'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { verifyCEO } from '@/actions/admin';
import { SpecialStore } from '@/lib/specialStoreTypes';

export interface AdminData {
  uid: string;
  email: string;
  role: 'CEO' | 'Admin';
  assignedRoutes: string[];
  name?: string;
  image?: string;
  vip?: boolean;
  specialStore?: SpecialStore;
}

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAdmin: () => void = () => { };

    const unsubAuth = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);

        // Sync user to Firestore 'users' collection for search functionality
        setDoc(doc(db, 'users', authUser.uid), {
          uid: authUser.uid,
          email: authUser.email?.toLowerCase(),
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
          providerId: authUser.providerData[0]?.providerId || 'password',
          lastSeen: new Date().toISOString()
        }, { merge: true });

        // Realtime listener for the admin document
        unsubAdmin = onSnapshot(doc(db, 'admins', authUser.uid), async (docSnap) => {
          let foundAdminData: AdminData | null = docSnap.exists() ? (docSnap.data() as AdminData) : null;

          // Check if CEO by server verification (UID or email)
          const isUidCEO = await verifyCEO(authUser.uid);
          const isEmailCEO = authUser.email ? await verifyCEO(authUser.email) : false;

          // Check general settings ceoInfo email
          let isSettingsCEO = false;
          try {
            const genSettings = await getDoc(doc(db, 'settings', 'general'));
            if (genSettings.exists()) {
              const ceoEmail = genSettings.data()?.ceoInfo?.email;
              if (ceoEmail && authUser.email && ceoEmail.trim().toLowerCase() === authUser.email.trim().toLowerCase()) {
                isSettingsCEO = true;
              }
            }
          } catch (e) {
            console.warn("Error fetching general settings for CEO check:", e);
          }

          const isVerifiedCEO = isUidCEO || isEmailCEO || isSettingsCEO;

          if (foundAdminData) {
            if (isVerifiedCEO) {
              foundAdminData.role = 'CEO';
            }
            setAdminData(foundAdminData);
          } else if (isVerifiedCEO) {
            setAdminData({
              uid: authUser.uid,
              email: authUser.email || '',
              role: 'CEO',
              assignedRoutes: [
                '/ADMIN/MANAGEMENT',
                '/ADMIN/PRODUCTS',
                '/ADMIN/FOODS',
                '/ADMIN/COSMETICS',
                '/ADMIN/WEARS',
                '/ADMIN/TOILET-KITCHEN',
                '/ADMIN/UK-USED',
                '/ADMIN/INSTALLMENTS',
                '/ADMIN/COMPLAINTS',
                '/ADMIN/ORDERS',
                '/ADMIN/PARTNERSHIP',
                '/ADMIN/BROADCAST',
                '/ADMIN/SETTINGS',
                '/ADMIN/STATS',
                '/ADMIN/ABOUT'
              ]
            });
          } else {
            setAdminData(null);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Admin record listener error:", error);
          setLoading(false);
        });

      } else {
        unsubAdmin(); // Stop the listener if user signs out
        setUser(null);
        setAdminData(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubAdmin();
    };
  }, []);

  return {
    user,
    adminData,
    loading,
    isCEO: adminData?.role === 'CEO',
    isAdmin: !!adminData
  };
}
