import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
  Send,
  Calendar,
  Building,
  Bookmark,
  BookmarkCheck,
  PlusCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SchemeEligibilityResult, EligibilityStatus } from '../types/scheme';
import { eligibilityService } from '../services/eligibilityService';

interface SchemeResultsPageProps {
  results: SchemeEligibilityResult[];
  isOffline: boolean;
  evaluatedAt?: string;
  rulesVersion?: string;
  onNavigateToReadiness: (schemeId?: string) => void;
  onNavigateToGuide: (schemeId?: string) => void;
  onTrackApplication?: (schemeId: string, eligibilityStatus?: EligibilityStatus) => void;
  onReEvaluate: () => void;
}

export const SchemeResultsPage: React.FC<SchemeResultsPageProps> = ({
  results,
  isOffline,
  evaluatedAt,
  rulesVersion,
  onNavigateToReadiness,
  onNavigateToGuide,
  onTrackApplication,
  onReEvaluate
}) => {
  const { t, language } = useLanguage();
  const { isSchemeSaved, toggleSaveScheme } = useAuth();

  const [filter, setFilter] = useState<'ALL' | EligibilityStatus>('ALL');
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>(null);

  // Grounded AI Assistant Drawer State
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeSchemeForAI, setActiveSchemeForAI] = useState<SchemeEligibilityResult | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedSchemeId((prev) => (prev === id ? null : id));
  };

  const handleOpenAssistant = (result: SchemeEligibilityResult) => {
    setActiveSchemeForAI(result);
    setAiResponse(null);
    setUserQuestion('');
    setAssistantOpen(true);
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchemeForAI || aiLoading) return;

    setAiLoading(true);
    try {
      const response = await eligibilityService.explainResult(
        activeSchemeForAI.schemeId,
        activeSchemeForAI,
        userQuestion,
        language
      );
      setAiResponse(response);
    } catch {
      setAiResponse(
        language === 'kn'
          ? 'ವಿವರಣೆ ಪಡೆಯುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ನಿಯಮಗಳ ಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.'
          : 'Unable to generate explanation right now. Please inspect the verified rules breakdown.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Filter schemes
  const filteredResults = results.filter((res) => {
    if (filter === 'ALL') return true;
    return res.status === filter;
  });

  const eligibleCount = results.filter((r) => r.status === 'ELIGIBLE').length;
  const likelyCount = results.filter((r) => r.status === 'LIKELY_ELIGIBLE').length;
  const notEligibleCount = results.filter((r) => r.status === 'NOT_ELIGIBLE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {language === 'kn' ? 'ಅಧಿಕೃತ ನಿಯಮಗಳ ಮೌಲ್ಯಮಾಪನ' : 'Deterministic Rules Evaluation'}
            {rulesVersion ? ` · v${rulesVersion}` : ''}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
            {t('results.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('results.subtitle')}
            {evaluatedAt && (
              <span className="block text-[11px] text-slate-500 mt-1">
                {language === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ ಸಮಯ:' : 'Evaluated:'}{' '}
                {new Date(evaluatedAt).toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN')}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={onReEvaluate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-[#173F2B] hover:bg-slate-50 transition-colors shrink-0 shadow-xs cursor-pointer self-start md:self-auto"
        >
          <span>{t('results.reEvaluate')}</span>
        </button>
      </div>

      {/* Explicit Offline Evaluation Warning Banner */}
      {isOffline && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 leading-relaxed space-y-1">
            <div className="font-bold">{t('offline.offlineEvalBadge')}</div>
            <p>{t('offline.offlineEvalWarning')}</p>
          </div>
        </div>
      )}

      {/* Mandatory Statutory Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#CBD5E1] flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#238B57] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong className="text-[#173F2B]">
            {language === 'kn' ? 'ಸರ್ಕಾರಿ ಅಧಿಕೃತ ಹಕ್ಕು ನಿರಾಕರಣೆ: ' : 'Official Disclaimer: '}
          </strong>
          {t('app.disclaimer')}
        </div>
      </div>

      {/* Interactive Category Filter Tabs (Single-line controls adhering to Anti-Slop rule) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            filter === 'ALL'
              ? 'bg-white text-[#173F2B] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t('results.filterAll')} ({results.length})
        </button>

        <button
          onClick={() => setFilter('ELIGIBLE')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            filter === 'ELIGIBLE'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('results.eligible')}</span>
          <span className="tabular-nums">({eligibleCount})</span>
        </button>

        <button
          onClick={() => setFilter('LIKELY_ELIGIBLE')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            filter === 'LIKELY_ELIGIBLE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{t('results.likelyEligible')}</span>
          <span className="tabular-nums">({likelyCount})</span>
        </button>

        <button
          onClick={() => setFilter('NOT_ELIGIBLE')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
            filter === 'NOT_ELIGIBLE'
              ? 'bg-red-700 text-white shadow-xs'
              : 'text-red-800 hover:bg-red-50'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{t('results.notEligible')}</span>
          <span className="tabular-nums">({notEligibleCount})</span>
        </button>
      </div>

      {/* Results List */}
      <div className="space-y-6">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">{t('results.noSchemes')}</p>
          </div>
        ) : (
          filteredResults.map((result) => {
            const isExpanded = expandedSchemeId === result.schemeId;

            // Semantic status styling
            let statusBadge = (
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{language === 'kn' ? result.statusLabelKn : result.statusLabelEn}</span>
              </div>
            );
            let cardBorder = 'border-emerald-200 bg-white hover:border-emerald-400';

            if (result.status === 'LIKELY_ELIGIBLE') {
              statusBadge = (
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{language === 'kn' ? result.statusLabelKn : result.statusLabelEn}</span>
                </div>
              );
              cardBorder = 'border-amber-200 bg-white hover:border-amber-400';
            } else if (result.status === 'NOT_ELIGIBLE') {
              statusBadge = (
                <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{language === 'kn' ? result.statusLabelKn : result.statusLabelEn}</span>
                </div>
              );
              cardBorder = 'border-red-200 bg-white hover:border-red-300';
            }

            return (
              <div
                key={result.schemeId}
                className={`rounded-2xl border p-6 sm:p-7 shadow-xs transition-all ${cardBorder}`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    {/* Unboxed metadata with typographic separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{result.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {result.officialSource}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {t('results.lastVerified')}: {result.lastVerifiedDate}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-[#173F2B]">
                      {language === 'kn' ? result.schemeNameKn : result.schemeName}
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      <strong className="text-slate-800">
                        {language === 'kn' ? 'ಸೌಲಭ್ಯ: ' : 'Benefit: '}
                      </strong>
                      {language === 'kn' ? result.benefitsKn : result.benefitsEn}
                    </p>
                  </div>

                  <div className="shrink-0">{statusBadge}</div>
                </div>

                {/* Summary Explanation Box */}
                <div className="mt-4 p-4 rounded-xl bg-[#F7F8F3] border border-slate-200 space-y-2">
                  <div className="text-xs text-slate-800 leading-relaxed font-medium">
                    {language === 'kn' ? result.summaryExplanationKn : result.summaryExplanationEn}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-xs text-[#173F2B]">
                    <span className="font-bold shrink-0">
                      {language === 'kn' ? 'ಮುಂದಿನ ಕ್ರಮ: ' : 'Next Action: '}
                    </span>
                    <span>{language === 'kn' ? result.nextActionKn : result.nextActionEn}</span>
                  </div>
                </div>

                {/* Condition Breakdown Toggle */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <button
                    onClick={() => toggleExpand(result.schemeId)}
                    className="text-xs font-semibold text-[#238B57] hover:text-[#173F2B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {isExpanded
                        ? language === 'kn'
                          ? 'ಷರತ್ತುಗಳ ವಿವರ ಮರೆಮಾಡಿ'
                          : 'Hide Condition Breakdown'
                        : language === 'kn'
                        ? 'ಷರತ್ತುಗಳ ವಿವರ ವೀಕ್ಷಿಸಿ'
                        : 'View Verified Conditions Breakdown'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaveScheme(result.schemeId)}
                      title={isSchemeSaved(result.schemeId) ? 'Saved' : 'Save Scheme'}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        isSchemeSaved(result.schemeId)
                          ? 'bg-emerald-50 border-emerald-300 text-[#238B57]'
                          : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isSchemeSaved(result.schemeId) ? (
                        <BookmarkCheck className="w-4 h-4 text-[#238B57]" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenAssistant(result)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-[#173F2B] hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#238B57]" />
                      <span>{t('results.askAssistant')}</span>
                    </button>

                    {onTrackApplication && (
                      <button
                        onClick={() => onTrackApplication(result.schemeId, result.status)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-[#173F2B] hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#238B57]" />
                        <span>{language === 'kn' ? 'ಅರ್ಜಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track Application'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigateToReadiness(result.schemeId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors cursor-pointer shadow-xs"
                    >
                      <span>{t('results.viewReadiness')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Condition Breakdown */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {language === 'kn' ? 'ನಿಯಮಗಳ ವಿವರವಾದ ಪರಿಶೀಲನೆ' : 'Auditable Condition Evaluation'}
                    </h3>

                    <div className="space-y-3">
                      
                      {/* Satisfied Conditions (Green) */}
                      {result.satisfiedConditions.map((item, idx) => (
                        <div
                          key={`sat-${idx}`}
                          className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-xs">
                            <span className="font-semibold text-emerald-950">
                              {language === 'kn' ? item.condition.titleKn : item.condition.titleEn}
                            </span>
                            <p className="text-emerald-900/80">
                              {language === 'kn' ? item.reasonKn : item.reasonEn}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Failed Conditions (Red) */}
                      {result.failedConditions.map((item, idx) => (
                        <div
                          key={`fail-${idx}`}
                          className="p-3 rounded-xl bg-red-50/70 border border-red-200 flex items-start gap-3"
                        >
                          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-xs">
                            <span className="font-semibold text-red-950">
                              {language === 'kn' ? item.condition.titleKn : item.condition.titleEn}
                            </span>
                            <p className="text-red-900/80">
                              {language === 'kn' ? item.reasonKn : item.reasonEn}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Unknown / Verification Required Conditions (Amber) */}
                      {result.unknownConditions.map((item, idx) => (
                        <div
                          key={`unk-${idx}`}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3"
                        >
                          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 text-xs">
                            <span className="font-semibold text-amber-950">
                              {language === 'kn' ? item.condition.titleKn : item.condition.titleEn}
                            </span>
                            <p className="text-amber-900/80">
                              {language === 'kn' ? item.reasonKn : item.reasonEn}
                            </p>
                          </div>
                        </div>
                      ))}

                    </div>

                    <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
                      <a
                        href={result.officialPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#173F2B] underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>Official Portal: {result.officialPortalUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Grounded Gemini Explainer Drawer */}
      {assistantOpen && activeSchemeForAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Drawer Header */}
            <div className="p-5 bg-[#173F2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#B9E769]" />
                <div>
                  <h3 className="font-bold text-sm">
                    {t('assistant.title')} — {language === 'kn' ? activeSchemeForAI.schemeNameKn : activeSchemeForAI.schemeName}
                  </h3>
                  <span className="text-[11px] text-[#B9E769]">
                    Status: {activeSchemeForAI.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grounding Notice */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
              {t('assistant.groundingNotice')}
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-[#F7F8F3] border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-[#173F2B]">
                  {language === 'kn' ? 'ನಿಯಮಾಧಾರಿತ ತೀರ್ಪು' : 'Authoritative Rules Verdict'}
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {language === 'kn'
                    ? activeSchemeForAI.summaryExplanationKn
                    : activeSchemeForAI.summaryExplanationEn}
                </p>
              </div>

              {aiResponse ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed whitespace-pre-line">
                  {aiResponse}
                </div>
              ) : aiLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>{t('assistant.loading')}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 p-2">
                  {language === 'kn'
                    ? 'ಈ ಫಲಿತಾಂಶದ ಬಗ್ಗೆ ಸ್ಪಷ್ಟನೆ ಅಥವಾ ಮುಂದಿನ ಹಂತಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ.'
                    : 'Ask any clarifying question regarding this result, documents, or official application portal steps.'}
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAskAssistant} className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder={t('assistant.askPlaceholder')}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2.5 rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('assistant.send')}</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
