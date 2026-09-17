// frontend/src/hooks/usePWAInstall.js
// Listens for the browser's beforeinstallprompt event and exposes a
// trigger() that opens the native install UI. If unsupported, exposes a
// fallback that tells the user how to install manually.

import { useEffect, useState } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setSupported(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // If the event has already been captured by another module, prefer that
    if (window.__sonaraDeferredPrompt) {
      setDeferredPrompt(window.__sonaraDeferredPrompt);
      setSupported(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const trigger = async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    return result;
  };

  const isAndroid = /android/i.test(navigator.userAgent || '');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const isDesktop =
    !isAndroid && !isIOS && /win|mac|linux|cros/i.test(navigator.platform || '');

  return { supported, installed, trigger, isAndroid, isIOS, isDesktop };
}