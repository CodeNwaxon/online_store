'use client';

import AdminGuard from '@/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaHome, FaSignOutAlt, FaUserTie } from 'react-icons/fa';
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

  useEffect(() => {
    const unsubInst = onSnapshot(query(collection(db, 'installments'), where('isNew', '==', true)), (snap) => {
      const instCount = snap.size;
      const unsubComp = onSnapshot(query(collection(db, 'complaints'), where('isNew', '==', true)), (compSnap) => {
        setUnreadCount(instCount + compSnap.size);
      });
      return () => unsubComp();
    });
    return () => unsubInst();
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
        {/* Sidebar */}
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
        <main className={`flex-1 ${pathname === '/admin/stats' ? 'p-1 md:p-4' : 'p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
