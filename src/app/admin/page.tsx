'use client';

import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import { FaChartBar, FaBoxes, FaCog, FaUserShield, FaCreditCard, FaUserTie } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminDashboard() {
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

  const routeCards = [
    { label: 'Admin Management', href: '/admin/management', icon: <FaUserShield size={40} />, id: '/ADMIN/MANAGEMENT', description: 'Add or remove admin staff and assign routes.', ceoOnly: true },
    { label: 'Products', href: '/admin/products', icon: <FaBoxes size={40} />, id: '/ADMIN/PRODUCTS', description: 'Manage your product inventory, categories, and groups.' },
    { label: 'Installments', href: '/admin/installments', icon: <FaCreditCard size={40} />, id: '/ADMIN/INSTALLMENTS', description: 'Track installment payments and customer complaints.' },
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
