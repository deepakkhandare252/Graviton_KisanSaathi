import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  ApplicationRecordItem,
  ApplicationTimelineItem,
  SavedSchemeItem,
  ApplicationStatus,
  OtpPurpose,
  AppNotification
} from '../types/auth';
import { VERIFIED_SCHEMES } from './schemesData';
import { normalizeIndianPhone, validateUsername } from '../utils/phoneUtils';
import {
  findDueReminderThreshold,
  evaluateDeadlineStatus,
  SUPPORTED_REMINDER_DAYS
} from '../utils/deadlineUtils';

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export interface OtpVerificationRecord {
  id: string;
  phoneNumber: string; // E.164
  otpHash: string;
  otpSalt: string;
  purpose: OtpPurpose;
  expiresAt: string;
  verifiedAt?: string | null;
  invalidatedAt?: string | null;
  attempts: number;
  createdAt: string;
}

export interface ReminderDispatchLog {
  id: string;
  userId: string;
  schemeId: string;
  deadlineDate: string;
  thresholdDays: number;
  channel: 'IN_APP' | 'SMS';
  sentAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  otpVerifications: OtpVerificationRecord[];
  savedSchemes: SavedSchemeItem[];
  applications: ApplicationRecordItem[];
  notifications: AppNotification[];
  reminderDispatchLogs: ReminderDispatchLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app-db.json');

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_RESENDS_PER_WINDOW = 5;
const OTP_RATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export function hashPassword(
  password: string,
  existingSalt?: string
): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: calculated } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

export function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

class AppDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
    this.migrateLegacyRecordsIfNeeded();
    this.seedDefaultUserIfEmpty();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        return {
          users: Array.isArray(raw.users) ? raw.users : [],
          otpVerifications: Array.isArray(raw.otpVerifications) ? raw.otpVerifications : [],
          savedSchemes: Array.isArray(raw.savedSchemes) ? raw.savedSchemes : [],
          applications: Array.isArray(raw.applications) ? raw.applications : [],
          notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
          reminderDispatchLogs: Array.isArray(raw.reminderDispatchLogs) ? raw.reminderDispatchLogs : []
        };
      }
    } catch (err) {
      console.warn('Could not read app-db.json, initializing fresh store:', err);
    }
    return {
      users: [],
      otpVerifications: [],
      savedSchemes: [],
      applications: [],
      notifications: [],
      reminderDispatchLogs: []
    };
  }

  private saveData(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  /**
   * Additive, non-destructive migration from prior schema versions.
   */
  private migrateLegacyRecordsIfNeeded(): void {
    let dirty = false;
    let legacyCounter = 1;

    for (const u of this.data.users as any[]) {
      if (!u.username) {
        u.username =
          u.id === 'user_seed_karnataka'
            ? 'basavaraj_patil'
            : `farmer_${String(u.id).slice(-6)}`.toLowerCase();
        dirty = true;
      }
      if (u.phoneNumber) {
        const norm = normalizeIndianPhone(u.phoneNumber);
        if (norm.valid && norm.e164 && u.phoneNumber !== norm.e164) {
          u.phoneNumber = norm.e164;
          dirty = true;
        }
      } else {
        u.phoneNumber =
          u.id === 'user_seed_karnataka'
            ? '+919845012345'
            : `+9190000000${String(legacyCounter++).padStart(2, '0')}`;
        dirty = true;
      }
      if (u.phoneVerified === undefined) {
        u.phoneVerified = Boolean(u.emailVerified);
        dirty = true;
      }
      if (!u.accountStatus) {
        u.accountStatus = u.phoneVerified ? 'ACTIVE' : 'PENDING_VERIFICATION';
        dirty = true;
      }
      if (!u.timezone) {
        u.timezone = 'Asia/Kolkata';
        dirty = true;
      }
      if (u.smsRemindersEnabled === undefined) {
        u.smsRemindersEnabled = false;
        dirty = true;
      }
    }

    for (const s of this.data.savedSchemes as any[]) {
      const scheme = VERIFIED_SCHEMES.find((item) => item.id === s.schemeId);
      if (!s.schemeNameSnapshot && scheme) {
        s.schemeNameSnapshot = scheme.nameEn;
        dirty = true;
      }
      if (s.applicationDeadline === undefined) {
        s.applicationDeadline = scheme?.applicationDeadline ?? null;
        s.deadlineVerified = Boolean(scheme?.deadlineVerified);
        dirty = true;
      }
      if (s.reminderEnabled === undefined) {
        s.reminderEnabled = Boolean(s.applicationDeadline);
        dirty = true;
      }
      if (!Array.isArray(s.reminderDaysBefore)) {
        s.reminderDaysBefore = [30, 7, 3, 1];
        dirty = true;
      }
      if (s.notes !== undefined && s.userNotes === undefined) {
        s.userNotes = s.notes;
        dirty = true;
      }
    }

    const hasSeedUser = this.data.users.some((u) => u.id === 'user_seed_karnataka');
    if (hasSeedUser) {
      const seedSavedIds = new Set(
        this.data.savedSchemes
          .filter((s) => s.userId === 'user_seed_karnataka')
          .map((s) => s.schemeId)
      );
      if (seedSavedIds.size <= 2) {
        for (const extraId of ['raitha-vidya-nidhi', 'pmfby-samrakshane']) {
          if (!seedSavedIds.has(extraId)) {
            const scheme = VERIFIED_SCHEMES.find((item) => item.id === extraId);
            if (scheme) {
              this.data.savedSchemes.push({
                id: `saved_mig_${extraId}`,
                userId: 'user_seed_karnataka',
                schemeId: scheme.id,
                schemeNameSnapshot: scheme.nameEn,
                savedAt: new Date().toISOString(),
                applicationDeadline: scheme.applicationDeadline ?? null,
                deadlineVerified: Boolean(scheme.deadlineVerified),
                reminderEnabled: true,
                reminderDaysBefore: [30, 7, 3, 1]
              });
              dirty = true;
            }
          }
        }
      }
    }

    for (const a of this.data.applications as any[]) {
      const scheme = VERIFIED_SCHEMES.find((item) => item.id === a.schemeId);
      if (!a.schemeNameSnapshot && scheme) {
        a.schemeNameSnapshot = scheme.nameEn;
        dirty = true;
      }
    }

    if (dirty) this.saveData();
  }

  private seedDefaultUserIfEmpty(): void {
    if (this.data.users.length === 0) {
      const { hash, salt } = hashPassword('Kisan@123');
      const now = new Date().toISOString();
      const seedUser: StoredUser = {
        id: 'user_seed_karnataka',
        username: 'basavaraj_patil',
        fullName: 'Basavaraj Patil',
        phoneNumber: '+919845012345',
        phoneVerified: true,
        preferredLanguage: 'kn',
        district: 'Dharwad',
        timezone: 'Asia/Kolkata',
        smsRemindersEnabled: false,
        accountStatus: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        passwordHash: hash,
        salt
      };
      this.data.users.push(seedUser);

      // Seed saved schemes with real verified catalog deadlines (or rolling open for PM-KISAN)
      const pmKisan = VERIFIED_SCHEMES.find((s) => s.id === 'pm-kisan-raitha-siri')!;
      const ganga = VERIFIED_SCHEMES.find((s) => s.id === 'ganga-kalyana')!;
      const vidya = VERIFIED_SCHEMES.find((s) => s.id === 'raitha-vidya-nidhi')!;
      const pmfby = VERIFIED_SCHEMES.find((s) => s.id === 'pmfby-samrakshane')!;

      this.data.savedSchemes.push(
        {
          id: 'saved_1',
          userId: seedUser.id,
          schemeId: ganga.id,
          schemeNameSnapshot: ganga.nameEn,
          savedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          applicationDeadline: ganga.applicationDeadline ?? null,
          deadlineVerified: Boolean(ganga.deadlineVerified),
          reminderEnabled: true,
          reminderDaysBefore: [30, 7, 3, 1],
          userNotes: 'Corporation borewell batch submission — get VAO no-borewell mahazar ready.'
        },
        {
          id: 'saved_2',
          userId: seedUser.id,
          schemeId: vidya.id,
          schemeNameSnapshot: vidya.nameEn,
          savedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          applicationDeadline: vidya.applicationDeadline ?? null,
          deadlineVerified: Boolean(vidya.deadlineVerified),
          reminderEnabled: true,
          reminderDaysBefore: [30, 7, 3],
          userNotes: 'Link FRUITS ID on State Scholarship Portal for daughter B.Sc Agri admission.'
        },
        {
          id: 'saved_3',
          userId: seedUser.id,
          schemeId: pmfby.id,
          schemeNameSnapshot: pmfby.nameEn,
          savedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
          applicationDeadline: pmfby.applicationDeadline ?? null,
          deadlineVerified: Boolean(pmfby.deadlineVerified),
          reminderEnabled: true,
          reminderDaysBefore: [30, 7, 3, 1],
          userNotes: 'Rabi Jowar & Gram coverage on Samrakshane portal.'
        },
        {
          id: 'saved_4',
          userId: seedUser.id,
          schemeId: pmKisan.id,
          schemeNameSnapshot: pmKisan.nameEn,
          savedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          applicationDeadline: null,
          deadlineVerified: false,
          reminderEnabled: false,
          reminderDaysBefore: [7, 3],
          userNotes: 'Pahani RTC verified for 4.2 acres in Navalgund.'
        }
      );

      this.data.applications.push({
        id: 'app_seed_1',
        userId: seedUser.id,
        schemeId: pmKisan.id,
        schemeNameSnapshot: pmKisan.nameEn,
        status: 'READY_TO_APPLY',
        applicationDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        appliedThroughPortal: 'FRUITS Karnataka (fruits.karnataka.gov.in)',
        acknowledgementNumber: 'FRUITS-DHW-2026-89102',
        notes: 'Pahani (RTC) and Aadhaar seeded bank account verified at Raitha Samparka Kendra.',
        readinessSnapshot: { readyCount: 3, totalMandatory: 3, percentage: 100 },
        eligibilitySnapshot: { status: 'ELIGIBLE', evaluatedAt: now },
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        timeline: [
          {
            id: 'time_1',
            applicationId: 'app_seed_1',
            status: 'INTERESTED',
            note: 'Discovered scheme eligibility via Kisan Scheme Saathi questionnaire.',
            timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: 'time_2',
            applicationId: 'app_seed_1',
            status: 'PREPARING',
            note: 'Collected RTC/Pahani from Bhoomi portal and Aadhaar copy.',
            timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: 'time_3',
            applicationId: 'app_seed_1',
            status: 'READY_TO_APPLY',
            note: 'All 3 mandatory documents verified. Ready for portal submission.',
            timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
          }
        ]
      });

      this.saveData();
    }

    // Run reminder check on startup so upcoming verified deadlines create unread notifications once
    this.runDeadlineReminderSweep();
  }

  // ==========================================
  // USER METHODS
  // ==========================================

  public sanitizeUser(u: StoredUser): User {
    const { passwordHash: _ph, salt: _s, ...safe } = u;
    return safe;
  }

  public findUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByUsername(username: string): StoredUser | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username.toLowerCase() === clean);
  }

  public findUserByPhone(phoneNumber: string): StoredUser | undefined {
    const norm = normalizeIndianPhone(phoneNumber);
    if (!norm.valid || !norm.e164) return undefined;
    return this.data.users.find((u) => u.phoneNumber === norm.e164);
  }

  public findUserByIdentifier(identifier: string): StoredUser | undefined {
    const asPhone = this.findUserByPhone(identifier);
    if (asPhone) return asPhone;
    return this.findUserByUsername(identifier);
  }

  public upsertPendingRegistration(params: {
    username: string;
    fullName: string;
    phoneNumber: string; // normalized E.164
    password: string;
    preferredLanguage?: 'en' | 'kn';
    district?: string;
  }): StoredUser {
    const cleanUsername = validateUsername(params.username).normalized;
    const existingUnverified = this.data.users.find(
      (u) =>
        (u.phoneNumber === params.phoneNumber || u.username === cleanUsername) &&
        !u.phoneVerified &&
        u.accountStatus === 'PENDING_VERIFICATION'
    );

    const { hash, salt } = hashPassword(params.password);
    const now = new Date().toISOString();

    if (existingUnverified) {
      existingUnverified.username = cleanUsername;
      existingUnverified.fullName = params.fullName.trim();
      existingUnverified.phoneNumber = params.phoneNumber;
      existingUnverified.preferredLanguage = params.preferredLanguage || 'kn';
      existingUnverified.district = params.district || existingUnverified.district || '';
      existingUnverified.passwordHash = hash;
      existingUnverified.salt = salt;
      existingUnverified.updatedAt = now;
      this.saveData();
      return existingUnverified;
    }

    const user: StoredUser = {
      id: 'usr_' + crypto.randomUUID().slice(0, 12),
      username: cleanUsername,
      fullName: params.fullName.trim(),
      phoneNumber: params.phoneNumber,
      phoneVerified: false,
      preferredLanguage: params.preferredLanguage || 'kn',
      district: params.district || '',
      timezone: 'Asia/Kolkata',
      smsRemindersEnabled: false,
      accountStatus: 'PENDING_VERIFICATION',
      createdAt: now,
      updatedAt: now,
      passwordHash: hash,
      salt
    };

    this.data.users.push(user);
    this.saveData();
    return user;
  }

  public updateUserProfile(
    id: string,
    updates: Partial<
      Pick<User, 'fullName' | 'preferredLanguage' | 'district' | 'timezone' | 'smsRemindersEnabled'>
    >
  ): StoredUser | null {
    const user = this.findUserById(id);
    if (!user) return null;

    if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
    if (updates.preferredLanguage !== undefined) user.preferredLanguage = updates.preferredLanguage;
    if (updates.district !== undefined) user.district = updates.district;
    if (updates.timezone !== undefined) user.timezone = updates.timezone;
    if (updates.smsRemindersEnabled !== undefined) {
      user.smsRemindersEnabled = updates.smsRemindersEnabled;
    }

    user.updatedAt = new Date().toISOString();
    this.saveData();
    return user;
  }

  public updatePasswordForPhone(e164Phone: string, newPassword: string): StoredUser | null {
    const user = this.findUserByPhone(e164Phone);
    if (!user) return null;
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    user.updatedAt = new Date().toISOString();
    this.saveData();
    return user;
  }

  // ==========================================
  // CRYPTOGRAPHIC SMS OTP VERIFICATION
  // ==========================================

  public checkOtpRateLimits(
    phoneNumber: string,
    purpose: OtpPurpose
  ): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
    const now = Date.now();
    const recentForPhone = this.data.otpVerifications.filter(
      (o) =>
        o.phoneNumber === phoneNumber &&
        o.purpose === purpose &&
        now - new Date(o.createdAt).getTime() < OTP_RATE_WINDOW_MS
    );

    if (recentForPhone.length >= OTP_MAX_RESENDS_PER_WINDOW) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(OTP_RATE_WINDOW_MS / 1000),
        reason: 'Too many OTP requests for this number. Please try again after 30 minutes.'
      };
    }

    const latest = recentForPhone.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (latest) {
      const elapsed = now - new Date(latest.createdAt).getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000),
          reason: `Please wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000)} seconds before requesting another OTP.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Issues a new 6-digit OTP stored exclusively via salted HMAC-SHA256 hash.
   * Immediately invalidates any prior active OTPs for the same phone + purpose.
   */
  public issueOtp(
    phoneNumber: string,
    purpose: OtpPurpose
  ): { otpCode: string; record: OtpVerificationRecord; expiresInSeconds: number } {
    const nowIso = new Date().toISOString();

    // Invalidate all prior active OTPs for this phone + purpose
    for (const existing of this.data.otpVerifications) {
      if (
        existing.phoneNumber === phoneNumber &&
        existing.purpose === purpose &&
        !existing.verifiedAt &&
        !existing.invalidatedAt
      ) {
        existing.invalidatedAt = nowIso;
      }
    }

    const otpCode = generateSixDigitOtp();
    const otpSalt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(otpCode, otpSalt);

    const record: OtpVerificationRecord = {
      id: 'otp_' + crypto.randomUUID().slice(0, 12),
      phoneNumber,
      otpHash,
      otpSalt,
      purpose,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
      verifiedAt: null,
      invalidatedAt: null,
      attempts: 0,
      createdAt: nowIso
    };

    this.data.otpVerifications.push(record);
    this.saveData();
    return {
      otpCode,
      record,
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000)
    };
  }

  public rollbackLatestOtp(otpId: string): void {
    const rec = this.data.otpVerifications.find((o) => o.id === otpId);
    if (rec) {
      rec.invalidatedAt = new Date().toISOString();
      this.saveData();
    }
  }

  public verifyOtp(params: {
    phoneNumber: string;
    otpCode: string;
    purpose: OtpPurpose;
  }): {
    success: boolean;
    message: string;
    code?: 'INVALID' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'NOT_FOUND';
    user?: StoredUser;
  } {
    const active = this.data.otpVerifications
      .filter(
        (o) =>
          o.phoneNumber === params.phoneNumber &&
          o.purpose === params.purpose &&
          !o.verifiedAt &&
          !o.invalidatedAt
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!active) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'No active OTP found. Please request a new OTP.'
      };
    }

    if (new Date(active.expiresAt).getTime() < Date.now()) {
      active.invalidatedAt = new Date().toISOString();
      this.saveData();
      return {
        success: false,
        code: 'EXPIRED',
        message: 'OTP has expired (5-minute limit). Please resend a new OTP.'
      };
    }

    if (active.attempts >= OTP_MAX_ATTEMPTS) {
      active.invalidatedAt = new Date().toISOString();
      this.saveData();
      return {
        success: false,
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Maximum OTP verification attempts reached. Please request a new OTP.'
      };
    }

    active.attempts += 1;
    const candidateHash = hashOtp(params.otpCode.trim(), active.otpSalt);
    const matches = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(active.otpHash, 'hex')
    );

    if (!matches) {
      const remaining = OTP_MAX_ATTEMPTS - active.attempts;
      if (remaining <= 0) {
        active.invalidatedAt = new Date().toISOString();
      }
      this.saveData();
      return {
        success: false,
        code: remaining <= 0 ? 'TOO_MANY_ATTEMPTS' : 'INVALID',
        message:
          remaining > 0
            ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
            : 'Too many failed OTP attempts. Please request a new OTP.'
      };
    }

    // Mark single-use OTP verified
    const nowIso = new Date().toISOString();
    active.verifiedAt = nowIso;

    const user = this.findUserByPhone(params.phoneNumber);
    if (user && (params.purpose === 'REGISTRATION' || params.purpose === 'LOGIN_VERIFICATION')) {
      user.phoneVerified = true;
      user.accountStatus = 'ACTIVE';
      user.updatedAt = nowIso;
    }

    this.saveData();
    return {
      success: true,
      message: 'Mobile number verified successfully.',
      user
    };
  }

  // ==========================================
  // SAVED SCHEMES + REMINDER CONFIG
  // ==========================================

  public getSavedSchemes(userId: string): SavedSchemeItem[] {
    return this.data.savedSchemes
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  public saveScheme(
    userId: string,
    schemeId: string,
    options?: {
      userNotes?: string;
      reminderEnabled?: boolean;
      reminderDaysBefore?: number[];
      customDeadline?: string | null;
    }
  ): SavedSchemeItem {
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === schemeId);
    const schemeNameSnapshot = scheme?.nameEn || schemeId;
    const verifiedDeadline = scheme?.applicationDeadline ?? null;
    const deadlineVerified = Boolean(scheme?.deadlineVerified);

    const existing = this.data.savedSchemes.find(
      (s) => s.userId === userId && s.schemeId === schemeId
    );

    if (existing) {
      if (options?.userNotes !== undefined) existing.userNotes = options.userNotes;
      if (options?.reminderEnabled !== undefined) existing.reminderEnabled = options.reminderEnabled;
      if (options?.reminderDaysBefore !== undefined) {
        existing.reminderDaysBefore = options.reminderDaysBefore.filter((d) =>
          SUPPORTED_REMINDER_DAYS.includes(d as any)
        );
      }
      if (options?.customDeadline !== undefined) {
        existing.customDeadline = options.customDeadline;
      }
      this.saveData();
      this.runDeadlineReminderSweep(userId);
      return existing;
    }

    const effectiveDeadline = options?.customDeadline || verifiedDeadline;
    const item: SavedSchemeItem = {
      id: 'sv_' + crypto.randomUUID().slice(0, 12),
      userId,
      schemeId,
      schemeNameSnapshot,
      savedAt: new Date().toISOString(),
      applicationDeadline: verifiedDeadline,
      deadlineVerified,
      customDeadline: options?.customDeadline ?? null,
      reminderEnabled:
        options?.reminderEnabled !== undefined
          ? options.reminderEnabled
          : Boolean(effectiveDeadline),
      reminderDaysBefore: options?.reminderDaysBefore || [30, 7, 3, 1],
      lastReminderSentAt: null,
      reminderAcknowledgedAt: null,
      reminderDismissed: false,
      userNotes: options?.userNotes
    };

    this.data.savedSchemes.push(item);
    this.saveData();
    this.runDeadlineReminderSweep(userId);
    return item;
  }

  public updateSavedSchemeReminder(
    userId: string,
    schemeId: string,
    updates: {
      reminderEnabled?: boolean;
      reminderDaysBefore?: number[];
      customDeadline?: string | null;
      userNotes?: string;
      acknowledge?: boolean;
      dismiss?: boolean;
    }
  ): SavedSchemeItem | null {
    const item = this.data.savedSchemes.find(
      (s) => s.userId === userId && s.schemeId === schemeId
    );
    if (!item) return null;

    if (updates.reminderEnabled !== undefined) item.reminderEnabled = updates.reminderEnabled;
    if (updates.reminderDaysBefore !== undefined) {
      item.reminderDaysBefore = updates.reminderDaysBefore.filter((d) =>
        SUPPORTED_REMINDER_DAYS.includes(d as any)
      );
    }
    if (updates.customDeadline !== undefined) {
      item.customDeadline = updates.customDeadline;
      if (updates.customDeadline && updates.dismiss === undefined) {
        item.reminderDismissed = false;
      }
    }
    if (updates.userNotes !== undefined) item.userNotes = updates.userNotes;
    if (updates.acknowledge) {
      item.reminderAcknowledgedAt = new Date().toISOString();
    }
    if (updates.dismiss !== undefined) {
      item.reminderDismissed = updates.dismiss;
    }

    this.saveData();
    if (item.reminderEnabled && !item.reminderDismissed) {
      this.runDeadlineReminderSweep(userId);
    }
    return item;
  }

  public removeSavedScheme(userId: string, schemeId: string): boolean {
    const initLen = this.data.savedSchemes.length;
    this.data.savedSchemes = this.data.savedSchemes.filter(
      (s) => !(s.userId === userId && s.schemeId === schemeId)
    );
    const removed = this.data.savedSchemes.length < initLen;
    if (removed) this.saveData();
    return removed;
  }

  // ==========================================
  // NOTIFICATIONS & DEDUPLICATED DEADLINE REMINDERS
  // ==========================================

  public getNotifications(userId: string): AppNotification[] {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markNotificationRead(userId: string, notificationId: string): AppNotification | null {
    const notif = this.data.notifications.find(
      (n) => n.id === notificationId && n.userId === userId
    );
    if (!notif) return null;
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
    this.saveData();
    return notif;
  }

  public markAllNotificationsRead(userId: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const n of this.data.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
        count += 1;
      }
    }
    if (count > 0) this.saveData();
    return count;
  }

  /**
   * Evaluates all saved schemes with a verified or user-confirmed deadline,
   * creating persistent in-app notifications without ever repeating the same
   * (userId, schemeId, deadlineDate, thresholdDays) reminder.
   * Returns newly generated notifications plus any SMS reminder dispatch tasks.
   */
  public runDeadlineReminderSweep(targetUserId?: string): Array<{
    notification: AppNotification;
    smsEligibleUser?: StoredUser;
    deadlineDate: string;
    remainingDays: number;
  }> {
    const generated: Array<{
      notification: AppNotification;
      smsEligibleUser?: StoredUser;
      deadlineDate: string;
      remainingDays: number;
    }> = [];

    const candidates = targetUserId
      ? this.data.savedSchemes.filter((s) => s.userId === targetUserId)
      : this.data.savedSchemes;

    for (const saved of candidates) {
      const user = this.findUserById(saved.userId);
      if (!user) continue;

      const scheme = VERIFIED_SCHEMES.find((sc) => sc.id === saved.schemeId);
      // Strict requirement: do not send reminders unless a verified deadline or user-confirmed date exists
      const effectiveDeadline = saved.deadlineVerified
        ? saved.applicationDeadline
        : saved.customDeadline || null;

      if (!effectiveDeadline) continue;

      const dispatchedThresholds = this.data.reminderDispatchLogs
        .filter(
          (log) =>
            log.userId === saved.userId &&
            log.schemeId === saved.schemeId &&
            log.deadlineDate === effectiveDeadline &&
            log.channel === 'IN_APP'
        )
        .map((log) => log.thresholdDays);

      const dueThreshold = findDueReminderThreshold({
        deadlineIso: effectiveDeadline,
        reminderEnabled: saved.reminderEnabled,
        reminderDismissed: saved.reminderDismissed,
        reminderDaysBefore: saved.reminderDaysBefore || [30, 7, 3, 1],
        dispatchedThresholds,
        timezone: user.timezone || 'Asia/Kolkata'
      });

      if (dueThreshold === null) continue;

      const evalStatus = evaluateDeadlineStatus(effectiveDeadline, user.timezone || 'Asia/Kolkata');
      if (!evalStatus.hasDeadline || evalStatus.remainingDays === null || evalStatus.remainingDays < 0) {
        continue;
      }

      const schemeNameEn = scheme?.nameEn || saved.schemeNameSnapshot;
      const schemeNameKn = scheme?.nameKn || saved.schemeNameSnapshot;
      const nowIso = new Date().toISOString();

      const notification: AppNotification = {
        id: 'ntf_' + crypto.randomUUID().slice(0, 12),
        userId: user.id,
        schemeId: saved.schemeId,
        schemeNameSnapshot: schemeNameEn,
        titleEn:
          evalStatus.remainingDays <= 3
            ? `Urgent Deadline: ${schemeNameEn}`
            : `Upcoming Deadline (${evalStatus.remainingDays} days left): ${schemeNameEn}`,
        titleKn:
          evalStatus.remainingDays <= 3
            ? `ತುರ್ತು ಕೊನೆಯ ದಿನಾಂಕ: ${schemeNameKn}`
            : `ಸಮೀಪಿಸುತ್ತಿರುವ ಕೊನೆಯ ದಿನಾಂಕ (${evalStatus.remainingDays} ದಿನ ಬಾಕಿ): ${schemeNameKn}`,
        messageEn: `Application deadline is ${effectiveDeadline} (${evalStatus.remainingDays} day(s) remaining). Open your readiness checklist to prepare documents.`,
        messageKn: `ಅರ್ಜಿ ಸಲ್ಲಿಕೆ ಕೊನೆಯ ದಿನಾಂಕ ${effectiveDeadline} (${evalStatus.remainingDays} ದಿನ ಬಾಕಿ ಇದೆ). ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಪಟ್ಟಿಯನ್ನು ಸಿದ್ಧಪಡಿಸಿ.`,
        type: 'DEADLINE_REMINDER',
        urgency: evalStatus.urgency === 'NONE' ? undefined : evalStatus.urgency,
        thresholdDays: dueThreshold,
        isRead: false,
        createdAt: nowIso,
        readAt: null
      };

      this.data.notifications.push(notification);
      this.data.reminderDispatchLogs.push({
        id: 'rlog_' + crypto.randomUUID().slice(0, 12),
        userId: user.id,
        schemeId: saved.schemeId,
        deadlineDate: effectiveDeadline,
        thresholdDays: dueThreshold,
        channel: 'IN_APP',
        sentAt: nowIso
      });
      saved.lastReminderSentAt = nowIso;

      generated.push({
        notification,
        smsEligibleUser: user.smsRemindersEnabled && user.phoneVerified ? user : undefined,
        deadlineDate: effectiveDeadline,
        remainingDays: evalStatus.remainingDays
      });
    }

    if (generated.length > 0) {
      this.saveData();
    }

    return generated;
  }

  public hasSmsReminderBeenDispatched(
    userId: string,
    schemeId: string,
    deadlineDate: string,
    thresholdDays: number
  ): boolean {
    return this.data.reminderDispatchLogs.some(
      (l) =>
        l.userId === userId &&
        l.schemeId === schemeId &&
        l.deadlineDate === deadlineDate &&
        l.thresholdDays === thresholdDays &&
        l.channel === 'SMS'
    );
  }

  public recordSmsReminderDispatched(
    userId: string,
    schemeId: string,
    deadlineDate: string,
    thresholdDays: number
  ): void {
    this.data.reminderDispatchLogs.push({
      id: 'rlog_' + crypto.randomUUID().slice(0, 12),
      userId,
      schemeId,
      deadlineDate,
      thresholdDays,
      channel: 'SMS',
      sentAt: new Date().toISOString()
    });
    this.saveData();
  }

  // ==========================================
  // APPLICATIONS
  // ==========================================

  public getApplications(userId: string): ApplicationRecordItem[] {
    return this.data.applications
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getApplicationById(id: string): ApplicationRecordItem | null {
    return this.data.applications.find((a) => a.id === id) || null;
  }

  public createApplication(params: {
    userId: string;
    schemeId: string;
    schemeNameSnapshot?: string;
    status?: ApplicationStatus;
    notes?: string;
    applicationDate?: string;
    appliedThroughPortal?: string;
    acknowledgementNumber?: string;
    readinessSnapshot?: ApplicationRecordItem['readinessSnapshot'];
    eligibilitySnapshot?: ApplicationRecordItem['eligibilitySnapshot'];
  }): ApplicationRecordItem {
    const now = new Date().toISOString();
    const initialStatus = params.status || 'INTERESTED';
    const appId = 'app_' + crypto.randomUUID().slice(0, 12);
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === params.schemeId);

    const initialTimeline: ApplicationTimelineItem[] = [
      {
        id: 'time_' + crypto.randomUUID().slice(0, 8),
        applicationId: appId,
        status: initialStatus,
        note: params.notes || 'Application tracked in Kisan Scheme Saathi',
        timestamp: now
      }
    ];

    const application: ApplicationRecordItem = {
      id: appId,
      userId: params.userId,
      schemeId: params.schemeId,
      schemeNameSnapshot: params.schemeNameSnapshot || scheme?.nameEn || params.schemeId,
      status: initialStatus,
      applicationDate: params.applicationDate || now,
      appliedThroughPortal: params.appliedThroughPortal,
      acknowledgementNumber: params.acknowledgementNumber,
      notes: params.notes,
      readinessSnapshot: params.readinessSnapshot,
      eligibilitySnapshot: params.eligibilitySnapshot,
      createdAt: now,
      updatedAt: now,
      timeline: initialTimeline
    };

    this.data.applications.push(application);
    this.saveData();
    return application;
  }

  public updateApplication(
    id: string,
    userId: string,
    updates: {
      status?: ApplicationStatus;
      notes?: string;
      applicationDate?: string;
      appliedThroughPortal?: string;
      acknowledgementNumber?: string;
      timelineNote?: string;
      readinessSnapshot?: ApplicationRecordItem['readinessSnapshot'];
      eligibilitySnapshot?: ApplicationRecordItem['eligibilitySnapshot'];
    }
  ): ApplicationRecordItem | null {
    const application = this.data.applications.find((a) => a.id === id && a.userId === userId);
    if (!application) return null;

    const now = new Date().toISOString();
    const statusChanged = updates.status && updates.status !== application.status;

    if (updates.status) application.status = updates.status;
    if (updates.notes !== undefined) application.notes = updates.notes;
    if (updates.applicationDate !== undefined) application.applicationDate = updates.applicationDate;
    if (updates.appliedThroughPortal !== undefined) {
      application.appliedThroughPortal = updates.appliedThroughPortal;
    }
    if (updates.acknowledgementNumber !== undefined) {
      application.acknowledgementNumber = updates.acknowledgementNumber;
    }
    if (updates.readinessSnapshot !== undefined) {
      application.readinessSnapshot = updates.readinessSnapshot;
    }
    if (updates.eligibilitySnapshot !== undefined) {
      application.eligibilitySnapshot = updates.eligibilitySnapshot;
    }

    if (statusChanged || updates.timelineNote) {
      application.timeline.push({
        id: 'time_' + crypto.randomUUID().slice(0, 8),
        applicationId: application.id,
        status: application.status,
        note: updates.timelineNote || `Status updated to ${application.status}`,
        timestamp: now
      });
    }

    application.updatedAt = now;
    this.saveData();
    return application;
  }

  public deleteApplication(id: string, userId: string): boolean {
    const initLen = this.data.applications.length;
    this.data.applications = this.data.applications.filter(
      (a) => !(a.id === id && a.userId === userId)
    );
    const removed = this.data.applications.length < initLen;
    if (removed) this.saveData();
    return removed;
  }
}

export const dbStore = new AppDatabase();
