'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaShoppingCart, FaBars, FaTimes, FaWhatsapp, FaHome, FaStore, FaInfoCircle, FaPhone, FaSignOutAlt, FaSignInAlt, FaCreditCard } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { products } from '@/data/products';
import CartSlider from './CartSlider';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const navLinks = [
  { href: '/', label: 'Home', icon: <FaHome /> },
  { href: '/shop', label: 'Shop', icon: <FaStore /> },
  { href: '/about', label: 'About', icon: <FaInfoCircle /> },
  { href: '/contact', label: 'Contact', icon: <FaPhone /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const params = useParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // Close drawer on route change
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); toast.success('Signed in!'); setIsMenuOpen(false); }
    catch { toast.error('Sign in failed.'); }
  };
  const handleSignOut = async () => {
    try { await signOut(auth); toast.success('Signed out.'); setIsMenuOpen(false); }
    catch { toast.error('Sign out failed.'); }
  };

  let whatsappMsg = "Hello, I'd like to make an enquiry.";
  if (pathname.startsWith('/product/')) {
    const p = products.find(p => p.id === params.id as string);
    if (p) whatsappMsg = `I want to make enquiries about ${p.name} for ₦${p.price.toLocaleString()}.`;
  }
  const whatsappUrl = `https://wa.me/2347034632037?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <>
      {/* ─── NAV BAR ─────────────────────────────────────── */}
      <nav className="bg-card border-b border-border sticky top-0 z-[200] py-[0.875rem]">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center max-w-[1200px]">

          {/* Logo — always visible */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logos.png" alt="Quick Choice" width={38} height={38}
              className="object-contain border-2 border-primary rounded p-0.5" />
            <span className="text-[1.2rem] font-bold text-primary">Quick Choice&reg;</span>
          </Link>

          {/* Desktop centre links — hidden on mobile via CSS */}
          <div className="hidden md:flex gap-7 items-center">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} className={`text-[0.95rem] pb-[2px] transition-all duration-200 border-b-2 ${pathname === l.href ? 'font-bold text-primary border-primary' : 'font-medium text-foreground border-transparent'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions — hidden on mobile via CSS */}
          <div className="hidden md:flex items-center gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[0.4rem] text-[0.85rem] font-bold border-2 border-current px-[0.9rem] py-[0.45rem] rounded-md">
              <FaWhatsapp size={16} /> Contact Us
            </a>
            {user ? (
              <div className="flex items-center gap-[0.6rem]">
                <img src={user.photoURL || ''} alt="avatar" className="w-[30px] h-[30px] rounded-full border-2 border-primary object-cover" />
                <button onClick={handleSignOut} className="text-[0.78rem] text-muted-foreground underline">Sign Out</button>
              </div>
            ) : (
              <button onClick={handleSignIn} className="border border-border text-foreground hover:bg-muted px-[0.9rem] py-[0.4rem] text-[0.85rem] rounded-md font-semibold transition-colors duration-200">
                Sign In
              </button>
            )}
          </div>

          {/* RIGHT ICONS — Cart always visible, hamburger only on mobile */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <button onClick={() => setIsCartOpen(true)} className="relative flex items-center p-1">
              <FaShoppingCart size={22} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white rounded-full w-[18px] h-[18px] text-[0.65rem] flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Hamburger — only on mobile */}
            <button className="flex md:hidden items-center p-1" onClick={() => setIsMenuOpen(true)}>
              <FaBars size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── DRAWER BACKDROP ─────────────────────────────── */}
      <div onClick={() => setIsMenuOpen(false)} className={`fixed inset-0 z-[300] bg-black/60 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* ─── DRAWER PANEL (slides right → left) ──────────── */}
      <div className={`fixed top-0 right-0 h-full w-[min(290px,82vw)] bg-card z-[400] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-[-6px_0_30px_rgba(0,0,0,0.15)] overflow-y-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex justify-between items-center px-[1.25rem] py-[1.1rem] border-b border-border">
          <div className="flex items-center gap-2">
            <Image src="/logos.png" alt="logo" width={28} height={28} className="rounded border-[1.5px] border-primary p-0.5" />
            <span className="font-bold text-primary text-[0.95rem]">Quick Choice&reg;</span>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="text-foreground p-1"><FaTimes size={22} /></button>
        </div>

        {/* User strip */}
        {user && (
          <div className="flex items-center gap-3 px-[1.25rem] py-[0.9rem] bg-muted border-b border-border">
            <img src={user.photoURL || ''} alt="avatar" className="w-[36px] h-[36px] rounded-full border-2 border-primary object-cover" />
            <div>
              <div className="font-semibold text-[0.88rem]">{user.displayName}</div>
              <div className="text-[0.72rem] text-muted-foreground break-all">{user.email}</div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 pt-2">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-[0.85rem] px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === l.href ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
              <span className={`text-[0.85rem] ${pathname === l.href ? 'text-primary' : 'text-muted-foreground'}`}>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-[1.25rem] py-4 border-t border-border flex flex-col gap-[0.65rem]">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg bg-[#25D366] text-white font-bold text-[0.88rem] no-underline">
            <FaWhatsapp size={18} /> WhatsApp Us
          </a>

          {user ? (
            <button onClick={handleSignOut} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg border border-border bg-transparent font-semibold text-[0.88rem] text-foreground cursor-pointer">
              <FaSignOutAlt /> Sign Out
            </button>
          ) : (
            <button onClick={handleSignIn} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg bg-primary text-white font-bold text-[0.88rem] cursor-pointer border-none">
              <FaSignInAlt /> Sign In with Google
            </button>
          )}
        </div>
      </div>

      <CartSlider isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
