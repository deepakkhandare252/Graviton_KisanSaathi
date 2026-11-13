import { apiClient } from './api';
import { authService } from './authService';
import { SavedSchemeWithDetails, savedSchemeService } from './savedSchemeService';
import { DeadlineEvaluation } from '../utils/deadlineUtils';

export interface UpcomingReminderItem extends SavedSchemeWithDetails {
  effectiveDeadline: string | null;
  deadlineStatus: DeadlineEvaluation;
}

export const reminderService = {
  async getUpcomingDeadlines(): Promise<{ timezone: string; reminders: UpcomingReminderItem[]; total: number }> {
    const token = authService.getToken();
    if (!token) {
      const guestSaved = await savedSchemeService.getSavedSchemes();
      const reminders = guestSaved
        .filter((item) => item.deadlineStatus?.hasDeadline && !item.reminderDismissed)
        .map((item) => ({
          ...item,
          effectiveDeadline: item.deadlineVerified ? item.applicationDeadline : item.customDeadline || null,
          deadlineStatus: item.deadlineStatus!
        }))
        .sort((a, b) => (a.deadlineStatus.remainingDays ?? 9999) - (b.deadlineStatus.remainingDays ?? 9999));

      return {
        timezone: 'Asia/Kolkata',
        reminders,
        total: reminders.length
      };
    }

    const { data } = await apiClient.get<{
      timezone: string;
      reminders: UpcomingReminderItem[];
      total: number;
    }>('/reminders/upcoming');
    return data;
  },

  async acknowledgeReminder(schemeId: string): Promise<void> {
    if (!authService.getToken()) {
      await savedSchemeService.updateReminderSettings(schemeId, { acknowledge: true });
      return;
    }
    await apiClient.post(`/reminders/${schemeId}/acknowledge`);
  },

  async dismissReminder(schemeId: string, dismiss: boolean = true): Promise<void> {
    if (!authService.getToken()) {
      await savedSchemeService.updateReminderSettings(schemeId, { dismiss });
      return;
    }
    await apiClient.post(`/reminders/${schemeId}/dismiss`, { dismiss });
  }
};
