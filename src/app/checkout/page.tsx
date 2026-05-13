'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingBag, FaCreditCard, FaShieldAlt, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

  const [siteName, setSiteName] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) setSiteName(docSnap.data().siteName || '');
    };
    fetchSettings();

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
      <div className="py-16 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <FaShoppingBag size={64} className="text-muted-foreground mb-6 opacity-50 mx-auto" />
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Add some items to your cart before checking out.</p>
          <Link href="/shop" className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-md font-semibold transition-colors inline-block">Go to Shop</Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="py-16 min-h-[70vh] flex items-center justify-center">
        <div className="text-center max-w-[500px] p-12 bg-card rounded-[var(--radius)] border border-border shadow-sm mx-4">
          <div className="w-20 h-20 rounded-full bg-[#DEF7EC] text-[#03543F] flex items-center justify-center mx-auto mb-6">
            <FaCheckCircle size={40} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Thank you for your purchase. Your order is being processed and will be shipped shortly. Check your email for the receipt.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/" className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-md font-semibold transition-colors">Back to Home</Link>
            <Link href="/shop" className="border border-border text-foreground hover:bg-muted px-6 py-3 rounded-md font-semibold transition-colors">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="mb-12">
          <Link href="/shop" className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors w-fit">
            <FaArrowLeft size={16} /> Back to Shop
          </Link>
          <h1 className="text-4xl font-bold">Checkout</h1>
        </div>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 items-start">
          {/* Shipping & Payment Form */}
          <div className="flex flex-col gap-10">
            <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <FaShieldAlt size={24} className="text-primary" /> Shipping Information
              </h3>
              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="fullName" className="block mb-2 text-sm font-semibold">Full Name</label>
                  <input type="text" id="fullName" value={formData.fullName} onChange={handleInputChange} required className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block mb-2 text-sm font-semibold">Phone Number</label>
                    <input type="tel" id="phone" value={formData.phone} onChange={handleInputChange} required className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-semibold">Email (Optional)</label>
                    <input type="email" id="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div>
                  <label htmlFor="address" className="block mb-2 text-sm font-semibold">House Address</label>
                  <textarea id="address" value={formData.address} onChange={handleInputChange} required rows={3} className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <FaCreditCard size={24} className="text-primary" /> Payment Details (Demo)
              </h3>
              <div className="flex flex-col gap-5">
                <div>
                  <label htmlFor="cardNum" className="block mb-2 text-sm font-semibold">Card Number</label>
                  <input type="text" id="cardNum" required placeholder="0000 0000 0000 0000" className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="block mb-2 text-sm font-semibold">Expiry Date</label>
                    <input type="text" id="expiry" required placeholder="MM/YY" className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block mb-2 text-sm font-semibold">CVV</label>
                    <input type="text" id="cvv" required placeholder="123" className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-muted p-8 rounded-[var(--radius)] sticky top-[100px] border border-border">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            <div className="flex flex-col gap-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded shrink-0 overflow-hidden">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <span className="text-muted-foreground">{item.name} x {item.quantity}</span>
                  </div>
                  <span className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-6">
              <div className="flex justify-between mb-3">
                <span>Subtotal</span>
                <span>₦{getTotalPrice().toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-6">
                <span>Shipping</span>
                <span className="text-[#059669] font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t border-border pt-6">
                <span>Total Amount</span>
                <span className="text-primary">₦{getTotalPrice().toLocaleString()}</span>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-8 p-4 bg-primary hover:bg-primary-hover text-white rounded-md font-semibold transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : `Pay ₦${getTotalPrice().toLocaleString()}`}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure payment powered by {siteName}.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
