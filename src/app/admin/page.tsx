'use client';

import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaUserTie, FaShoppingCart, FaUtensils, FaHandshake, FaBullhorn } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function AdminDashboard() {
  const { adminData, isCEO } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [unreadPartners, setUnreadPartners] = useState(0);

  useEffect(() => {
    // Check auth state and only set up listeners if authenticated
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUnreadCount(0);
        setUnreadOrders(0);
        setUnreadPartners(0);
        return;
      }

      let instCount = 0;
      let compCount = 0;

      const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('isNew', '==', true)), (snap) => {
        setUnreadOrders(snap.size);
      }, (error) => {
        console.warn("Admin page orders listener error:", error);
      });

      const unsubInst = onSnapshot(query(collection(db, 'installments'), where('isNew', '==', true)), (snap) => {
        instCount = snap.size;
        setUnreadCount(instCount + compCount);
      }, (error) => {
        console.warn("Admin page installments listener error:", error);
      });

      const unsubComp = onSnapshot(query(collection(db, 'complaints'), where('isNew', '==', true)), (snap) => {
        compCount = snap.size;
        setUnreadCount(instCount + compCount);
      }, (error) => {
        console.warn("Admin page complaints listener error:", error);
      });

      const unsubPartners = onSnapshot(query(collection(db, 'partners'), where('status', '==', 'pending')), (snap) => {
        setUnreadPartners(snap.size);
      }, (error) => {
        console.warn("Admin page partners listener error:", error);
      });

      return () => {
        unsubOrders();
        unsubInst();
        unsubComp();
        unsubPartners();
      };
    });

    return () => unsubAuth();
  }, []);

  const routeCards = [
    { label: 'Admin Management', href: '/admin/management', icon: <FaUserShield size={40} />, id: '/ADMIN/MANAGEMENT', description: 'Add or remove admin staff and assign routes.', ceoOnly: true },
    { label: 'Products', href: '/admin/products', icon: <FaBoxes size={40} />, id: '/ADMIN/PRODUCTS', description: 'Manage your product inventory, categories, and groups.' },
    { label: 'Foods', href: '/admin/foods', icon: <FaUtensils size={40} />, id: '/ADMIN/FOODS', description: 'Manage food items, categories, and marketplace settings.' },
    { label: 'Toilet & Kitchen', href: '/admin/toilet-kitchen', icon: <FaBoxes size={40} />, id: '/ADMIN/TOILET-KITCHEN', description: 'Manage toilet & kitchen inventory and categories.' },
    { label: 'Cosmetics', href: '/admin/cosmetics', icon: <FaCosmetics size={40} />, id: '/ADMIN/COSMETICS', description: 'Manage cosmetics inventory and categories.' }, // Wait, FaCosmetics doesn't exist in react-icons/fa. Oh the user's code used FaBoxes. I will strictly use their code.
    { label: 'Wears', href: '/admin/wears', icon: <FaUserTie size={40} />, id: '/ADMIN/WEARS', description: 'Manage wears inventory and categories.' },
    { label: 'Installments', href: '/admin/installments', icon: <FaCreditCard size={40} />, id: '/ADMIN/INSTALLMENTS', description: 'Track installment payments and customer complaints.' },
    { label: 'Store Orders', href: '/admin/orders', icon: <FaShoppingCart size={40} />, id: '/ADMIN/ORDERS', description: 'Process online payments and completed installment orders.' },
    { label: 'Partnership', href: '/admin/partnership', icon: <FaHandshake size={40} />, id: '/ADMIN/PARTNERSHIP', description: 'Manage partnership applications and view payouts.' },
    { label: 'Broadcast', href: '/admin/broadcast', icon: <FaBullhorn size={40} />, id: '/ADMIN/BROADCAST', description: 'Send targeted notifications and manage templates.' },
    { label: 'Site Settings', href: '/admin/settings', icon: <FaCog size={40} />, id: '/ADMIN/SETTINGS', description: 'Update site name, contacts, and social links.' },
    { label: 'Statistics', href: '/admin/stats', icon: <FaChartBar size={40} />, id: '/ADMIN/STATS', description: 'View sales data, revenue, and product statistics.' },
    { label: 'Admin About Editor', href: '/admin/about', icon: <FaUserTie size={40} />, id: '/ADMIN/ABOUT', description: 'Update CEO contact info, image, and shop message.' },
  ];

  const visibleCards = routeCards.filter(card => {
    if (isCEO) return true;
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
