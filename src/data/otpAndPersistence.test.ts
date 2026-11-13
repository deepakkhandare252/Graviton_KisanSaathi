import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dbStore } from './dbStore';

const DB_FILE = path.resolve(process.cwd(), 'data', 'app-db.json');
let originalDbSnapshot: string | null = null;

before(() => {
  if (fs.existsSync(DB_FILE)) {
    originalDbSnapshot = fs.readFileSync(DB_FILE, 'utf-8');
  }
});

after(() => {
  if (originalDbSnapshot !== null) {
    fs.writeFileSync(DB_FILE, originalDbSnapshot, 'utf-8');
  }
});

test('OTP issuance stores only hashed OTP, enforces 5-attempt lockout, and invalidates prior OTP on resend', () => {
  const testPhone = '+919988776611';
  const pending = dbStore.upsertPendingRegistration({
    username: 'test_otp_farmer',
    fullName: 'Test Farmer OTP',
    phoneNumber: testPhone,
    password: 'Password@123',
    preferredLanguage: 'en',
    district: 'Dharwad'
  });

  assert.equal(pending.accountStatus, 'PENDING_VERIFICATION');
  assert.equal(pending.phoneVerified, false);

  const first = dbStore.issueOtp(testPhone, 'REGISTRATION');
  assert.match(first.otpCode, /^\d{6}$/);
  assert.equal(first.expiresInSeconds, 300);
  // Ensure raw OTP is NOT stored in record
  assert.notEqual(first.record.otpHash, first.otpCode);
  assert.equal((first.record as any).otpCode, undefined);

  // Re-issuing must invalidate the first OTP immediately
  const second = dbStore.issueOtp(testPhone, 'REGISTRATION');
  assert.match(second.otpCode, /^\d{6}$/);
  assert.ok(first.record.invalidatedAt !== null);

  // Ensure wrong code triggers attempt tracking and locks out on 5th failed try
  const wrongAttempts = [];
  const wrongCode = second.otpCode === '123456' ? '654321' : '123456';
  for (let i = 0; i < 5; i++) {
    wrongAttempts.push(
      dbStore.verifyOtp({
        phoneNumber: testPhone,
        otpCode: wrongCode,
        purpose: 'REGISTRATION'
      })
    );
  }
  assert.equal(wrongAttempts[0].code, 'INVALID');
  assert.equal(wrongAttempts[4].code, 'TOO_MANY_ATTEMPTS');

  // Even the valid second code is now locked out because max attempts were exhausted
  const lockedOut = dbStore.verifyOtp({
    phoneNumber: testPhone,
    otpCode: second.otpCode,
    purpose: 'REGISTRATION'
  });
  assert.equal(lockedOut.success, false);

  // Clean reissue activates pending user to ACTIVE
  const third = dbStore.issueOtp(testPhone, 'REGISTRATION');
  const verified = dbStore.verifyOtp({
    phoneNumber: testPhone,
    otpCode: third.otpCode,
    purpose: 'REGISTRATION'
  });
  assert.equal(verified.success, true);
  assert.equal(verified.user?.phoneVerified, true);
  assert.equal(verified.user?.accountStatus, 'ACTIVE');

  // Identifier lookup works by username OR spaced phone number
  assert.equal(dbStore.findUserByIdentifier('test_otp_farmer')?.id, pending.id);
  assert.equal(dbStore.findUserByIdentifier('99887 76611')?.id, pending.id);

  // Single-use: reusing the verified OTP fails
  const replay = dbStore.verifyOtp({
    phoneNumber: testPhone,
    otpCode: third.otpCode,
    purpose: 'REGISTRATION'
  });
  assert.equal(replay.success, false);
});

test('OTP rate limit enforces 60-second resend cooldown', () => {
  const testPhone = '+919988776622';
  dbStore.issueOtp(testPhone, 'PASSWORD_RESET');
  const rateCheck = dbStore.checkOtpRateLimits(testPhone, 'PASSWORD_RESET');
  assert.equal(rateCheck.allowed, false);
  assert.ok((rateCheck.retryAfterSeconds ?? 0) > 0);
});

test('Saved scheme deadlines generate deduplicated in-app notifications & applications enforce user ownership', () => {
  const testPhone = '+919988776633';
  const user = dbStore.upsertPendingRegistration({
    username: 'test_deadline_farmer',
    fullName: 'Deadline Farmer',
    phoneNumber: testPhone,
    password: 'Password@123'
  });
  const issued = dbStore.issueOtp(testPhone, 'REGISTRATION');
  dbStore.verifyOtp({ phoneNumber: testPhone, otpCode: issued.otpCode, purpose: 'REGISTRATION' });

  // Save rolling scheme without deadline -> generates zero reminder notifications
  const rollingSaved = dbStore.saveScheme(user.id, 'pm-kisan-raitha-siri', {
    userNotes: 'Open enrollment check'
  });
  assert.equal(rollingSaved.deadlineVerified, false);
  assert.equal(rollingSaved.applicationDeadline, null);

  // Save verified deadline scheme (ganga-kalyana has verified deadline) -> generates notification once
  const gangaSaved = dbStore.saveScheme(user.id, 'ganga-kalyana', {
    reminderEnabled: true,
    reminderDaysBefore: [30, 7, 3, 1]
  });
  assert.equal(gangaSaved.deadlineVerified, true);
  assert.equal(gangaSaved.schemeNameSnapshot.includes('Ganga Kalyana'), true);

  const notifsAfterFirst = dbStore.getNotifications(user.id);
  assert.equal(notifsAfterFirst.length, 1);

  // Re-running sweep must NOT duplicate the notification for the same threshold
  const secondSweep = dbStore.runDeadlineReminderSweep(user.id);
  assert.equal(secondSweep.length, 0);
  assert.equal(dbStore.getNotifications(user.id).length, 1);

  // Mark read works
  const marked = dbStore.markNotificationRead(user.id, notifsAfterFirst[0].id);
  assert.equal(marked?.isRead, true);

  // Application creation captures snapshot and enforces ownership
  const app = dbStore.createApplication({
    userId: user.id,
    schemeId: 'ganga-kalyana',
    status: 'PREPARING',
    readinessSnapshot: { readyCount: 2, totalMandatory: 4, percentage: 50 },
    eligibilitySnapshot: { status: 'ELIGIBLE', evaluatedAt: new Date().toISOString() }
  });
  assert.equal(app.readinessSnapshot?.percentage, 50);
  assert.equal(app.eligibilitySnapshot?.status, 'ELIGIBLE');

  // Another user cannot update or delete this user's application
  assert.equal(dbStore.updateApplication(app.id, 'usr_wrong_owner', { status: 'APPROVED' }), null);
  assert.equal(dbStore.deleteApplication(app.id, 'usr_wrong_owner'), false);

  // Owner can update & delete
  const updated = dbStore.updateApplication(app.id, user.id, {
    status: 'APPLIED',
    timelineNote: 'Submitted via RSK'
  });
  assert.equal(updated?.status, 'APPLIED');
  assert.equal(updated?.timeline.length, 2);
  assert.equal(dbStore.deleteApplication(app.id, user.id), true);
});
