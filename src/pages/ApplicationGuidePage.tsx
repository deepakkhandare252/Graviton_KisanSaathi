import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  ShieldCheck,
  Database,
  Volume2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSchemesCatalog, useSchemeApplicationGuide } from '../hooks/useSchemeQueries';
import { useReadAloud } from '../hooks/useReadAloud';

interface ApplicationGuidePageProps {
  initialSchemeId?: string;
  onNavigateToChecklist: (schemeId?: string) => void;
}

export const ApplicationGuidePage: React.FC<ApplicationGuidePageProps> = ({
  initialSchemeId,
  onNavigateToChecklist
}) => {
  const { t, language } = useLanguage();
  const { speakText } = useReadAloud();
  const { schemes, isLoading: catalogLoading, isOfflineData } = useSchemesCatalog();

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(() => {
    return initialSchemeId || 'pm-kisan-raitha-siri';
  });

  useEffect(() => {
    if (initialSchemeId) {
      setSelectedSchemeId(initialSchemeId);
    }
  }, [initialSchemeId]);

  const scheme = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];
  const { data: guideResult } = useSchemeApplicationGuide(scheme?.id || selectedSchemeId);
  const guide = guideResult?.guide;

  if (catalogLoading && !scheme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-8 w-72 bg-slate-200 rounded-xl" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (!scheme) return null;

  const steps =
    language === 'kn'
      ? guide?.stepsKn ?? scheme.applicationStepsKn
      : guide?.stepsEn ?? scheme.applicationStepsEn;
  const centres =
    language === 'kn'
      ? guide?.assistanceCentresKn ?? scheme.assistanceCentresKn
      : guide?.assistanceCentresEn ?? scheme.assistanceCentresEn;
  const officialPortalUrl = guide?.officialPortalUrl ?? scheme.officialPortalUrl;
  const informationUrl = guide?.informationUrl ?? scheme.informationUrl;
  const helplinePhone = guide?.helplinePhone ?? scheme.helplinePhone;
  const isKannada = language === 'kn';
  const schemeName = isKannada ? scheme.nameKn : scheme.nameEn;
  const noticeText = isKannada
    ? 'ಸೂಚನೆ: ಈ ಅರ್ಜಿ ಸಹಾಯಕವು ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿ ನಿಯಮಗಳನ್ನು ಆಫ್‌ಲೈನ್ ಮತ್ತು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸುತ್ತದೆ. ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಬೇಕು ಅಥವಾ ಗ್ರಾಮ ಒನ್ / ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಬೇಕು.'
    : 'Notice: This application assistant prepares your documents and validates rules offline and online. Opening the external government portal and submitting an official application requires active internet connectivity or visiting a Grama One / Raitha Samparka Kendra counter.';
  const rejectionTips = isKannada
    ? [
        'ಡಿಬಿಟಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ ಆಧಾರ್ ಅನ್ನು ಎನ್‌ಪಿಸಿಐ ಮ್ಯಾಪರ್‌ಗೆ ಲಿಂಕ್ ಮಾಡಿ.',
        'ಭೂಮಿ ಆರ್‌ಟಿಸಿಯಲ್ಲಿನ ನಿಮ್ಮ ಸರ್ವೇ ಸಂಖ್ಯೆಗಳು ಫ್ರೂಟ್ಸ್ ಐಡಿ ಪ್ರೊಫೈಲ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ ಎಂದು ಪರಿಶೀಲಿಸಿ.',
        'ಬೆಳೆ ವಿಮೆ ಕ್ಲೇಮ್‌ಗಳ ಕೊನೆಯ ದಿನಾಂಕದ ಮೊದಲು ಬೆಳೆ ಸಮೀಕ್ಷೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.'
      ]
    : [
        'Always link your Aadhaar with the NPCI mapper at your bank branch before applying for DBT.',
        'Check that your survey numbers in Bhoomi RTC match your FRUITS ID profile.',
        'Complete Bele Sameekshe crop survey before cut-off dates for crop insurance claims.'
      ];
  const fullProcedureText = [
    `${schemeName}.`,
    ...steps.map((step, index) => `${isKannada ? 'ಹಂತ' : 'Step'} ${index + 1}. ${step}`),
    `${isKannada ? 'ಸಹಾಯ ಕೇಂದ್ರಗಳು' : 'Assistance centres'}. ${centres.join('. ')}`,
    helplinePhone
      ? `${isKannada ? 'ಸಹಾಯವಾಣಿ' : 'Helpline'}: ${helplinePhone}`
      : '',
    noticeText,
    `${isKannada ? 'ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಜಿ ತಿರಸ್ಕಾರ ತಪ್ಪಿಸಲು' : 'To avoid portal rejections'}. ${rejectionTips.join(' ')}`
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {language === 'kn' ? 'ಅರ್ಜಿ ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ಕೇಂದ್ರಗಳು' : 'Karnataka Application Guidance'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
            {language === 'kn' ? 'ಅರ್ಜಿ ಸಲ್ಲಿಕೆಯ ಸಂಪೂರ್ಣ ಮಾರ್ಗದರ್ಶಿ' : 'Government Portal & Assistance Centre Walkthrough'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {language === 'kn'
              ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು, ಹೋಬಳಿ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಗಳು ಮತ್ತು ಗ್ರಾಮ ಒನ್ ಮಾರ್ಗಸೂಚಿ'
              : 'Direct verified application procedures, official URLs, and physical service desk navigation.'}
          </p>
        </div>

        <button
          onClick={() => onNavigateToChecklist(scheme.id)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-[#B9E769]" />
          <span>{t('results.viewReadiness')}</span>
        </button>
      </div>

      {/* Scheme Dropdown Selector + Cache indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            {language === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿಗಾಗಿ ಯೋಜನೆ ಆಯ್ಕೆಮಾಡಿ:' : 'Select Scheme Guide:'}
          </label>
          <select
            value={scheme.id}
            onChange={(e) => setSelectedSchemeId(e.target.value)}
            className="w-full sm:max-w-md px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
          >
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {language === 'kn' ? s.nameKn : s.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#238B57]" />
          <span>
            {isOfflineData ? t('offline.sourceIndexedDb') : t('offline.sourceNetwork')} · Verified {scheme.lastVerifiedDate}
          </span>
        </div>
      </div>

      {/* Scheme Summary Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{language === 'kn' ? scheme.categoryKn : scheme.category}</span>
          <span aria-hidden="true">·</span>
          <span>Rules Version: {scheme.rulesVersion}</span>
          <span aria-hidden="true">·</span>
          <span>{t('offline.lastVerifiedDate')}: {scheme.lastVerifiedDate}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[#173F2B]">
          {language === 'kn' ? scheme.nameKn : scheme.nameEn}
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          {language === 'kn' ? scheme.financialBenefitKn : scheme.financialBenefitEn}
        </p>

        {/* Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
          <a
            href={officialPortalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#238B57] text-white text-xs font-bold hover:bg-[#173F2B] transition-colors shadow-sm"
          >
            <span>{language === 'kn' ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ' : 'Open Official Government Portal'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {informationUrl && (
            <a
              href={informationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-[#173F2B] text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <span>{language === 'kn' ? 'ಮಾರ್ಗಸೂಚಿ ಜಿ.ಓ (GO) ಮಾಹಿತಿ' : 'Official Guidelines / Circular'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}
        </div>
      </div>

      {/* Step by step application walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#238B57]" />
              <span>{isKannada ? 'ಹಂತ-ಹಂತದ ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆ' : 'Step-by-Step Application Process'}</span>
            </h3>
            <button
              type="button"
              onClick={() => speakText(fullProcedureText)}
              className="read-aloud-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
              aria-label={isKannada ? 'ಪೂರ್ಣ ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆ ಕೇಳಿ' : 'Listen to the full application process'}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>{isKannada ? 'ಪೂರ್ಣ ಪ್ರಕ್ರಿಯೆ ಕೇಳಿ' : 'Listen to full process'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {isKannada
              ? 'ಪ್ರತಿ ಹಂತವನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಅಥವಾ ಪೂರ್ಣ ಪ್ರಕ್ರಿಯೆಯನ್ನು ಬೇಕಾದಷ್ಟು ಬಾರಿ ಕೇಳಬಹುದು.'
              : 'Replay any step or the full process as often as you need.'}
          </p>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#F7F8F3] border border-slate-300 text-[#173F2B] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="flex-1 text-xs text-slate-700 leading-relaxed pt-0.5">{step}</p>
                <button
                  type="button"
                  onClick={() => speakText(`${isKannada ? `ಹಂತ ${idx + 1}` : `Step ${idx + 1}`}. ${step}`)}
                  className="read-aloud-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors"
                  aria-label={isKannada ? `${idx + 1}ನೇ ಹಂತವನ್ನು ಕೇಳಿ` : `Listen to step ${idx + 1}`}
                  title={isKannada ? 'ಈ ಹಂತವನ್ನು ಮತ್ತೆ ಕೇಳಿ' : 'Replay this step'}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> This application assistant prepares your documents and validates rules offline and online. Opening the external government portal and submitting an official application requires active internet connectivity or visiting a Grama One / Raitha Samparka Kendra counter.
            </span>
          </div>
        </div>

        {/* Assistance Centres & Helplines */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#173F2B] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#238B57]" />
              <span>{language === 'kn' ? 'ಸಹಾಯ ಕೇಂದ್ರಗಳು' : 'Physical Assistance Centres'}</span>
            </h3>

            <div className="space-y-3">
              {centres.map((centre, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <MapPin className="w-4 h-4 text-[#238B57] shrink-0 mt-0.5" />
                  <span>{centre}</span>
                </div>
              ))}
            </div>

            {helplinePhone && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-800">
                <Phone className="w-4 h-4 text-[#238B57]" />
                <span className="font-semibold">Helpline:</span>
                <span className="text-[#173F2B] font-bold">{helplinePhone}</span>
              </div>
            )}
          </div>

          <div className="bg-[#173F2B] text-white rounded-2xl p-6 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#B9E769] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Karnataka GovTech Standards</span>
            </div>
            <h4 className="text-sm font-bold text-white">Avoid Portal Rejections</h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>• Always link your Aadhaar with the NPCI mapper at your bank branch before applying for DBT.</li>
              <li>• Check that your survey numbers in Bhoomi RTC match your FRUITS ID profile.</li>
              <li>• Complete Bele Sameekshe crop survey before cut-off dates for crop insurance claims.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
