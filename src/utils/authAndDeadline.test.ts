import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIndianPhone,
  validateUsername,
  parseLoginIdentifier
} from './phoneUtils';
import {
  calculateRemainingDays,
  evaluateDeadlineStatus,
  findDueReminderThreshold
} from './deadlineUtils';

test('Phone validation normalizes valid Indian mobile numbers to E.164 (+91XXXXXXXXXX)', () => {
  assert.equal(normalizeIndianPhone('9845012345').e164, '+919845012345');
  assert.equal(normalizeIndianPhone('09845012345').e164, '+919845012345');
  assert.equal(normalizeIndianPhone('+91 98450 12345').e164, '+919845012345');
  assert.equal(normalizeIndianPhone('91-9845012345').e164, '+919845012345');
  assert.equal(normalizeIndianPhone('6789012345').valid, true);
});

test('Phone validation rejects invalid, short, or non-Indian numbers', () => {
  assert.equal(normalizeIndianPhone('1234567890').valid, false); // starts with 1
  assert.equal(normalizeIndianPhone('5845012345').valid, false); // starts with 5
  assert.equal(normalizeIndianPhone('98450123').valid, false); // too short
  assert.equal(normalizeIndianPhone('+14155552671').valid, false); // non-Indian prefix
  assert.equal(normalizeIndianPhone('abcd123456').valid, false); // letters
});

test('Username validator accepts valid farmer usernames and rejects invalid ones', () => {
  assert.deepEqual(validateUsername('Basavaraj_Patil'), { valid: true, normalized: 'basavaraj_patil' });
  assert.equal(validateUsername('ab').valid, false); // too short
  assert.equal(validateUsername('bad user!').valid, false); // spaces/bang
});

test('Login identifier parser distinguishes username vs Indian phone number', () => {
  assert.deepEqual(parseLoginIdentifier('9845012345'), {
    type: 'phone',
    normalizedValue: '+919845012345'
  });
  assert.deepEqual(parseLoginIdentifier('basavaraj_patil'), {
    type: 'username',
    normalizedValue: 'basavaraj_patil'
  });
});

test('Deadline calculation computes accurate remaining days and urgency states in Asia/Kolkata', () => {
  const ref = new Date('2026-11-13T05:00:00.000Z'); // 10:30 AM IST on 2026-11-13
  assert.equal(calculateRemainingDays('2026-11-15', 'Asia/Kolkata', ref), 2);
  assert.equal(evaluateDeadlineStatus('2026-11-15', 'Asia/Kolkata', ref).urgency, 'URGENT');
  assert.equal(evaluateDeadlineStatus('2026-11-20', 'Asia/Kolkata', ref).urgency, 'APPROACHING');
  assert.equal(evaluateDeadlineStatus('2026-12-15', 'Asia/Kolkata', ref).urgency, 'FAR');
  assert.equal(evaluateDeadlineStatus('2026-11-10', 'Asia/Kolkata', ref).urgency, 'EXPIRED');
  assert.equal(evaluateDeadlineStatus(null, 'Asia/Kolkata', ref).urgency, 'NONE');
});

test('Reminder scheduler triggers tightest due threshold and prevents duplicate sends', () => {
  const ref = new Date('2026-11-13T05:00:00.000Z');
  // 2 days away: 3-day threshold should fire if not yet dispatched
  const due1 = findDueReminderThreshold({
    deadlineIso: '2026-11-15',
    reminderEnabled: true,
    reminderDaysBefore: [30, 7, 3, 1],
    dispatchedThresholds: [30, 7],
    referenceDate: ref
  });
  assert.equal(due1, 3);

  // If threshold 3 was already dispatched and 2 days remain (not <=1), nothing should re-fire
  const due2 = findDueReminderThreshold({
    deadlineIso: '2026-11-15',
    reminderEnabled: true,
    reminderDaysBefore: [30, 7, 3, 1],
    dispatchedThresholds: [30, 7, 3],
    referenceDate: ref
  });
  assert.equal(due2, null);

  // Disabled reminders or missing verified deadlines never fire
  assert.equal(
    findDueReminderThreshold({
      deadlineIso: '2026-11-15',
      reminderEnabled: false,
      reminderDaysBefore: [3],
      dispatchedThresholds: [],
      referenceDate: ref
    }),
    null
  );
  assert.equal(
    findDueReminderThreshold({
      deadlineIso: null,
      reminderEnabled: true,
      reminderDaysBefore: [3],
      dispatchedThresholds: [],
      referenceDate: ref
    }),
    null
  );
});
