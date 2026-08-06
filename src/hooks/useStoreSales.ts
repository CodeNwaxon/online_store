'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface StoreTypeSales {
  shop: number;
  food: number;
  furniture: number;
  toilet_kitchen: number;
  wears: number;
  cosmetics: number;
  uk_used: number;
}

export function useStoreSales() {
  const [vendorSales, setVendorSales] = useState<Record<string, number>>({});
  const [storeTypeSales, setStoreTypeSales] = useState<StoreTypeSales>({
    shop: 0,
    food: 0,
    furniture: 0,
    toilet_kitchen: 0,
    wears: 0,
    cosmetics: 0,
    uk_used: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try reading pre-aggregated settings/salesCounts first
    let unsubSalesCounts: (() => void) | null = null;

    unsubSalesCounts = onSnapshot(
      doc(db, 'settings', 'salesCounts'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const totalSum = (data.shop || 0) + (data.food || 0) + (data.furniture || 0) + (data.wears || 0) + (data.cosmetics || 0) + (data.toilet_kitchen || 0);

          if (totalSum > 0) {
            setStoreTypeSales({
              shop: Number(data.shop) || 0,
              food: Number(data.food) || 0,
              furniture: Number(data.furniture) || 0,
              toilet_kitchen: Number(data.toilet_kitchen) || 0,
              wears: Number(data.wears) || 0,
              cosmetics: Number(data.cosmetics) || 0,
              uk_used: Number(data.uk_used) || 0,
            });

            const vSales: Record<string, number> = {};

            if (data.vendors && typeof data.vendors === 'object') {
              for (const [key, val] of Object.entries(data.vendors)) {
                const numVal = Number(val) || 0;
                vSales[key] = numVal;
                vSales[key.replace(/_/g, '.')] = numVal;
              }
            }

            // Also handle flattened keys like "vendors.codewithme_nw@gmail_com"
            for (const [key, val] of Object.entries(data)) {
              if (key.startsWith('vendors.')) {
                const vendorKey = key.substring('vendors.'.length);
                const numVal = Number(val) || 0;
                vSales[vendorKey] = numVal;
                vSales[vendorKey.replace(/_/g, '.')] = numVal;
              }
            }

            setVendorSales(vSales);
            setLoading(false);
            return;
          }
        }

        // If settings/salesCounts does not exist or has 0, just use zeroes.
        // We cannot fall back to the orders collection because it requires admin permissions.
        setLoading(false);
      },
      (err) => {
        console.warn('salesCounts listener error:', err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubSalesCounts) unsubSalesCounts();
    };
  }, []);

  const getVendorSales = (email?: string | null) => {
    if (!email) return 0;
    const cleanEmail = email.toLowerCase().trim();
    const underscoreEmail = cleanEmail.replace(/\./g, '_');
    
    return vendorSales[cleanEmail] ?? 
           vendorSales[underscoreEmail] ?? 
           vendorSales[encodeURIComponent(cleanEmail)] ??
           vendorSales[encodeURIComponent(underscoreEmail)] ??
           vendorSales[cleanEmail.replace('@', '%40')] ?? 
           vendorSales[underscoreEmail.replace('@', '%40')] ?? 
           vendorSales[cleanEmail.replace('@', '%@')] ?? 
           vendorSales[underscoreEmail.replace('@', '%@')] ?? 
           0;
  };

  return { vendorSales, storeTypeSales, getVendorSales, loading };
}
