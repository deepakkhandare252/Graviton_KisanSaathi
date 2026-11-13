import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { VERIFIED_SCHEMES } from './src/data/schemesData.ts';
import { RulesEngine } from './src/rules/rulesEngine.ts';
import { FarmerProfile } from './src/types/scheme.ts';
import { dbStore, verifyPassword } from './src/data/dbStore.ts';
import {
  sendOtpSms,
  sendDeadlineReminderSms,
  getConfiguredSmsProvider,
  maskPhoneNumber
} from './src/services/smsSender.ts';
import { normalizeIndianPhone, validateUsername } from './src/utils/phoneUtils.ts';
import { evaluateDeadlineStatus } from './src/utils/deadlineUtils.ts';
import { OtpPurpose } from './src/types/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const args = process.argv.slice(2);
const portFlagIndex = args.indexOf('--port');
let argPort: number | null = null;
if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
  argPort = parseInt(args[portFlagIndex + 1], 10);
}

const PORT =
  argPort ||
  (process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json());

// Allow local cross-port origins (e.g. Vite :3000 <-> nginx :8080 or Vite :5173 <-> :3000)
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
      (process.env.APP_URL && origin === process.env.APP_URL))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Strict cache boundary headers: never allow intermediaries or browsers to cache auth, OTP, or private records
app.use(
  [
    '/api/auth',
    '/api/saved-schemes',
    '/api/applications',
    '/api/notifications',
    '/api/reminders',
    '/api/eligibility',
    '/api/assistant'
  ],
  (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
  }
);

// Optional Gemini instance for grounded explanations (Backend only)
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
}

// Secret key for JWT signing
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.AUTH_SECRET || 'kisan-scheme-saathi-jwt-secret-2026';

// In-memory JWT revocation set for explicit logout within token TTL
const revokedTokens = new Set<string>();

