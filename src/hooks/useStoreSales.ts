'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export interface StoreTypeSales {
  shop: number;
  food: number;
  furniture: number;
  toilet_kitchen: number;
  wears: number;
  cosmetics: number;
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const vSales: Record<string, number> = {};
        const sSales: StoreTypeSales = {
          shop: 0,
          food: 0,
          furniture: 0,
          toilet_kitchen: 0,
          wears: 0,
          cosmetics: 0,
        };

        snap.docs.forEach((doc) => {
          const order = doc.data() as any;
          // Ignore cancelled orders
          if (order.status === 'cancelled' || order.status === 'canceled') return;

          if (Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const qty = Number(item.quantity) || 1;

              // Vendor sales tracking
              if (item.vendor) {
                const emailKey = String(item.vendor).toLowerCase().trim();
                vSales[emailKey] = (vSales[emailKey] || 0) + qty;
              }

              // Every item bought from the store increments the general Shop sales count
              sSales.shop += qty;

              // Store type specific sales tracking
              const coll = String(item.collectionName || '').toLowerCase();
              const group = String(item.group || '').toLowerCase();
              const category = String(item.category || '').toLowerCase();
              const name = String(item.name || '').toLowerCase();

              const isFurniture =
                coll.includes('furniture') ||
                group.includes('furniture') ||
                category.includes('furniture') ||
                name.includes('furniture') ||
                name.includes('chair') ||
                name.includes('table') ||
                name.includes('sofa') ||
                name.includes('desk') ||
                name.includes('bed');

              if (isFurniture) {
                sSales.furniture += qty;
              } else if (coll === 'foods' || group === 'foods' || category === 'food market' || group.includes('food')) {
                sSales.food += qty;
              } else if (
                coll === 'toilet_kitchen' ||
                group.includes('toilet') ||
                group.includes('kitchen') ||
                category.includes('toilet') ||
                category.includes('kitchen')
              ) {
                sSales.toilet_kitchen += qty;
              } else if (
                coll === 'wears' ||
                group.includes('wears') ||
                group.includes('clothing') ||
                category.includes('wears')
              ) {
                sSales.wears += qty;
              } else if (coll === 'cosmetics' || group.includes('cosmetics') || category.includes('cosmetics')) {
                sSales.cosmetics += qty;
              }
            });
          }
        });

        setVendorSales(vSales);
        setStoreTypeSales(sSales);
        setLoading(false);
      },
      (err) => {
        console.warn('Orders listener error in useStoreSales:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const getVendorSales = (email?: string | null) => {
    if (!email) return 0;
    return vendorSales[email.toLowerCase().trim()] || 0;
  };

  return { vendorSales, storeTypeSales, getVendorSales, loading };
}
