'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminUnreadStore } from '@/store/useAdminUnreadStore';

export function useAdminUnreadCounts() {
  const { adminData, isCEO } = useAdmin();
  const {
    unreadCount,
    unreadOrders,
    unreadPartners,
    unreadComplaints,
    setUnreadCount,
    setUnreadOrders,
    setUnreadPartners,
    setUnreadComplaints,
    resetUnreadCounts,
  } = useAdminUnreadStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        resetUnreadCounts();
        return;
      }

      let instCount = 0;
      let compCount = 0;
      let specialCount = 0;

      const canModerate = isCEO || !!adminData?.vip;
      const canReadSpecial = isCEO || !!adminData?.vip || !!adminData?.specialStore?.slug;

      const unsubOrders = onSnapshot(
        query(collection(db, 'orders'), where('isNew', '==', true)),
        (snap) => {
          let count = 0;

          snap.forEach((docSnap) => {
            const orderData = docSnap.data();
            if (orderData.deleted) return;

            let isVIPForOrder = false;
            if (adminData?.vip) {
              const ROUTE_TO_COLLECTION: Record<string, string> = {
                '/ADMIN/PRODUCTS': 'products',
                '/ADMIN/FOODS': 'foods',
                '/ADMIN/WEARS': 'wears',
                '/ADMIN/COSMETICS': 'cosmetics',
                '/ADMIN/TOILET-KITCHEN': 'toilet_kitchen',
                '/ADMIN/UK-USED': 'uk_used',
              };

              const allowedCols = (adminData.assignedRoutes || []).flatMap((r: string) =>
                ROUTE_TO_COLLECTION[r] ? [ROUTE_TO_COLLECTION[r]] : []
              );

              isVIPForOrder =
                allowedCols.length > 0 &&
                orderData.items?.some((item: any) => item.collectionName && allowedCols.includes(item.collectionName));
            }

            const hasOrderAccess = isCEO || adminData?.assignedRoutes?.includes('/ADMIN/ORDERS') || isVIPForOrder;

            if (hasOrderAccess) {
              count++;
            } else if (
              orderData.items?.some(
                (item: any) => item.vendor?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()
              )
            ) {
              count++;
            }
          });

          setUnreadOrders(count);
        },
        (error) => {
          console.warn('Admin unread counts orders listener error:', error);
        }
      );

      const unsubInst = onSnapshot(
        query(collection(db, 'installments'), where('isNew', '==', true)),
        (snap) => {
          instCount = snap.size;
          setUnreadCount(instCount); // Use setUnreadCount purely for installments as per UI
        },
        (error) => {
          console.warn('Admin unread counts installments listener error:', error);
        }
      );

      const unsubComp = canModerate
        ? onSnapshot(
            query(collection(db, 'complaints'), where('isNew', '==', true)),
            (snap) => {
              compCount = snap.size;
              setUnreadComplaints(compCount + specialCount);
            },
            (error) => {
              console.warn('Admin unread counts complaints listener error:', error);
            }
          )
        : () => {};

      const unsubSpecial = canReadSpecial
        ? onSnapshot(
            collection(db, 'specialStoreMessages'),
            (snap) => {
              let count = 0;
              snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.isDeleted) return;
                if (data.isNew === false) return; // Not unread

                if (canModerate) {
                  count++;
                } else if (adminData?.specialStore?.slug && data.storeSlug === adminData.specialStore.slug) {
                  count++;
                }
              });
              specialCount = count;
              setUnreadComplaints(compCount + specialCount);
            },
            (error) => {
              console.warn('Admin unread counts special messages listener error:', error);
            }
          )
        : () => {};

      const unsubPartners = onSnapshot(
        query(collection(db, 'partners'), where('status', '==', 'pending')),
        (snap) => {
          setUnreadPartners(snap.size);
        },
        (error) => {
          console.warn('Admin unread counts partners listener error:', error);
        }
      );

      return () => {
        unsubOrders();
        unsubInst();
        unsubComp();
        unsubSpecial();
        unsubPartners();
      };
    });

    return () => unsubAuth();
  }, [adminData, isCEO, resetUnreadCounts, setUnreadCount, setUnreadOrders, setUnreadPartners, setUnreadComplaints]);

  return {
    unreadCount,
    unreadOrders,
    unreadPartners,
    unreadComplaints,
  };
}