function signToken(payload: { userId: string; username: string; phoneNumber: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(
  tokenString: string
): { userId: string; username: string; phoneNumber: string } | null {
  try {
    if (revokedTokens.has(tokenString)) return null;
    const parts = tokenString.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
  const user = dbStore.findUserById(payload.userId);
  if (!user || !user.phoneVerified || user.accountStatus !== 'ACTIVE') {
    return res.status(401).json({ error: 'Account unavailable or phone not verified' });
  }
  (req as any).user = user;
  (req as any).authToken = token;
  next();
}

async function processReminderNotificationsAndOptionalSms(userId?: string) {
  const created = dbStore.runDeadlineReminderSweep(userId);
  for (const item of created) {
    if (item.smsEligibleUser && item.notification.schemeId && item.notification.thresholdDays) {
      const alreadySent = dbStore.hasSmsReminderBeenDispatched(
        item.smsEligibleUser.id,
        item.notification.schemeId,
        item.deadlineDate,
        item.notification.thresholdDays
      );
      if (!alreadySent) {
        const smsRes = await sendDeadlineReminderSms({
          phoneNumber: item.smsEligibleUser.phoneNumber,
          schemeName: item.notification.schemeNameSnapshot || item.notification.schemeId,
          deadlineDate: item.deadlineDate,
          remainingDays: item.remainingDays
        });
        if (smsRes.sent) {
          dbStore.recordSmsReminderDispatched(
            item.smsEligibleUser.id,
            item.notification.schemeId,
            item.deadlineDate,
            item.notification.thresholdDays
          );
        }
      }
    }
  }
  return created;
}

// Run reminder evaluation periodically (every 15 mins)
setInterval(() => {
  processReminderNotificationsAndOptionalSms().catch(() => {});
}, 15 * 60 * 1000);

// ==========================================
// PHONE + USERNAME + SMS OTP AUTH ENDPOINTS
// ==========================================

/**
 * Step 1 of Registration: Validate inputs, store PENDING_VERIFICATION user,
 * issue hashed 6-digit OTP, and dispatch via configured SMS provider.
 * Never exposes raw OTP in JSON response or logs.
 */
app.post('/api/auth/register', async (req, res) => {
  const {
    username,
    fullName,
    phoneNumber,
    password,
    confirmPassword,
    preferredLanguage,
    district,
    termsAccepted
  } = req.body;

  if (!username || !fullName || !phoneNumber || !password) {
    return res.status(400).json({
      error: 'Username, full name, Indian mobile number, and password are required.'
    });
  }

  if (termsAccepted !== true) {
    return res.status(400).json({
      error: 'Please accept the Terms of Service and Privacy Policy to continue.'
    });
  }

  const usernameCheck = validateUsername(username);
  if (!usernameCheck.valid) {
    return res.status(400).json({ error: usernameCheck.errorEn });
  }

  const phoneCheck = normalizeIndianPhone(phoneNumber);
  if (!phoneCheck.valid || !phoneCheck.e164) {
    return res.status(400).json({ error: phoneCheck.errorEn || 'Invalid Indian mobile number.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
  }

  const existingByUsername = dbStore.findUserByUsername(usernameCheck.normalized);
  if (existingByUsername && existingByUsername.phoneVerified) {
    return res.status(409).json({ error: 'This username is already taken.' });
  }

  const existingByPhone = dbStore.findUserByPhone(phoneCheck.e164);
  if (existingByPhone && existingByPhone.phoneVerified) {
    return res.status(409).json({ error: 'An account with this mobile number is already registered.' });
  }

  const rateCheck = dbStore.checkOtpRateLimits(phoneCheck.e164, 'REGISTRATION');
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: rateCheck.reason,
      retryAfterSeconds: rateCheck.retryAfterSeconds
    });
  }

  const pendingUser = dbStore.upsertPendingRegistration({
    username: usernameCheck.normalized,
    fullName,
    phoneNumber: phoneCheck.e164,
    password,
    preferredLanguage: preferredLanguage || 'kn',
    district
  });

  const { otpCode, record, expiresInSeconds } = dbStore.issueOtp(
    pendingUser.phoneNumber,
    'REGISTRATION'
  );
  const smsResult = await sendOtpSms({
    phoneNumber: pendingUser.phoneNumber,
    otpCode,
    purpose: 'REGISTRATION'
  });

  if (!smsResult.sent && smsResult.configured) {
    dbStore.rollbackLatestOtp(record.id);
    return res.status(502).json({
      error: smsResult.message || 'SMS gateway failed to send OTP. Please try again shortly.',
      smsDelivered: false,
      smsConfigured: true,
      smsProvider: smsResult.provider
    });
  }

  return res.status(201).json({
    success: true,
    otpRequired: true,
    phoneNumber: pendingUser.phoneNumber,
    phoneNumberMasked: maskPhoneNumber(pendingUser.phoneNumber),
    purpose: 'REGISTRATION' as OtpPurpose,
    expiresInSeconds,
    resendCooldownSeconds: 60,
    smsDelivered: smsResult.sent,
    smsConfigured: smsResult.configured,
    smsProvider: smsResult.provider,
    message: smsResult.sent
      ? `A 6-digit verification OTP has been sent via SMS to ${maskPhoneNumber(pendingUser.phoneNumber)}.`
      : `Real SMS delivery is unconfigured (${smsResult.provider.toUpperCase()} credentials missing in .env). Configure your SMS provider to receive live OTPs.`
  });
});

/**
 * Send or Resend OTP (supports REGISTRATION, LOGIN_VERIFICATION, PASSWORD_RESET)
 */
async function handleOtpDispatch(req: express.Request, res: express.Response) {
  const { phoneNumber, purpose = 'REGISTRATION' } = req.body;
  const phoneCheck = normalizeIndianPhone(phoneNumber);

  if (!phoneCheck.valid || !phoneCheck.e164) {
    return res.status(400).json({ error: phoneCheck.errorEn || 'Invalid Indian mobile number.' });
  }

  const validPurposes: OtpPurpose[] = ['REGISTRATION', 'LOGIN_VERIFICATION', 'PASSWORD_RESET'];
  if (!validPurposes.includes(purpose)) {
    return res.status(400).json({ error: 'Invalid OTP purpose.' });
  }

  const rateCheck = dbStore.checkOtpRateLimits(phoneCheck.e164, purpose);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: rateCheck.reason,
      retryAfterSeconds: rateCheck.retryAfterSeconds
    });
  }

  const existingUser = dbStore.findUserByPhone(phoneCheck.e164);

  // Prevent account enumeration during PASSWORD_RESET
  if (purpose === 'PASSWORD_RESET' && (!existingUser || !existingUser.phoneVerified)) {
    const providerInfo = getConfiguredSmsProvider();
    return res.json({
      success: true,
      otpRequired: true,
      phoneNumber: phoneCheck.e164,
      phoneNumberMasked: maskPhoneNumber(phoneCheck.e164),
      purpose,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      smsDelivered: providerInfo.configured,
      smsConfigured: providerInfo.configured,
      smsProvider: providerInfo.provider,
      message: providerInfo.configured
        ? `If an account exists for ${maskPhoneNumber(phoneCheck.e164)}, an OTP has been sent.`
        : `SMS provider (${providerInfo.provider.toUpperCase()}) is unconfigured in .env.`
    });
  }

  const { otpCode, record, expiresInSeconds } = dbStore.issueOtp(phoneCheck.e164, purpose);
  const smsResult = await sendOtpSms({
    phoneNumber: phoneCheck.e164,
    otpCode,
    purpose
  });

  if (!smsResult.sent && smsResult.configured) {
    dbStore.rollbackLatestOtp(record.id);
    return res.status(502).json({
      error: smsResult.message,
      smsDelivered: false,
      smsConfigured: true,
      smsProvider: smsResult.provider
    });
  }

  return res.json({
    success: true,
    otpRequired: true,
    phoneNumber: phoneCheck.e164,
    phoneNumberMasked: maskPhoneNumber(phoneCheck.e164),
    purpose,
    expiresInSeconds,
    resendCooldownSeconds: 60,
    smsDelivered: smsResult.sent,
    smsConfigured: smsResult.configured,
    smsProvider: smsResult.provider,
    message: smsResult.sent
      ? `OTP sent to ${maskPhoneNumber(phoneCheck.e164)}. Valid for 5 minutes.`
      : `Real SMS delivery is unconfigured (${smsResult.provider.toUpperCase()} credentials missing in .env).`
  });
}

