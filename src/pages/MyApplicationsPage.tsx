import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  PlusCircle,
  Edit3,
  Trash2,
  Calendar,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { applicationService, ApplicationWithDetails } from '../services/applicationService';
import { checklistService } from '../services/checklistService';
import { VERIFIED_SCHEMES } from '../data/schemesData';
import { ApplicationStatus } from '../types/auth';
import { EligibilityStatus } from '../types/scheme';

interface MyApplicationsPageProps {
  initialSchemeToTrack?: string | null;
  initialEligibilityToTrack?: EligibilityStatus | null;
  onClearInitialScheme?: () => void;
  onNavigate: (view: string) => void;
  onSelectApplicationDetails: (applicationId: string) => void;
  onSelectSchemeForChecklist: (schemeId: string) => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'INTERESTED',
  'PREPARING',
  'READY_TO_APPLY',
  'APPLIED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CORRECTION',
  'WITHDRAWN'
];

export const MyApplicationsPage: React.FC<MyApplicationsPageProps> = ({
  initialSchemeToTrack,
  initialEligibilityToTrack,
  onClearInitialScheme,
  onNavigate,
  onSelectApplicationDetails,
  onSelectSchemeForChecklist
}) => {
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'APPROVED' | 'ATTENTION'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [showNewModal, setShowNewModal] = useState(Boolean(initialSchemeToTrack));
  const [newSchemeId, setNewSchemeId] = useState(
    initialSchemeToTrack || VERIFIED_SCHEMES[0]?.id || 'pm-kisan-raitha-siri'
  );
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('PREPARING');
  const [newAckNumber, setNewAckNumber] = useState('');
  const [newPortal, setNewPortal] = useState(() => {
    const scheme = VERIFIED_SCHEMES.find((s) => s.id === (initialSchemeToTrack || 'pm-kisan-raitha-siri'));
    return scheme?.officialPortalUrl || 'FRUITS Karnataka (fruits.karnataka.gov.in)';
  });
  const [newNotes, setNewNotes] = useState('');
  const [pendingEligibility, setPendingEligibility] = useState<EligibilityStatus | null>(
    initialEligibilityToTrack || null
  );
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    if (initialSchemeToTrack) {
      setNewSchemeId(initialSchemeToTrack);
      setPendingEligibility(initialEligibilityToTrack || null);
      const scheme = VERIFIED_SCHEMES.find((s) => s.id === initialSchemeToTrack);
      if (scheme) {
        setNewPortal(scheme.officialPortalUrl);
      }
      setShowNewModal(true);
      onClearInitialScheme?.();
    }
  }, [initialSchemeToTrack]);

  // Quick Status Update Modal
  const [updatingApp, setUpdatingApp] = useState<ApplicationWithDetails | null>(null);
  const [updateStatusVal, setUpdateStatusVal] = useState<ApplicationStatus>('APPLIED');
  const [updateAckNumber, setUpdateAckNumber] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateTimelineNote, setUpdateTimelineNote] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Confirm delete inline modal (avoid window.confirm per environment rules)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const items = await applicationService.getApplications();
      const enriched = items.map((app) => {
        const fullScheme = VERIFIED_SCHEMES.find((s) => s.id === app.schemeId);
        return {
          ...app,
          scheme: fullScheme || app.scheme
        };
      });
      setApplications(enriched);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [isAuthenticated]);

  const handleCreateNewApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNew(true);

    try {
      const selectedScheme = VERIFIED_SCHEMES.find((s) => s.id === newSchemeId);
      const readiness = selectedScheme
        ? checklistService.calculateReadiness(selectedScheme.prerequisites)
        : null;

      await applicationService.createApplication({
        schemeId: newSchemeId,
        status: newStatus,
        acknowledgementNumber: newAckNumber.trim() || undefined,
        appliedThroughPortal: newPortal.trim() || undefined,
        notes: newNotes.trim() || undefined,
        readinessSnapshot: readiness
          ? {
              readyCount: readiness.completed,
              totalMandatory: readiness.total,
              percentage: Math.round(readiness.ratio * 100)
            }
          : undefined,
        eligibilitySnapshot: pendingEligibility
          ? {
              status: pendingEligibility,
              evaluatedAt: new Date().toISOString()
            }
          : undefined
      });

      setShowNewModal(false);
      setNewAckNumber('');
      setNewNotes('');
      setPendingEligibility(null);
      await loadApplications();
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಅರ್ಜಿ ಟ್ರ್ಯಾಕರ್ ಸೇರಿಸಲಾಗಿದೆ' : 'Application tracked',
        description: selectedScheme ? (language === 'kn' ? selectedScheme.nameKn : selectedScheme.nameEn) : undefined
      });
    } catch (err) {
      console.error('Failed to create application:', err);
      showToast({ variant: 'error', title: 'Could not create application record' });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const openUpdateModal = (app: ApplicationWithDetails) => {
    setUpdatingApp(app);
    setUpdateStatusVal(app.status);
    setUpdateAckNumber(app.acknowledgementNumber || '');
    setUpdateNotes(app.notes || '');
    setUpdateTimelineNote('');
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingApp) return;

    setIsSubmittingUpdate(true);
    try {
      const selectedScheme = VERIFIED_SCHEMES.find((s) => s.id === updatingApp.schemeId);
      const readiness = selectedScheme
        ? checklistService.calculateReadiness(selectedScheme.prerequisites)
        : null;

      await applicationService.updateApplication(updatingApp.id, {
        status: updateStatusVal,
        acknowledgementNumber: updateAckNumber.trim() || undefined,
        notes: updateNotes.trim() || undefined,
        timelineNote: updateTimelineNote.trim() || undefined,
        readinessSnapshot: readiness
          ? {
              readyCount: readiness.completed,
              totalMandatory: readiness.total,
              percentage: Math.round(readiness.ratio * 100)
            }
          : undefined
      });

      setUpdatingApp(null);
      await loadApplications();
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಅರ್ಜಿ ಸ್ಥಿತಿ ನವೀಕರಿಸಲಾಗಿದೆ' : 'Application updated'
      });
    } catch (err) {
      console.error('Failed to update application:', err);
      showToast({ variant: 'error', title: 'Could not update application' });
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    await applicationService.deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
    showToast({
      variant: 'info',
      title: language === 'kn' ? 'ಅರ್ಜಿ ದಾಖಲೆ ಅಳಿಸಲಾಗಿದೆ' : 'Tracked application deleted'
    });
  };

  const filteredApplications = applications.filter((app) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'ACTIVE') {
      return ['INTERESTED', 'PREPARING', 'READY_TO_APPLY', 'APPLIED', 'UNDER_REVIEW'].includes(app.status);
    }
    if (selectedFilter === 'APPROVED') {
      return app.status === 'APPROVED';
    }
    if (selectedFilter === 'ATTENTION') {
      return ['NEEDS_CORRECTION', 'REJECTED', 'WITHDRAWN'].includes(app.status);
    }
    return true;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    const label = t(`applications.statuses.${status}`) || status;
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-600',
          label
        };
      case 'APPLIED':
      case 'UNDER_REVIEW':
        return {
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-600',
          label
        };
      case 'READY_TO_APPLY':
        return {
          bg: 'bg-teal-100 text-teal-900 border-teal-300',
          dot: 'bg-teal-600',
          label
        };
      case 'PREPARING':
      case 'INTERESTED':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-600',
          label
        };
      case 'NEEDS_CORRECTION':
        return {
          bg: 'bg-orange-100 text-orange-900 border-orange-300',
          dot: 'bg-orange-600',
          label
        };
      case 'REJECTED':
      case 'WITHDRAWN':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-600',
          label
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-500',
          label
        };
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#173F2B] text-xs font-semibold mb-2">
            <FileCheck2 className="w-3.5 h-3.5 text-[#238B57]" />
            <span>{language === 'kn' ? 'ವೈಯಕ್ತಿಕ ಅರ್ಜಿ ಟ್ರ್ಯಾಕರ್' : 'Personal Application Tracker'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173F2B] tracking-tight">
            {t('applications.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            {t('applications.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#B9E769]" />
          <span>{t('applications.newApplication')}</span>
        </button>
      </div>

      {/* Grounded Tracker Disclaimer */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] sm:text-xs">
          {t('applications.disclaimer')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSelectedFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectedFilter === 'ALL'
              ? 'bg-[#173F2B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('applications.filterAll')} ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectedFilter === 'ACTIVE'
              ? 'bg-[#173F2B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {language === 'kn' ? 'ಪ್ರಗತಿಯಲ್ಲಿರುವ ಅರ್ಜಿಗಳು' : 'In Progress'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('APPROVED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectedFilter === 'APPROVED'
              ? 'bg-[#173F2B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {language === 'kn' ? 'ಮಂಜೂರಾದವು' : 'Approved'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter('ATTENTION')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectedFilter === 'ATTENTION'
              ? 'bg-[#173F2B] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {language === 'kn' ? 'ತಿದ್ದುಪಡಿ / ಗಮನ ಅಗತ್ಯ' : 'Needs Action'}
        </button>
      </div>

      {/* Applications Cards List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading your applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {t('applications.emptyTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('applications.emptyDesc')}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-[#B9E769]" />
              <span>{t('applications.startTracking')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('questionnaire')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t('nav.eligibility')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app, idx) => {
            const badge = getStatusBadge(app.status);
            const schemeName = language === 'kn' ? app.scheme?.nameKn : app.scheme?.nameEn;
            const deptName = language === 'kn' ? app.scheme?.departmentKn : app.scheme?.departmentEn;
            const lastTimeline = app.timeline?.[app.timeline.length - 1];

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>

                    {app.readinessSnapshot && (
                      <button
                        type="button"
                        onClick={() => onSelectSchemeForChecklist(app.schemeId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#173F2B] border border-emerald-200 hover:bg-emerald-100 cursor-pointer tabular-nums"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#238B57]" />
                        <span>
                          {language === 'kn' ? 'ದಾಖಲೆ:' : 'Readiness:'} {app.readinessSnapshot.readyCount}/{app.readinessSnapshot.totalMandatory} ({app.readinessSnapshot.percentage}%)
                        </span>
                      </button>
                    )}

                    {app.eligibilitySnapshot && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Sparkles className="w-3 h-3 text-[#238B57]" />
                        <span>{app.eligibilitySnapshot.status.replace('_', ' ')}</span>
                      </span>
                    )}

                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(app.updatedAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#173F2B]">
                      {schemeName || app.schemeNameSnapshot || app.schemeId}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {deptName || 'Karnataka Department of Agriculture'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-700 block text-[11px]">
                        {t('applications.acknowledgementNumber')}:
                      </span>
                      <span className="font-mono text-slate-900">
                        {app.acknowledgementNumber || 'Pending / Not Entered'}
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700 block text-[11px]">
                        {t('applications.portal')}:
                      </span>
                      <span className="text-slate-800">
                        {app.appliedThroughPortal || app.scheme?.officialPortalUrl || 'FRUITS Portal'}
                      </span>
                    </div>

                    {lastTimeline && (
                      <div className="w-full pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                        <span className="font-semibold text-emerald-800">
                          {language === 'kn' ? 'ಇತ್ತೀಚಿನ ಪ್ರಗತಿ:' : 'Latest Progress:'}
                        </span>{' '}
                        <span>{lastTimeline.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => openUpdateModal(app)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#238B57]" />
                    <span>{t('applications.updateStatus')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectApplicationDetails(app.id)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{language === 'kn' ? 'ಇತಿಹಾಸ / ವಿವರ' : 'Timeline Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === app.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(app.id)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                      >
                        {language === 'kn' ? 'ದೃಢೀಕರಿಸಿ' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(app.id)}
                      aria-label={`Delete ${app.schemeNameSnapshot || app.schemeId}`}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: New Application */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-[#173F2B] text-base flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#238B57]" />
                  <span>{t('applications.newApplication')}</span>
                </h3>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setShowNewModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewApplication} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'kn' ? 'ಯೋಜನೆ ಆಯ್ಕೆಮಾಡಿ' : 'Select Karnataka Scheme'} *
                  </label>
                  <select
                    value={newSchemeId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSchemeId(val);
                      const found = VERIFIED_SCHEMES.find((s) => s.id === val);
                      if (found) setNewPortal(found.officialPortalUrl);
                    }}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  >
                    {VERIFIED_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {language === 'kn' ? s.nameKn : s.nameEn} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.status')} *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t(`applications.statuses.${st}`) || st}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t(`applications.statusDescs.${newStatus}`)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.acknowledgementNumber')}
                  </label>
                  <input
                    type="text"
                    value={newAckNumber}
                    onChange={(e) => setNewAckNumber(e.target.value)}
                    placeholder="e.g. FRUITS-2026-XXXX or RSK-ACK-1234"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.portal')}
                  </label>
                  <input
                    type="text"
                    value={newPortal}
                    onChange={(e) => setNewPortal(e.target.value)}
                    placeholder="e.g. FRUITS Karnataka / Seva Sindhu / RSK Counter"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.notes')}
                  </label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Met Village Accountant; Pahani signed. Ready for biometric authentication."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingNew ? 'Saving...' : 'Track Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Update Status */}
      <AnimatePresence>
        {updatingApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-[#173F2B] text-base flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#238B57]" />
                  <span>{t('applications.updateStatus')}</span>
                </h3>
                <button
                  type="button"
                  aria-label="Close update modal"
                  onClick={() => setUpdatingApp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveUpdate} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Scheme:</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {language === 'kn' ? updatingApp.scheme?.nameKn : updatingApp.scheme?.nameEn || updatingApp.schemeNameSnapshot}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.status')} *
                  </label>
                  <select
                    value={updateStatusVal}
                    onChange={(e) => setUpdateStatusVal(e.target.value as ApplicationStatus)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t(`applications.statuses.${st}`) || st}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t(`applications.statusDescs.${updateStatusVal}`)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.acknowledgementNumber')}
                  </label>
                  <input
                    type="text"
                    value={updateAckNumber}
                    onChange={(e) => setUpdateAckNumber(e.target.value)}
                    placeholder="e.g. FRUITS-2026-XXXX"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'kn' ? 'ಹೊಸ ಮೈಲಿಗಲ್ಲು / ಪ್ರಗತಿ ಟಿಪ್ಪಣಿ' : 'New Timeline Milestone Note'}
                  </label>
                  <input
                    type="text"
                    value={updateTimelineNote}
                    onChange={(e) => setUpdateTimelineNote(e.target.value)}
                    placeholder="e.g. Field inspection completed by Assistant Agricultural Officer."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('applications.notes')}
                  </label>
                  <textarea
                    rows={2}
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Personal remarks or action items..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUpdatingApp(null)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUpdate}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingUpdate ? 'Updating...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
