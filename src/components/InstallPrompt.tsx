'use client';

import { useState, useEffect } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';

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
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--primary)',
      borderRadius: 'var(--radius)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow)',
      zIndex: 1000,
      maxWidth: '300px',
      animation: 'slideIn 0.5s ease-out',
      overflow: 'hidden'
    }}>
      <button 
        onClick={() => setShowPrompt(false)}
        style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--muted-foreground)', zIndex: 1 }}
      >
        <FaTimes />
      </button>
      <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaDownload color="var(--primary)" /> Install App
      </h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
        Install our app for a faster shopping experience and offline access.
      </p>
      <button 
        onClick={handleInstallClick}
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.5rem' }}
      >
        Install Now
      </button>

      {/* Countdown Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '4px',
        backgroundColor: 'var(--primary)',
        width: '100%',
        animation: 'shrink 10s linear forwards'
      }} />

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