app.post('/api/auth/send-otp', handleOtpDispatch);
app.post('/api/auth/resend-otp', handleOtpDispatch);

/**
 * Verify 6-digit SMS OTP & activate verified user account (issuing JWT)
 */
app.post('/api/auth/verify-otp', (req, res) => {
  const { phoneNumber, otpCode, otp, purpose = 'REGISTRATION' } = req.body;
  const code = String(otpCode ?? otp ?? '').trim();

  const phoneCheck = normalizeIndianPhone(phoneNumber);
  if (!phoneCheck.valid || !phoneCheck.e164) {
    return res.status(400).json({ error: phoneCheck.errorEn || 'Invalid mobile number.' });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a valid 6-digit numeric OTP.' });
  }

  const result = dbStore.verifyOtp({
    phoneNumber: phoneCheck.e164,
    otpCode: code,
    purpose
  });

  if (!result.success) {
    const status = result.code === 'TOO_MANY_ATTEMPTS' ? 429 : 400;
    return res.status(status).json({ error: result.message, code: result.code });
  }

  const user = result.user;
  if (!user) {
    return res.json({ success: true, message: result.message });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    phoneNumber: user.phoneNumber
  });

  return res.json({
    success: true,
    message: result.message,
    token,
    user: dbStore.sanitizeUser(user)
  });
});

/**
 * Login with Username OR Indian Phone Number + Password
 */
