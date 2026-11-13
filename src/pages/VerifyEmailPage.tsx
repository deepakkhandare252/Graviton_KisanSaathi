import React from 'react';
import { Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VerifyEmailPageProps {
  initialToken?: string;
  onNavigate: (view: string) => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate }) => {
  const { language } = useLanguage();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5 text-center">
        <div className="w-12 h-12 bg-[#173F2B] text-[#B9E769] rounded-xl flex items-center justify-center mx-auto shadow-sm">
          <Phone className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[#173F2B]">
            {language === 'kn'
              ? 'ಮೊಬೈಲ್ OTP ದೃಢೀಕರಣಕ್ಕೆ ಸ್ಥಳಾಂತರಿಸಲಾಗಿದೆ'
              : 'Upgraded to Mobile SMS OTP Verification'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {language === 'kn'
              ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ ಈಗ ಇಮೇಲ್ ಬದಲಾಗಿ ನಿಮ್ಮ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (+91) ಮತ್ತು SMS OTP ಮೂಲಕ ಖಾತೆಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ದೃಢೀಕರಿಸುತ್ತದೆ.'
              : 'Kisan Scheme Saathi now secures farmer accounts using your username and Indian mobile number (+91) verified via SMS OTP instead of email.'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#238B57] shrink-0" />
          <span>
            {language === 'kn'
              ? 'ಬಳಕೆದಾರಹೆಸರು ಅಥವಾ +91 ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ'
              : 'Sign in with your username or verified +91 mobile number'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{language === 'kn' ? 'ಸೈನ್ ಇನ್ ಮಾಡಿ' : 'Go to Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {language === 'kn' ? 'ಹೊಸ ಖಾತೆ ತೆರೆಯಿರಿ' : 'Register with Mobile'}
          </button>
        </div>
      </div>
    </div>
  );
};
