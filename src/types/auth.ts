export type ApplicationStatus =
  | 'INTERESTED'
  | 'PREPARING'
  | 'READY_TO_APPLY'
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION'
  | 'WITHDRAWN';

export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED';

export type OtpPurpose = 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET';

export interface User {
  id: string;
  username: string;
  fullName: string;
  phoneNumber: string; // Stored strictly in E.164 (+91XXXXXXXXXX)
  phoneVerified: boolean;
  preferredLanguage: 'en' | 'kn';
  district?: string;
  timezone: string; // Defaults to 'Asia/Kolkata'
  smsRemindersEnabled: boolean;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface OtpDispatchResponse {
  success: boolean;
  otpRequired: boolean;
  phoneNumberMasked: string;
  phoneNumber: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  smsDelivered: boolean;
  smsConfigured: boolean;
  smsProvider: string;
  message: string;
}

export interface SavedSchemeItem {
  id: string;
  userId: string;
  schemeId: string;
  schemeNameSnapshot: string;
  savedAt: string;
  applicationDeadline: string | null;
  deadlineVerified: boolean;
  customDeadline?: string | null;
  reminderEnabled: boolean;
  reminderDaysBefore: number[]; // Supported: [30, 7, 3, 1]
  lastReminderSentAt?: string | null;
  reminderAcknowledgedAt?: string | null;
  reminderDismissed?: boolean;
  userNotes?: string;
}

export interface ApplicationTimelineItem {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  note?: string;
  timestamp: string;
}

export interface ApplicationRecordItem {
  id: string;
  userId: string;
  schemeId: string;
  schemeNameSnapshot: string;
  status: ApplicationStatus;
  applicationDate?: string;
  acknowledgementNumber?: string;
  appliedThroughPortal?: string;
  notes?: string;
  readinessSnapshot?: {
    readyCount: number;
    totalMandatory: number;
    percentage: number;
  };
  eligibilitySnapshot?: {
    status: 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'NOT_ELIGIBLE';
    evaluatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  timeline: ApplicationTimelineItem[];
}

export type NotificationType = 'DEADLINE_REMINDER' | 'SYSTEM' | 'APPLICATION_UPDATE';

export interface AppNotification {
  id: string;
  userId: string;
  schemeId?: string;
  schemeNameSnapshot?: string;
  titleEn: string;
  titleKn: string;
  messageEn: string;
  messageKn: string;
  type: NotificationType;
  urgency?: 'FAR' | 'APPROACHING' | 'URGENT' | 'EXPIRED';
  thresholdDays?: number;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}