app.post('/api/auth/login', async (req, res) => {
  const identifierRaw = req.body.identifier || req.body.username || req.body.phoneNumber;
  const { password } = req.body;

  if (!identifierRaw || !password) {
    return res.status(400).json({ error: 'Username or mobile number and password are required.' });
  }

  const user = dbStore.findUserByIdentifier(String(identifierRaw));
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
  }

  if (!user.phoneVerified || user.accountStatus !== 'ACTIVE') {
    return res.status(403).json({
      error: 'Phone number not yet verified. Please complete OTP verification first.',
      otpRequired: true,
      phoneNumber: user.phoneNumber,
      phoneNumberMasked: maskPhoneNumber(user.phoneNumber)
    });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    phoneNumber: user.phoneNumber
  });

  // Evaluate reminders on login cleanly
  await processReminderNotificationsAndOptionalSms(user.id);

  return res.json({
    token,
    user: dbStore.sanitizeUser(user)
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokedTokens.add(authHeader.split(' ')[1]);
  }
  return res.json({ success: true, message: 'Signed out successfully.' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  req.body.purpose = 'PASSWORD_RESET';
  return handleOtpDispatch(req, res);
});

app.post('/api/auth/reset-password', (req, res) => {
  const { phoneNumber, otpCode, otp, newPassword, confirmPassword } = req.body;
  const code = String(otpCode ?? otp ?? '').trim();

  const phoneCheck = normalizeIndianPhone(phoneNumber);
  if (!phoneCheck.valid || !phoneCheck.e164) {
    return res.status(400).json({ error: phoneCheck.errorEn || 'Invalid mobile number.' });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a valid 6-digit numeric OTP.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const otpRes = dbStore.verifyOtp({
    phoneNumber: phoneCheck.e164,
    otpCode: code,
    purpose: 'PASSWORD_RESET'
  });

  if (!otpRes.success) {
    return res.status(otpRes.code === 'TOO_MANY_ATTEMPTS' ? 429 : 400).json({ error: otpRes.message });
  }

  const updated = dbStore.updatePasswordForPhone(phoneCheck.e164, newPassword);
  if (!updated) {
    return res.status(404).json({ error: 'No matching verified account found.' });
  }

  return res.json({
    success: true,
    message: 'Password reset successfully. You can now sign in with your new password.'
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user;
  res.json(dbStore.sanitizeUser(user));
});

app.put('/api/auth/profile', authenticate, (req, res) => {
  const user = (req as any).user;
  const { fullName, preferredLanguage, district, timezone, smsRemindersEnabled } = req.body;

  const updated = dbStore.updateUserProfile(user.id, {
    fullName,
    preferredLanguage,
    district,
    timezone,
    smsRemindersEnabled
  });

  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(dbStore.sanitizeUser(updated));
});

// ==========================================
// SAVED SCHEMES + REMINDERS ENDPOINTS
// ==========================================

app.get('/api/saved-schemes', authenticate, (req, res) => {
  const user = (req as any).user;
  const saved = dbStore.getSavedSchemes(user.id);

  const enriched = saved.map((item) => {
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === item.schemeId) || null;
    const effectiveDeadline = item.deadlineVerified
      ? item.applicationDeadline
      : item.customDeadline || null;
    const deadlineEval = evaluateDeadlineStatus(effectiveDeadline, user.timezone || 'Asia/Kolkata');

    return {
      ...item,
      deadlineStatus: deadlineEval,
      scheme
    };
  });

  res.json({
    savedSchemes: enriched,
    total: enriched.length
  });
});

app.post('/api/saved-schemes', authenticate, (req, res) => {
  const user = (req as any).user;
  const { schemeId, userNotes, notes, reminderEnabled, reminderDaysBefore, customDeadline } = req.body;

  if (!schemeId) {
    return res.status(400).json({ error: 'Scheme ID is required' });
  }

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme does not exist in verified catalog' });
  }

  const saved = dbStore.saveScheme(user.id, schemeId, {
    userNotes: userNotes ?? notes,
    reminderEnabled,
    reminderDaysBefore,
    customDeadline
  });

  const effectiveDeadline = saved.deadlineVerified
    ? saved.applicationDeadline
    : saved.customDeadline || null;
  const deadlineEval = evaluateDeadlineStatus(effectiveDeadline, user.timezone || 'Asia/Kolkata');

  res.status(201).json({
    ...saved,
    deadlineStatus: deadlineEval,
    scheme
  });
});

app.patch('/api/saved-schemes/:schemeId/reminder', authenticate, async (req, res) => {
  const user = (req as any).user;
  const {
    reminderEnabled,
    reminderDaysBefore,
    customDeadline,
    userNotes,
    acknowledge,
    dismiss
  } = req.body;

  const updated = dbStore.updateSavedSchemeReminder(user.id, req.params.schemeId, {
    reminderEnabled,
    reminderDaysBefore,
    customDeadline,
    userNotes,
    acknowledge,
    dismiss
  });

  if (!updated) {
    return res.status(404).json({ error: 'Saved scheme not found for current user.' });
  }

  await processReminderNotificationsAndOptionalSms(user.id);

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === updated.schemeId) || null;
  const effectiveDeadline = updated.deadlineVerified
    ? updated.applicationDeadline
    : updated.customDeadline || null;
  const deadlineEval = evaluateDeadlineStatus(effectiveDeadline, user.timezone || 'Asia/Kolkata');

  res.json({
    ...updated,
    deadlineStatus: deadlineEval,
    scheme
  });
});

app.delete('/api/saved-schemes/:schemeId', authenticate, (req, res) => {
  const user = (req as any).user;
  const removed = dbStore.removeSavedScheme(user.id, req.params.schemeId);
  res.json({ success: removed, schemeId: req.params.schemeId });
});

// ==========================================
// UPCOMING DEADLINES & NOTIFICATIONS ENDPOINTS
// ==========================================

app.get('/api/reminders/upcoming', authenticate, async (req, res) => {
  const user = (req as any).user;
  await processReminderNotificationsAndOptionalSms(user.id);

  const saved = dbStore.getSavedSchemes(user.id);
  const timezone = user.timezone || 'Asia/Kolkata';

  const reminders = saved
    .map((item) => {
      const scheme = VERIFIED_SCHEMES.find((s) => s.id === item.schemeId) || null;
      const effectiveDeadline = item.deadlineVerified
        ? item.applicationDeadline
        : item.customDeadline || null;
      const deadlineStatus = evaluateDeadlineStatus(effectiveDeadline, timezone);

      return {
        ...item,
        effectiveDeadline,
        deadlineStatus,
        scheme
      };
    })
    .filter((item) => item.deadlineStatus.hasDeadline)
    .sort((a, b) => {
      const da = a.deadlineStatus.remainingDays ?? 9999;
      const db = b.deadlineStatus.remainingDays ?? 9999;
      return da - db;
    });

  res.json({
    timezone,
    reminders,
    total: reminders.length
  });
});

app.post('/api/reminders/:schemeId/acknowledge', authenticate, (req, res) => {
  const user = (req as any).user;
  const updated = dbStore.updateSavedSchemeReminder(user.id, req.params.schemeId, {
    acknowledge: true
  });
  if (!updated) return res.status(404).json({ error: 'Saved scheme not found' });
  res.json({ success: true, savedScheme: updated });
});

app.post('/api/reminders/:schemeId/dismiss', authenticate, (req, res) => {
  const user = (req as any).user;
  const dismiss = req.body?.dismiss !== false;
  const updated = dbStore.updateSavedSchemeReminder(user.id, req.params.schemeId, {
    dismiss
  });
  if (!updated) return res.status(404).json({ error: 'Saved scheme not found' });
  res.json({ success: true, savedScheme: updated });
});

app.get('/api/notifications', authenticate, async (req, res) => {
  const user = (req as any).user;
  await processReminderNotificationsAndOptionalSms(user.id);
  const notifications = dbStore.getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  res.json({ notifications, unreadCount });
});

app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
  const user = (req as any).user;
  const updated = dbStore.markNotificationRead(user.id, req.params.id);
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true, notification: updated });
});

