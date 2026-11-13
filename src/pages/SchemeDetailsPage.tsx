import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  ArrowRight,
  Building,
  Calendar,
  Phone,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Database,
  RefreshCw,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSchemesCatalog } from '../hooks/useSchemeQueries';
import { useOnlineStatus } from '../hooks/usePWA';
import { SchemeDefinition } from '../types/scheme';
import { evaluateDeadlineStatus } from '../utils/deadlineUtils';

interface SchemeDetailsPageProps {
  initialSchemeId?: string;
  onSelectSchemeForChecklist: (schemeId: string) => void;
  onNavigateToQuestionnaire: () => void;
}

export const SchemeDetailsPage: React.FC<SchemeDetailsPageProps> = ({
  initialSchemeId,
  onSelectSchemeForChecklist,
  onNavigateToQuestionnaire
}) => {
  const { t, language } = useLanguage();
  const { isSchemeSaved, toggleSaveScheme } = useAuth();
  const isOnline = useOnlineStatus();
  const {
    schemes,
    isLoading,
    isFetching,
    isError,
    isOfflineData,
    dataSource,
    cachedTimestamp,
    lastVerifiedDate,
    forceRefresh
  } = useSchemesCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeModalScheme, setActiveModalScheme] = useState<SchemeDefinition | null>(null);

  useEffect(() => {
    if (initialSchemeId && schemes.length > 0 && !activeModalScheme) {
      const matched = schemes.find((s) => s.id === initialSchemeId);
      if (matched) {
        setActiveModalScheme(matched);
      }
    }
  }, [initialSchemeId, schemes]);

  const categories = [
    'ALL',
    'Direct Financial Support',
    'Crop Insurance',
    'Irrigation & Infrastructure',
    'Affirmative Welfare & Irrigation',
    'Farm Mechanization',
    'Education & Family Welfare',
    'Safety & Social Security',
    'Healthcare & Health Insurance'
  ];

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesCategory = selectedCategory === 'ALL' || scheme.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      scheme.nameEn.toLowerCase().includes(query) ||
      scheme.nameKn.includes(query) ||
      scheme.departmentEn.toLowerCase().includes(query) ||
      scheme.financialBenefitEn.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const formattedCacheTime = cachedTimestamp
    ? new Date(cachedTimestamp).toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';

  const sourceLabel =
    dataSource === 'network' && isOnline
      ? t('offline.sourceNetwork')
      : dataSource === 'indexeddb'
      ? t('offline.sourceIndexedDb')
      : t('offline.sourceBundled');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {language === 'kn' ? 'ಕರ್ನಾಟಕ ಕೃಷಿ ದತ್ತಾಂಶ' : 'Official Karnataka Repository'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
            {language === 'kn' ? 'ಸರ್ಕಾರಿ ಕೃಷಿ ಯೋಜನೆಗಳ ಪಟ್ಟಿ' : 'Karnataka Government Agriculture Schemes'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {language === 'kn'
              ? 'ಪರಿಶೀಲಿತ ಅಧಿಕೃತ ನಿಯಮಗಳು, ಅರ್ಹತಾ ಮಾನದಂಡಗಳು ಮತ್ತು ಸಹಾಯವಾಣಿಗಳು'
              : 'Verified government policy rules, financial benefits, and direct application portals.'}
          </p>
        </div>

        <button
          onClick={onNavigateToQuestionnaire}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors shrink-0 shadow-sm cursor-pointer self-start md:self-auto"
        >
          <span>{t('hero.primaryCta')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cache & Freshness Bar (separates local cache refresh timestamp from official scheme verification date) */}
      <div className="rounded-xl bg-white border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#173F2B]">
            {isOfflineData || !isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Database className="w-3.5 h-3.5 text-[#238B57]" />
            )}
            <span>{sourceLabel}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">|</span>
          <span>
            <strong className="text-slate-700">{t('offline.cachedAt')}:</strong> {formattedCacheTime}
          </span>
          <span aria-hidden="true" className="text-slate-300">|</span>
          <span>
            <strong className="text-slate-700">{t('offline.lastVerifiedDate')}:</strong> {lastVerifiedDate}
          </span>
        </div>

        <button
          type="button"
          onClick={() => forceRefresh()}
          disabled={isFetching || !isOnline}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-[#F7F8F3] text-[#173F2B] font-semibold hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{t('offline.refreshBtn')}</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'kn'
                ? 'ಯೋಜನೆ, ಇಲಾಖೆ ಅಥವಾ ಬೆಳೆಯ ಹೆಸರಿನಿಂದ ಹುಡುಕಿ...'
                : 'Search by scheme name, department, or keyword...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
          >
            <option value="ALL">All Categories ({schemes.length})</option>
            {categories.filter((c) => c !== 'ALL').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error State with Retry */}
      {isError && schemes.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-[#173F2B]">
            {language === 'kn' ? 'ಯೋಜನೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.' : 'Could not load schemes catalog.'}
          </p>
          <button
            type="button"
            onClick={() => forceRefresh()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('offline.retryBtn')}</span>
          </button>
        </div>
      )}

      {/* Scheme Cards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:border-[#238B57] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-emerald-800">{language === 'kn' ? scheme.categoryKn : scheme.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{scheme.lastVerifiedDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaveScheme(scheme.id)}
                    title={isSchemeSaved(scheme.id) ? 'Saved' : 'Save Scheme'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSchemeSaved(scheme.id)
                        ? 'bg-emerald-50 border-emerald-300 text-[#238B57]'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {isSchemeSaved(scheme.id) ? (
                      <BookmarkCheck className="w-4 h-4 text-[#238B57]" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-[#173F2B]">
                  {language === 'kn' ? scheme.nameKn : scheme.nameEn}
                </h2>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {language === 'kn' ? scheme.financialBenefitKn : scheme.financialBenefitEn}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {language === 'kn' ? scheme.departmentKn : scheme.departmentEn}
                  </span>
                  {scheme.helplinePhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {scheme.helplinePhone}
                    </span>
                  )}
                  {(() => {
                    const dl = evaluateDeadlineStatus(
                      scheme.deadlineVerified ? scheme.applicationDeadline : null,
                      'Asia/Kolkata'
                    );
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold tabular-nums ${dl.badgeColorClass}`}>
                        <Calendar className="w-3 h-3" />
                        <span>
                          {dl.hasDeadline && dl.deadlineIso
                            ? `${dl.deadlineIso} (${dl.remainingDays !== null && dl.remainingDays >= 0 ? `${dl.remainingDays}d` : t('deadlines.expired')})`
                            : t('deadlines.rolling')}
                        </span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveModalScheme(scheme)}
                  className="text-xs font-semibold text-[#173F2B] hover:text-[#238B57] flex items-center gap-1 cursor-pointer"
                >
                  <span>{language === 'kn' ? 'ಸಂಪೂರ್ಣ ನಿಯಮಗಳು' : 'Read Verified Rules'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectSchemeForChecklist(scheme.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F7F8F3] hover:bg-slate-200 text-[#173F2B] transition-colors cursor-pointer"
                  >
                    {language === 'kn' ? 'ದಾಖಲೆ ಪಟ್ಟಿ' : 'Checklist'}
                  </button>

                  <a
                    href={scheme.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#173F2B] hover:bg-slate-100"
                    title="Official Government Portal"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Modal */}
      {activeModalScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-[#173F2B] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-[#B9E769]">
                  {language === 'kn' ? activeModalScheme.categoryKn : activeModalScheme.category}
                </span>
                <h3 className="text-lg font-bold mt-1">
                  {language === 'kn' ? activeModalScheme.nameKn : activeModalScheme.nameEn}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalScheme(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700 leading-relaxed">
              <div>
                <h4 className="font-bold text-[#173F2B] uppercase text-[11px] tracking-wider mb-1">
                  {language === 'kn' ? 'ಆರ್ಥಿಕ ಸೌಲಭ್ಯ' : 'Financial Benefit'}
                </h4>
                <p className="bg-[#F7F8F3] p-3 rounded-xl border border-slate-200">
                  {language === 'kn'
                    ? activeModalScheme.financialBenefitKn
                    : activeModalScheme.financialBenefitEn}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#173F2B] uppercase text-[11px] tracking-wider mb-2">
                  {language === 'kn' ? 'ಅರ್ಹತಾ ನಿಯಮಗಳು (ಷರತ್ತುಗಳು)' : 'Deterministic Eligibility Conditions'}
                </h4>
                <div className="space-y-2">
                  {activeModalScheme.conditions.map((cond) => (
                    <div key={cond.id} className="p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {language === 'kn' ? cond.titleKn : cond.titleEn}
                        </span>
                        {cond.isExclusion ? (
                          <span className="text-[10px] text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">
                            Disqualifying Exclusion
                          </span>
                        ) : cond.isMandatory ? (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            Mandatory
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-1">
                        {language === 'kn' ? cond.descriptionKn : cond.descriptionEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#173F2B] uppercase text-[11px] tracking-wider mb-2">
                  {language === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಕೆ ಹಂತಗಳು' : 'Application Steps'}
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
                  {(language === 'kn'
                    ? activeModalScheme.applicationStepsKn
                    : activeModalScheme.applicationStepsEn
                  ).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-4 text-slate-500">
                <a
                  href={activeModalScheme.officialPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#238B57] font-semibold underline flex items-center gap-1"
                >
                  <span>Official Portal: {activeModalScheme.officialPortalUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  const id = activeModalScheme.id;
                  setActiveModalScheme(null);
                  onSelectSchemeForChecklist(id);
                }}
                className="px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors cursor-pointer"
              >
                {t('results.viewReadiness')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
