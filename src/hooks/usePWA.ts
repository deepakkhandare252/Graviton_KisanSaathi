import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Tracks live transitions between online and offline states for transient toast/banner UX.
 */
export function useConnectivityTransition() {
  const isOnline = useOnlineStatus();
  const prevOnline = useRef<boolean>(isOnline);
  const [transitionEvent, setTransitionEvent] = useState<'went-offline' | 'back-online' | null>(null);

  useEffect(() => {
    if (prevOnline.current !== isOnline) {
      setTransitionEvent(isOnline ? 'back-online' : 'went-offline');
      prevOnline.current = isOnline;
      if (isOnline) {
        const timer = window.setTimeout(() => setTransitionEvent(null), 5000);
        return () => window.clearTimeout(timer);
      }
    }
  }, [isOnline]);

  return {
    isOnline,
    transitionEvent,
    clearTransition: () => setTransitionEvent(null)
  };
}

/**
 * Registers the VitePWA Workbox service worker safely and exposes update/offline-ready state.
 */
export function useServiceWorkerStatus() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const updateFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let active = true;
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (!active) return;
        const updateSW = registerSW({
          immediate: true,
          onOfflineReady() {
            if (active) setOfflineReady(true);
          },
          onNeedRefresh() {
            if (active) setNeedRefresh(true);
          },
          onRegisteredSW() {
            if (active) setSwRegistered(true);
          }
        });
        updateFnRef.current = updateSW;
      })
      .catch(() => {
        // Ignore registration errors in restricted preview/test environments
      });

    return () => {
      active = false;
    };
  }, []);

  const updateServiceWorker = async () => {
    if (updateFnRef.current) {
      await updateFnRef.current(true);
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return {
    offlineReady,
    needRefresh,
    swRegistered,
    updateServiceWorker
  };
}