app.post('/api/notifications/read-all', authenticate, (req, res) => {
  const user = (req as any).user;
  const count = dbStore.markAllNotificationsRead(user.id);
  res.json({ success: true, markedCount: count });
});

// ==========================================
// MY APPLICATIONS TRACKING ENDPOINTS
// ==========================================

app.get('/api/applications', authenticate, (req, res) => {
  const user = (req as any).user;
  const applications = dbStore.getApplications(user.id);

  const enriched = applications.map((appItem) => {
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === appItem.schemeId);
    return {
      ...appItem,
      scheme: scheme || null
    };
  });

  res.json({
    applications: enriched,
    total: enriched.length
  });
});

app.post('/api/applications', authenticate, (req, res) => {
  const user = (req as any).user;
  const {
    schemeId,
    status,
    notes,
    applicationDate,
    appliedThroughPortal,
    acknowledgementNumber,
    readinessSnapshot,
    eligibilitySnapshot
  } = req.body;

  if (!schemeId) {
    return res.status(400).json({ error: 'Scheme ID is required' });
  }

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme does not exist in verified catalog' });
  }

  const application = dbStore.createApplication({
    userId: user.id,
    schemeId,
    schemeNameSnapshot: scheme.nameEn,
    status,
    notes,
    applicationDate,
    appliedThroughPortal: appliedThroughPortal || scheme.officialPortalUrl,
    acknowledgementNumber,
    readinessSnapshot,
    eligibilitySnapshot
  });

  res.status(201).json({
    ...application,
    scheme
  });
});

app.get('/api/applications/:id', authenticate, (req, res) => {
  const user = (req as any).user;
  const application = dbStore.getApplicationById(req.params.id);

  if (!application || application.userId !== user.id) {
    return res.status(404).json({ error: 'Application record not found' });
  }

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === application.schemeId);
  res.json({
    ...application,
    scheme: scheme || null
  });
});

