import React from 'react';

// Wrapper component to avoid importing icons multiple times in the main layout
import NotificationPanel from './NotificationPanel';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAdmin } from '@/hooks/useAdmin';
import { usePartner } from '@/hooks/usePartner';

export default function NotificationWrapper({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { notifications, getFilteredNotifications } = useNotificationStore();
  const { user, isAdmin, isCEO, adminData } = useAdmin();
  const { partnerData, isApprovedPartner } = usePartner();

  // Determine user filters
  const filters = {
    userUid: user?.uid,
    userEmail: user?.email || undefined,
    isAdmin: isAdmin,
    isCEO: isCEO,
    isVip: adminData?.vip,
    assignedRoutes: adminData?.assignedRoutes
  };

  const filteredNotifs = getFilteredNotifications(filters);

  return <NotificationPanel isOpen={isOpen} onClose={onClose} notifications={filteredNotifs} />;
}
