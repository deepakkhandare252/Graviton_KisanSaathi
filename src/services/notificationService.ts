import { apiClient } from './api';
import { authService } from './authService';
import { AppNotification } from '../types/auth';

export const notificationService = {
  async getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    if (!authService.getToken()) {
      return { notifications: [], unreadCount: 0 };
    }
    const { data } = await apiClient.get<{ notifications: AppNotification[]; unreadCount: number }>(
      '/notifications'
    );
    return data;
  },

  async markAsRead(notificationId: string): Promise<AppNotification | null> {
    if (!authService.getToken()) return null;
    const { data } = await apiClient.patch<{ notification: AppNotification }>(
      `/notifications/${notificationId}/read`
    );
    return data.notification;
  },

  async markAllAsRead(): Promise<void> {
    if (!authService.getToken()) return;
    await apiClient.post('/notifications/read-all');
  }
};
