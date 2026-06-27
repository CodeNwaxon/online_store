'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaWhatsapp, FaYoutube, FaTiktok, FaShareAlt } from 'react-icons/fa';
import FooterInstall from './FooterInstall';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

import { useAdmin } from '@/hooks/useAdmin';
import { usePartnerNotificationStore } from '@/store/usePartnerNotificationStore';

const ICON_MAP: any = {
  Facebook: <FaFacebook size={20} />,
  Instagram: <FaInstagram size={20} />,
  Twitter: <FaTwitter size={20} />,
  LinkedIn: <FaLinkedin size={20} />,
  WhatsApp: <FaWhatsapp size={20} />,
  YouTube: <FaYoutube size={20} />,
  TikTok: <FaTiktok size={20} />,
};

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);
  const { isAdmin, isCEO, user } = useAdmin();
  const { unreadSales, setLastSalesCount, clearUnreadSales } = usePartnerNotificationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out.');
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) setSettings(docSnap.data());
    };
    fetchSettings();
  }, []);

  const handlePartnershipClick = () => {
    const state = usePartnerNotificationStore.getState();
    const newTotal = state.lastSalesCount + state.unreadSales;
    state.setLastSalesCount(newTotal);
    state.clearUnreadSales();
  };

  const siteName = settings?.siteName || '';
  const footerMessage = settings?.footerMessage || `Premium African-inspired store bringing you the best in electronics, furniture, and more with [${siteName}].`;

  // Function to highlight text in brackets [Like This]
  const renderMessage = (msg: string) => {
    const parts = msg.split(/(\[.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const text = part.slice(1, -1);
        return <span key={i} className="text-primary font-semibold">{text}</span>;
      }
      return part;
    });
  };

  return (
    <footer className="bg-card border-t border-border pt-16 pb-8 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex gap-4 items-start">
              <Image
                src="/logo_nomo.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain shrink-0 p-0.5"
              />
              <p className="text-muted-foreground text-[0.9rem] m-0">
                {renderMessage(footerMessage)}
              </p>
            </div>
          </div>
          <div>
            <h4 className="mb-6 text-primary font-bold">{siteName}</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/shop" className="text-muted-foreground hover:text-primary transition-colors">Shop</Link></li>
              <li><Link href="/foods" className="text-muted-foreground hover:text-primary transition-colors">Food Market</Link></li>
              <li>
                <Link href="/partnership" onClick={handlePartnershipClick} className="text-green-600 font-black hover:text-green-700 transition-colors inline-flex items-center gap-2">
                  Partnership
                  {mounted && unreadSales > 0 && (
                    <span className="bg-[#4B0082] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {unreadSales}
                    </span>
                  )}
                </Link>
              </li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              {isAdmin && (
                <li><Link href="/admin" className="text-secondary font-bold hover:text-primary transition-colors">{isCEO ? 'CEO Panel' : 'Admin Panel'}</Link></li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold">Support</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><a href="/about#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="/about#privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Customer Care</Link></li>
              {user && (
                <li>
                  <button 
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-secondary transition-colors cursor-pointer p-0 bg-transparent border-none text-left w-full"
                  >
                    Sign Out
                  </button>
                </li>
              )}
              <FooterInstall />
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold">Connect With Us</h4>
            <div className="flex gap-4">
              {settings?.socialLinks?.map((link: any, i: number) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover transition-colors">
                  {ICON_MAP[link.platform] || <FaShareAlt size={20} />}
                </a>
              )) || (
                <p className="text-xs text-muted-foreground italic">Follow us on social media</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved. Designed with passion.
        </div>
      </div>
    </footer>
  );
}

