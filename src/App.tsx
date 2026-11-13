import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { MotionConfig } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { OfflineBanner } from './components/common/OfflineBanner';
import { LandingPage } from './pages/LandingPage';
import { FarmerProfile, SchemeEligibilityResult, EligibilityStatus } from './types/scheme';
import { eligibilityService } from './services/eligibilityService';

// Route-level code splitting for secondary and interactive views
const QuestionnairePage = lazy(() =>
  import('./pages/QuestionnairePage').then((m) => ({ default: m.QuestionnairePage }))
);
const SchemeResultsPage = lazy(() =>
  import('./pages/SchemeResultsPage').then((m) => ({ default: m.SchemeResultsPage }))
);
const SchemeDetailsPage = lazy(() =>
  import('./pages/SchemeDetailsPage').then((m) => ({ default: m.SchemeDetailsPage }))
);
const ReadinessPage = lazy(() =>
  import('./pages/ReadinessPage').then((m) => ({ default: m.ReadinessPage }))
);
const ApplicationGuidePage = lazy(() =>
  import('./pages/ApplicationGuidePage').then((m) => ({ default: m.ApplicationGuidePage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const MySavedSchemesPage = lazy(() =>
  import('./pages/MySavedSchemesPage').then((m) => ({ default: m.MySavedSchemesPage }))
);
const MyApplicationsPage = lazy(() =>
  import('./pages/MyApplicationsPage').then((m) => ({ default: m.MyApplicationsPage }))
);
const ApplicationDetailsPage = lazy(() =>
  import('./pages/ApplicationDetailsPage').then((m) => ({ default: m.ApplicationDetailsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

type ViewType =
  | 'landing'
  | 'dashboard'
  | 'schemes'
  | 'questionnaire'
  | 'results'
  | 'readiness'
  | 'guidance'
  | 'settings'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-email'
  | 'saved'
  | 'applications'
  | 'application-details'
  | 'profile';

const RouteSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
    <div className="h-8 w-64 bg-slate-200 rounded-xl" />
    <div className="h-4 w-96 max-w-full bg-slate-200 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      <div className="h-48 bg-white rounded-2xl border border-slate-200" />
      <div className="h-48 bg-white rounded-2xl border border-slate-200" />
    </div>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [farmerProfile, setFarmerProfile] = useState<Partial<FarmerProfile>>({});
  const [evaluationResults, setEvaluationResults] = useState<SchemeEligibilityResult[]>([]);
  const [evaluationMeta, setEvaluationMeta] = useState<{
    evaluatedAt?: string;
    rulesVersion?: string;
    lastVerifiedDate?: string;
    evaluationMode?: 'online' | 'offline-cached-rules';
  }>({});
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('pm-kisan-raitha-siri');
  const [schemeToTrack, setSchemeToTrack] = useState<string | null>(null);
  const [eligibilityToTrack, setEligibilityToTrack] = useState<EligibilityStatus | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [verificationTokenParam, setVerificationTokenParam] = useState<string>('');
  const [isOfflineEvaluation, setIsOfflineEvaluation] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const clickAudioContextRef = useRef<AudioContext | null>(null);
  const hasWarnedClickAudioRef = useRef(false);

  useEffect(() => {
    const reportUnavailable = (error: unknown) => {
      if (hasWarnedClickAudioRef.current) return;
      hasWarnedClickAudioRef.current = true;
      console.warn('Button click sound is unavailable:', error);
    };

    const playClickSound = () => {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) {
        reportUnavailable(new Error('Web Audio API is not supported.'));
        return;
      }

      try {
        let context = clickAudioContextRef.current;
        if (!context || context.state === 'closed') {
          context = new AudioContextConstructor();
          clickAudioContextRef.current = context;
        }

        const playTone = () => {
          const now = context.currentTime;
          const sampleCount = Math.max(1, Math.floor(context.sampleRate * 0.025));
          const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
          const samples = buffer.getChannelData(0);
          for (let index = 0; index < samples.length; index += 1) {
            const fade = 1 - index / samples.length;
            samples[index] = (Math.random() * 2 - 1) * fade * fade;
          }

          const source = context.createBufferSource();
          const filter = context.createBiquadFilter();
          const gain = context.createGain();
          source.buffer = buffer;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2600, now);
          filter.frequency.exponentialRampToValueAtTime(850, now + 0.025);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
          source.connect(filter);
          filter.connect(gain);
          gain.connect(context.destination);
          source.start(now);
          source.stop(now + 0.025);
        };

        if (context.state === 'running') {
          playTone();
        } else {
          void context.resume().then(playTone).catch(reportUnavailable);
        }
      } catch (error) {
        reportUnavailable(error);
      }
    };

    const handleButtonClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('button:not(:disabled)')
      ) {
        playClickSound();
      }
    };

    document.addEventListener('click', handleButtonClick, true);
    return () => {
      document.removeEventListener('click', handleButtonClick, true);
      const context = clickAudioContextRef.current;
      clickAudioContextRef.current = null;
      if (context && context.state !== 'closed') {
        void context.close().catch(reportUnavailable);
      }
    };
  }, []);

  // Check URL params on initial load (e.g. ?view=dashboard or ?view=verify-email&token=xyz)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ViewType | null;
      const token = params.get('token');
      if (token) {
        setVerificationTokenParam(token);
      }
      if (
        viewParam &&
        [
          'landing',
          'dashboard',
          'schemes',
          'questionnaire',
          'results',
          'readiness',
          'guidance',
          'settings',
          'login',
          'register',
          'forgot-password',
          'verify-email',
          'saved',
          'applications',
          'profile'
        ].includes(viewParam)
      ) {
        setCurrentView(viewParam);
      }
    } catch {
      // ignore
    }
  }, []);

  const navigateTo = (view: string) => {
    setCurrentView(view as ViewType);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Evaluate profile and transition to Results view
  const handleEvaluate = async (profile: Partial<FarmerProfile>) => {
    setIsEvaluating(true);
    setFarmerProfile(profile);

    try {
      const outcome = await eligibilityService.evaluateProfile(profile);
      setEvaluationResults(outcome.results);
      setIsOfflineEvaluation(outcome.isEvaluatedOffline);
      setEvaluationMeta({
        evaluatedAt: outcome.evaluatedAt,
        rulesVersion: outcome.rulesVersion,
        lastVerifiedDate: outcome.lastVerifiedDate,
        evaluationMode: outcome.evaluationMode
      });
      setCurrentView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApplyPresetProfile = async (preset: Partial<FarmerProfile>) => {
    await handleEvaluate(preset);
  };

  const handleSelectSchemeForChecklist = (schemeId?: string) => {
    if (schemeId) setSelectedSchemeId(schemeId);
    setCurrentView('readiness');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSchemeForGuide = (schemeId?: string) => {
    if (schemeId) setSelectedSchemeId(schemeId);
    setCurrentView('guidance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSchemeDetails = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setCurrentView('schemes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackApplication = (schemeId: string, eligibilityStatus?: EligibilityStatus) => {
    setSelectedSchemeId(schemeId);
    setSchemeToTrack(schemeId);
    setEligibilityToTrack(eligibilityStatus || null);
    setCurrentView('applications');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectApplicationDetails = (appId: string) => {
    setSelectedApplicationId(appId);
    setCurrentView('application-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="min-h-screen flex flex-col bg-[#F7F8F3] text-[#17251D] selection:bg-[#B9E769] selection:text-[#173F2B]">
                {/* Offline / Connectivity Transition & SW Update Banner */}
                <OfflineBanner />

                {/* Top Navigation Bar */}
                <Header currentView={currentView} onNavigate={navigateTo} />

                {/* Global Loading Overlay if evaluating */}
                {isEvaluating && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 space-y-4">
                      <div className="w-10 h-10 border-3 border-[#238B57] border-t-transparent rounded-full animate-spin mx-auto" />
                      <h3 className="font-bold text-[#173F2B] text-base">Evaluating Verified Scheme Rules</h3>
                      <p className="text-xs text-slate-600">
                        Cross-referencing Karnataka land ceilings, exclusions, and prerequisite criteria...
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1">
                  <Suspense fallback={<RouteSkeleton />}>
                    {currentView === 'landing' && (
                      <LandingPage
                        onNavigate={navigateTo}
                        onSelectScheme={handleSelectSchemeDetails}
                        onApplyPresetProfile={handleApplyPresetProfile}
                      />
                    )}

                    {currentView === 'dashboard' && (
                      <DashboardPage
                        onNavigate={navigateTo}
                        onSelectSchemeForChecklist={handleSelectSchemeForChecklist}
                        onSelectSchemeForGuide={handleSelectSchemeForGuide}
                        onTrackApplication={handleTrackApplication}
                      />
                    )}

                    {currentView === 'schemes' && (
                      <SchemeDetailsPage
                        initialSchemeId={selectedSchemeId}
                        onSelectSchemeForChecklist={handleSelectSchemeForChecklist}
                        onNavigateToQuestionnaire={() => navigateTo('questionnaire')}
                      />
                    )}

                    {currentView === 'questionnaire' && (
                      <QuestionnairePage initialProfile={farmerProfile} onEvaluate={handleEvaluate} />
                    )}

                    {currentView === 'results' && (
                      <SchemeResultsPage
                        results={evaluationResults}
                        isOffline={isOfflineEvaluation}
                        evaluatedAt={evaluationMeta.evaluatedAt}
                        rulesVersion={evaluationMeta.rulesVersion}
                        onNavigateToReadiness={handleSelectSchemeForChecklist}
                        onNavigateToGuide={handleSelectSchemeForGuide}
                        onTrackApplication={handleTrackApplication}
                        onReEvaluate={() => navigateTo('questionnaire')}
                      />
                    )}

                    {currentView === 'readiness' && (
                      <ReadinessPage
                        initialSchemeId={selectedSchemeId}
                        onNavigateToGuide={handleSelectSchemeForGuide}
                      />
                    )}

                    {currentView === 'guidance' && (
                      <ApplicationGuidePage
                        initialSchemeId={selectedSchemeId}
                        onNavigateToChecklist={handleSelectSchemeForChecklist}
                      />
                    )}

                    {currentView === 'saved' && (
                      <MySavedSchemesPage
                        onNavigate={navigateTo}
                        onSelectSchemeForChecklist={handleSelectSchemeForChecklist}
                        onSelectSchemeForGuide={handleSelectSchemeForGuide}
                        onTrackApplication={handleTrackApplication}
                      />
                    )}

                    {currentView === 'applications' && (
                      <MyApplicationsPage
                        initialSchemeToTrack={schemeToTrack}
                        initialEligibilityToTrack={eligibilityToTrack}
                        onClearInitialScheme={() => {
                          setSchemeToTrack(null);
                          setEligibilityToTrack(null);
                        }}
                        onNavigate={navigateTo}
                        onSelectApplicationDetails={handleSelectApplicationDetails}
                        onSelectSchemeForChecklist={handleSelectSchemeForChecklist}
                      />
                    )}

                    {currentView === 'application-details' && (
                      <ApplicationDetailsPage
                        applicationId={selectedApplicationId}
                        onBack={() => navigateTo('applications')}
                        onSelectSchemeForChecklist={handleSelectSchemeForChecklist}
                        onSelectSchemeForGuide={handleSelectSchemeForGuide}
                      />
                    )}

                    {currentView === 'login' && (
                      <LoginPage
                        onNavigate={navigateTo}
                        onSuccess={() => navigateTo('dashboard')}
                      />
                    )}

                    {currentView === 'register' && <RegisterPage onNavigate={navigateTo} />}

                    {currentView === 'forgot-password' && (
                      <ForgotPasswordPage onNavigate={navigateTo} />
                    )}

                    {currentView === 'verify-email' && (
                      <VerifyEmailPage
                        initialToken={verificationTokenParam}
                        onNavigate={navigateTo}
                      />
                    )}

                    {currentView === 'profile' && <ProfilePage onNavigate={navigateTo} />}

                    {currentView === 'settings' && <SettingsPage />}
                  </Suspense>
                </main>

                {/* Footer */}
                <Footer />
              </div>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
