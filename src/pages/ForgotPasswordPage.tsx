import React, { useState, useEffect } from 'react';
import { KeyRound, Phone, Lock, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authService } from '../services/authService';
import { normalizeIndianPhone } from '../utils/phoneUtils';
import { OtpDispatchResponse } from '../types/auth';

interface ForgotPasswordPageProps {
  onNavigate: (view: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [step, setStep] = useState<'PHONE' | 'RESET' | 'DONE'>('PHONE');
  const [phoneInput, setPhoneInput] = useState('');
  const [dispatchInfo, setDispatchInfo] = useState<OtpDispatchResponse | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const tmr = setInterval(() => setCooldown((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(tmr);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const phoneCheck = normalizeIndianPhone(phoneInput);
    if (!phoneCheck.valid || !phoneCheck.e164) {
      setError(language === 'kn' ? phoneCheck.errorKn! : phoneCheck.errorEn!);
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(phoneCheck.e164);
      setDispatchInfo(res);
      setCooldown(res.resendCooldownSeconds || 60);
      setStep('RESET');
      showToast({
        variant: res.smsDelivered ? 'success' : 'warning',
        title: res.smsDelivered ? 'Reset OTP Sent' : 'SMS Unconfigured',
        description: res.message
      });
    } catch (err: any) {
      setError(err.message || 'Failed to initiate password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchInfo) return;
    setError(null);

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError(language === 'kn' ? 'ಮಾನ್ಯವಾದ 6-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ.' : 'Enter a valid 6-digit OTP.');
      return;
    }
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      setError(
        language === 'kn'
          ? 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳಿದ್ದು ಎರಡೂ ಹೊಂದಿಕೆಯಾಗಬೇಕು.'
          : 'Passwords must match and be at least 6 characters.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        phoneNumber: dispatchInfo.phoneNumber,
        otpCode: otpCode.trim(),
        newPassword,
        confirmPassword
      });
      setStep('DONE');
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಲಾಗಿದೆ' : 'Password Reset Complete'
      });
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#173F2B] text-[#B9E769] rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#173F2B] tracking-tight">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">{t('auth.forgotPasswordSubtitle')}</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 'DONE' ? (
          <div className="text-center space-y-4 py-3">
            <div className="w-12 h-12 bg-emerald-100 text-[#238B57] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#173F2B]">
              {language === 'kn'
                ? 'ನಿಮ್ಮ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಉಳಿಸಲಾಗಿದೆ. ಈಗ ಲಾಗಿನ್ ಆಗಬಹುದು.'
                : 'Your password has been updated. You can now sign in.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] cursor-pointer"
            >
              {t('auth.signInBtn')}
            </button>
          </div>
        ) : step === 'RESET' && dispatchInfo ? (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {!dispatchInfo.smsConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
                {dispatchInfo.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Digit SMS OTP ({dispatchInfo.phoneNumberMasked}) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3 py-2 text-center font-mono text-base font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.newPassword')} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
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
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] cursor-pointer disabled:opacity-60"
            >
              {isLoading ? 'Updating...' : t('auth.resetPasswordBtn')}
            </button>

            <div className="flex justify-between items-center text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-slate-600 hover:text-[#173F2B] inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'kn' ? 'ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ' : 'Change number'}</span>
              </button>
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleRequestOtp}
                className="inline-flex items-center gap-1 font-semibold text-[#238B57] disabled:text-slate-400 cursor-pointer tabular-nums"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{cooldown > 0 ? `${cooldown}s` : t('auth.resendOtp')}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestOtp} className="space-y-4">
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] cursor-pointer disabled:opacity-60"
            >
              {isLoading ? 'Sending OTP...' : t('auth.sendResetOtp')}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-200 text-center text-xs">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-slate-600 hover:text-[#173F2B] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'kn' ? 'ಲಾಗಿನ್ ಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ' : 'Back to Sign In'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
