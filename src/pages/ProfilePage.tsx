import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
  AtSign,
  BellRing
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaDistricts';
import { authService } from '../services/authService';
import { formatIndianPhoneDisplay } from '../utils/phoneUtils';

interface ProfilePageProps {
  onNavigate: (view: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, refreshUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [district, setDistrict] = useState(user?.district || 'Dharwad');
  const [prefLang, setPrefLang] = useState<'en' | 'kn'>(user?.preferredLanguage || language);
  const [smsRemindersEnabled, setSmsRemindersEnabled] = useState<boolean>(Boolean(user?.smsRemindersEnabled));

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setDistrict(user.district || 'Dharwad');
      setPrefLang(user.preferredLanguage || 'kn');
      setSmsRemindersEnabled(Boolean(user.smsRemindersEnabled));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      await authService.updateProfile({
        fullName,
        district,
        preferredLanguage: prefLang,
        smsRemindersEnabled
      });
      await refreshUser();
      if (prefLang !== language) {
        setLanguage(prefLang);
      }
      setStatusMsg({ type: 'success', text: t('auth.profileUpdated') });
      showToast({ variant: 'success', title: t('auth.profileUpdated') });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigate('landing');
  };

  if (!user) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <p className="text-sm text-slate-600">Please sign in to view your profile.</p>
        <button
          onClick={() => onNavigate('login')}
          className="px-4 py-2 rounded-xl bg-[#173F2B] text-white text-xs font-semibold cursor-pointer"
        >
          {t('nav.login')}
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-[#173F2B] tracking-tight">
              {t('auth.profileTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {t('auth.profileSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Readonly Username & Verified Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.username')}
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  disabled
                  value={user.username}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100/70 text-slate-600 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.phoneNumber')}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled
                    value={formatIndianPhoneDisplay(user.phoneNumber)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100/70 text-slate-600 cursor-not-allowed font-mono"
                  />
                </div>
                {user.phoneVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('auth.verifiedPhoneBadge')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('auth.fullName')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
              />
            </div>
          </div>

          {/* District & Preferred Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.district')}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#238B57]"
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
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="prefLang"
                    value="kn"
                    checked={prefLang === 'kn'}
                    onChange={() => setPrefLang('kn')}
                    className="text-[#238B57] focus:ring-[#238B57]"
                  />
                  <span>ಕನ್ನಡ (Kannada)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="prefLang"
                    value="en"
                    checked={prefLang === 'en'}
                    onChange={() => setPrefLang('en')}
                    className="text-[#238B57] focus:ring-[#238B57]"
                  />
                  <span>English</span>
                </label>
              </div>
            </div>
          </div>

          {/* Optional Consented SMS Reminder Opt-in */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smsRemindersEnabled}
                onChange={(e) => setSmsRemindersEnabled(e.target.checked)}
                className="mt-0.5 rounded text-[#238B57] focus:ring-[#238B57]"
              />
              <div>
                <span className="text-xs font-bold text-[#173F2B] flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-[#238B57]" />
                  {t('auth.smsConsentLabel')}
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {t('auth.smsConsentDesc')}
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {t('nav.dashboard')}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-6 rounded-xl bg-[#173F2B] text-white text-xs font-semibold hover:bg-[#238B57] transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-[#B9E769]" />
              <span>{isSaving ? 'Saving...' : t('auth.updateProfile')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
