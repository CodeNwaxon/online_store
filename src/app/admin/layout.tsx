'use client';

import AdminGuard from '@/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaHome, FaSignOutAlt, FaUserTie, FaShoppingCart, FaBars, FaTimes } from 'react-icons/fa';
import { useAdmin } from '@/hooks/useAdmin';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { adminData, isCEO } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('isNew', '==', true)), (snap) => {
      setUnreadOrders(snap.size);
    });

    const unsubInst = onSnapshot(query(collection(db, 'installments'), where('isNew', '==', true)), (snap) => {
      const instCount = snap.size;
      const unsubComp = onSnapshot(query(collection(db, 'complaints'), where('isNew', '==', true)), (compSnap) => {
        setUnreadCount(instCount + compSnap.size);
      });
      return () => unsubComp();
    });
    return () => {
      unsubOrders();
      unsubInst();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    toast.success('Signed out from admin');
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: <FaHome />, id: 'dashboard' },
    { label: 'Management', href: '/admin/management', icon: <FaUserShield />, id: '/ADMIN/MANAGEMENT', ceoOnly: true },
    { label: 'Products', href: '/admin/products', icon: <FaBoxes />, id: '/ADMIN/PRODUCTS' },
    { label: 'Installments', href: '/admin/installments', icon: <FaCreditCard />, id: '/ADMIN/INSTALLMENTS' },
    { label: 'Orders', href: '/admin/orders', icon: <FaShoppingCart />, id: '/ADMIN/ORDERS' },
    { label: 'Settings', href: '/admin/settings', icon: <FaCog />, id: '/ADMIN/SETTINGS' },
    { label: 'Statistics', href: '/admin/stats', icon: <FaChartBar />, id: '/ADMIN/STATS' },
    { label: 'Admin About Editor', href: '/admin/about', icon: <FaUserTie />, id: '/ADMIN/ABOUT' },
  ];

  const filteredNav = navItems.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isCEO) return true;
    return adminData?.assignedRoutes?.includes(item.id);
  });

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-muted/30">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border px-4 flex items-center justify-between z-[100]">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <FaUserShield /> Admin
          </h2>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground bg-muted rounded-lg"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Sidebar (Drawer) */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <aside className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-[101] flex flex-col transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-border mt-16 md:mt-0">
            <p className="text-xs text-muted-foreground">Logged in as {adminData?.role}</p>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
            {filteredNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-md transition-colors ${pathname === item.href ? 'bg-primary text-white font-bold' : 'text-foreground hover:bg-muted'}`}
              >
                <span className="flex items-center gap-3">
                  {item.icon} {item.label}
                </span>
                {item.label === 'Installments' && unreadCount > 0 && (
                  <span className="bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
                {item.label === 'Orders' && unreadOrders > 0 && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadOrders}
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

        {/* Sidebar (Desktop) */}
        <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col sticky top-0 h-screen">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <FaUserShield /> Admin Panel
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Logged in as {adminData?.role}</p>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-1">
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
        <main className={`flex-1 pt-16 md:pt-0 ${pathname === '/admin/stats' ? 'p-1 md:p-4' : 'p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
