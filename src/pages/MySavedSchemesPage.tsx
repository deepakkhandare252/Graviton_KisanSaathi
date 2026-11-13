import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  CheckCircle2,
  FileText,
  PlusCircle,
  Sparkles,
  Search,
  CalendarClock,
  SlidersHorizontal,
  Bell,
  BellOff,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { savedSchemeService, SavedSchemeWithDetails } from '../services/savedSchemeService';
import { VERIFIED_SCHEMES } from '../data/schemesData';
import { Scheme } from '../types/scheme';
import { evaluateDeadlineStatus, SUPPORTED_REMINDER_DAYS } from '../utils/deadlineUtils';

interface MySavedSchemesPageProps {
  onNavigate: (view: string) => void;
  onSelectSchemeForChecklist: (schemeId: string) => void;
  onSelectSchemeForGuide: (schemeId: string) => void;
  onTrackApplication: (schemeId: string) => void;
}

type SavedFilterTab = 'ALL' | 'DEADLINES' | 'URGENT';
type SavedSortOrder = 'SOONEST' | 'RECENT' | 'ALPHA';

export const MySavedSchemesPage: React.FC<MySavedSchemesPageProps> = ({
  onNavigate,
  onSelectSchemeForChecklist,
  onSelectSchemeForGuide,
  onTrackApplication
}) => {
  const { user, isAuthenticated, toggleSaveScheme, refreshSavedSchemes, refreshReminders } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [savedItems, setSavedItems] = useState<SavedSchemeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<SavedFilterTab>('ALL');
  const [sortBy, setSortBy] = useState<SavedSortOrder>('SOONEST');

  // Inline reminder settings drawer per card
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftReminderEnabled, setDraftReminderEnabled] = useState(true);
  const [draftDays, setDraftDays] = useState<number[]>([30, 7, 3, 1]);
  const [draftCustomDate, setDraftCustomDate] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [isSavingPref, setIsSavingPref] = useState(false);

  const loadSavedSchemes = async () => {
    setIsLoading(true);
    try {
      const items = await savedSchemeService.getSavedSchemes();
      const tz = user?.timezone || 'Asia/Kolkata';
      const enriched = items.map((item) => {
        const fullScheme = VERIFIED_SCHEMES.find((s) => s.id === item.schemeId) || item.scheme || null;
        const effective = item.deadlineVerified
          ? item.applicationDeadline
          : item.customDeadline || null;
        return {
          ...item,
          scheme: fullScheme,
          deadlineStatus: item.deadlineStatus || evaluateDeadlineStatus(effective, tz)
        };
      });
      setSavedItems(enriched);
    } catch (e) {
      console.error('Failed to load saved schemes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSchemes();
  }, [isAuthenticated]);

  const handleRemove = async (schemeId: string) => {
    await toggleSaveScheme(schemeId);
    setSavedItems((prev) => prev.filter((item) => item.schemeId !== schemeId));
    showToast({
      variant: 'info',
      title: language === 'kn' ? 'ಉಳಿಸಿದ ಯೋಜನೆಯನ್ನು ತೆಗೆದುಹಾಕಲಾಗಿದೆ' : 'Removed from Saved Schemes'
    });
  };

  const openEditor = (item: SavedSchemeWithDetails) => {
    if (editingId === item.schemeId) {
      setEditingId(null);
      return;
    }
    setEditingId(item.schemeId);
    setDraftReminderEnabled(item.reminderEnabled);
    setDraftDays(item.reminderDaysBefore?.length ? [...item.reminderDaysBefore] : [30, 7, 3, 1]);
    setDraftCustomDate(item.customDeadline || '');
    setDraftNotes(item.userNotes || '');
  };

  const toggleDraftDay = (day: number) => {
    setDraftDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  };

  const handleSaveReminderPrefs = async (item: SavedSchemeWithDetails) => {
    setIsSavingPref(true);
    try {
      await savedSchemeService.updateReminderSettings(item.schemeId, {
        reminderEnabled: draftReminderEnabled,
        reminderDaysBefore: draftDays,
        customDeadline: item.deadlineVerified ? undefined : draftCustomDate.trim() || null,
        userNotes: draftNotes.trim()
      });
      await Promise.all([loadSavedSchemes(), refreshSavedSchemes(), refreshReminders()]);
      setEditingId(null);
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಜ್ಞಾಪನೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ' : 'Reminder preferences saved'
      });
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
      showToast({ variant: 'error', title: 'Could not save reminder settings' });
    } finally {
      setIsSavingPref(false);
    }
  };

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = savedItems.filter((item) => {
      const scheme = item.scheme;
      const evalStatus = item.deadlineStatus;
      const matchesSearch =
        !q ||
        (scheme?.nameEn || item.schemeNameSnapshot).toLowerCase().includes(q) ||
        (scheme?.nameKn || '').toLowerCase().includes(q) ||
        (scheme?.departmentEn || '').toLowerCase().includes(q) ||
        (scheme?.financialBenefitEn || '').toLowerCase().includes(q) ||
        (item.userNotes || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'DEADLINES') {
        return Boolean(evalStatus?.hasDeadline);
      }
      if (filterTab === 'URGENT') {
        const days = evalStatus?.remainingDays;
        return (
          Boolean(evalStatus?.hasDeadline) &&
          days !== null &&
          days !== undefined &&
          days >= 0 &&
          days <= 7
        );
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'SOONEST') {
        const da = a.deadlineStatus?.hasDeadline ? (a.deadlineStatus.remainingDays ?? 9999) : 99999;
        const db = b.deadlineStatus?.hasDeadline ? (b.deadlineStatus.remainingDays ?? 9999) : 99999;
        return da - db;
      }
      if (sortBy === 'ALPHA') {
        const na = language === 'kn' ? a.scheme?.nameKn || a.schemeNameSnapshot : a.scheme?.nameEn || a.schemeNameSnapshot;
        const nb = language === 'kn' ? b.scheme?.nameKn || b.schemeNameSnapshot : b.scheme?.nameEn || b.schemeNameSnapshot;
        return na.localeCompare(nb);
      }
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });
  }, [savedItems, searchQuery, filterTab, sortBy, language]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#173F2B] text-xs font-semibold mb-2">
            <BookmarkCheck className="w-3.5 h-3.5 text-[#238B57]" />
            <span>{t('saved.savedBadge')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173F2B] tracking-tight">
            {t('saved.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            {t('saved.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('schemes')}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t('saved.exploreSchemes')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('questionnaire')}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B9E769]" />
            {t('saved.checkEligibility')}
          </button>
        </div>
      </div>

      {/* Guest Notice if not logged in */}
      {!isAuthenticated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-950">
              {language === 'kn' ? 'ಸ್ಥಳೀಯ ಬ್ರೌಸರ್ ಸಂಗ್ರಹಣೆ ಸಕ್ರಿಯವಾಗಿದೆ' : 'Guest Local Storage Active'}
            </p>
            <p className="text-[11px] text-amber-800">
              {language === 'kn'
                ? 'ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡುವುದರಿಂದ ನಿಮ್ಮ ಉಳಿಸಿದ ಯೋಜನೆಗಳು ಹಾಗೂ ಜ್ಞಾಪನೆಗಳು ಸಾಧನಗಳ ನಡುವೆ ಸುರಕ್ಷಿತವಾಗಿ ಸಿಂಕ್ ಆಗುತ್ತವೆ.'
                : 'Sign in to sync your saved schemes, verified deadlines, and reminder alerts across devices.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="px-3 py-1.5 rounded-lg bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors shrink-0 cursor-pointer"
          >
            {t('nav.login')}
          </button>
        </div>
      )}

      {/* Search, Filter Tabs, and Sort Bar */}
      {savedItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('saved.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {([
                { key: 'ALL', label: t('saved.filterAll') },
                { key: 'DEADLINES', label: t('saved.filterDeadlines') },
                { key: 'URGENT', label: t('saved.filterUrgent') }
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    filterTab === tab.key
                      ? 'bg-[#173F2B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#173F2B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              aria-label="Sort saved schemes"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SavedSortOrder)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
            >
              <option value="SOONEST">{t('saved.sortSoonest')}</option>
              <option value="RECENT">{t('saved.sortRecent')}</option>
              <option value="ALPHA">{t('saved.sortAlpha')}</option>
            </select>
          </div>
        </div>
      )}

      {/* Saved Scheme Cards List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading saved schemes...</p>
        </div>
      ) : savedItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {t('saved.emptyTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('saved.emptyDesc')}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('schemes')}
              className="px-4 py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors cursor-pointer shadow-sm"
            >
              {t('saved.exploreSchemes')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('questionnaire')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t('saved.checkEligibility')}
            </button>
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <p className="text-sm font-bold text-slate-700">
            {language === 'kn' ? 'ಫಿಲ್ಟರ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಉಳಿಸಿದ ಯೋಜನೆಗಳಿಲ್ಲ' : 'No saved schemes match this filter'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterTab('ALL');
            }}
            className="text-xs font-semibold text-[#238B57] hover:underline cursor-pointer"
          >
            {language === 'kn' ? 'ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ' : 'Reset filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item, idx) => {
            const scheme: Scheme | undefined = item.scheme || undefined;
            const evalStatus = item.deadlineStatus;
            const isEditing = editingId === item.schemeId;

            const urgencyDot =
              evalStatus?.urgency === 'URGENT' || evalStatus?.urgency === 'EXPIRED'
                ? 'bg-rose-600'
                : evalStatus?.urgency === 'APPROACHING'
                  ? 'bg-amber-600'
                  : evalStatus?.urgency === 'FAR'
                    ? 'bg-emerald-600'
                    : 'bg-slate-400';

            const urgencyLabel =
              evalStatus?.urgency === 'URGENT'
                ? t('deadlines.urgencyUrgent')
                : evalStatus?.urgency === 'APPROACHING'
                  ? t('deadlines.urgencyApproaching')
                  : evalStatus?.urgency === 'FAR'
                    ? t('deadlines.urgencyFar')
                    : evalStatus?.urgency === 'EXPIRED'
                      ? t('deadlines.expired')
                      : t('deadlines.rolling');

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-[#173F2B] border border-emerald-100 uppercase tracking-wider">
                      {scheme ? (language === 'kn' ? scheme.categoryKn : scheme.category) : 'Scheme'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        aria-label={`Reminder settings for ${item.schemeNameSnapshot}`}
                        title={t('deadlines.reminderSettings')}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isEditing
                            ? 'bg-emerald-100 text-[#173F2B]'
                            : 'text-slate-400 hover:text-[#173F2B] hover:bg-slate-100'
                        }`}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.schemeId)}
                        aria-label={`Remove ${item.schemeNameSnapshot}`}
                        title={t('saved.removeSaved')}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-[#173F2B] text-base leading-snug">
                      {scheme
                        ? language === 'kn'
                          ? scheme.nameKn
                          : scheme.nameEn
                        : item.schemeNameSnapshot}
                    </h3>
                    {scheme && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {language === 'kn' ? scheme.departmentKn : scheme.departmentEn}
                      </p>
                    )}
                  </div>

                  {/* Verified Deadline / Open Year-Round Indicator */}
                  <div
                    className={`rounded-xl px-3 py-2 border text-xs flex items-center justify-between gap-2 ${
                      evalStatus?.badgeColorClass || 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDot}`} />
                      <span className="font-bold truncate">{urgencyLabel}</span>
                    </div>
                    {evalStatus?.hasDeadline && evalStatus.deadlineIso ? (
                      <span className="font-mono text-[11px] font-bold tabular-nums shrink-0">
                        {evalStatus.deadlineIso} ·{' '}
                        {evalStatus.remainingDays === 0
                          ? t('deadlines.closesToday')
                          : evalStatus.remainingDays && evalStatus.remainingDays > 0
                            ? `${evalStatus.remainingDays}d`
                            : t('deadlines.expired')}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium shrink-0">
                        {language === 'kn' ? 'ಸ್ಥಿರ ದಿನಾಂಕವಿಲ್ಲ' : 'No fixed cutoff'}
                      </span>
                    )}
                  </div>

                  {scheme && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-700 space-y-1">
                      <p className="font-semibold text-emerald-800 text-[11px]">
                        {language === 'kn' ? 'ಪ್ರಮುಖ ಸೌಲಭ್ಯ / ಸಹಾಯಧನ:' : 'Core Benefits:'}
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {language === 'kn' ? scheme.financialBenefitKn : scheme.financialBenefitEn}
                      </p>
                    </div>
                  )}

                  {item.userNotes && !isEditing && (
                    <p className="text-[11px] text-slate-600 bg-amber-50/50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold text-slate-800">
                        {language === 'kn' ? 'ಟಿಪ್ಪಣಿ:' : 'Note:'}
                      </span>{' '}
                      {item.userNotes}
                    </p>
                  )}

                  {/* Inline Reminder & Notes Editor */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#173F2B] flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-[#238B57]" />
                              <span>{t('deadlines.reminderSettings')}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setDraftReminderEnabled((p) => !p)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                draftReminderEnabled
                                  ? 'bg-[#173F2B] text-white'
                                  : 'bg-white border border-slate-300 text-slate-600'
                              }`}
                            >
                              {draftReminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                              <span>{draftReminderEnabled ? 'On' : 'Off'}</span>
                            </button>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-slate-700 mb-1">
                              {t('deadlines.intervalsLabel')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {SUPPORTED_REMINDER_DAYS.map((day) => {
                                const active = draftDays.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDraftDay(day)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums cursor-pointer ${
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

                          {!item.deadlineVerified && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                {t('deadlines.customDateLabel')}
                              </label>
                              <input
                                type="date"
                                value={draftCustomDate}
                                onChange={(e) => setDraftCustomDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              {t('saved.personalNotes')}
                            </label>
                            <textarea
                              rows={2}
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                              placeholder={
                                language === 'kn'
                                  ? 'ಉದಾ: ಗ್ರಾಮ ಒನ್‌ನಲ್ಲಿ ಪಹಣಿ ಸಲ್ಲಿಸಬೇಕು'
                                  : 'e.g. Confirm RSK counter cutoff & keep Pahani ready'
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="flex-1 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingPref}
                              onClick={() => handleSaveReminderPrefs(item)}
                              className="flex-1 py-1.5 rounded-lg bg-[#173F2B] text-white text-[11px] font-semibold hover:bg-[#238B57] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              <Save className="w-3 h-3" />
                              <span>{isSavingPref ? 'Saving...' : t('deadlines.saveSettings')}</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSchemeForChecklist(item.schemeId)}
                      className="py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#238B57]" />
                      <span>{language === 'kn' ? 'ದಾಖಲೆ ಪಟ್ಟಿ' : 'Checklist'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectSchemeForGuide(item.schemeId)}
                      className="py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{language === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿ' : 'Guide'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTrackApplication(item.schemeId)}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#B9E769]" />
                    <span>{t('saved.trackApplication')}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
