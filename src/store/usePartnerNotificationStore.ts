import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PartnerNotificationState {
  unreadSales: number;
  lastSalesCount: number;
  hasUnseenApproval: boolean;
  lastSeenPartnerStatus: string | null;
  setUnreadSales: (count: number) => void;
  setLastSalesCount: (count: number) => void;
  clearUnreadSales: () => void;
  setHasUnseenApproval: (val: boolean) => void;
  setLastSeenPartnerStatus: (status: string) => void;
}

export const usePartnerNotificationStore = create<PartnerNotificationState>()(
  persist(
    (set) => ({
      unreadSales: 0,
      lastSalesCount: 0,
      hasUnseenApproval: false,
      lastSeenPartnerStatus: null,
      setUnreadSales: (count) => set({ unreadSales: count }),
      setLastSalesCount: (count) => set({ lastSalesCount: count }),
      clearUnreadSales: () => set({ unreadSales: 0 }),
      setHasUnseenApproval: (val) => set({ hasUnseenApproval: val }),
      setLastSeenPartnerStatus: (status) => set({ lastSeenPartnerStatus: status }),
    }),
    {
      name: 'partner-notification-storage',
    }
  )
);
