import { apiClient } from './api';
import { authService } from './authService';
import { SavedSchemeItem } from '../types/auth';
import { Scheme } from '../types/scheme';
import { VERIFIED_SCHEMES } from '../data/schemesData';
import { DeadlineEvaluation, evaluateDeadlineStatus } from '../utils/deadlineUtils';

const GUEST_SAVED_KEY = 'kisan_guest_saved_schemes_v2';
const LEGACY_GUEST_KEY = 'kisan_guest_saved_schemes';

export interface SavedSchemeWithDetails extends SavedSchemeItem {
  scheme?: Scheme | null;
  deadlineStatus?: DeadlineEvaluation;
}

function loadGuestRecords(): SavedSchemeItem[] {
  try {
    const raw = localStorage.getItem(GUEST_SAVED_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const legacyRaw = localStorage.getItem(LEGACY_GUEST_KEY);
    if (legacyRaw) {
      const ids: string[] = JSON.parse(legacyRaw);
      return ids.map((id) => {
        const s = VERIFIED_SCHEMES.find((item) => item.id === id);
        return {
          id: `guest_${id}`,
          userId: 'guest',
          schemeId: id,
          schemeNameSnapshot: s?.nameEn || id,
          savedAt: new Date().toISOString(),
          applicationDeadline: s?.applicationDeadline ?? null,
          deadlineVerified: Boolean(s?.deadlineVerified),
          reminderEnabled: Boolean(s?.applicationDeadline),
          reminderDaysBefore: [30, 7, 3, 1]
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

function saveGuestRecords(records: SavedSchemeItem[]): void {
  try {
    localStorage.setItem(GUEST_SAVED_KEY, JSON.stringify(records));
    localStorage.setItem(LEGACY_GUEST_KEY, JSON.stringify(records.map((r) => r.schemeId)));
  } catch (e) {
    console.warn('Failed to cache guest saved schemes:', e);
  }
}

function enrichGuest(records: SavedSchemeItem[]): SavedSchemeWithDetails[] {
  return records.map((item) => {
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === item.schemeId) || null;
    const effective = item.deadlineVerified ? item.applicationDeadline : item.customDeadline || null;
    return {
      ...item,
      scheme,
      deadlineStatus: evaluateDeadlineStatus(effective, 'Asia/Kolkata')
    };
  });
}

export const savedSchemeService = {
  async getSavedSchemes(): Promise<SavedSchemeWithDetails[]> {
    const token = authService.getToken();
    if (!token) {
      return enrichGuest(loadGuestRecords());
    }

    // Security guarantee: when authenticated, NEVER silently fall back to un-scoped guest storage
    const { data } = await apiClient.get<{ savedSchemes: SavedSchemeWithDetails[] }>('/saved-schemes');
    return data.savedSchemes || [];
  },

  async saveScheme(
    schemeId: string,
    options?: {
      userNotes?: string;
      reminderEnabled?: boolean;
      reminderDaysBefore?: number[];
      customDeadline?: string | null;
    }
  ): Promise<SavedSchemeWithDetails | null> {
    const token = authService.getToken();
    if (!token) {
      const scheme = VERIFIED_SCHEMES.find((s) => s.id === schemeId);
      const existingGuest = loadGuestRecords();
      if (!existingGuest.some((r) => r.schemeId === schemeId)) {
        const next: SavedSchemeItem = {
          id: `guest_${schemeId}`,
          userId: 'guest',
          schemeId,
          schemeNameSnapshot: scheme?.nameEn || schemeId,
          savedAt: new Date().toISOString(),
          applicationDeadline: scheme?.applicationDeadline ?? null,
          deadlineVerified: Boolean(scheme?.deadlineVerified),
          customDeadline: options?.customDeadline ?? null,
          reminderEnabled: options?.reminderEnabled ?? Boolean(scheme?.applicationDeadline),
          reminderDaysBefore: options?.reminderDaysBefore ?? [30, 7, 3, 1],
          userNotes: options?.userNotes
        };
        saveGuestRecords([next, ...existingGuest]);
      }
      return enrichGuest(loadGuestRecords()).find((r) => r.schemeId === schemeId) || null;
    }

    const { data } = await apiClient.post<SavedSchemeWithDetails>('/saved-schemes', {
      schemeId,
      userNotes: options?.userNotes,
      reminderEnabled: options?.reminderEnabled,
      reminderDaysBefore: options?.reminderDaysBefore,
      customDeadline: options?.customDeadline
    });
    return data;
  },

  async updateReminderSettings(
    schemeId: string,
    updates: {
      reminderEnabled?: boolean;
      reminderDaysBefore?: number[];
      customDeadline?: string | null;
      userNotes?: string;
      acknowledge?: boolean;
      dismiss?: boolean;
    }
  ): Promise<SavedSchemeWithDetails | null> {
    const token = authService.getToken();

    if (!token) {
      const guest = loadGuestRecords();
      const idx = guest.findIndex((r) => r.schemeId === schemeId);
      if (idx >= 0) {
        const cur = guest[idx];
        guest[idx] = {
          ...cur,
          reminderEnabled: updates.reminderEnabled ?? cur.reminderEnabled,
          reminderDaysBefore: updates.reminderDaysBefore ?? cur.reminderDaysBefore,
          customDeadline: updates.customDeadline !== undefined ? updates.customDeadline : cur.customDeadline,
          userNotes: updates.userNotes !== undefined ? updates.userNotes : cur.userNotes,
          reminderAcknowledgedAt: updates.acknowledge ? new Date().toISOString() : cur.reminderAcknowledgedAt,
          reminderDismissed: updates.dismiss !== undefined ? updates.dismiss : cur.reminderDismissed
        };
        saveGuestRecords(guest);
      }
      return enrichGuest(loadGuestRecords()).find((r) => r.schemeId === schemeId) || null;
    }

    const { data } = await apiClient.patch<SavedSchemeWithDetails>(
      `/saved-schemes/${schemeId}/reminder`,
      updates
    );
    return data;
  },

  async removeSavedScheme(schemeId: string): Promise<void> {
    const token = authService.getToken();
    if (!token) {
      saveGuestRecords(loadGuestRecords().filter((r) => r.schemeId !== schemeId));
      return;
    }

    await apiClient.delete(`/saved-schemes/${schemeId}`);
  }
};
