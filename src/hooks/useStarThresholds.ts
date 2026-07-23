'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type StarThresholds = { [star: number]: number };

export function useStarThresholds() {
  const [thresholds, setThresholds] = useState<StarThresholds | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      const data = snap.data();
      if (data?.starThresholds) {
        setThresholds(data.starThresholds as StarThresholds);
      } else {
        // Default thresholds
        setThresholds({ 1: 20, 2: 50, 3: 100, 4: 250, 5: 500 });
      }
    }, (error) => {
      console.warn('Star thresholds listener error:', error);
      setThresholds({ 1: 20, 2: 50, 3: 100, 4: 250, 5: 500 });
    });
    return () => unsub();
  }, []);

  return thresholds;
}
