/**
 * Deadline Calculation & Reminder Interval Utilities (Asia/Kolkata Default)
 *
 * Ensures zero fabricated deadlines: schemes without a verified or user-confirmed
 * deadline return null metrics and never dispatch automated reminders.
 */

export type DeadlineUrgency = 'NONE' | 'FAR' | 'APPROACHING' | 'URGENT' | 'EXPIRED';

export const SUPPORTED_REMINDER_DAYS = [30, 7, 3, 1] as const;

export interface DeadlineEvaluation {
  hasDeadline: boolean;
  deadlineIso: string | null;
  remainingDays: number | null;
  urgency: DeadlineUrgency;
  statusLabelEn: string;
  statusLabelKn: string;
  badgeColorClass: string;
}

/**
 * Returns the YYYY-MM-DD calendar date in the user's timezone (defaults to Asia/Kolkata).
 */
export function getTodayDateStringInTimezone(
  timezone = 'Asia/Kolkata',
  referenceDate: Date = new Date()
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(referenceDate); // YYYY-MM-DD
}

/**
 * Parses an ISO date string (YYYY-MM-DD or full ISO timestamp) into YYYY-MM-DD.
 */
export function toDateOnlyString(dateInput?: string | null): string | null {
  if (!dateInput) return null;
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/**
 * Calculates calendar-day difference (deadlineDate - todayDate) in Asia/Kolkata.
 */
export function calculateRemainingDays(
  deadlineIso?: string | null,
  timezone = 'Asia/Kolkata',
  referenceDate: Date = new Date()
): number | null {
  const deadlineDateStr = toDateOnlyString(deadlineIso);
  if (!deadlineDateStr) return null;

  const todayStr = getTodayDateStringInTimezone(timezone, referenceDate);
  const [dy, dm, dd] = deadlineDateStr.split('-').map(Number);
  const [ty, tm, td] = todayStr.split('-').map(Number);

  const deadlineUtcMs = Date.UTC(dy, dm - 1, dd);
  const todayUtcMs = Date.UTC(ty, tm - 1, td);
  return Math.round((deadlineUtcMs - todayUtcMs) / (24 * 60 * 60 * 1000));
}

/**
 * Evaluates a deadline into structured visual state (Green / Amber / Red)
 * with explicit readable labels (never color alone).
 */
export function evaluateDeadlineStatus(
  deadlineIso?: string | null,
  timezone = 'Asia/Kolkata',
  referenceDate: Date = new Date()
): DeadlineEvaluation {
  const cleanDate = toDateOnlyString(deadlineIso);
  const remainingDays = calculateRemainingDays(cleanDate, timezone, referenceDate);

  if (!cleanDate || remainingDays === null) {
    return {
      hasDeadline: false,
      deadlineIso: null,
      remainingDays: null,
      urgency: 'NONE',
      statusLabelEn: 'Rolling / No Fixed Cutoff',
      statusLabelKn: 'ವರ್ಷಪೂರ್ತಿ ಮುಕ್ತ (ನಿಗದಿತ ಕೊನೆಯ ದಿನಾಂಕವಿಲ್ಲ)',
      badgeColorClass: 'bg-slate-100 text-slate-700 border-slate-300'
    };
  }

  if (remainingDays < 0) {
    return {
      hasDeadline: true,
      deadlineIso: cleanDate,
      remainingDays,
      urgency: 'EXPIRED',
      statusLabelEn: 'Deadline Passed',
      statusLabelKn: 'ಕೊನೆಯ ದಿನಾಂಕ ಮುಗಿದಿದೆ',
      badgeColorClass: 'bg-rose-100 text-rose-900 border-rose-300'
    };
  }

  if (remainingDays <= 3) {
    return {
      hasDeadline: true,
      deadlineIso: cleanDate,
      remainingDays,
      urgency: 'URGENT',
      statusLabelEn: remainingDays === 0 ? 'Due Today' : 'Urgent — Very Close',
      statusLabelKn: remainingDays === 0 ? 'ಇಂದೇ ಕೊನೆಯ ದಿನ' : 'ತುರ್ತು — ಅತಿ ಸಮೀಪದಲ್ಲಿದೆ',
      badgeColorClass: 'bg-rose-100 text-rose-900 border-rose-300'
    };
  }

  if (remainingDays <= 14) {
    return {
      hasDeadline: true,
      deadlineIso: cleanDate,
      remainingDays,
      urgency: 'APPROACHING',
      statusLabelEn: 'Deadline Approaching',
      statusLabelKn: 'ಕೊನೆಯ ದಿನಾಂಕ ಸಮೀಪಿಸುತ್ತಿದೆ',
      badgeColorClass: 'bg-amber-100 text-amber-900 border-amber-300'
    };
  }

  return {
    hasDeadline: true,
    deadlineIso: cleanDate,
    remainingDays,
    urgency: 'FAR',
    statusLabelEn: 'On Track — Ample Time',
    statusLabelKn: 'ಸಮಯವಿದೆ (ಮುಂದಿದೆ)',
    badgeColorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  };
}

/**
 * Determines which configured reminder milestone (30, 7, 3, or 1 day) is due right now
 * without repeating an already-dispatched threshold for the same deadline date.
 */
export function findDueReminderThreshold(params: {
  deadlineIso?: string | null;
  reminderEnabled: boolean;
  reminderDismissed?: boolean;
  reminderDaysBefore: number[];
  dispatchedThresholds: number[]; // thresholds already logged for this user+scheme+deadline
  timezone?: string;
  referenceDate?: Date;
}): number | null {
  if (!params.reminderEnabled || params.reminderDismissed) return null;
  if (!params.deadlineIso) return null;

  const remainingDays = calculateRemainingDays(
    params.deadlineIso,
    params.timezone || 'Asia/Kolkata',
    params.referenceDate
  );

  if (remainingDays === null || remainingDays < 0) return null;

  // Sort thresholds ascending (1, 3, 7, 30) and pick the tightest matched threshold not yet dispatched
  // Never backfill a looser threshold (e.g. 7d or 30d) after a tighter threshold (e.g. 3d) was already sent.
  const minDispatched =
    params.dispatchedThresholds.length > 0 ? Math.min(...params.dispatchedThresholds) : Infinity;

  const sortedThresholds = [...params.reminderDaysBefore]
    .filter((d) => SUPPORTED_REMINDER_DAYS.includes(d as any))
    .sort((a, b) => a - b);

  for (const threshold of sortedThresholds) {
    if (
      remainingDays <= threshold &&
      threshold < minDispatched &&
      !params.dispatchedThresholds.includes(threshold)
    ) {
      return threshold;
    }
  }

  return null;
}
