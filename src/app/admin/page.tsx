'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { useAdminUnreadStore } from '@/store/useAdminUnreadStore';
import Link from 'next/link';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaUserTie, FaShoppingCart, FaUtensils, FaHandshake, FaBullhorn, FaCommentDots } from 'react-icons/fa';

export default function AdminDashboard() {
  const { adminData, isCEO } = useAdmin();
  const { unreadCount, unreadOrders, unreadPartners, unreadComplaints } = useAdminUnreadStore();

  const routeCards = [
    { label: 'Admin Management', href: '/admin/management', icon: <FaUserShield size={40} />, id: '/ADMIN/MANAGEMENT', description: 'Add or remove admin staff and assign routes.', ceoOnly: true },
    { label: 'Products', href: '/admin/products', icon: <FaBoxes size={40} />, id: '/ADMIN/PRODUCTS', description: 'Manage your product inventory, categories, and groups.' },
    { label: 'Foods', href: '/admin/foods', icon: <FaUtensils size={40} />, id: '/ADMIN/FOODS', description: 'Manage food items, categories, and marketplace settings.' },
    { label: 'Toilet & Kitchen', href: '/admin/toilet-kitchen', icon: <FaBoxes size={40} />, id: '/ADMIN/TOILET-KITCHEN', description: 'Manage toilet & kitchen inventory and categories.' },
    { label: 'Cosmetics', href: '/admin/cosmetics', icon: <FaBoxes size={40} />, id: '/ADMIN/COSMETICS', description: 'Manage cosmetics inventory and categories.' },
    { label: 'Wears', href: '/admin/wears', icon: <FaUserTie size={40} />, id: '/ADMIN/WEARS', description: 'Manage wears inventory and categories.' },
    { label: 'UK Used', href: '/admin/uk-used', icon: <FaHandshake size={40} />, id: '/ADMIN/UK-USED', description: 'Manage UK Used items and categories.' },
    { label: 'Installments', href: '/admin/installments', icon: <FaCreditCard size={40} />, id: '/ADMIN/INSTALLMENTS', description: 'Track installment payments and funding activity.' },
    { label: 'Complaints', href: '/admin/complaints', icon: <FaCommentDots size={40} />, id: '/ADMIN/COMPLAINTS', description: 'Review general contact complaints and special-store customer messages.' },
    { label: 'Store Orders', href: '/admin/orders', icon: <FaShoppingCart size={40} />, id: '/ADMIN/ORDERS', description: 'Process online payments and completed installment orders.' },
    { label: 'Partnership', href: '/admin/partnership', icon: <FaHandshake size={40} />, id: '/ADMIN/PARTNERSHIP', description: 'Manage partnership applications and view payouts.' },
    { label: 'Broadcast', href: '/admin/broadcast', icon: <FaBullhorn size={40} />, id: '/ADMIN/BROADCAST', description: 'Send targeted notifications and manage templates.' },
    { label: 'Site Settings', href: '/admin/settings', icon: <FaCog size={40} />, id: '/ADMIN/SETTINGS', description: 'Update site name, contacts, and social links.' },
    { label: 'Statistics', href: '/admin/stats', icon: <FaChartBar size={40} />, id: '/ADMIN/STATS', description: 'View sales data, revenue, and product statistics.' },
    { label: 'Admin About Editor', href: '/admin/about', icon: <FaUserTie size={40} />, id: '/ADMIN/ABOUT', description: 'Update CEO contact info, image, and shop message.' },
  ];

  const hasProductRoute = adminData?.assignedRoutes?.some((r: string) =>
    ['/ADMIN/PRODUCTS', '/ADMIN/FOODS', '/ADMIN/WEARS', '/ADMIN/COSMETICS', '/ADMIN/TOILET-KITCHEN', '/ADMIN/UK-USED'].includes(r)
  );
  const hasComplaintsRoute = adminData?.assignedRoutes?.includes('/ADMIN/COMPLAINTS');
  const isSpecialStoreVendor = !!adminData?.specialStore;

  const visibleCards = routeCards.filter(card => {
    if (isCEO) return true;

    if (card.id === '/ADMIN/ORDERS') {
      return hasProductRoute || isSpecialStoreVendor || adminData?.assignedRoutes?.includes('/ADMIN/ORDERS');
    }

    if (card.id === '/ADMIN/COMPLAINTS') {
      return hasComplaintsRoute || isSpecialStoreVendor || isCEO;
    }

    return adminData?.assignedRoutes?.includes(card.id);
  });

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome, {adminData?.role}</h1>
        <p className="text-muted-foreground">Manage your online store from here.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCards.map(card => (
          <Link
            key={card.id}
            href={card.href}
            className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm hover:shadow-md hover:border-primary transition-all group"
          >
            <div className="text-primary mb-6 group-hover:scale-110 transition-transform relative w-fit">
              {card.icon}
              {card.label === 'Installments' && unreadCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-md">
                  {unreadCount}
                </span>
              )}
              {card.label === 'Store Orders' && unreadOrders > 0 && (
                <span className="absolute -top-2 -right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-md">
                  {unreadOrders}
                </span>
              )}
              {card.label === 'Partnership' && unreadPartners > 0 && (
                <span className="absolute -top-2 -right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-md">
                  {unreadPartners}
                </span>
              )}
              {card.label === 'Complaints' && unreadComplaints > 0 && (
                <span className="absolute -top-2 -right-4 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-md">
                  {unreadComplaints}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold mb-3">{card.label}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
