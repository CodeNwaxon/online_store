'use client';

import AdminGuard from '@/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaHome, FaSignOutAlt, FaUserTie, FaShoppingCart, FaBars, FaTimes, FaUtensils, FaHandshake, FaBullhorn, FaCommentDots } from 'react-icons/fa';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminUnreadCounts } from '@/hooks/useAdminUnreadCounts';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { adminData, isCEO } = useAdmin();
  const { unreadCount, unreadOrders, unreadPartners, unreadComplaints } = useAdminUnreadCounts();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut(auth);
    toast.success('Signed out from admin');
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: <FaHome />, id: 'dashboard' },
    { label: 'Management', href: '/admin/management', icon: <FaUserShield />, id: '/ADMIN/MANAGEMENT', ceoOnly: true },
    { label: 'Products', href: '/admin/products', icon: <FaBoxes />, id: '/ADMIN/PRODUCTS' },
    { label: 'Foods', href: '/admin/foods', icon: <FaUtensils />, id: '/ADMIN/FOODS' },
    { label: 'Toilet & Kitchen', href: '/admin/toilet-kitchen', icon: <FaBoxes />, id: '/ADMIN/TOILET-KITCHEN' },
    { label: 'Cosmetics', href: '/admin/cosmetics', icon: <FaBoxes />, id: '/ADMIN/COSMETICS' },
    { label: 'Wears', href: '/admin/wears', icon: <FaUserTie />, id: '/ADMIN/WEARS' },
    { label: 'UK Used', href: '/admin/uk-used', icon: <FaHandshake />, id: '/ADMIN/UK-USED' },
    { label: 'Installments', href: '/admin/installments', icon: <FaCreditCard />, id: '/ADMIN/INSTALLMENTS' },
    { label: 'Complaints', href: '/admin/complaints', icon: <FaCommentDots />, id: '/ADMIN/COMPLAINTS' },
    { label: 'Orders', href: '/admin/orders', icon: <FaShoppingCart />, id: '/ADMIN/ORDERS' },
    { label: 'Partnership', href: '/admin/partnership', icon: <FaHandshake />, id: '/ADMIN/PARTNERSHIP' },
    { label: 'Broadcast', href: '/admin/broadcast', icon: <FaBullhorn />, id: '/ADMIN/BROADCAST' },
    { label: 'Settings', href: '/admin/settings', icon: <FaCog />, id: '/ADMIN/SETTINGS' },
    { label: 'Statistics', href: '/admin/stats', icon: <FaChartBar />, id: '/ADMIN/STATS' },
    { label: 'Admin About Editor', href: '/admin/about', icon: <FaUserTie />, id: '/ADMIN/ABOUT' },
  ];

  const filteredNav = navItems.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isCEO) return true;
    
    // Admins with product routes or a special store should automatically see the Orders link
    if (item.id === '/ADMIN/ORDERS') {
      const hasProductRoute = adminData?.assignedRoutes?.some((r: string) => ['/ADMIN/PRODUCTS', '/ADMIN/FOODS', '/ADMIN/WEARS', '/ADMIN/COSMETICS', '/ADMIN/TOILET-KITCHEN', '/ADMIN/UK-USED'].includes(r));
      if (hasProductRoute || adminData?.specialStore) return true;
    }

    if (item.id === '/ADMIN/COMPLAINTS') {
      const hasComplaintsRoute = adminData?.assignedRoutes?.includes('/ADMIN/COMPLAINTS');
      const isSpecialStoreVendor = !!adminData?.specialStore;
      if (hasComplaintsRoute || isSpecialStoreVendor || isCEO) return true;
    }

    return adminData?.assignedRoutes?.includes(item.id);
  });

  return (
    <AdminGuard>
      <div className="flex min-h-[calc(100vh-72px)] bg-muted/30">

        {/* Desktop Sidebar */}
        <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col sticky top-[72px] h-[calc(100vh-72px)] z-[100] overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-8 bg-primary rounded flex items-center justify-center text-white font-semibold text-[11px] italic">Nomo</div>
              <h2 className="text-lg font-bold text-primary tracking-tight">
                {isCEO ? 'CEO Dashboard' : 'Admin Dashboard'}
              </h2>
            </div>

            <Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary mb-6 transition-colors">
              <FaHome size={14} /> Switch to Home
            </Link>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                {adminData?.image ? (
                  <img src={adminData.image} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <FaUserShield size={18} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{adminData?.name || 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{auth.currentUser?.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
            {filteredNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md transition-colors ${pathname === item.href ? 'bg-primary text-white font-bold' : 'text-foreground hover:bg-muted'}`}
              >
                <span className="flex items-center gap-3">
                  {item.icon} {item.label}
                </span>
                {item.label === 'Installments' && unreadCount > 0 && (
                  <span className="bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
                {item.label === 'Orders' && unreadOrders > 0 && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {unreadOrders}
                  </span>
                )}
                {item.label === 'Partnership' && unreadPartners > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {unreadPartners}
                  </span>
                )}
                {item.label === 'Complaints' && unreadComplaints > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                    {unreadComplaints}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-secondary hover:bg-secondary/10 rounded-md transition-colors font-semibold"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-w-0 overflow-x-hidden ${pathname === '/admin/stats' ? 'p-1 md:p-4' : 'py-4 px-3 md:p-8'}`}>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}