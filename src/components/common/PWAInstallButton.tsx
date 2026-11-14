import React, { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWA';
import { useLanguage } from '../../contexts/LanguageContext';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t, language } = useLanguage();

  if (isInstalled) {
    return (
      <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs text-[#238B57] font-medium">
        <Check className="w-3.5 h-3.5" />
        {language === 'kn' ? 'ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಆಗಿದೆ' : 'App Installed'}
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="pwa-install-button inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-[#173F2B] px-2.5 text-xs font-semibold text-white hover:bg-[#238B57] transition-colors whitespace-nowrap shrink-0 shadow-sm sm:px-3"
        aria-label="Install Kisan Scheme Saathi Application"
      >
        <Download className="w-3.5 h-3.5 text-[#B9E769]" />
        <span className="hidden 2xl:inline">{t('nav.installApp')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="pwa-install-button inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-2.5 text-xs font-semibold text-[#173F2B] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 sm:px-3"
        >
          <Download className="w-3.5 h-3.5 text-[#238B57]" />
          <span className="hidden 2xl:inline">{language === 'kn' ? 'ಆಪಲ್‌ನಲ್ಲಿ ಇನ್‌ಸ್ಟಾಲ್' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#173F2B]">
                  {language === 'kn' ? 'ಐಫೋನ್‌ನಲ್ಲಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari bottom toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. Open Kisan Saathi directly without browser bars for field access.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-[#173F2B] py-2 text-xs font-semibold text-white hover:bg-[#238B57] transition-colors"
              >
                {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Got It'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
