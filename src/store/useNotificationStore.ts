import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  type: 'order' | 'partnership' | 'complaint' | 'installment' | 'delivery' | 'broadcast' | 'vendor_order' | 'order_delivered' | 'order_placed' | 'message_reply' | 'cancellation';
  title: string;
  message: string;
  image?: string;
  link?: string;
  linkLabel?: string;
  createdAt: string;
  read: boolean;
  /** Which admin route this notification belongs to (for permission filtering) */
  adminRoute?: string;
  /** For vendor-specific notifications — the vendor email */
  vendorEmail?: string;
  /** For customer-specific notifications — the user uid */
  customerUid?: string;
  /** order items for context */
  orderItems?: { name: string; image: string; quantity: number; price: number; selectedSize?: string; selectedColor?: string; ram?: string; rom?: string }[];
  /** order id for linking */
  orderId?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  dismissedNotificationIds: string[];
  seenNotificationIds: string[];
  addNotification: (notif: AppNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: (filters?: {
    userUid?: string;
    userEmail?: string;
    isAdmin?: boolean;
    isCEO?: boolean;
    isVip?: boolean;
    assignedRoutes?: string[];
  }) => number;
  getFilteredNotifications: (filters?: {
    userUid?: string;
    userEmail?: string;
    isAdmin?: boolean;
    isCEO?: boolean;
    isVip?: boolean;
    assignedRoutes?: string[];
  }) => AppNotification[];
}

/** Map notification type to the admin route it belongs to */
const notifTypeToRoute: Record<string, string> = {
  order: '/ADMIN/ORDERS',
  vendor_order: '/ADMIN/ORDERS',
  partnership: '/ADMIN/PARTNERSHIP',
  complaint: '/ADMIN/ORDERS', // complaints show under orders
  installment: '/ADMIN/INSTALLMENTS',
  cancellation: '/ADMIN/INSTALLMENTS',
};

function filterNotifications(
  notifications: AppNotification[],
  filters?: {
    userUid?: string;
    userEmail?: string;
    isAdmin?: boolean;
    isCEO?: boolean;
    isVip?: boolean;
    assignedRoutes?: string[];
  }
): AppNotification[] {
  if (!filters) return notifications;

  return notifications.filter(notif => {
    // Broadcast notifications: everyone gets these unless restricted
    if (notif.type === 'broadcast') {
      // If it's vendor-only broadcast, only show to vendors (admins)
      if (notif.vendorEmail === '__VENDORS_ONLY__') {
        return filters.isAdmin;
      }
      // '__ALL_USERS__' or undefined/missing vendorEmail → show to everyone
      return true;
    }

    // Delivery and order placed notifications: only for the specific customer
    if (notif.type === 'delivery' || notif.type === 'order_delivered' || notif.type === 'order_placed') {
      return notif.customerUid === filters.userUid;
    }

    // Message reply notifications: only for the customer who originally sent the message
    if (notif.type === 'message_reply') {
      return notif.customerUid === filters.userUid;
    }

    // Vendor order notifications: only for the specific vendor
    if (notif.type === 'vendor_order') {
      // CEO and VIP admins already receive the global 'order' notification,
      // so we hide the duplicate 'vendor_order' from them.
      if (filters.isCEO || filters.isVip) return false;
      return notif.vendorEmail === filters.userEmail;
    }

    // Vendor complaint/message notifications should only reach the matching vendor.
    if (notif.type === 'complaint' && notif.vendorEmail) {
      return notif.vendorEmail === filters.userEmail;
    }

    // Admin-only notification types (order, partnership, complaint, installment)
    if (!filters.isAdmin) return false;

    // CEO and VIP admins see everything
    if (filters.isCEO || filters.isVip) return true;

    // Regular admins: check if they have the route permission
    // EXCEPTION: Global 'order' notifications are strictly for CEO/VIP, even if the admin has /ADMIN/ORDERS route
    if (notif.type === 'order') return false;

    const requiredRoute = notif.adminRoute || notifTypeToRoute[notif.type];
    if (!requiredRoute) return true;
    return filters.assignedRoutes?.includes(requiredRoute) ?? false;
  });
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      dismissedNotificationIds: [],
      seenNotificationIds: [],

      addNotification: (notif) =>
        set((state) => {
          // Avoid duplicates by id in current list
          if (state.notifications.some(n => n.id === notif.id)) return state;
          
          // Avoid adding notifications that were explicitly deleted/dismissed
          if (state.dismissedNotificationIds?.includes(notif.id)) return state;

          // Avoid adding notifications that were previously seen and naturally dropped out of the 200 limit
          if (state.seenNotificationIds?.includes(notif.id)) return state;
          
          return {
            notifications: [notif, ...state.notifications].slice(0, 200), // keep max 200
            seenNotificationIds: [...(state.seenNotificationIds || []), notif.id].slice(-2000), // keep track of last 2000 seen to prevent zombie respawns
          };
        }),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
          dismissedNotificationIds: [...(state.dismissedNotificationIds || []), id].slice(-1000), // keep history of dismissed
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
        })),

      clearAll: () => set((state) => {
        const idsToDismiss = state.notifications.map(n => n.id);
        return { 
          notifications: [],
          dismissedNotificationIds: [...(state.dismissedNotificationIds || []), ...idsToDismiss].slice(-1000)
        };
      }),

      getUnreadCount: (filters) => {
        const filtered = filterNotifications(get().notifications, filters);
        return filtered.filter(n => !n.read).length;
      },

      getFilteredNotifications: (filters) => {
        return filterNotifications(get().notifications, filters);
      },
    }),
    {
      name: 'app-notifications-v2',
    }
  )
);
