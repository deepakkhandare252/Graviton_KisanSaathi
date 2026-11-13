import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-[#173F2B] text-white border-t border-[#238B57]/30 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#238B57] flex items-center justify-center text-[#B9E769] font-bold text-lg">
                K
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                {language === 'kn' ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ' : 'Kisan Scheme Saathi'}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">
              {language === 'kn'
                ? 'ಕರ್ನಾಟಕದ ರೈತರಿಗೆ ಸರಳ, ಪಾರದರ್ಶಕ ಹಾಗೂ ನಿಯಮಾಧಾರಿತ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಅರ್ಹತೆ ಮತ್ತು ಅರ್ಜಿ ಸಿದ್ಧತಾ ವೇದಿಕೆ.'
                : 'Explainable, farmer-centric government scheme eligibility and application-readiness assistant for Karnataka, India.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#B9E769]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{t('app.karnatakaFocus')}</span>
              <span aria-hidden="true">·</span>
              <span>v2026.4</span>
            </div>
          </div>

          {/* Official Karnataka Government Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'kn' ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು' : 'Official Portals'}
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <a
                  href="https://fruits.karnataka.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#B9E769] transition-colors inline-flex items-center gap-1"
                >
                  Karnataka FRUITS Portal
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://landrecords.karnataka.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#B9E769] transition-colors inline-flex items-center gap-1"
                >
                  Bhoomi (RTC / Pahani)
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://samrakshane.karnataka.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#B9E769] transition-colors inline-flex items-center gap-1"
                >
                  Samrakshane (Crop Insurance)
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://sevasindhu.karnataka.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#B9E769] transition-colors inline-flex items-center gap-1"
                >
                  Seva Sindhu Karnataka
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Help & Centres */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'kn' ? 'ಸಹಾಯ ಹಾಗೂ ಕೇಂದ್ರಗಳು' : 'Assistance & Support'}
            </h4>
            <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p>Kisan Call Centre: <strong className="text-white">1800-180-1551</strong></p>
              <p>Karnataka Agriculture Dept: <strong className="text-white">1800-425-3553</strong></p>
              <p>Seva Sindhu Helpline: <strong className="text-white">1902</strong></p>
              <p className="text-[11px] text-slate-400 pt-2">
                Visit your local Hobli Raitha Samparka Kendra (RSK) or Grama One kiosk.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="mt-8 pt-8 border-t border-[#238B57]/30 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="text-center md:text-left">
            {t('app.disclaimer')}
          </p>
          <div className="text-slate-400 text-center md:text-right shrink-0">
            Kisan Scheme Saathi © 2026 · Karnataka Farmer Advisory System
          </div>
        </div>
      </div>
    </footer>
  );
};
