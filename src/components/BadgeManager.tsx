'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { usePartner } from '@/hooks/usePartner';
import { usePartnerNotificationStore } from '@/store/usePartnerNotificationStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

/**
 * BadgeManager — invisible component that manages the PWA app badge count.
 * 
 * Uses the Badging API (navigator.setAppBadge) to show a notification count
 * on the installed PWA icon. Badge count is role-based:
 * 
 * - Partners: unread sales + approval notification
 * - Admins: counts for their assigned pages only
 * - CEO: all admin notification types combined
 */
export default function BadgeManager() {
  const { isAdmin, isCEO, adminData } = useAdmin();
  const { partnerData, isApprovedPartner } = usePartner();
  const {
    unreadSales,
    hasUnseenApproval,
    lastSeenPartnerStatus,
    setHasUnseenApproval,
    setLastSeenPartnerStatus,
  } = usePartnerNotificationStore();

  // Admin notification counts
  const [adminBadge, setAdminBadge] = useState(0);

  // --- Partner approval detection ---
  useEffect(() => {
    if (!partnerData?.status) return;

    const status = partnerData.status;

    // Detect pending → approved transition
    if (
      status === 'approved' &&
      lastSeenPartnerStatus !== null &&
      lastSeenPartnerStatus !== 'approved'
    ) {
      setHasUnseenApproval(true);
    }

    // Initialize tracking on first encounter (no notification for existing approved users)
    // Or update for non-approved statuses so we can detect future transitions
    if (lastSeenPartnerStatus === null) {
      setLastSeenPartnerStatus(status);
    } else if (status !== 'approved') {
      setLastSeenPartnerStatus(status);
    }
  }, [partnerData?.status, lastSeenPartnerStatus, setHasUnseenApproval, setLastSeenPartnerStatus]);

  // --- Admin badge: Firestore listeners based on assigned routes ---
  useEffect(() => {
    if (!isAdmin) {
      setAdminBadge(0);
      return;
    }

    const hasRoute = (route: string) =>
      isCEO || adminData?.assignedRoutes?.includes(route);

    let orderCount = 0;
    let instCount = 0;
    let compCount = 0;
    let partnerCount = 0;
    const unsubs: (() => void)[] = [];

    const updateTotal = () => {
      setAdminBadge(orderCount + instCount + compCount + partnerCount);
    };

    // Orders
    if (hasRoute('/ADMIN/ORDERS')) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'orders'), where('isNew', '==', true)),
          (snap) => {
            orderCount = snap.size;
            updateTotal();
          },
          () => {}
        )
      );
    }

    // Installments + Complaints
    if (hasRoute('/ADMIN/INSTALLMENTS')) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'installments'), where('isNew', '==', true)),
          (snap) => {
            instCount = snap.size;
            updateTotal();
          },
          () => {}
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'complaints'), where('isNew', '==', true)),
          (snap) => {
            compCount = snap.size;
            updateTotal();
          },
          () => {}
        )
      );
    }

    // Partnership applications
    if (hasRoute('/ADMIN/PARTNERSHIP')) {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'partners'), where('status', '==', 'pending')),
          (snap) => {
            partnerCount = snap.size;
            updateTotal();
          },
          () => {}
        )
      );
    }

    return () => unsubs.forEach((fn) => fn());
  }, [isAdmin, isCEO, adminData?.assignedRoutes]);

  // --- Update PWA app badge ---
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;

    let total = 0;

    // Admin notifications
    if (isAdmin) {
      total += adminBadge;
    }

    // Partner sales notifications
    if (isApprovedPartner) {
      total += unreadSales;
    }

    // Partnership approval notification
    if (hasUnseenApproval) {
      total += 1;
    }

    if (total > 0) {
      (navigator as any).setAppBadge(total);
    } else {
      (navigator as any).clearAppBadge();
    }
  }, [isAdmin, isApprovedPartner, adminBadge, unreadSales, hasUnseenApproval]);

  // Renders nothing — purely a side-effect component
  return null;
}
