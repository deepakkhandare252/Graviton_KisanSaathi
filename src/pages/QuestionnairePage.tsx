import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  MapPin,
  Tractor,
  Droplets,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaDistricts';
import { FarmerProfile } from '../types/scheme';

interface QuestionnairePageProps {
  initialProfile?: Partial<FarmerProfile>;
  onEvaluate: (profile: Partial<FarmerProfile>) => void;
}

export const QuestionnairePage: React.FC<QuestionnairePageProps> = ({
  initialProfile,
  onEvaluate
}) => {
  const { t, language } = useLanguage();

  const [step, setStep] = useState(1);

  const defaultProfile: Partial<FarmerProfile> = {
    state: 'Karnataka',
    district: 'mandya',
    farmerCategory: 'small_marginal',
    socialCategory: 'GEN',
    landHoldingAcres: 2.5,
    hasLandOwnership: true,
    annualIncome: 120000,
    age: 42,
    cropsGrown: ['Paddy'],
    hasWaterSource: true,
    hasExistingBorewell: false,
    isCooperativeMember: false,
    hasChildrenInHigherEducation: false,
    notifiedCropInHobli: true,
    hasFruitsId: true,
    fruitsIdNumber: '',
    hasRtcOrPahani: true,
    hasAadhaarBankLinked: true,
    hasCasteIncomeCertificate: false,
    hasSowingCertificate: true,
    isInstitutionalLandholder: false,
    isConstitutionalPostHolder: false,
    isGovernmentEmployee: false,
    isIncomeTaxPayee: false,
    isEnrolledInEsiOrCghs: false
  };

  const [formData, setFormData] = useState<Partial<FarmerProfile>>(() => {
    return initialProfile && Object.keys(initialProfile).length > 0
      ? { ...defaultProfile, ...initialProfile }
      : defaultProfile;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof FarmerProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.district) errs.district = 'Please select your Karnataka district.';
      if (!formData.farmerCategory) errs.farmerCategory = 'Please select farmer category.';
    }

    if (currentStep === 2) {
      if (formData.landHoldingAcres === undefined || formData.landHoldingAcres < 0) {
        errs.landHoldingAcres = 'Please enter valid landholding acres (or 0 for landless).';
      }
      if (formData.annualIncome === undefined || formData.annualIncome < 0) {
        errs.annualIncome = 'Please enter approximate annual family income.';
      }
      if (!formData.age || formData.age < 18 || formData.age > 100) {
        errs.age = 'Please enter a valid age between 18 and 100.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleComplete = () => {
    if (validateStep(step)) {
      onEvaluate(formData);
    }
  };

  const loadSampleProfile = () => {
    const sample: Partial<FarmerProfile> = {
      state: 'Karnataka',
      district: 'mandya',
      farmerCategory: 'small_marginal',
      socialCategory: 'OBC_2A',
      landHoldingAcres: 2.5,
      hasLandOwnership: true,
      annualIncome: 120000,
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
    };
    setFormData(sample);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Questionnaire Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
            {t('app.karnatakaFocus')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
            {t('questionnaire.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('questionnaire.subtitle')}
          </p>
        </div>

        <button
          onClick={loadSampleProfile}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-[#173F2B] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
          title={t('questionnaire.quickLoadDesc')}
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#238B57]" />
          <span>{t('questionnaire.quickLoad')}</span>
        </button>
      </div>

      {/* Step Progress Indicator */}
      <div className="my-8">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
          {[
            { num: 1, title: t('questionnaire.step1'), icon: MapPin },
            { num: 2, title: t('questionnaire.step2'), icon: Tractor },
            { num: 3, title: t('questionnaire.step3'), icon: Droplets },
            { num: 4, title: t('questionnaire.step4'), icon: FileCheck }
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                    isCompleted
                      ? 'bg-[#238B57] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#173F2B] text-[#B9E769] ring-2 ring-[#B9E769] ring-offset-2'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`mt-2 text-[11px] sm:text-xs font-medium line-clamp-1 ${
                    isCurrent ? 'text-[#173F2B] font-bold' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative mt-4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#238B57] transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        
        {/* STEP 1: Location & Category */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#173F2B] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#238B57]" />
              <span>{t('questionnaire.step1')}</span>
            </h2>

            {/* State (Fixed to Karnataka) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.state')}
              </label>
              <input
                type="text"
                value="Karnataka"
                disabled
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium"
              />
            </div>

            {/* Karnataka District */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.district')} *
              </label>
              <select
                value={formData.district || ''}
                onChange={(e) => updateField('district', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#238B57] focus:outline-none"
              >
                <option value="">-- {t('questionnaire.selectDistrict')} --</option>
                {KARNATAKA_DISTRICTS.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {language === 'kn' ? dist.nameKn : dist.nameEn} ({dist.region})
                  </option>
                ))}
              </select>
              {errors.district && (
                <p className="text-xs text-red-600 mt-1">{errors.district}</p>
              )}
            </div>

            {/* Farmer Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t('questionnaire.farmerCategory')} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'small_marginal', label: t('questionnaire.smallMarginal') },
                  { id: 'large', label: t('questionnaire.largeFarmer') },
                  { id: 'tenant', label: t('questionnaire.tenantFarmer') },
                  { id: 'woman_farmer', label: t('questionnaire.womanFarmer') },
                  { id: 'agricultural_laborer', label: t('questionnaire.agriLaborer') }
                ].map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.farmerCategory === cat.id
                        ? 'border-[#238B57] bg-[#F7F8F3] text-[#173F2B] font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="farmerCategory"
                      value={cat.id}
                      checked={formData.farmerCategory === cat.id}
                      onChange={() => updateField('farmerCategory', cat.id)}
                      className="text-[#238B57] focus:ring-[#238B57]"
                    />
                    <span className="text-xs">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Social Category (Affirmative welfare schemes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.socialCategory')} (For Ganga Kalyana & Targeted Subsidies)
              </label>
              <select
                value={formData.socialCategory || 'GEN'}
                onChange={(e) => updateField('socialCategory', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#238B57] focus:outline-none"
              >
                <option value="GEN">{t('questionnaire.genCategory')}</option>
                <option value="SC">{t('questionnaire.scCategory')}</option>
                <option value="ST">{t('questionnaire.stCategory')}</option>
                <option value="OBC_CAT_1">{t('questionnaire.obcCat1')}</option>
                <option value="OBC_2A">{t('questionnaire.obc2A')}</option>
                <option value="OBC_2B">{t('questionnaire.obc2B')}</option>
                <option value="OBC_3A">{t('questionnaire.obc3A')}</option>
                <option value="OBC_3B">{t('questionnaire.obc3B')}</option>
                <option value="MINORITY">{t('questionnaire.minority')}</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: Land & Farming Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#173F2B] flex items-center gap-2">
              <Tractor className="w-5 h-5 text-[#238B57]" />
              <span>{t('questionnaire.step2')}</span>
            </h2>

            {/* Land Ownership Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t('questionnaire.landOwnership')} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('hasLandOwnership', true)}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    formData.hasLandOwnership
                      ? 'border-[#238B57] bg-[#F7F8F3] text-[#173F2B] font-semibold ring-1 ring-[#238B57]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t('questionnaire.ownLand')}
                </button>
                <button
                  type="button"
                  onClick={() => updateField('hasLandOwnership', false)}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    !formData.hasLandOwnership
                      ? 'border-[#238B57] bg-[#F7F8F3] text-[#173F2B] font-semibold ring-1 ring-[#238B57]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {t('questionnaire.noLand')}
                </button>
              </div>
            </div>

            {/* Landholding in Acres */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.landAcres')} *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.landHoldingAcres ?? ''}
                onChange={(e) => updateField('landHoldingAcres', parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#238B57] focus:outline-none"
                placeholder="e.g. 2.5"
              />
              {errors.landHoldingAcres && (
                <p className="text-xs text-red-600 mt-1">{errors.landHoldingAcres}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Enter total cultivable acres owned in Karnataka. Up to 5 acres qualifies for Small & Marginal benefits.
              </p>
            </div>

            {/* Annual Income */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.annualIncome')} *
              </label>
              <input
                type="number"
                step="5000"
                min="0"
                value={formData.annualIncome ?? ''}
                onChange={(e) => updateField('annualIncome', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#238B57] focus:outline-none"
                placeholder="e.g. 120000"
              />
              {errors.annualIncome && (
                <p className="text-xs text-red-600 mt-1">{errors.annualIncome}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Used to verify income ceilings for affirmative schemes (e.g. Ganga Kalyana limit is ₹2,00,000).
              </p>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('questionnaire.farmerAge')} *
              </label>
              <input
                type="number"
                min="18"
                max="100"
                value={formData.age ?? ''}
                onChange={(e) => updateField('age', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-[#238B57] focus:outline-none"
                placeholder="e.g. 42"
              />
              {errors.age && (
                <p className="text-xs text-red-600 mt-1">{errors.age}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                Required for accidental relief schemes (Raitha Sanjeevini requires 18 to 65 years).
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Water & Agricultural Activity */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#173F2B] flex items-center gap-2">
              <Droplets className="w-5 h-5 text-[#238B57]" />
              <span>{t('questionnaire.step3')}</span>
            </h2>

            {/* Water Source */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#173F2B]">
                    {t('questionnaire.waterSource')}
                  </span>
                  <p className="text-[11px] text-slate-500">{t('questionnaire.waterSourceDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.hasWaterSource)}
                  onChange={(e) => updateField('hasWaterSource', e.target.checked)}
                  className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Existing Borewell on Land (Disqualification check for Ganga Kalyana) */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#173F2B]">
                    {t('questionnaire.existingBorewell')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Ganga Kalyana grants free borewells only to plots without an active energized borewell.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.hasExistingBorewell)}
                  onChange={(e) => updateField('hasExistingBorewell', e.target.checked)}
                  className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Cooperative Membership */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#173F2B]">
                    {t('questionnaire.cooperativeMember')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Required for cashless hospitalization under Yashaswini Health Scheme.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.isCooperativeMember)}
                  onChange={(e) => updateField('isCooperativeMember', e.target.checked)}
                  className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Children in Higher Education */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#173F2B]">
                    {t('questionnaire.higherEduChildren')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Required for Chief Minister’s Raitha Vidya Nidhi education scholarship.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.hasChildrenInHigherEducation)}
                  onChange={(e) => updateField('hasChildrenInHigherEducation', e.target.checked)}
                  className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Notified Crop Insurance */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#173F2B]">
                    {t('questionnaire.notifiedCropHobli')}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    PMFBY Samrakshane applies to notified crops (Paddy, Ragi, Maize, Groundnut, Cotton, etc.).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(formData.notifiedCropInHobli)}
                  onChange={(e) => updateField('notifiedCropInHobli', e.target.checked)}
                  className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Registrations & Statutory Exclusions */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[#173F2B] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#238B57]" />
              <span>{t('questionnaire.step4')}</span>
            </h2>

            {/* Document and ID Registrations */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#238B57]">
                Karnataka Government ID & Portal Registrations
              </h3>

              {[
                { field: 'hasFruitsId', label: t('questionnaire.fruitsId'), desc: 'Karnataka FRUITS Portal (FID)' },
                { field: 'hasRtcOrPahani', label: t('questionnaire.rtcRecord'), desc: 'Karnataka Bhoomi RTC in owner name' },
                { field: 'hasAadhaarBankLinked', label: t('questionnaire.aadhaarNpci'), desc: 'Mandatory for PM-KISAN & Raitha Siri DBT' },
                { field: 'hasCasteIncomeCertificate', label: t('questionnaire.casteIncomeCert'), desc: 'Nadakacheri RD-numbered certificate' },
                { field: 'hasSowingCertificate', label: t('questionnaire.sowingCert'), desc: 'Karnataka Bele Sameekshe Mobile App' }
              ].map((item) => (
                <div key={item.field} className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((formData as any)[item.field])}
                    onChange={(e) => updateField(item.field as any, e.target.checked)}
                    className="w-5 h-5 text-[#238B57] rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Mandatory Exclusions Disclosures */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">
                {t('questionnaire.exclusionsHeader')}
              </h3>
              <p className="text-[11px] text-slate-500">
                Check any condition that applies to you or your immediate family:
              </p>

              {[
                { field: 'isIncomeTaxPayee', label: t('questionnaire.incomeTax'), desc: 'Disqualifies from PM-KISAN / Raitha Siri' },
                { field: 'isGovernmentEmployee', label: t('questionnaire.govtEmployee'), desc: 'Regular govt/PSU staff are excluded' },
                { field: 'isConstitutionalPostHolder', label: t('questionnaire.constitutionalPost'), desc: 'Ministers, MPs, MLAs, MLCs, Mayors' },
                { field: 'isInstitutionalLandholder', label: t('questionnaire.institutionalLand'), desc: 'Trust, temple, or company land' },
                { field: 'isEnrolledInEsiOrCghs', label: t('questionnaire.esiCghs'), desc: 'Excludes from Yashaswini Co-op Health Scheme' }
              ].map((item) => (
                <div key={item.field} className="p-3.5 rounded-xl border border-red-100 bg-red-50/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-red-900">{item.label}</span>
                    <p className="text-[11px] text-red-700/80">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((formData as any)[item.field])}
                    onChange={(e) => updateField(item.field as any, e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('questionnaire.prevStep')}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors cursor-pointer shadow-sm"
            >
              <span>{t('questionnaire.nextStep')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold rounded-xl bg-[#238B57] text-white hover:bg-[#173F2B] transition-colors cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-[#B9E769]" />
              <span>{t('questionnaire.evaluateCta')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
