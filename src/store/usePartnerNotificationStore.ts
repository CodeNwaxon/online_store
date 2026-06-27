import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PartnerNotificationState {
  unreadSales: number;
  lastSalesCount: number;
  setUnreadSales: (count: number) => void;
  setLastSalesCount: (count: number) => void;
  clearUnreadSales: () => void;
}

export const usePartnerNotificationStore = create<PartnerNotificationState>()(
  persist(
    (set) => ({
      unreadSales: 0,
      lastSalesCount: 0,
      setUnreadSales: (count) => set({ unreadSales: count }),
      setLastSalesCount: (count) => set({ lastSalesCount: count }),
      clearUnreadSales: () => set({ unreadSales: 0 }),
    }),
    {
      name: 'partner-notification-storage',
    }
  )
);
