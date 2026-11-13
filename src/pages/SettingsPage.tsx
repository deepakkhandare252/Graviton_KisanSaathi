import React, { useState, useEffect } from 'react';
import {
  Globe,
  Database,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Wifi,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWAInstall, useOnlineStatus, useServiceWorkerStatus } from '../hooks/usePWA';
import { useSchemesCatalog } from '../hooks/useSchemeQueries';
import { schemeCacheDb } from '../services/schemeCacheDb';
import { schemeService } from '../services/schemeService';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const { swRegistered, offlineReady } = useServiceWorkerStatus();
  const {
    schemes,
    cachedTimestamp,
    sourceVersion,
    lastVerifiedDate,
    forceRefresh
  } = useSchemesCatalog();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [cacheSummary, setCacheSummary] = useState<{
    hasCachedCatalog: boolean;
    cachedTimestamp: string | null;
    sourceVersion: string;
    lastVerifiedDate: string;
    schemeCount: number;
  } | null>(null);

  const loadCacheSummary = async () => {
    const summary = await schemeCacheDb.getCacheSummary();
    setCacheSummary(summary);
  };

  useEffect(() => {
    loadCacheSummary();
  }, [cachedTimestamp, schemes.length]);

  const handleRefreshCache = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      await forceRefresh();
      await loadCacheSummary();
      setRefreshMessage(
        language === 'kn'
          ? 'ಯೋಜನೆಗಳ ನಿಯಮಗಳ ಸಂಗ್ರಹವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.'
          : 'Successfully synced all Karnataka scheme rules, checklists, and guides to IndexedDB.'
      );
    } catch {
      setRefreshMessage(
        language === 'kn'
          ? 'ಕ್ಯಾಶ್ ನವೀಕರಣ ವಿಫಲವಾಗಿದೆ (ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದಾಗ).'
          : 'Failed to refresh cache from server (device appears offline).'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    await schemeService.clearOfflineSchemeCache();
    await loadCacheSummary();
    setRefreshMessage(
      language === 'kn'
        ? 'ಸ್ಥಳೀಯ ಆಫ್‌ಲೈನ್ ಯೋಜನೆ ಕ್ಯಾಶ್ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ.'
        : 'Local IndexedDB scheme cache cleared. Online sync will re-populate verified schemes automatically.'
    );
  };

  const effectiveCachedAt = cacheSummary?.cachedTimestamp || cachedTimestamp;
  const formattedCachedAt = effectiveCachedAt
    ? new Date(effectiveCachedAt).toLocaleString(language === 'kn' ? 'kn-IN' : 'en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : language === 'kn'
    ? 'ಸಂಗ್ರಹಿಸಲಾಗಿಲ್ಲ'
    : 'Not yet cached';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#238B57]">
          {language === 'kn' ? 'ವ್ಯವಸ್ಥೆಯ ವಿವರಗಳು' : 'Preferences & Offline Storage'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173F2B] mt-1">
          {language === 'kn' ? 'ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ಆಫ್‌ಲೈನ್ ನಿರ್ವಹಣೆ' : 'Settings & Offline Management'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          {language === 'kn'
            ? 'ಭಾಷೆ ಬದಲಾವಣೆ, ಆಫ್‌ಲೈನ್ ಡೇಟಾ ನವೀಕರಣ ಹಾಗೂ ಭದ್ರತಾ ವಿವರಗಳು'
            : 'Configure regional language, inspect IndexedDB offline scheme cache, and verify security guarantees.'}
        </p>
      </div>

      {/* Language Preferences */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#238B57]" />
          <span>{language === 'kn' ? 'ಭಾಷಾ ಆಯ್ಕೆ' : 'Language Preferences'}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setLanguage('en')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              language === 'en'
                ? 'border-[#238B57] bg-[#F7F8F3] ring-1 ring-[#238B57]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#173F2B]">English</span>
              {language === 'en' && <CheckCircle className="w-4 h-4 text-[#238B57]" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">English interface & explanations</p>
          </button>

          <button
            onClick={() => setLanguage('kn')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              language === 'kn'
                ? 'border-[#238B57] bg-[#F7F8F3] ring-1 ring-[#238B57]'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#173F2B]">ಕನ್ನಡ (Kannada)</span>
              {language === 'kn' && <CheckCircle className="w-4 h-4 text-[#238B57]" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">ಸಂಪೂರ್ಣ ಕನ್ನಡ ಇಂಟರ್ಫೇಸ್ ಹಾಗೂ ವಿವರಣೆಗಳು</p>
          </button>
        </div>
      </div>

      {/* Offline Storage & PWA Cache */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#238B57]" />
              <span>{language === 'kn' ? 'ಸ್ಥಳೀಯ ಆಫ್‌ಲೈನ್ ಕ್ಯಾಶ್ (IndexedDB)' : 'Offline Schemes & Rules Cache (IndexedDB)'}</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {language === 'kn'
                ? 'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದಾಗಲೂ ಹೊಲದಲ್ಲಿ ಬಳಸಲು ಸಾರ್ವಜನಿಕ ಯೋಜನೆ ನಿಯಮಗಳನ್ನು ಮಾತ್ರ ಸಾಧನದಲ್ಲಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ.'
                : 'Public verified Karnataka scheme rules, checklists, and portal guides are stored persistently for rural offline access.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefreshCache}
              disabled={refreshing || !isOnline}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#173F2B] text-white hover:bg-[#238B57] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : t('offline.refreshBtn')}</span>
            </button>

            <button
              onClick={handleClearCache}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('offline.clearCacheBtn')}</span>
            </button>
          </div>
        </div>

        {refreshMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            {refreshMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-slate-200 text-xs">
            <span className="text-slate-500">Connectivity</span>
            <div className="font-bold text-[#173F2B] mt-1 flex items-center gap-1.5">
              <Wifi className={`w-4 h-4 ${isOnline ? 'text-[#238B57]' : 'text-amber-600'}`} />
              <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-slate-200 text-xs">
            <span className="text-slate-500">{t('offline.cachedAt')}</span>
            <div className="font-bold text-[#173F2B] mt-1">{formattedCachedAt}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-slate-200 text-xs">
            <span className="text-slate-500">{t('offline.lastVerifiedDate')}</span>
            <div className="font-bold text-[#173F2B] mt-1">
              {cacheSummary?.lastVerifiedDate || lastVerifiedDate} · v{cacheSummary?.sourceVersion || sourceVersion}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-slate-200 text-xs">
            <span className="text-slate-500">Service Worker & PWA</span>
            <div className="font-bold text-[#173F2B] mt-1">
              {isInstalled
                ? 'Installed App'
                : swRegistered || offlineReady
                ? 'Offline Shell Active'
                : isInstallable
                ? 'Installable PWA'
                : 'Browser Preview'}
            </div>
          </div>
        </div>

        {/* Explicit Offline Capabilities vs Online-Only Limitations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1.5">
            <div className="font-bold text-[#173F2B]">
              {language === 'kn' ? 'ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಸೇವೆಗಳು' : 'Works Offline (On Device)'}
            </div>
            <ul className="text-slate-700 space-y-1">
              <li>• Browse & search all {cacheSummary?.schemeCount || schemes.length || 8} cached Karnataka schemes</li>
              <li>• Inspect eligibility conditions, required documents & checklists</li>
              <li>• View application portal steps & Grama One assistance centres</li>
              <li>• Run local deterministic rules evaluation on cached policies</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>{language === 'kn' ? 'ಇಂಟರ್ನೆಟ್ ಅಗತ್ಯವಿರುವ ಸೇವೆಗಳು' : 'Requires Internet Connection'}</span>
            </div>
            <ul className="text-amber-900 space-y-1">
              <li>• Account login, registration & real SMS OTP verification</li>
              <li>• Syncing My Saved Schemes, Reminders & My Applications to MySQL</li>
              <li>• Live Gemini AI bilingual explanations & latest policy updates</li>
              <li>• Submitting applications on external official government portals</li>
            </ul>
          </div>
        </div>

        {isInstallable && (
          <div className="pt-2">
            <button
              onClick={install}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#238B57] text-white text-xs font-bold hover:bg-[#173F2B] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#B9E769]" />
              <span>{t('nav.installApp')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Privacy & Cache Security Guarantee */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-[#173F2B] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#238B57]" />
          <span>{language === 'kn' ? 'ಗೌಪ್ಯತೆ ಹಾಗೂ ಕ್ಯಾಶ್ ಸುರಕ್ಷತೆ' : 'Zero-PII Privacy & Secure Cache Boundaries'}</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Kisan Scheme Saathi caches only public Karnataka government scheme rules and checklists in IndexedDB and Workbox CacheStorage. Authentication tokens, SMS OTP codes, passwords, saved schemes, and private application records are never cached in the Service Worker and all user-scoped in-memory caches are immediately purged upon sign-out or account switch.
        </p>
      </div>
    </div>
  );
};
