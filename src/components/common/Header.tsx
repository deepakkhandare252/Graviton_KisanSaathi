import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Globe,
  Sparkles,
  User,
  LogIn,
  Settings,
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  LayoutDashboard
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const {
    user,
    isAuthenticated,
    logout,
    savedSchemeIds,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const desktopNavItems = [
    { id: 'landing', label: language === 'kn' ? 'ಮುಖಪುಟ' : 'Home' },
    ...(isAuthenticated
      ? [{ id: 'dashboard', label: language === 'kn' ? 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : 'Dashboard' }]
      : []),
    { id: 'schemes', label: language === 'kn' ? 'ಯೋಜನೆಗಳು' : 'Schemes' },
    { id: 'questionnaire', label: language === 'kn' ? 'ಅರ್ಹತೆ' : 'Eligibility' },
    {
      id: 'saved',
      label: language === 'kn' ? 'ಉಳಿಸಿದವು' : 'Saved',
      badge: savedSchemeIds.size > 0 ? savedSchemeIds.size : undefined
    },
    { id: 'applications', label: language === 'kn' ? 'ಅರ್ಜಿಗಳು' : 'Applications' },
    { id: 'readiness', label: language === 'kn' ? 'ದಾಖಲೆಗಳು' : 'Checklist' },
    { id: 'guidance', label: language === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿ' : 'Guide' }
  ];

  const mobileNavItems = [
    { id: 'landing', label: t('nav.home') },
    ...(isAuthenticated ? [{ id: 'dashboard', label: t('nav.dashboard') }] : []),
    { id: 'schemes', label: t('nav.schemes') },
    { id: 'questionnaire', label: t('nav.eligibility') },
    {
      id: 'saved',
      label: t('nav.savedSchemes'),
      badge: savedSchemeIds.size > 0 ? savedSchemeIds.size : undefined
    },
    { id: 'applications', label: t('nav.myApplications') },
    { id: 'readiness', label: t('nav.readiness') },
    { id: 'guidance', label: t('nav.guidance') },
    { id: 'settings', label: t('nav.settings') }
  ];

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
    setNotifOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F8F3]/95 backdrop-blur-md border-b border-[#E2E8F0] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              onClick={() => handleNavClick('landing')}
              className="text-left group flex items-center gap-1.5 sm:gap-2 cursor-pointer focus:outline-none"
              aria-label="Kisan Scheme Saathi Home"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#173F2B] flex items-center justify-center text-[#B9E769] font-bold text-base sm:text-lg shadow-sm shrink-0">
                K
              </div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-[#173F2B] whitespace-nowrap">
                {language === 'kn' ? 'ಕಿಸಾನ್ ಸ್ಕೀಮ್ ಸಾಥಿ' : 'Kisan Scheme Saathi'}
              </span>
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden xl:flex items-center gap-3.5 text-xs font-semibold text-slate-700">
            {desktopNavItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-1.5 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#173F2B] font-bold'
                      : 'text-slate-600 hover:text-[#173F2B]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#238B57] text-white tabular-nums">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#238B57] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Utilities + Notification Bell + Auth + Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />

            {/* Notification Bell (Visible when authenticated) */}
            {isAuthenticated && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
                    notifOpen
                      ? 'bg-emerald-50 border-[#238B57] text-[#173F2B]'
                      : 'bg-white border-[#CBD5E1] text-slate-600 hover:text-[#173F2B] hover:bg-slate-50'
                  }`}
                  aria-label="Open notifications"
                  title={t('notifications.title')}
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0.9, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 bg-[#173F2B] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#B9E769]" />
                          <span className="text-xs font-bold">{t('notifications.title')}</span>
                          {unreadCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238B57] text-white font-semibold tabular-nums">
                              {unreadCount} {t('notifications.unread')}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => markAllNotificationsRead()}
                            className="text-[11px] text-[#B9E769] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>{t('notifications.markAllRead')}</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 bg-white">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center space-y-1 bg-white">
                            <p className="text-xs font-bold text-slate-800">{t('notifications.emptyTitle')}</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {t('notifications.emptyDesc')}
                            </p>
                          </div>
                        ) : (
                          notifications.slice(0, 6).map((n) => (
                            <div
                              key={n.id}
                              className={`p-3.5 text-xs transition-colors ${
                                n.isRead ? 'bg-white' : 'bg-[#F2FBF6]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  {n.urgency === 'URGENT' ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  )}
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="font-bold text-[#173F2B] leading-snug">
                                      {language === 'kn' ? n.titleKn : n.titleEn}
                                    </p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                      {language === 'kn' ? n.messageKn : n.messageEn}
                                    </p>
                                  </div>
                                </div>
                                {!n.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => markNotificationRead(n.id)}
                                    className="text-[10px] font-semibold text-[#238B57] hover:underline shrink-0 cursor-pointer"
                                  >
                                    {t('notifications.markRead')}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleNavClick('dashboard')}
                          className="w-full py-2 rounded-lg bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-[#B9E769]" />
                          <span>{t('notifications.viewAllDashboard')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Settings & Offline Icon Button */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`hidden sm:inline-flex p-2 rounded-lg border transition-colors cursor-pointer ${
                currentView === 'settings'
                  ? 'bg-emerald-50 border-[#238B57] text-[#173F2B]'
                  : 'bg-white border-[#CBD5E1] text-slate-600 hover:text-[#173F2B] hover:bg-slate-50'
              }`}
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg border border-[#CBD5E1] bg-white text-[#173F2B] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              aria-label="Switch Language between English and Kannada"
            >
              <Globe className="w-3.5 h-3.5 text-[#238B57] shrink-0" />
              <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>

            {/* Auth Button or User Profile Button */}
            {isAuthenticated && user ? (
              <button
                onClick={() => handleNavClick('profile')}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-xs shrink-0 ${
                  currentView === 'profile'
                    ? 'bg-emerald-50 border-[#238B57] text-[#173F2B]'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
                title={`${user.fullName} (@${user.username})`}
                aria-label={user.fullName}
              >
                <User className="w-3.5 h-3.5 text-[#238B57] shrink-0" />
                <span className="hidden sm:inline max-w-[96px] truncate">{user.fullName}</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('login')}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>{t('nav.login')}</span>
              </button>
            )}

            {/* Primary Action Button */}
            <button
              onClick={() => handleNavClick('questionnaire')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#173F2B] text-white hover:bg-[#238B57] transition-colors whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B9E769]" />
              <span>{t('nav.findMySchemes')}</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 sm:p-2 text-slate-700 hover:text-[#173F2B] rounded-lg cursor-pointer shrink-0"
              aria-label="Open mobile navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#E2E8F0] bg-[#F7F8F3] px-4 pt-3 pb-6 space-y-2 shadow-lg">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-[#173F2B] text-white font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#238B57] text-white tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {isAuthenticated ? (
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => handleNavClick('profile')}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 text-center"
              >
                {t('nav.profile')}
              </button>
              <button
                onClick={async () => {
                  await logout();
                  handleNavClick('landing');
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-center"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => handleNavClick('login')}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 text-center"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => handleNavClick('register')}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#238B57] text-white text-center"
              >
                {t('nav.register')}
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => handleNavClick('questionnaire')}
              className="w-full py-2.5 rounded-lg bg-[#173F2B] text-white text-xs font-semibold text-center flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#B9E769]" />
              {t('nav.findMySchemes')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
