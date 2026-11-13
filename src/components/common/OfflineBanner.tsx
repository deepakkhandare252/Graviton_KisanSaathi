import React from 'react';
import { WifiOff, Database, Wifi, RefreshCw } from 'lucide-react';
import { useConnectivityTransition, useServiceWorkerStatus } from '../../hooks/usePWA';
import { useLanguage } from '../../contexts/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, transitionEvent, clearTransition } = useConnectivityTransition();
  const { needRefresh, updateServiceWorker } = useServiceWorkerStatus();
  const { t, language } = useLanguage();

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#173F2B] text-[#B9E769] text-xs font-medium px-4 py-2 border-b border-[#238B57]/40"
        >
          <div className="flex flex-wrap items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 text-[#B9E769] shrink-0" />
            <span>{t('offline.banner')}</span>
            <span className="hidden md:inline-flex items-center gap-1 ml-auto text-white/85 text-[11px]">
              <Database className="w-3 h-3 text-[#B9E769]" />
              {t('offline.offlineLimitations')}
            </span>
          </div>
        </div>
      )}

      {isOnline && transitionEvent === 'back-online' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-700 text-white text-xs font-medium px-4 py-2 border-b border-emerald-600"
        >
          <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#B9E769] shrink-0" />
              <span>{t('offline.backOnline')}</span>
            </div>
            <button
              type="button"
              onClick={clearTransition}
              className="text-[11px] underline text-white/90 hover:text-white cursor-pointer"
            >
              {language === 'kn' ? 'ಮುಚ್ಚಿ' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      {isOnline && needRefresh && (
        <div className="bg-[#F7F8F3] text-[#173F2B] text-xs font-medium px-4 py-2 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
            <span>
              {language === 'kn'
                ? 'ಹೊಸ ಆ್ಯಪ್ ನವೀಕರಣ ಲಭ್ಯವಿದೆ.'
                : 'An updated offline version of Kisan Scheme Saathi is available.'}
            </span>
            <button
              type="button"
              onClick={updateServiceWorker}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#173F2B] text-white text-[11px] font-semibold hover:bg-[#238B57] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'kn' ? 'ನವೀಕರಿಸಿ' : 'Update App'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
