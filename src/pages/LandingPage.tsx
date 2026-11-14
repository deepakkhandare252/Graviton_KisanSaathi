import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wifi,
  ExternalLink,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSchemesCatalog } from '../hooks/useSchemeQueries';
import { VERIFIED_SCHEMES } from '../data/schemesData';
import { FarmerProfile } from '../types/scheme';
import { evaluateDeadlineStatus } from '../utils/deadlineUtils';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onSelectScheme: (schemeId: string) => void;
  onApplyPresetProfile: (profile: Partial<FarmerProfile>) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onSelectScheme,
  onApplyPresetProfile
}) => {
  const { t, language } = useLanguage();
  const { isSchemeSaved, toggleSaveScheme } = useAuth();
  const { schemes: catalogSchemes } = useSchemesCatalog();

  const samplePersonas = [
    {
      titleEn: 'Small Paddy Farmer (Mandya)',
      titleKn: 'ಸಣ್ಣ ಭತ್ತದ ರೈತ (ಮಂಡ್ಯ)',
      descEn: '2.5 Acres, Canal Irrigated, FRUITS ID & Aadhaar linked',
      descKn: '2.5 ಎಕರೆ, ನಾಲಾ ನೀರಾವರಿ, ಫ್ರೂಟ್ಸ್ ಐಡಿ ಹಾಗೂ ಆಧಾರ್ ಲಿಂಕ್ ಆಗಿದೆ',
      badgeEn: 'Eligible: Raitha Siri & PMFBY',
      badgeKn: 'ಅರ್ಹ: ರೈತ ಸಿರಿ ಮತ್ತು ಬೆಳೆ ವಿಮೆ',
      profile: {
        state: 'Karnataka',
        district: 'mandya',
        farmerCategory: 'small_marginal',
        socialCategory: 'OBC_3A',
        landHoldingAcres: 2.5,
        hasLandOwnership: true,
        annualIncome: 140000,
        age: 44,
        cropsGrown: ['Paddy', 'Sugarcane'],
        hasWaterSource: true,
        hasExistingBorewell: false,
        isCooperativeMember: true,
        hasChildrenInHigherEducation: true,
        notifiedCropInHobli: true,
        hasFruitsId: true,
        fruitsIdNumber: 'FID-KA-2026-98124',
        hasRtcOrPahani: true,
        hasAadhaarBankLinked: true,
        hasCasteIncomeCertificate: true,
        hasSowingCertificate: true,
        isInstitutionalLandholder: false,
        isConstitutionalPostHolder: false,
        isGovernmentEmployee: false,
        isIncomeTaxPayee: false,
        isEnrolledInEsiOrCghs: false
      } as Partial<FarmerProfile>
    },
    {
      titleEn: 'Dryland SC/ST Farmer (Kalaburagi)',
      titleKn: 'ಒಣಭೂಮಿ ಎಸ್‌ಸಿ/ಎಸ್‌ಟಿ ರೈತ (ಕಲಬುರಗಿ)',
      descEn: '3.5 Acres, Rainfed Red Gram, Needs Irrigation Borewell',
      descKn: '3.5 ಎಕರೆ ಒಣಭೂಮಿ, ತೊಗರಿ ಬೆಳೆ, ಕೊಳವೆಬಾವಿ ಅಗತ್ಯವಿದೆ',
      badgeEn: 'Target: Ganga Kalyana Borewell',
      badgeKn: 'ಗುರಿ: ಗಂಗಾ ಕಲ್ಯಾಣ ಕೊಳವೆಬಾವಿ',
      profile: {
        state: 'Karnataka',
        district: 'kalaburagi',
        farmerCategory: 'small_marginal',
        socialCategory: 'SC',
        landHoldingAcres: 3.5,
        hasLandOwnership: true,
        annualIncome: 95000,
        age: 38,
        cropsGrown: ['Red Gram', 'Jowar'],
        hasWaterSource: false,
        hasExistingBorewell: false,
        isCooperativeMember: false,
        hasChildrenInHigherEducation: false,
        notifiedCropInHobli: true,
        hasFruitsId: true,
        fruitsIdNumber: 'FID-KA-2026-44321',
        hasRtcOrPahani: true,
        hasAadhaarBankLinked: true,
        hasCasteIncomeCertificate: true,
        hasSowingCertificate: true,
        isInstitutionalLandholder: false,
        isConstitutionalPostHolder: false,
        isGovernmentEmployee: false,
        isIncomeTaxPayee: false,
        isEnrolledInEsiOrCghs: false
      } as Partial<FarmerProfile>
    },
    {
      titleEn: 'Dairy & Arecanut Farmer (Shivamogga)',
      titleKn: 'ಡೈರಿ ಮತ್ತು ಅಡಿಕೆ ಬೆಳೆಗಾರ (ಶಿವಮೊಗ್ಗ)',
      descEn: '4.0 Acres, Drip Irrigation, Milk Cooperative Member',
      descKn: '4.0 ಎಕರೆ, ಹನಿ ನೀರಾವರಿ, ಹಾಲು ಒಕ್ಕೂಟದ ಸಕ್ರಿಯ ಸದಸ್ಯ',
      badgeEn: 'Target: Yashaswini & Micro-Irrigation',
      badgeKn: 'ಗುರಿ: ಯಶಸ್ವಿನಿ ಮತ್ತು ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ',
      profile: {
        state: 'Karnataka',
        district: 'shivamogga',
        farmerCategory: 'small_marginal',
        socialCategory: 'GEN',
        landHoldingAcres: 4.0,
        hasLandOwnership: true,
        annualIncome: 210000,
        age: 51,
        cropsGrown: ['Arecanut', 'Pepper'],
        hasWaterSource: true,
        hasExistingBorewell: true,
        isCooperativeMember: true,
        hasChildrenInHigherEducation: true,
        notifiedCropInHobli: true,
        hasFruitsId: true,
        fruitsIdNumber: 'FID-KA-2026-77889',
        hasRtcOrPahani: true,
        hasAadhaarBankLinked: true,
        hasCasteIncomeCertificate: false,
        hasSowingCertificate: true,
        isInstitutionalLandholder: false,
        isConstitutionalPostHolder: false,
        isGovernmentEmployee: false,
        isIncomeTaxPayee: false,
        isEnrolledInEsiOrCghs: false
      } as Partial<FarmerProfile>
    }
  ];

  const featuredSchemes = (catalogSchemes.length > 0 ? catalogSchemes : VERIFIED_SCHEMES).slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24">
      
      {/* Hero Section */}
      <section className="landing-hero relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-20 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Clean Sub-header metadata (Anti-slop: unboxed text with separators) */}
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#238B57]">
                <span>Karnataka AgriTech</span>
                <span aria-hidden="true">·</span>
                <span>GovTech Karnataka</span>
                <span aria-hidden="true">·</span>
                <span>Verified Schemes</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#173F2B] tracking-tight leading-[1.15] text-balance">
                {t('hero.title')}
              </h1>

              <p className="text-sm sm:text-base text-slate-700 max-w-xl leading-relaxed">
                {t('hero.description')}
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
                <button
                  onClick={() => onNavigate('questionnaire')}
                  className="button-primary inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#B9E769]" />
                  <span>{t('hero.primaryCta')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('schemes')}
                  className="button-secondary inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-[#173F2B] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-[#238B57]" />
                  <span>{t('hero.secondaryCta')}</span>
                </button>
              </div>

              {/* Trust Indicators / Stats */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-xl font-bold text-[#173F2B] tabular-nums">8+</div>
                  <div className="text-slate-500 font-medium">{t('hero.statsSchemes')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#173F2B] tabular-nums">31</div>
                  <div className="text-slate-500 font-medium">{t('hero.statsDistricts')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#238B57] flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Rules</span>
                  </div>
                  <div className="text-slate-500 font-medium">{t('hero.statsExplainable')}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#173F2B]">KN / EN</div>
                  <div className="text-slate-500 font-medium">{t('hero.statsLanguages')}</div>
                </div>
              </div>
            </div>

            {/* Right Media Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-100 aspect-[16/10] sm:aspect-[4/3] group">
                <img
                  src="/src/assets/images/kisan_hero_banner_1794299263203.jpg"
                  alt="Lush green farmland in rural Karnataka with modern irrigation"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Styled graceful CSS fallback
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Fallback container underneath */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#173F2B] via-[#238B57] to-[#B9E769]/30 -z-10 flex flex-col items-center justify-center p-6 text-white text-center">
                  <ShieldCheck className="w-12 h-12 text-[#B9E769] mb-3" />
                  <h3 className="font-bold text-lg">Kisan Scheme Saathi</h3>
                  <p className="text-xs text-white/80 mt-1 max-w-xs">
                    Empowering Karnataka farmers with deterministic rules and verified readiness.
                  </p>
                </div>

                {/* Subtle scrim with trust callout */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#B9E769]" />
                      Bhoomi & FRUITS ID Compliant
                    </span>
                    <span className="text-slate-300">Karnataka Govt Guidelines</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Quick Interactive Personas for Instant Demonstration */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
                {language === 'kn' ? 'ತ್ವರಿತ ಪರೀಕ್ಷೆ' : 'Instant Demonstration'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#173F2B] mt-1">
                {language === 'kn' ? 'ಮಾದರಿ ರೈತರ ಪ್ರೊಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ' : 'Select a Real-World Karnataka Farmer Profile'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {language === 'kn'
                  ? 'ಫಲಿತಾಂಶಗಳ ನಿಖರತೆಯನ್ನು ಪರೀಕ್ಷಿಸಲು ಯಾವುದೇ ಒಂದು ಮಾದರಿಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ'
                  : 'Click any profile below to evaluate deterministic eligibility across all 8 schemes instantly'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('questionnaire')}
              className="text-xs font-semibold text-[#238B57] hover:text-[#173F2B] underline cursor-pointer whitespace-nowrap"
            >
              {language === 'kn' ? 'ಖಾಲಿ ಪ್ರಶ್ನಾವಳಿ ತೆರೆಯಿರಿ →' : 'Or fill custom questionnaire →'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {samplePersonas.map((persona, index) => (
              <div
                key={index}
                onClick={() => onApplyPresetProfile(persona.profile)}
                className="group p-5 rounded-xl border border-slate-200 hover:border-[#238B57] hover:bg-[#F7F8F3]/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-[#238B57] font-semibold mb-1">
                    {language === 'kn' ? persona.badgeKn : persona.badgeEn}
                  </div>
                  <h3 className="text-base font-bold text-[#173F2B] group-hover:text-[#238B57] transition-colors">
                    {language === 'kn' ? persona.titleKn : persona.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {language === 'kn' ? persona.descKn : persona.descEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#173F2B] group-hover:text-[#238B57]">
                  <span>{language === 'kn' ? 'ಅರ್ಹತೆ ಪರೀಕ್ಷಿಸಿ' : 'Test This Farmer'}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three-Step Process */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {t('app.tagline')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#173F2B] mt-2">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F7F8F3] text-[#173F2B] flex items-center justify-center font-bold text-xl border border-slate-200">
                01
              </div>
              <h3 className="text-lg font-bold text-[#173F2B]">
                {t('howItWorks.step1Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('howItWorks.step1Desc')}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
              Zero Aadhaar or sensitive banking numbers requested.
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#238B57]/40 shadow-xs flex flex-col justify-between relative">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#238B57] text-[#B9E769] flex items-center justify-center font-bold text-xl">
                02
              </div>
              <h3 className="text-lg font-bold text-[#173F2B]">
                {t('howItWorks.step2Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('howItWorks.step2Desc')}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3 text-xs font-semibold">
              <span className="text-[#238B57] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
              </span>
              <span className="text-amber-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Likely
              </span>
              <span className="text-red-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Ineligible
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#F7F8F3] text-[#173F2B] flex items-center justify-center font-bold text-xl border border-slate-200">
                03
              </div>
              <h3 className="text-lg font-bold text-[#173F2B]">
                {t('howItWorks.step3Title')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('howItWorks.step3Desc')}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
              Direct access to FRUITS, Seva Sindhu, and Samrakshane.
            </div>
          </div>

        </div>
      </section>

      {/* Featured Verified Schemes Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
              {language === 'kn' ? 'ಪರಿಶೀಲಿತ ಯೋಜನೆಗಳು' : 'Karnataka Agriculture Catalog'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#173F2B] mt-1">
              {language === 'kn' ? 'ಪ್ರಮುಖ ಕೃಷಿ ಹಾಗೂ ಕ್ಷೇಮಾಭಿವೃದ್ಧಿ ಯೋಜನೆಗಳು' : 'Verified Schemes Ready for Evaluation'}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('schemes')}
            className="text-xs font-semibold text-[#238B57] hover:text-[#173F2B] flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'kn' ? 'ಎಲ್ಲಾ 8 ಯೋಜನೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : 'View all 8 schemes'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-[#238B57] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-800">{language === 'kn' ? scheme.categoryKn : scheme.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Verified: {scheme.lastVerifiedDate}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveScheme(scheme.id);
                    }}
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

                <h3 className="text-lg font-bold text-[#173F2B]">
                  {language === 'kn' ? scheme.nameKn : scheme.nameEn}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {language === 'kn' ? scheme.financialBenefitKn : scheme.financialBenefitEn}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-1 gap-x-4 text-[11px] text-slate-500">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>Conditions: {scheme.conditions.length} Verified Rules</span>
                    <span>Prerequisites: {scheme.prerequisites.length} Documents</span>
                  </div>
                  {(() => {
                    const dl = evaluateDeadlineStatus(
                      scheme.deadlineVerified ? scheme.applicationDeadline : null,
                      'Asia/Kolkata'
                    );
                    if (dl.hasDeadline && dl.deadlineIso) {
                      return (
                        <span className={`px-2 py-0.5 rounded-md border font-semibold tabular-nums ${dl.badgeColorClass}`}>
                          {language === 'kn' ? 'ಕೊನೆಯ ದಿನಾಂಕ:' : 'Cutoff:'} {dl.deadlineIso}
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-md border bg-slate-50 border-slate-200 text-slate-600 font-medium">
                        {t('deadlines.rolling')}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectScheme(scheme.id)}
                  className="text-xs font-semibold text-[#173F2B] hover:text-[#238B57] flex items-center gap-1 cursor-pointer"
                >
                  <span>{language === 'kn' ? 'ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ' : 'View Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={scheme.officialPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span>{language === 'kn' ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್' : 'Official Portal'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Offline PWA & Reliability Proof */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-[#173F2B] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
            <div className="md:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#238B57]/40 text-[#B9E769] text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                {language === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಹಾಗೂ ಗ್ರಾಮ ಮಟ್ಟದ ಬಳಕೆ' : 'Field Ready Offline Architecture'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {t('offline.pwaTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {t('offline.pwaDesc')}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('questionnaire')}
                  className="px-6 py-3 rounded-xl bg-[#B9E769] text-[#173F2B] text-xs font-bold hover:bg-white transition-colors cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {language === 'kn' ? 'ಈಗಲೇ ಪರೀಕ್ಷಿಸಿ' : 'Launch Questionnaire'}
                </button>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-center">
              <div className="w-40 h-40 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center">
                <FileCheck2 className="w-10 h-10 text-[#B9E769] mb-2" />
                <span className="text-xs font-bold text-white">100% Deterministic</span>
                <span className="text-[10px] text-slate-300 mt-1">
                  Java Spring Boot Rules Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
