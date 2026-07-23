'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';

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
    // 1. Try reading pre-aggregated settings/salesCounts first
    let unsubSalesCounts: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;

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
            });

            if (data.vendors && typeof data.vendors === 'object') {
              const vSales: Record<string, number> = {};
              for (const [key, val] of Object.entries(data.vendors)) {
                const numVal = Number(val) || 0;
                vSales[key] = numVal;
                vSales[key.replace(/_/g, '.')] = numVal;
              }
              setVendorSales(vSales);
            }
            setLoading(false);
            return;
          }
        }

        // If settings/salesCounts does not exist or has 0, compute directly from orders collection
        listenToOrders();
      },
      () => {
        listenToOrders();
      }
    );

    const listenToOrders = () => {
      if (unsubSalesCounts) {
        unsubSalesCounts();
        unsubSalesCounts = null;
      }

      unsubOrders = onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          const vSales: Record<string, number> = {};
          const sSales: StoreTypeSales = { shop: 0, food: 0, furniture: 0, toilet_kitchen: 0, wears: 0, cosmetics: 0 };

          snap.docs.forEach((d) => {
            const order = d.data() as any;
            if (order.status === 'cancelled' || order.status === 'canceled') return;

            if (Array.isArray(order.items)) {
              order.items.forEach((item: any) => {
                const qty = Number(item.quantity) || 1;
                sSales.shop += qty;

                if (item.vendor) {
                  const emailKey = String(item.vendor).toLowerCase().trim();
                  vSales[emailKey] = (vSales[emailKey] || 0) + qty;
                  vSales[emailKey.replace(/\./g, '_')] = (vSales[emailKey.replace(/\./g, '_')] || 0) + qty;
                }

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
                } else if (coll === 'toilet_kitchen' || group.includes('toilet') || group.includes('kitchen') || category.includes('toilet') || category.includes('kitchen')) {
                  sSales.toilet_kitchen += qty;
                } else if (coll === 'wears' || group.includes('wears') || group.includes('clothing') || category.includes('wears')) {
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
          console.warn('Orders listener error:', err);
          setLoading(false);
        }
      );
    };

    return () => {
      if (unsubSalesCounts) unsubSalesCounts();
      if (unsubOrders) unsubOrders();
    };
  }, []);

  const getVendorSales = (email?: string | null) => {
    if (!email) return 0;
    const cleanEmail = email.toLowerCase().trim();
    const underscoreEmail = cleanEmail.replace(/\./g, '_');
    return vendorSales[cleanEmail] ?? vendorSales[underscoreEmail] ?? 0;
  };

  return { vendorSales, storeTypeSales, getVendorSales, loading };
}
