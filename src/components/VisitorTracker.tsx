'use client';

import { useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export default function VisitorTracker() {
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        // Check if this device has already been counted
        let visitorUid = localStorage.getItem('visitor_uid');

        if (visitorUid) {
          // Already has a UID — check if it's been recorded in Firestore
          const existingDoc = await getDoc(doc(db, 'visitor_ids', visitorUid));
          if (existingDoc.exists()) {
            // Already counted, do nothing
            return;
          }
        }

        // Generate a new UID if none exists
        if (!visitorUid) {
          visitorUid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('visitor_uid', visitorUid);
        }

        // Record the visitor in Firestore
        await setDoc(doc(db, 'visitor_ids', visitorUid), {
          firstVisit: new Date().toISOString(),
        });

        // Increment the current month's count (year-specific) and the general total
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = MONTH_KEYS[now.getMonth()];
        const monthKey = `${currentYear}_${currentMonth}`;

        await setDoc(
          doc(db, 'visitors', 'monthly'),
          { 
            [monthKey]: increment(1),
            total: increment(1)
          },
          { merge: true }
        );
      } catch (error) {
        // Silent fail — visitor tracking should never break the app
        console.warn('Visitor tracking error:', error);
      }
    };

    trackVisitor();
  }, []);

  return null;
}