app.patch('/api/applications/:id', authenticate, (req, res) => {
  const user = (req as any).user;
  const {
    status,
    notes,
    applicationDate,
    appliedThroughPortal,
    acknowledgementNumber,
    timelineNote,
    readinessSnapshot,
    eligibilitySnapshot
  } = req.body;

  const updated = dbStore.updateApplication(req.params.id, user.id, {
    status,
    notes,
    applicationDate,
    appliedThroughPortal,
    acknowledgementNumber,
    timelineNote,
    readinessSnapshot,
    eligibilitySnapshot
  });

  if (!updated) {
    return res.status(404).json({ error: 'Application record not found or unauthorized' });
  }

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === updated.schemeId);
  res.json({
    ...updated,
    scheme: scheme || null
  });
});

app.delete('/api/applications/:id', authenticate, (req, res) => {
  const user = (req as any).user;
  const deleted = dbStore.deleteApplication(req.params.id, user.id);
  res.json({ success: deleted, id: req.params.id });
});

// ==========================================
// SCHEME CATALOG & ELIGIBILITY ENGINE ENDPOINTS
// ==========================================

app.get('/api/health', (req, res) => {
  const smsConfig = getConfiguredSmsProvider();
  res.json({
    status: 'UP',
    service: 'kisan-scheme-saathi-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    rulesEngine: 'authoritative-deterministic',
    smsProvider: smsConfig.provider,
    smsConfigured: smsConfig.configured,
    state: 'Karnataka'
  });
});

app.get('/api/schemes', (req, res) => {
  const categoryFilter = req.query.category as string;
  let schemes = VERIFIED_SCHEMES;

  if (categoryFilter) {
    schemes = schemes.filter((s) => s.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({
    schemes,
    total: schemes.length,
    version: '2026.5-KAR',
    lastVerifiedDate: '2026-11-10'
  });
});

app.get('/api/schemes/:id', (req, res) => {
  const scheme = VERIFIED_SCHEMES.find((s) => s.id === req.params.id);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found', schemeId: req.params.id });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(scheme);
});

app.post('/api/eligibility/evaluate', (req, res) => {
  const profile: Partial<FarmerProfile> = req.body;

  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: 'Invalid profile payload provided' });
  }

  if (!profile.state) {
    profile.state = 'Karnataka';
  }

  const results = RulesEngine.evaluateAllSchemes(VERIFIED_SCHEMES, profile);

  res.json({
    timestamp: new Date().toISOString(),
    evaluatedCount: results.length,
    profileSummary: {
      state: profile.state,
      district: profile.district || 'Unspecified',
      category: profile.farmerCategory || 'small_marginal',
      landAcres: profile.landHoldingAcres ?? 0
    },
    results
  });
});

app.get('/api/schemes/:id/checklist', (req, res) => {
  const scheme = VERIFIED_SCHEMES.find((s) => s.id === req.params.id);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({
    schemeId: scheme.id,
    schemeNameEn: scheme.nameEn,
    schemeNameKn: scheme.nameKn,
    prerequisites: scheme.prerequisites
  });
});

app.get('/api/schemes/:id/application-guide', (req, res) => {
  const scheme = VERIFIED_SCHEMES.find((s) => s.id === req.params.id);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json({
    schemeId: scheme.id,
    schemeNameEn: scheme.nameEn,
    schemeNameKn: scheme.nameKn,
    officialPortalUrl: scheme.officialPortalUrl,
    informationUrl: scheme.informationUrl,
    helplinePhone: scheme.helplinePhone,
    stepsEn: scheme.applicationStepsEn,
    stepsKn: scheme.applicationStepsKn,
    assistanceCentresEn: scheme.assistanceCentresEn,
    assistanceCentresKn: scheme.assistanceCentresKn,
    lastVerifiedDate: scheme.lastVerifiedDate,
    applicationDeadline: scheme.applicationDeadline ?? null,
    deadlineVerified: Boolean(scheme.deadlineVerified)
  });
});

