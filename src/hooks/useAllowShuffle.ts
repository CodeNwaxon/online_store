'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useAllowShuffle(storeKey: string) {
  const [allowShuffle, setAllowShuffle] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!storeKey) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'settings', 'shuffle'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setAllowShuffle(!!data?.[storeKey]);
        } else {
          setAllowShuffle(false);
        }
        setLoading(false);
      },
      (error) => {
        console.warn(`Error listening to shuffle settings for ${storeKey}:`, error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [storeKey]);

  return { allowShuffle, loading };
}
