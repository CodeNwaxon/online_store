import { create } from 'zustand';

interface AdminUnreadStore {
  unreadCount: number;
  unreadOrders: number;
  unreadPartners: number;
  unreadComplaints: number;
  setUnreadCount: (count: number) => void;
  setUnreadOrders: (count: number) => void;
  setUnreadPartners: (count: number) => void;
  setUnreadComplaints: (count: number) => void;
  resetUnreadCounts: () => void;
}

export const useAdminUnreadStore = create<AdminUnreadStore>((set) => ({
  unreadCount: 0,
  unreadOrders: 0,
  unreadPartners: 0,
  unreadComplaints: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  setUnreadOrders: (count) => set({ unreadOrders: count }),
  setUnreadPartners: (count) => set({ unreadPartners: count }),
  setUnreadComplaints: (count) => set({ unreadComplaints: count }),
  resetUnreadCounts: () => set({ unreadCount: 0, unreadOrders: 0, unreadPartners: 0, unreadComplaints: 0 }),
}));
