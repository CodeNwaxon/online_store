'use client';

import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if already installed or dismissed in this session
      const isInstalled = localStorage.getItem('app_installed');
      if (!isInstalled) {
        // Show the prompt with a small delay
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      localStorage.setItem('app_installed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(false);
      }, 10000); // Hide after 10 seconds (matches animation)
      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('app_installed', 'true');
    }
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-5 right-5 bg-card border border-primary rounded-[var(--radius)] p-5 shadow-md z-[1000] max-w-[300px] animate-slide-in overflow-hidden">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute top-2.5 right-2.5 text-muted-foreground z-10 hover:text-foreground transition-colors"
      >
        <FaTimes />
      </button>
      <h4 className="mb-2 flex items-center gap-3 font-bold">
        <img src="/nomo_lg.png" alt="Logo" className="w-8 h-8 object-contain border border-primary rounded p-0.5" />
        Install Nomo Storez
      </h4>
      <p className="text-[0.85rem] text-muted-foreground mb-4">
        Install our app for a faster shopping experience and offline access.
      </p>
      <button 
        onClick={handleInstallClick}
        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold rounded-md p-2 transition-colors"
      >
        Install Now
      </button>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-primary w-full animate-shrink" />
    </div>
  );
}
