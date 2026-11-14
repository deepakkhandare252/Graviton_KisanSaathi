import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  BookmarkCheck,
  FileCheck2,
  Bell,
  BellOff,
  Check,
  X,
  ArrowRight,
  SlidersHorizontal,
  FileText,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { reminderService, UpcomingReminderItem } from '../services/reminderService';
import { savedSchemeService } from '../services/savedSchemeService';
import { applicationService, ApplicationWithDetails } from '../services/applicationService';
import { SUPPORTED_REMINDER_DAYS } from '../utils/deadlineUtils';

interface DashboardPageProps {
  onNavigate: (view: string) => void;
  onSelectSchemeForChecklist: (schemeId: string) => void;
  onSelectSchemeForGuide: (schemeId: string) => void;
  onTrackApplication: (schemeId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectSchemeForChecklist,
  onSelectSchemeForGuide,
  onTrackApplication
}) => {
  const {
    user,
    isAuthenticated,
    savedSchemes,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshReminders,
    refreshSavedSchemes
  } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [reminders, setReminders] = useState<UpcomingReminderItem[]>([]);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [remRes, apps] = await Promise.all([
        reminderService.getUpcomingDeadlines(),
        applicationService.getApplications()
      ]);
      setReminders(remRes.reminders || []);
      setApplications(apps || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [isAuthenticated, savedSchemes.length]);

  const urgentCount = reminders.filter(
    (r) => !r.reminderDismissed && r.deadlineStatus.remainingDays !== null && r.deadlineStatus.remainingDays >= 0 && r.deadlineStatus.remainingDays <= 7
  ).length;

  const activeDeadlinesCount = reminders.filter(
    (r) => !r.reminderDismissed && r.deadlineStatus.remainingDays !== null && r.deadlineStatus.remainingDays >= 0
  ).length;

  const handleToggleReminderEnabled = async (item: UpcomingReminderItem) => {
    const next = !item.reminderEnabled;
    await savedSchemeService.updateReminderSettings(item.schemeId, { reminderEnabled: next });
    await Promise.all([loadDashboardData(), refreshReminders(), refreshSavedSchemes()]);
    showToast({
      variant: 'info',
      title: next ? 'Reminders Enabled' : 'Reminders Paused',
      description: language === 'kn' ? item.scheme?.nameKn : item.schemeNameSnapshot
    });
  };

  const handleToggleThresholdDay = async (item: UpcomingReminderItem, day: number) => {
    const current = item.reminderDaysBefore || [30, 7, 3, 1];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => b - a);
    await savedSchemeService.updateReminderSettings(item.schemeId, { reminderDaysBefore: next });
    await Promise.all([loadDashboardData(), refreshReminders(), refreshSavedSchemes()]);
  };

  const handleAcknowledge = async (item: UpcomingReminderItem) => {
    await reminderService.acknowledgeReminder(item.schemeId);
    await Promise.all([loadDashboardData(), refreshReminders()]);
    showToast({ variant: 'success', title: t('deadlines.acknowledged') });
  };

  const handleDismiss = async (item: UpcomingReminderItem) => {
    await reminderService.dismissReminder(item.schemeId, true);
    await Promise.all([loadDashboardData(), refreshReminders()]);
    showToast({ variant: 'info', title: 'Deadline alert dismissed' });
  };

  const getBadgeStyle = (urgency: string) => {
    if (urgency === 'URGENT') {
      return {
        wrapper: 'bg-rose-50 text-rose-900 border-rose-300',
        dot: 'bg-rose-600',
        label: t('deadlines.urgencyUrgent')
      };
    }
    if (urgency === 'APPROACHING') {
      return {
        wrapper: 'bg-amber-50 text-amber-900 border-amber-300',
        dot: 'bg-amber-600',
        label: t('deadlines.urgencyApproaching')
      };
    }
    if (urgency === 'FAR') {
      return {
        wrapper: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600',
        label: t('deadlines.urgencyFar')
      };
    }
    return {
      wrapper: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-500',
      label: t('deadlines.expired')
    };
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Greeting Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {language === 'kn' ? 'ಕರ್ನಾಟಕ ರೈತರ ಸಿದ್ಧತಾ ಕೇಂದ್ರ' : 'Karnataka Farmer Command Center'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173F2B] tracking-tight mt-1">
            {user ? `${t('dashboard.greeting')}, ${user.fullName}` : t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('saved')}
            className="button-secondary px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t('nav.savedSchemes')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('questionnaire')}
            className="button-primary px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#B9E769]" />
            <span>{t('nav.findMySchemes')}</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('dashboard.kpiSaved'),
            value: savedSchemes.length,
            icon: BookmarkCheck,
            accent: 'text-[#238B57] bg-emerald-50 border-emerald-200'
          },
          {
            label: t('dashboard.kpiDeadlines'),
            value: activeDeadlinesCount,
            icon: CalendarClock,
            accent: 'text-amber-700 bg-amber-50 border-amber-200'
          },
          {
            label: t('dashboard.kpiUrgent'),
            value: urgentCount,
            icon: AlertTriangle,
            accent: 'text-rose-700 bg-rose-50 border-rose-200'
          },
          {
            label: t('dashboard.kpiApplications'),
            value: applications.length,
            icon: FileCheck2,
            accent: 'text-[#173F2B] bg-slate-100 border-slate-200'
          }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] tabular-nums mt-1">
                  {kpi.value}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${kpi.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* UPCOMING SCHEME DEADLINES Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#173F2B] tracking-tight flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#238B57]" />
              <span>{t('dashboard.upcomingDeadlinesTitle')}</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">{t('dashboard.upcomingDeadlinesSubtitle')}</p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">IST · Asia/Kolkata</span>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-8 h-8 border-3 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Evaluating deadline windows...</p>
          </div>
        ) : reminders.filter((r) => !r.reminderDismissed).length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <CalendarClock className="w-9 h-9 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">{t('dashboard.noDeadlinesTitle')}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{t('dashboard.noDeadlinesDesc')}</p>
            <button
              type="button"
              onClick={() => onNavigate('saved')}
              className="px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] cursor-pointer"
            >
              {t('nav.savedSchemes')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reminders
              .filter((r) => !r.reminderDismissed)
              .map((item, idx) => {
                const badge = getBadgeStyle(item.deadlineStatus.urgency);
                const remDays = item.deadlineStatus.remainingDays;
                const isEditing = editingSchemeId === item.schemeId;
                const matchingApp = applications.find((a) => a.schemeId === item.schemeId);
                const displayDate = item.effectiveDeadline || item.deadlineStatus.deadlineIso;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: idx * 0.04 }}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Badge + Remaining Days */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.wrapper}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>

                        <span className="text-xs font-extrabold text-[#173F2B] tabular-nums">
                          {remDays === 0
                            ? t('deadlines.closesToday')
                            : remDays !== null && remDays > 0
                              ? `${remDays} ${t('deadlines.daysLeft')}`
                              : t('deadlines.expired')}
                        </span>
                      </div>

                      {/* Scheme Title & Date */}
                      <div>
                        <h3 className="text-base font-bold text-[#173F2B] leading-snug">
                          {language === 'kn' ? item.scheme?.nameKn || item.schemeNameSnapshot : item.scheme?.nameEn || item.schemeNameSnapshot}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-800">{displayDate}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[11px] text-[#238B57] font-semibold">
                            {item.deadlineVerified ? t('deadlines.verifiedBadge') : t('deadlines.customBadge')}
                          </span>
                        </p>
                      </div>

                      {/* Application / Readiness Linkage */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                        <span>
                          {matchingApp
                            ? `${language === 'kn' ? 'ಅರ್ಜಿ ಸ್ಥಿತಿ:' : 'Tracker:'} ${t(`applications.statuses.${matchingApp.status}`)}`
                            : language === 'kn'
                              ? 'ಅರ್ಜಿ ಇನ್ನೂ ಪ್ರಾರಂಭಿಸಿಲ್ಲ'
                              : 'Not yet tracked in My Applications'}
                        </span>
                        {item.reminderAcknowledgedAt && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5 shrink-0">
                            <Check className="w-3 h-3" /> {t('deadlines.acknowledged')}
                          </span>
                        )}
                      </div>

                      {/* Expandable Reminder Threshold Controls */}
                      {isEditing && (
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#173F2B]">{t('deadlines.enableReminders')}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleReminderEnabled(item)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                item.reminderEnabled
                                  ? 'bg-[#173F2B] text-white'
                                  : 'bg-white border border-slate-300 text-slate-600'
                              }`}
                            >
                              {item.reminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                              <span>{item.reminderEnabled ? 'On' : 'Off'}</span>
                            </button>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-slate-700 mb-1.5">
                              {t('deadlines.intervalsLabel')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {SUPPORTED_REMINDER_DAYS.map((day) => {
                                const active = (item.reminderDaysBefore || []).includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleToggleThresholdDay(item, day)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${
                                      active
                                        ? 'bg-[#238B57] text-white'
                                        : 'bg-white border border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    {day}d
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectSchemeForChecklist(item.schemeId)}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#238B57]" />
                          <span>{language === 'kn' ? 'ದಾಖಲೆ' : 'Docs'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectSchemeForGuide(item.schemeId)}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>{language === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿ' : 'Guide'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSchemeId(isEditing ? null : item.schemeId)}
                          className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border cursor-pointer flex items-center justify-center gap-1 ${
                            isEditing
                              ? 'bg-emerald-50 border-[#238B57] text-[#173F2B]'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>{language === 'kn' ? 'ಜ್ಞಾಪನೆ' : 'Alerts'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {!item.reminderAcknowledgedAt && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(item)}
                            className="flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3 text-[#B9E769]" />
                            <span>{t('deadlines.acknowledge')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onTrackApplication(item.schemeId)}
                          className="flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-[#173F2B] hover:bg-emerald-100 cursor-pointer"
                        >
                          {t('saved.trackApplication')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismiss(item)}
                          title={t('deadlines.dismiss')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </section>

      {/* Bottom 2-Column Activity + Notification History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Center History */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#238B57]" />
              <span>{t('dashboard.notificationHistory')}</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums">
                  {unreadCount}
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="text-xs font-semibold text-[#238B57] hover:underline cursor-pointer"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{t('notifications.emptyDesc')}</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    n.isRead ? 'bg-slate-50/70 border-slate-100' : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#173F2B]">
                      {language === 'kn' ? n.titleKn : n.titleEn}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {language === 'kn' ? n.messageKn : n.messageEn}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="text-[11px] font-semibold text-[#238B57] hover:underline shrink-0 cursor-pointer"
                    >
                      {t('notifications.markRead')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Applications + Quick Links */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#238B57]" />
              <span>{t('dashboard.recentActivity')}</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="text-xs font-semibold text-[#238B57] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'kn' ? 'ಎಲ್ಲವನ್ನು ನೋಡಿ' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {applications.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{t('applications.emptyDesc')}</p>
          ) : (
            <div className="space-y-2.5">
              {applications.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#173F2B] truncate">
                      {language === 'kn' ? app.scheme?.nameKn || app.schemeNameSnapshot : app.scheme?.nameEn || app.schemeNameSnapshot}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t(`applications.statuses.${app.status}`)} · {new Date(app.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('applications')}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                  >
                    {language === 'kn' ? 'ತೆರೆಯಿರಿ' : 'Open'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
