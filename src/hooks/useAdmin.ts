'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { verifyCEO } from '@/actions/admin';

export interface AdminData {
  uid: string;
  email: string;
  role: 'CEO' | 'Admin';
  assignedRoutes: string[];
  name?: string;
  image?: string;
}

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAdmin: () => void = () => {};

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
          if (docSnap.exists()) {
            setAdminData(docSnap.data() as AdminData);
            setLoading(false);
          } else {
            try {
              const isCEO = await verifyCEO(authUser.uid);
              if (isCEO) {
                // Hardcoded CEO fallback
                setAdminData({
                  uid: authUser.uid,
                  email: authUser.email || '',
                  role: 'CEO',
                  assignedRoutes: [
                    '/ADMIN/MANAGEMENT',
                    '/ADMIN/PRODUCTS',
                    '/ADMIN/INSTALLMENTS',
                    '/ADMIN/ORDERS',
                    '/ADMIN/SETTINGS',
                    '/ADMIN/STATS',
                    '/ADMIN/ABOUT'
                  ]
                });
              } else {
                setAdminData(null);
              }
            } catch (err) {
              console.error("verifyCEO error:", err);
              setAdminData(null);
            }
            setLoading(false);
          }
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
