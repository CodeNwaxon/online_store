'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useShippingMaxDays() {
  const [maxDays, setMaxDays] = useState<number>(3);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      const data = snap.data();
      if (data?.shippingMaxDays !== undefined && data?.shippingMaxDays !== null) {
        setMaxDays(Number(data.shippingMaxDays) || 3);
      } else {
        setMaxDays(3);
      }
    }, (error) => {
      console.warn('Shipping max days listener error:', error);
      setMaxDays(3);
    });
    return () => unsub();
  }, []);

  return maxDays;
}
