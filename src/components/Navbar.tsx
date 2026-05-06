'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaShoppingCart, FaBars, FaTimes, FaWhatsapp } from 'react-icons/fa';
import { useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { products } from '@/data/products';
import CartSlider from './CartSlider';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function Navbar() {
  const pathname = usePathname();
  const params = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully!');
    } catch (error) {
      toast.error('Failed to sign in.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out.');
    } catch (error) {
      toast.error('Failed to sign out.');
    }
  };

  // Dynamic WhatsApp message
  let whatsappMsg = "Hello, I'd like to make an enquiry.";
  if (pathname.startsWith('/product/')) {
    const productId = params.id as string;
    const product = products.find(p => p.id === productId);
    if (product) {
      whatsappMsg = `I want to make enquiries about ${product.name}, by ${product.manufacturer}, for ₦${product.price.toLocaleString()}.`;
    }
  }
  const whatsappUrl = `https://wa.me/2347034632037?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <nav style={{
      backgroundColor: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '1rem 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Image
            src="/logo.png"
            alt="Quick Choice Logo"
            width={40}
            height={40}
            style={{ 
              objectFit: 'contain', 
              border: '2px solid var(--primary)', 
              borderRadius: '4px',
              padding: '2px'
            }}
          />
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>Quick Choice&reg;</span>
        </Link>

        {/* Desktop Links */}
        <div style={{
          display: 'none',
          gap: '1.5rem',
          alignItems: 'center'
        }} className="desktop-menu">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </div>

        {/* Right Actions (Cart & Toggle) */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            onClick={() => setIsCartOpen(true)}
          >
            <FaShoppingCart size={22} />
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: 'var(--secondary)',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {totalItems}
              </span>
            )}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="user-profile">
              <img
                src={user.photoURL || ''}
                alt="Profile"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid var(--primary)',
                  objectFit: 'cover'
                }}
              />
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', marginRight: '1rem' }}
            >
              Sign In
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              color: 'black',
              border: '2px solid black',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem'
            }}
            className="contact-btn"
          >
            <FaWhatsapp size={18} /> <span className="contact-text">Contact Us</span>
          </a>

          <button
            className="mobile-toggle"
            onClick={() => setIsOpen(!isOpen)}
            style={{ display: 'none' }}
          >
            {isOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          width: '100%',
          backgroundColor: 'var(--card)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
          <Link href="/shop" onClick={() => setIsOpen(false)}>Shop</Link>
          <Link href="/about" onClick={() => setIsOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setIsOpen(false)}>Contact</Link>
        </div>
      )}

      <CartSlider isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-menu { display: flex !important; }
          .mobile-toggle { display: none !important; }
          .user-profile { margin-right: 3rem !important; }
        }
        @media (max-width: 767px) {
          .desktop-menu { display: none !important; }
          .mobile-toggle { display: block !important; }
          .contact-text { display: none !important; }
          .contact-btn { padding: 0.5rem !important; }
        }
      `}</style>
    </nav>
  );
}
