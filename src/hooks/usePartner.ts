'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export interface PartnerData {
  uid: string;
  email: string;
  status: string;
  referralCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  phoneNumber?: string;
}

export function usePartner() {
  const [user, setUser] = useState<User | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubPartner: () => void = () => {};

    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        unsubPartner = onSnapshot(doc(db, 'partners', authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setPartnerData(docSnap.data() as PartnerData);
          } else {
            setPartnerData(null);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Partner record listener error:", error);
          setLoading(false);
        });
      } else {
        unsubPartner();
        setUser(null);
        setPartnerData(null);
        setLoading(false);
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubPartner();
    };
  }, []);

  return { 
    user, 
    partnerData, 
    loading, 
    isApprovedPartner: partnerData?.status === 'approved' 
  };
}
