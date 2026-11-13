import React, { useState } from 'react';
import {
  LogIn,
  Lock,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';

interface LoginPageProps {
  onNavigate: (view: string) => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onSuccess }) => {
  const { login, verifyOtp } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pending-OTP recovery if user registered but never verified
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
      showToast({
        variant: 'success',
        title: language === 'kn' ? 'ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ' : 'Signed In',
        description: language === 'kn' ? 'ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ.' : 'Welcome back to Kisan Scheme Saathi.'
      });
      if (onSuccess) {
        onSuccess();
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403 && err.data?.otpRequired && typeof err.data.phoneNumber === 'string') {
        setPendingPhone(err.data.phoneNumber);
      }
      setError(err.message || 'Login failed. Please check your username, mobile number, or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPendingOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPhone) return;
    setError(null);
    setIsLoading(true);
    try {
      await verifyOtp({ phoneNumber: pendingPhone, otpCode: otpInput.trim(), purpose: 'REGISTRATION' });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPendingOtp = async () => {
    if (!pendingPhone) return;
    try {
      const res = await authService.sendOtp(pendingPhone, 'REGISTRATION');
      showToast({
        variant: res.smsDelivered ? 'success' : 'warning',
        title: res.smsDelivered ? 'OTP Dispatched' : 'SMS Unconfigured',
        description: res.message
      });
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch OTP.');
    }
  };

  const fillDemoCredentials = () => {
    setIdentifier('basavaraj_patil');
    setPassword('Kisan@123');
    setPendingPhone(null);
    setError(null);
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
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#173F2B] tracking-tight">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Verified Demo Credentials Quick Fill */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">
                {language === 'kn' ? 'ದೃಢೀಕೃತ ರೈತ ಡೆಮೋ ಖಾತೆ' : 'Pre-seeded Verified Farmer Account'}
              </p>
              <p className="text-[11px] text-emerald-800 font-mono">
                basavaraj_patil · +919845012345
              </p>
              <p className="text-[11px] text-emerald-800 font-mono">Pass: Kisan@123</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors shrink-0 cursor-pointer"
          >
            {language === 'kn' ? 'ಭರ್ತಿ ಮಾಡಿ' : 'Fill Demo'}
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pendingPhone ? (
          <form onSubmit={handleVerifyPendingOtp} className="space-y-4 border-t border-slate-100 pt-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {language === 'kn'
                  ? `${pendingPhone} ಸಂಖ್ಯೆಗೆ 6-ಅಂಕಿಯ SMS OTP ದೃಢೀಕರಣ ಬಾಕಿ ಇದೆ.`
                  : `Complete 6-digit SMS OTP verification for ${pendingPhone}.`}
              </span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit OTP"
              className="w-full px-3 py-2.5 text-center font-mono text-base font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSendPendingOtp}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {t('auth.resendOtp')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] cursor-pointer"
              >
                {t('auth.verifyOtpBtn')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.identifier')}
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('auth.identifierPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {t('auth.password')}
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[11px] font-semibold text-[#238B57] hover:underline cursor-pointer"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57] focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#173F2B] text-white text-sm font-semibold hover:bg-[#238B57] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.signInBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
          <p>
            {t('auth.noAccount')}{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-semibold text-[#173F2B] hover:underline cursor-pointer"
            >
              {language === 'kn' ? 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ' : 'Create Farmer Account'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