app.post('/api/assistant/explain', async (req, res) => {
  const { schemeId, result, userQuestion, language } = req.body;

  if (!result || !schemeId) {
    return res.status(400).json({ error: 'Missing evaluation result context' });
  }

  const scheme = VERIFIED_SCHEMES.find((s) => s.id === schemeId);
  const lang = language === 'kn' ? 'Kannada' : 'English';

  if (!aiClient) {
    const fallback =
      language === 'kn'
        ? `ಯೋಜನೆ: ${result.schemeNameKn}\nಅರ್ಹತಾ ಫಲಿತಾಂಶ: ${result.statusLabelKn}\n\nವಿವರಣೆ: ${result.summaryExplanationKn}\nಮುಂದಿನ ಕ್ರಮ: ${result.nextActionKn}\nಅಧಿಕೃತ ಪೋರ್ಟಲ್: ${result.officialPortalUrl}\n\n(ಗಮನಿಸಿ: ಅಂತಿಮ ಅರ್ಹತೆ ಮತ್ತು ಸೌಲಭ್ಯದ ಅನುಮೋದನೆಯನ್ನು ಸಂಬಂಧಪಟ್ಟ ಸರ್ಕಾರಿ ಪ್ರಾಧಿಕಾರವೇ ನಿರ್ಧರಿಸುತ್ತದೆ.)`
        : `Scheme: ${result.schemeName}\nEligibility Status: ${result.statusLabelEn}\n\nExplanation: ${result.summaryExplanationEn}\nNext Step: ${result.nextActionEn}\nOfficial Portal: ${result.officialPortalUrl}\n\n(Note: Final eligibility and benefit approval are determined exclusively by the authorized government agency.)`;
    return res.json({ explanation: fallback, source: 'deterministic-rules' });
  }

  try {
    const prompt = `You are "Kisan Scheme Saathi Assistant", a helpful, empathetic agricultural advisor for Karnataka, India.
Explain the following verified scheme eligibility evaluation to the farmer in clear, polite ${lang}.

STRICT RULES:
1. Do NOT determine eligibility or change the status. The authoritative status is already determined as: "${result.status}".
2. Do NOT invent new scheme criteria, documents, or links. Use only the provided context.
3. Explicitly explain satisfied conditions, failed conditions (if any), and unknown verification requirements.
4. Conclude with this mandatory disclaimer: "Final eligibility and benefit approval are determined by the responsible government authority."
5. Language: Answer fluently and naturally in ${lang}.

CONTEXT:
Scheme: ${result.schemeName} (${scheme?.nameKn || ''})
Category: ${result.category}
Status: ${result.status}
Benefits: ${result.benefitsEn}
Official Portal: ${result.officialPortalUrl}
Department: ${result.officialSource}
Satisfied Conditions: ${JSON.stringify(result.satisfiedConditions.map((c: any) => c.condition.titleEn))}
Failed Conditions: ${JSON.stringify(result.failedConditions.map((c: any) => c.condition.titleEn))}
Unknown Conditions: ${JSON.stringify(result.unknownConditions.map((c: any) => c.condition.titleEn))}
Next Action: ${result.nextActionEn}

Farmer's specific question: "${userQuestion || 'Can you explain why I received this result and what I need to do next?'}"`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text || '';
    res.json({ explanation: text, source: 'grounded-gemini' });
  } catch (err: any) {
    console.error('Gemini explanation error:', err);
    const fallback =
      language === 'kn'
        ? `${result.schemeNameKn} ಯೋಜನೆಗೆ ನಿಮ್ಮ ಸ್ಥಿತಿ: ${result.statusLabelKn}.\n${result.summaryExplanationKn}\nಮುಂದಿನ ಕ್ರಮ: ${result.nextActionKn}\n(ಅಂತಿಮ ಅನುಮೋದನೆ ಸರ್ಕಾರಿ ಪ್ರಾಧಿಕಾರದಿಂದ ಮಾತ್ರ)`
        : `Status: ${result.statusLabelEn} for ${result.schemeName}.\n${result.summaryExplanationEn}\nNext Action: ${result.nextActionEn}\n(Final approval determined by government authority)`;
    res.json({ explanation: fallback, source: 'deterministic-fallback' });
  }
});

app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ==========================================
// VITE SPA MIDDLEWARE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kisan Scheme Saathi server running on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && PORT !== 3000) {
      console.warn(`Port ${PORT} in use, retrying on 3000...`);
      app.listen(3000, '0.0.0.0', () => {
        console.log(`Kisan Scheme Saathi server running on port 3000`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
