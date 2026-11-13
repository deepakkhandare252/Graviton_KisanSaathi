import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  AuthResponse,
  OtpDispatchResponse,
  OtpPurpose,
  AppNotification
} from '../types/auth';
import { authService } from '../services/authService';
import { onUnauthorizedSession } from '../services/api';
import { savedSchemeService, SavedSchemeWithDetails } from '../services/savedSchemeService';
import { notificationService } from '../services/notificationService';
import { reminderService, UpcomingReminderItem } from '../services/reminderService';
import { clearPrivateUserCaches, queryKeys } from '../lib/queryClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedSchemeIds: Set<string>;
  savedSchemes: SavedSchemeWithDetails[];
  notifications: AppNotification[];
  unreadCount: number;
  upcomingReminders: UpcomingReminderItem[];
  isSchemeSaved: (schemeId: string) => boolean;
  toggleSaveScheme: (schemeId: string) => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<AuthResponse>;
  register: (params: {
    username: string;
    fullName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
    preferredLanguage?: 'en' | 'kn';
    district?: string;
  }) => Promise<OtpDispatchResponse>;
  verifyOtp: (params: {
    phoneNumber: string;
    otpCode: string;
    purpose?: OtpPurpose;
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshSavedSchemes: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(authService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedSchemes, setSavedSchemes] = useState<SavedSchemeWithDetails[]>([]);
  const [savedSchemeIds, setSavedSchemeIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [upcomingReminders, setUpcomingReminders] = useState<UpcomingReminderItem[]>([]);
  const lastUserIdRef = useRef<string | null>(null);

  const activeUserKey = user?.id && token ? user.id : 'guest';

  const refreshSavedSchemes = useCallback(async () => {
    try {
      const items = await savedSchemeService.getSavedSchemes();
      setSavedSchemes(items);
      setSavedSchemeIds(new Set(items.map((i) => i.schemeId)));
      qc.setQueryData(queryKeys.savedSchemes(activeUserKey), items);
    } catch (e) {
      console.warn('Failed to load saved schemes:', e);
    }
  }, [qc, activeUserKey]);

  const refreshNotifications = useCallback(async () => {
    if (!authService.getToken()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      qc.setQueryData(queryKeys.notifications(activeUserKey), data);
    } catch {
      // ignore transient network failures
    }
  }, [qc, activeUserKey]);

  const refreshReminders = useCallback(async () => {
    try {
      const data = await reminderService.getUpcomingDeadlines();
      setUpcomingReminders(data.reminders || []);
      qc.setQueryData(queryKeys.reminders(activeUserKey), data);
    } catch {
      setUpcomingReminders([]);
    }
  }, [qc, activeUserKey]);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authService.getCurrentUser();
      if (lastUserIdRef.current && current?.id && lastUserIdRef.current !== current.id) {
        clearPrivateUserCaches(qc);
      }
      lastUserIdRef.current = current?.id || null;
      setUser(current);
      setToken(authService.getToken());
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [qc]);

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      await Promise.all([refreshSavedSchemes(), refreshNotifications(), refreshReminders()]);
    };
    init();
  }, [refreshUser, refreshSavedSchemes, refreshNotifications, refreshReminders]);

  useEffect(() => {
    const unsub = onUnauthorizedSession(() => {
      lastUserIdRef.current = null;
      setUser(null);
      setToken(null);
      setSavedSchemes([]);
      setSavedSchemeIds(new Set());
      setNotifications([]);
      setUnreadCount(0);
      setUpcomingReminders([]);
      clearPrivateUserCaches(qc);
    });
    return unsub;
  }, [qc]);

  const login = async (identifier: string, password: string) => {
    clearPrivateUserCaches(qc);
    const res = await authService.login(identifier, password);
    lastUserIdRef.current = res.user.id;
    setUser(res.user);
    setToken(res.token);
    await Promise.all([refreshSavedSchemes(), refreshNotifications(), refreshReminders()]);
    qc.invalidateQueries({ queryKey: queryKeys.applications(res.user.id) });
    return res;
  };

  const register = async (params: {
    username: string;
    fullName: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
    preferredLanguage?: 'en' | 'kn';
    district?: string;
  }) => {
    return authService.register(params);
  };

  const verifyOtp = async (params: {
    phoneNumber: string;
    otpCode: string;
    purpose?: OtpPurpose;
  }) => {
    clearPrivateUserCaches(qc);
    const res = await authService.verifyOtp(params);
    if (res.token && res.user) {
      lastUserIdRef.current = res.user.id;
      setUser(res.user);
      setToken(res.token);
      await Promise.all([refreshSavedSchemes(), refreshNotifications(), refreshReminders()]);
      qc.invalidateQueries({ queryKey: queryKeys.applications(res.user.id) });
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    lastUserIdRef.current = null;
    setUser(null);
    setToken(null);
    setSavedSchemes([]);
    setSavedSchemeIds(new Set());
    setNotifications([]);
    setUnreadCount(0);
    setUpcomingReminders([]);
    clearPrivateUserCaches(qc);
    await Promise.all([refreshSavedSchemes(), refreshReminders()]);
  };

  const isSchemeSaved = (schemeId: string) => savedSchemeIds.has(schemeId);

  const toggleSaveScheme = async (schemeId: string): Promise<boolean> => {
    const isCurrentlySaved = savedSchemeIds.has(schemeId);
    const updated = new Set(savedSchemeIds);

    if (isCurrentlySaved) {
      updated.delete(schemeId);
      setSavedSchemeIds(updated);
      try {
        await savedSchemeService.removeSavedScheme(schemeId);
      } catch (err) {
        updated.add(schemeId);
        setSavedSchemeIds(new Set(updated));
        throw err;
      }
      await Promise.all([refreshSavedSchemes(), refreshReminders()]);
      qc.invalidateQueries({ queryKey: queryKeys.savedSchemes(activeUserKey) });
      qc.invalidateQueries({ queryKey: queryKeys.reminders(activeUserKey) });
      return false;
    } else {
      updated.add(schemeId);
      setSavedSchemeIds(updated);
      try {
        await savedSchemeService.saveScheme(schemeId);
      } catch (err) {
        updated.delete(schemeId);
        setSavedSchemeIds(new Set(updated));
        throw err;
      }
      await Promise.all([refreshSavedSchemes(), refreshNotifications(), refreshReminders()]);
      qc.invalidateQueries({ queryKey: queryKeys.savedSchemes(activeUserKey) });
      qc.invalidateQueries({ queryKey: queryKeys.notifications(activeUserKey) });
      qc.invalidateQueries({ queryKey: queryKeys.reminders(activeUserKey) });
      return true;
    }
  };

  const markNotificationRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    qc.invalidateQueries({ queryKey: queryKeys.notifications(activeUserKey) });
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllAsRead();
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || now })));
    setUnreadCount(0);
    qc.invalidateQueries({ queryKey: queryKeys.notifications(activeUserKey) });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        savedSchemeIds,
        savedSchemes,
        notifications,
        unreadCount,
        upcomingReminders,
        isSchemeSaved,
        toggleSaveScheme,
        login,
        register,
        verifyOtp,
        logout,
        refreshUser,
        refreshSavedSchemes,
        refreshNotifications,
        refreshReminders,
        markNotificationRead,
        markAllNotificationsRead
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
