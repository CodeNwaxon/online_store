'use client';

import { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function FooterInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast('To install the app, tap "Share" and "Add to Home Screen" on iOS, or use your browser menu on Android/Desktop.', {
        icon: 'ℹ️',
        duration: 5000,
      });
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('app_installed', 'true');
    }
  };

  return (
    <li>
      <button 
        onClick={handleInstallClick}
        className="text-primary font-bold flex items-center gap-2 text-[0.9rem]"
      >
        <FaDownload /> Install App
      </button>
    </li>
  );
}
