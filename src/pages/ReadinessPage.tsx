import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Building,
  Info,
  ChevronRight,
  Database
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSchemesCatalog, useSchemeChecklist } from '../hooks/useSchemeQueries';
import { checklistService, ChecklistItemStatus } from '../services/checklistService';
import { DocumentPrerequisite } from '../types/scheme';

interface ReadinessPageProps {
  initialSchemeId?: string;
  onNavigateToGuide: (schemeId?: string) => void;
}

export const ReadinessPage: React.FC<ReadinessPageProps> = ({
  initialSchemeId,
  onNavigateToGuide
}) => {
  const { t, language } = useLanguage();
  const { schemes, isLoading: catalogLoading, cachedTimestamp, isOfflineData } = useSchemesCatalog();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(() => {
    return initialSchemeId || 'pm-kisan-raitha-siri';
  });

  useEffect(() => {
    if (initialSchemeId) {
      setSelectedSchemeId(initialSchemeId);
    }
  }, [initialSchemeId]);

  const [statuses, setStatuses] = useState<Record<string, ChecklistItemStatus>>(() => {
    return checklistService.getSavedStatuses();
  });

  const activeScheme = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];
  const { data: queriedPrerequisites, isLoading: checklistLoading } = useSchemeChecklist(
    activeScheme?.id || selectedSchemeId
  );

  const prerequisites = queriedPrerequisites ?? activeScheme?.prerequisites ?? [];

  const handleToggle = (item: DocumentPrerequisite) => {
    const current = Boolean(statuses[item.id]?.isAvailable);
    const updated = checklistService.toggleDocumentStatus(item.id, !current);
    setStatuses({ ...updated });
  };

  const readiness = checklistService.calculateReadiness(prerequisites);

  if (catalogLoading && !activeScheme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="h-40 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {language === 'kn' ? 'ದಾಖಲೆ ಸಿದ್ಧತೆ ಮತ್ತು ಪರಿಶೀಲನೆ' : 'Application Prerequisites'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
            {t('readiness.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('readiness.subtitle')}
          </p>
        </div>

        <button
          onClick={() => onNavigateToGuide(activeScheme?.id || selectedSchemeId)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span>{language === 'kn' ? 'ಅರ್ಜಿ ಮಾರ್ಗದರ್ಶಿ ವೀಕ್ಷಿಸಿ' : 'View Application Guide'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scheme Selector + Offline Cache Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            {language === 'kn' ? 'ಯೋಜನೆಯನ್ನು ಬದಲಾಯಿಸಿ:' : 'Select Scheme for Checklist:'}
          </label>
          <select
            value={activeScheme?.id || selectedSchemeId}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
            className="w-full sm:max-w-md px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
          >
            {schemes.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>
                {language === 'kn' ? scheme.nameKn : scheme.nameEn}
              </option>
            ))}
          </select>
        </div>

        {cachedTimestamp && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#238B57]" />
            <span>
              {isOfflineData ? t('offline.sourceIndexedDb') : t('offline.cachedAt')} ·{' '}
              {activeScheme?.lastVerifiedDate || '2026-10-15'}
            </span>
          </div>
        )}
      </div>

      {/* Readiness Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="md:col-span-8 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#238B57]">
            <FileCheck2 className="w-4 h-4" />
            <span>{activeScheme ? (language === 'kn' ? activeScheme.nameKn : activeScheme.nameEn) : ''}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#173F2B]">
            {readiness.completed === readiness.total
              ? t('readiness.ready')
              : `${readiness.missingMandatory} ${t('readiness.needsAttention')}`}
          </h2>

          <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
            {t('readiness.prereqIntro')}
          </p>
        </div>

        <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-[#F7F8F3] rounded-xl border border-slate-200 text-center">
          <div className="text-3xl font-extrabold text-[#173F2B] tabular-nums">
            {readiness.completed} / {readiness.total}
          </div>
          <div className="text-xs font-medium text-slate-600 mt-1">
            {language === 'kn' ? 'ದಾಖಲೆಗಳು ಲಭ್ಯವಿದೆ' : 'Prerequisites Ready'}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#238B57] h-full transition-all duration-300 rounded-full"
              style={{ width: `${readiness.ratio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Prerequisites Checklist */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {language === 'kn' ? 'ಅಗತ್ಯ ದಾಖಲೆಗಳು ಮತ್ತು ಪಡೆಯುವ ವಿಧಾನ' : 'Required Documents & Instructions'}
        </h3>

        {checklistLoading && prerequisites.length === 0 ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {prerequisites.map((item) => {
              const isReady = Boolean(statuses[item.id]?.isAvailable);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-6 border transition-all ${
                    isReady
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[#173F2B]">
                          {language === 'kn' ? item.nameKn : item.nameEn}
                        </h4>
                        {item.isMandatory ? (
                          <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Optional
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {language === 'kn' ? item.descriptionKn : item.descriptionEn}
                      </p>

                      <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {item.issuingAuthority}
                        </span>
                        {item.portalUrl && (
                          <a
                            href={item.portalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#238B57] hover:underline flex items-center gap-1 font-medium"
                          >
                            {t('readiness.officialPortal')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(item)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
                        isReady
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isReady ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Ready</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span>{t('readiness.markAvailable')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100/80 flex items-start gap-2 text-xs text-slate-600 bg-[#F7F8F3]/60 p-3 rounded-xl">
                    <Info className="w-4 h-4 text-[#238B57] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800">{t('readiness.howToGet')}: </strong>
                      <span>{language === 'kn' ? item.howToObtainKn : item.howToObtainEn}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
