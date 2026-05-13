'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Loading() {
  const [siteName, setSiteName] = useState('Quick Choice');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists() && docSnap.data().siteName) {
          setSiteName(docSnap.data().siteName);
        }
      } catch (err) {
        console.error("Error fetching site name for loading:", err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[9999]">
      <div className="relative w-[100px] h-[100px]">
        {/* Circling Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-muted border-t-primary animate-spin" />

        {/* Small Logo in Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] overflow-hidden p-1 bg-white">
          <Image
            src="/logos.png"
            alt="Loading..."
            width={42}
            height={42}
            className="object-contain"
          />
        </div>
      </div>

      <p className="mt-6 font-bold text-primary tracking-[2px] text-sm uppercase">
        {siteName}
      </p>
    </div>
  );
}
