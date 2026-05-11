'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

export interface AdminData {
  uid: string;
  email: string;
  role: 'CEO' | 'Admin';
  assignedRoutes: string[];
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
        unsubAdmin = onSnapshot(doc(db, 'admins', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setAdminData(docSnap.data() as AdminData);
          } else if (authUser.uid === process.env.NEXT_PUBLIC_ADMIN_KEY) {
            // Hardcoded CEO fallback
            setAdminData({
              uid: authUser.uid,
              email: authUser.email || '',
              role: 'CEO',
              assignedRoutes: [
                '/ADMIN/MANAGEMENT',
                '/ADMIN/PRODUCTS',
                '/ADMIN/INSTALLMENTS',
                '/ADMIN/SETTINGS',
                '/ADMIN/STATS',
                '/ADMIN/ABOUT'
              ]
            });
          } else {
            setAdminData(null);
          }
          setLoading(false);
        });

      } else {
        setUser(null);
        setAdminData(null);
        setLoading(false);
      }
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
