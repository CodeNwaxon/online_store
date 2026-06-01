'use client';

import { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';

export default function FooterInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if installed
    if (localStorage.getItem('app_installed') === 'true') {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('app_installed', 'true');
      setIsInstalled(true);
    }
  };

  if (isInstalled || !deferredPrompt) return null;

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
