'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingBag, FaCreditCard, FaShieldAlt, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          fullName: user.displayName || ''
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
      clearCart();
    }, 2000);
  };

  if (items.length === 0 && !isSuccess) {
    return (
      <div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <FaShoppingBag size={64} style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Add some items to your cart before checking out.</p>
          <Link href="/shop" className="btn btn-primary">Go to Shop</Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '3rem', backgroundColor: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#DEF7EC', color: '#03543F', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' 
          }}>
            <FaCheckCircle size={40} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Payment Successful!</h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Thank you for your purchase. Your order is being processed and will be shipped shortly. Check your email for the receipt.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/" className="btn btn-primary">Back to Home</Link>
            <Link href="/shop" className="btn btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <div style={{ marginBottom: '3rem' }}>
          <Link href="/shop" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            <FaArrowLeft size={16} /> Back to Shop
          </Link>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Checkout</h1>
        </div>

        <form onSubmit={handleCheckout} className="grid grid-2" style={{ gap: '3rem', alignItems: 'flex-start' }}>
          {/* Shipping & Payment Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ backgroundColor: 'var(--card)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaShieldAlt size={24} color="var(--primary)" /> Shipping Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label htmlFor="fullName" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>Full Name</label>
                  <input type="text" id="fullName" value={formData.fullName} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                </div>
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div>
                    <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>Phone Number</label>
                    <input type="tel" id="phone" value={formData.phone} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>Email (Optional)</label>
                    <input type="email" id="email" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                </div>
                <div>
                  <label htmlFor="address" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>House Address</label>
                  <textarea id="address" value={formData.address} onChange={handleInputChange} required rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', resize: 'none' }}></textarea>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--card)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaCreditCard size={24} color="var(--primary)" /> Payment Details (Demo)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label htmlFor="cardNum" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>Card Number</label>
                  <input type="text" id="cardNum" required placeholder="0000 0000 0000 0000" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                </div>
                <div className="grid grid-2" style={{ gap: '1rem' }}>
                  <div>
                    <label htmlFor="expiry" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>Expiry Date</label>
                    <input type="text" id="expiry" required placeholder="MM/YY" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label htmlFor="cvv" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>CVV</label>
                    <input type="text" id="cvv" required placeholder="123" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div style={{ backgroundColor: 'var(--muted)', padding: '2rem', borderRadius: 'var(--radius)', position: 'sticky', top: '100px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <span style={{ color: 'var(--muted-foreground)' }}>{item.name} x {item.quantity}</span>
                  </div>
                  <span style={{ fontWeight: '600' }}>₦{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Subtotal</span>
                <span>₦{getTotalPrice().toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span>Shipping</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--primary)' }}>₦{getTotalPrice().toLocaleString()}</span>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '2rem', padding: '1rem', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Processing...' : `Pay ₦${getTotalPrice().toLocaleString()}`}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
              Secure payment powered by Quick Choice.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
