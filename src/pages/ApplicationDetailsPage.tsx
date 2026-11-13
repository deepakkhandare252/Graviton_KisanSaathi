import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Building2,
  ExternalLink,
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { applicationService, ApplicationWithDetails } from '../services/applicationService';
import { ApplicationStatus } from '../types/auth';

interface ApplicationDetailsPageProps {
  applicationId: string;
  onBack: () => void;
  onSelectSchemeForChecklist: (schemeId: string) => void;
  onSelectSchemeForGuide: (schemeId: string) => void;
}

export const ApplicationDetailsPage: React.FC<ApplicationDetailsPageProps> = ({
  applicationId,
  onBack,
  onSelectSchemeForChecklist,
  onSelectSchemeForGuide
}) => {
  const { t, language } = useLanguage();
  const [app, setApp] = useState<ApplicationWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New timeline event form state
  const [newNote, setNewNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('UNDER_REVIEW');
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await applicationService.getApplicationById(applicationId);
      setApp(data);
      if (data) {
        setSelectedStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to load application details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const handleAddTimelineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !newNote.trim()) return;

    setIsAddingTimeline(true);
    try {
      const updated = await applicationService.updateApplication(app.id, {
        status: selectedStatus,
        timelineNote: newNote.trim()
      });
      if (updated) {
        setApp(updated);
        setNewNote('');
      }
    } catch (err) {
      console.error('Failed to append timeline event:', err);
    } finally {
      setIsAddingTimeline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <p className="text-sm text-slate-600 mb-4">Application record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold cursor-pointer"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  const schemeName = language === 'kn' ? app.scheme?.nameKn : app.scheme?.nameEn;
  const deptName = language === 'kn' ? app.scheme?.departmentKn : app.scheme?.departmentEn;
  const statusLabel = t(`applications.statuses.${app.status}`) || app.status;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#173F2B] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{language === 'kn' ? 'ನನ್ನ ಅರ್ಜಿಗಳ ಪಟ್ಟಿಗೆ ಹಿಂತಿರುಗಿ' : 'Back to My Applications'}</span>
      </button>

      {/* Main Detail Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              {statusLabel}
            </span>
            {app.readinessSnapshot && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#173F2B] border border-emerald-200 tabular-nums">
                Readiness: {app.readinessSnapshot.readyCount}/{app.readinessSnapshot.totalMandatory} ({app.readinessSnapshot.percentage}%)
              </span>
            )}
            {app.eligibilitySnapshot && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Eligibility: {app.eligibilitySnapshot.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last Updated: {new Date(app.updatedAt).toLocaleDateString()}</span>
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173F2B]">
            {schemeName || app.schemeNameSnapshot || app.schemeId}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {deptName || 'Karnataka Agricultural Department'}
          </p>
        </div>

        {/* Key Application Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {t('applications.acknowledgementNumber')}
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {app.acknowledgementNumber || 'Not Entered'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {t('applications.portal')}
            </span>
            <span className="font-medium text-slate-900 truncate block">
              {app.appliedThroughPortal || app.scheme?.officialPortalUrl || 'Official Portal'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {t('applications.appliedOn')}
            </span>
            <span className="font-medium text-slate-900">
              {app.applicationDate ? new Date(app.applicationDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          {app.scheme && (
            <>
              <button
                type="button"
                onClick={() => onSelectSchemeForChecklist(app.schemeId)}
                className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#238B57]" />
                <span>{language === 'kn' ? 'ದಾಖಲೆ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ' : 'View Document Checklist'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectSchemeForGuide(app.schemeId)}
                className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'kn' ? 'ಅರ್ಜಿ ಮಾರ್ಗದರ್ಶಿ' : 'View Step-by-Step Guide'}</span>
              </button>

              {app.scheme.officialPortalUrl && (
                <a
                  href={app.scheme.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3.5 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#B9E769]" />
                  <span>{language === 'kn' ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ' : 'Visit Official Portal'}</span>
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {/* Grounded Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          {t('applications.disclaimer')}
        </p>
      </div>

      {/* Timeline Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-[#173F2B] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#238B57]" />
            <span>{t('applications.timeline')}</span>
          </h2>
          <span className="text-xs text-slate-500">
            {app.timeline.length} milestone(s)
          </span>
        </div>

        {/* Chronological Timeline Render */}
        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {app.timeline.map((event, idx) => (
            <div key={event.id || idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#238B57] ring-4 ring-emerald-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#173F2B]">
                    {t(`applications.statuses.${event.status}`) || event.status}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                {event.note && (
                  <p className="text-xs text-slate-700 mt-1">
                    {event.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Progress Note Form */}
        <div className="pt-6 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-[#238B57]" />
            <span>{t('applications.addMilestone')}</span>
          </h3>

          <form onSubmit={handleAddTimelineEvent} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('applications.status')}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                >
                  {[
                    'INTERESTED',
                    'PREPARING',
                    'READY_TO_APPLY',
                    'APPLIED',
                    'UNDER_REVIEW',
                    'APPROVED',
                    'REJECTED',
                    'NEEDS_CORRECTION',
                    'WITHDRAWN'
                  ].map((s) => (
                    <option key={s} value={s}>
                      {t(`applications.statuses.${s}`) || s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Progress Note / Government Update
                </label>
                <input
                  type="text"
                  required
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. Received SMS acknowledgement; RSK officer verified Pahani."
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAddingTimeline || !newNote.trim()}
                className="py-2 px-4 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isAddingTimeline ? 'Saving...' : 'Add Milestone to Timeline'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
