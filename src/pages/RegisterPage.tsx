import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Lock,
  User,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  AtSign,
  ShieldCheck,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaDistricts';
import { authService } from '../services/authService';
import { OtpDispatchResponse } from '../types/auth';
import { normalizeIndianPhone, formatIndianPhoneDisplay, validateUsername } from '../utils/phoneUtils';

interface RegisterPageProps {
  onNavigate: (view: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register, verifyOtp } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  // Step 1 fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLang, setPreferredLang] = useState<'en' | 'kn'>(language === 'kn' ? 'kn' : 'en');
  const [district, setDistrict] = useState('Dharwad');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 2 OTP state
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpDispatch, setOtpDispatch] = useState<OtpDispatchResponse | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (step !== 'OTP') return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const phoneValidation = phoneInput.trim() ? normalizeIndianPhone(phoneInput) : null;

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const userCheck = validateUsername(username);
    if (!userCheck.valid) {
      setError((language === 'kn' ? userCheck.errorKn : userCheck.errorEn) ?? 'Invalid username.');
      return;
    }
    const phoneCheck = normalizeIndianPhone(phoneInput);
    if (!phoneCheck.valid || !phoneCheck.e164) {
      setError(language === 'kn' ? phoneCheck.errorKn! : phoneCheck.errorEn!);
      return;
    }
    if (password.length < 6) {
      setError(language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳನ್ನು ಹೊಂದಿರಬೇಕು.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.' : 'Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setError(
        language === 'kn'
          ? 'ಮುಂದುವರಿಯಲು ಸೇವಾ ನಿಯಮಗಳು ಮತ್ತು ಗೌಪ್ಯತಾ ನೀತಿಯನ್ನು ಒಪ್ಪಿಕೊಳ್ಳಿ.'
          : 'Please accept the Terms of Service and Privacy Policy to continue.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const dispatch = await register({
        username: userCheck.normalized,
        fullName: fullName.trim(),
        phoneNumber: phoneCheck.e164,
        password,
        confirmPassword,
        termsAccepted,
        preferredLanguage: preferredLang,
        district
      });
      setOtpDispatch(dispatch);
      setExpirySeconds(dispatch.expiresInSeconds || 300);
      setResendCooldown(dispatch.resendCooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('OTP');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast({
        variant: dispatch.smsDelivered ? 'success' : 'info',
        title: dispatch.smsDelivered ? 'OTP Sent via SMS' : 'Account Pending Verification',
        description: dispatch.message
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      const slice = cleaned.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      slice.forEach((d, idx) => {
        next[idx] = d;
      });
      setOtpDigits(next);
      const focusIdx = Math.min(slice.length, 5);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpDispatch) return;
    setError(null);
    const otpCode = otpDigits.join('');
    if (!/^\d{6}$/.test(otpCode)) {
      setError(language === 'kn' ? 'ದಯವಿಟ್ಟು 6-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ.' : 'Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp({
        phoneNumber: otpDispatch.phoneNumber,
        otpCode,
        purpose: 'REGISTRATION'
      });
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಖಾತೆ ಸಕ್ರಿಯಗೊಂಡಿದೆ' : 'Mobile Verified & Account Active',
        description: language === 'kn' ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿಗೆ ಸ್ವಾಗತ!' : 'Welcome to Kisan Scheme Saathi!'
      });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpDispatch || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      const next = await authService.resendOtp(otpDispatch.phoneNumber, 'REGISTRATION');
      setOtpDispatch(next);
      setExpirySeconds(next.expiresInSeconds || 300);
      setResendCooldown(next.resendCooldownSeconds || 60);
      showToast({
        variant: next.smsDelivered ? 'success' : 'warning',
        title: next.smsDelivered ? 'New OTP Sent' : 'SMS Gateway Unconfigured',
        description: next.message
      });
    } catch (err: any) {
      setError(err.message || 'Could not resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#173F2B] text-[#B9E769] rounded-xl flex items-center justify-center mx-auto shadow-sm">
            {step === 'FORM' ? <UserPlus className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold text-[#173F2B] tracking-tight">
            {step === 'FORM' ? t('auth.registerTitle') : t('auth.verifyOtpTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {step === 'FORM' ? t('auth.registerSubtitle') : t('auth.verifyOtpSubtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'OTP' && otpDispatch ? (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-center">
              <p className="text-xs text-slate-600">
                {language === 'kn' ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:' : 'Verification target:'}
              </p>
              <p className="text-sm font-bold text-[#173F2B] font-mono tabular-nums">
                {otpDispatch.phoneNumberMasked}
              </p>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {t('auth.otpExpiresIn')}: <span className="font-semibold text-slate-800">{formatTimer(expirySeconds)}</span>
              </p>
            </div>

            {!otpDispatch.smsConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
                <p className="font-bold">
                  {language === 'kn' ? 'SMS ಗೇಟ್‌ವೇ ಇನ್ನೂ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ' : 'Live SMS Gateway Not Configured'}
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {language === 'kn'
                    ? 'ಈ ಪರಿಸರದಲ್ಲಿ MSG91 / Twilio / Fast2SMS ಕೀಗಳನ್ನು (.env) ನಮೂದಿಸದ ಕಾರಣ ನೈಜ SMS ಕಳುಹಿಸಲಾಗಿಲ್ಲ. ನಕಲಿ OTP ತೋರಿಸಲಾಗುವುದಿಲ್ಲ.'
                    : 'Real SMS credentials (MSG91, Twilio, or Fast2SMS) are not set in .env, so no external SMS was sent. Enter a valid OTP once configured, or sign in with the verified demo farmer account.'}
                </p>
              </div>
            )}

            {/* 6-digit Segmented OTP Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit OTP input">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  aria-label={`OTP digit ${idx + 1}`}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold font-mono rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#238B57] text-[#173F2B]"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || expirySeconds === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-[#173F2B] text-white text-sm font-semibold hover:bg-[#238B57] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.verifyOtpBtn')}</span>
                  <CheckCircle2 className="w-4 h-4 text-[#B9E769]" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('FORM');
                  setError(null);
                }}
                className="text-slate-600 hover:text-[#173F2B] inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'kn' ? 'ವಿವರ ಬದಲಾಯಿಸಿ' : 'Edit details'}</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending}
                className="inline-flex items-center gap-1.5 font-semibold text-[#238B57] hover:text-[#173F2B] disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed tabular-nums"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0
                    ? `${t('auth.resendIn')} ${resendCooldown}s`
                    : t('auth.resendOtp')}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.username')} *
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.usernamePlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{t('auth.usernameHint')}</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.fullName')} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                />
              </div>
            </div>

            {/* Indian Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.phoneNumber')} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder={t('auth.phoneNumberPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                />
              </div>
              {phoneValidation ? (
                phoneValidation.valid && phoneValidation.e164 ? (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    E.164: {formatIndianPhoneDisplay(phoneValidation.e164)}
                  </p>
                ) : (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {language === 'kn' ? phoneValidation.errorKn : phoneValidation.errorEn}
                  </p>
                )
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">{t('auth.phoneHint')}</p>
              )}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.confirmPassword')} *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.confirmPassword')}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* District & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.district')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] bg-slate-50/50"
                  >
                    {KARNATAKA_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.nameEn}>
                        {language === 'kn' ? d.nameKn : d.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.preferredLanguage')}
                </label>
                <div className="flex items-center gap-4 h-10">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredLang"
                      value="kn"
                      checked={preferredLang === 'kn'}
                      onChange={() => setPreferredLang('kn')}
                      className="text-[#238B57] focus:ring-[#238B57]"
                    />
                    <span>ಕನ್ನಡ</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="preferredLang"
                      value="en"
                      checked={preferredLang === 'en'}
                      onChange={() => setPreferredLang('en')}
                      className="text-[#238B57] focus:ring-[#238B57]"
                    />
                    <span>English</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Terms & Privacy Consent */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-[#238B57] focus:ring-[#238B57]"
              />
              <span className="text-[11px] text-slate-700 leading-relaxed">
                {t('auth.termsLabel')}
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#173F2B] text-white text-sm font-semibold hover:bg-[#238B57] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.registerBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
          <p>
            {t('auth.haveAccount')}{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-semibold text-[#173F2B] hover:underline cursor-pointer"
            >
              {t('auth.signInBtn')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
