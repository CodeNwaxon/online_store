'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useNewTagDurationDays() {
  const [duration, setDuration] = useState<number>(5);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      const data = snap.data();
      if (data?.newTagDurationDays !== undefined && data?.newTagDurationDays !== null) {
        setDuration(Number(data.newTagDurationDays) || 5);
      } else {
        setDuration(5);
      }
    }, (error) => {
      console.warn('New tag duration listener error:', error);
      setDuration(5);
    });
    return () => unsub();
  }, []);

  return duration;
}
