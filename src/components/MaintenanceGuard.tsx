'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useAdmin } from '@/hooks/useAdmin';
import { FaTools, FaSignInAlt, FaSignOutAlt, FaPowerOff, FaArrowRight } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, isCEO, adminData, loading: adminDataLoading } = useAdmin();
  const [signingIn, setSigningIn] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [ceoPreview, setCeoPreview] = useState(false);

  const isCeoUser = isCEO || adminData?.role === 'CEO' || (adminData?.assignedRoutes && adminData.assignedRoutes.includes('/ADMIN/MANAGEMENT'));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenance(!!docSnap.data().maintenanceMode);
      } else {
        setIsMaintenance(false);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Maintenance listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        lastLogin: serverTimestamp(),
      }, { merge: true });
      toast.success('Signed in!');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast.error('Sign in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCeoPreview(false);
      toast.success('Signed out.');
    } catch {
      toast.error('Sign out failed.');
    }
  };

  const handleStopMaintenance = async () => {
    setToggling(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), { maintenanceMode: false });
      toast.success('Maintenance mode turned OFF! Site is live.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to turn off maintenance mode.');
    } finally {
      setToggling(false);
    }
  };

  if (loading || adminDataLoading) {
    return null;
  }

  // If maintenance is OFF, show site normally
  if (!isMaintenance) {
    return <>{children}</>;
  }

  // If CEO chose preview mode while maintenance is active, render site with banner
  if (isCeoUser && ceoPreview) {
    return (
      <>
        <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-[1000] shadow-md">
          <span>⚠️ Maintenance mode is currently active for public users.</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStopMaintenance}
              disabled={toggling}
              className="bg-black text-white px-3 py-1 rounded text-xs hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {toggling ? 'Stopping...' : 'Stop Maintenance'}
            </button>
            <button
              onClick={() => setCeoPreview(false)}
              className="underline text-xs"
            >
              Lock View
            </button>
          </div>
        </div>
        {children}
      </>
    );
  }

  // Maintenance View (Active Maintenance)
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-6 bg-background text-foreground text-center">
      {/* Top Header with clean Sign In / User controls */}
      <header className="w-full max-w-4xl flex justify-between items-center py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary text-base md:text-lg">System Status</span>
        </div>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <FaSignInAlt /> {signingIn ? 'Signing in...' : 'Sign In'}
            </button>
          )}
        </div>
      </header>

      {/* Main Maintenance Body */}
      <main className="my-auto flex flex-col items-center justify-center max-w-md px-4 py-10">
        <FaTools size={60} className="text-primary mb-6 animate-pulse" />
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Under Maintenance</h1>
        <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed">
          We are currently performing scheduled maintenance on our website. Please check back later. We apologize for any inconvenience.
        </p>

        {/* CEO Controls in Main Area */}
        {isCeoUser && (
          <div className="w-full bg-card border border-primary/30 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 mt-2 animate-in fade-in zoom-in duration-200">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">CEO Access Granted</span>
            <p className="text-xs text-muted-foreground">Maintenance mode is currently blocking public access.</p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleStopMaintenance}
                disabled={toggling}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-secondary text-white font-bold text-xs shadow-lg shadow-secondary/20 hover:opacity-90 transition-all disabled:opacity-50"
              >
                <FaPowerOff size={14} /> {toggling ? 'Stopping...' : 'Stop Maintenance Mode'}
              </button>
              <button
                onClick={() => setCeoPreview(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border font-bold text-xs hover:bg-muted transition-colors"
              >
                Enter Site <FaArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center text-xs text-muted-foreground py-4 border-t border-border">
        &copy; {new Date().getFullYear()} All Rights Reserved.
      </footer>
    </div>
  );
}


