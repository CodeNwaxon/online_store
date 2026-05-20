'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingBag, FaCreditCard, FaShieldAlt, FaCheckCircle, FaArrowLeft, FaPrint } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [finalOrderData, setFinalOrderData] = useState<any | null>(null);
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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        userId: auth.currentUser?.uid || 'guest',
        customerName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        totalAmount: getTotalPrice(),
        status: 'paid',
        type: 'normal',
        isNew: true,
        createdAt: new Date().toISOString(),
      };

      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'orders'), orderData);

      // Deduct product quantities in Firestore
      for (const item of items) {
        try {
          const productRef = doc(db, 'products', item.id);
          await updateDoc(productRef, {
            quantity: increment(-item.quantity)
          });
        } catch (err) {
          console.error("Error deducting quantity for product:", item.id, err);
        }
      }

      // Save to local history for customer
      const history = JSON.parse(localStorage.getItem('purchase_history') || '[]');
      history.unshift({ id: docRef.id, ...orderData });
      localStorage.setItem('purchase_history', JSON.stringify(history.slice(0, 50))); // Keep last 50

      setOrderId(docRef.id);
      setFinalOrderData(orderData);
      setLoading(false);
      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!finalOrderData || !orderId) return;
    const displayUid = orderId.substring(0, 10).toUpperCase();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #f1f5f9; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #D48806; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .section-title { font-size: 10px; font-weight: 900; color: #1e293b; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
            .value { font-size: 11px; font-weight: bold; color: #1e293b; text-align: right; max-width: 180px; word-break: break-all; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; }
            .item-name { font-weight: 500; color: #475569; }
            .item-price { font-weight: bold; color: #1e293b; }
            .total-row { margin-top: 20px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .total-value { font-size: 24px; font-weight: 900; color: #D48806; }
            .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-thanks { font-size: 9px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0; }
            .footer-addr { font-size: 8px; font-weight: 500; color: #94a3b8; margin: 4px 0 0; }
            .print-btn { margin-top: 20px; padding: 12px 24px; background: #1e293b; color: #fff; border: none; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
            .print-btn:hover { background: #334155; }
            @media print { 
              body { background: #fff; padding: 10px; display: block; } 
              .no-print { display: none; } 
              .receipt { border: 1px solid #e2e8f0; box-shadow: none; width: 380px; margin: 0 auto; break-inside: avoid; border-radius: 16px; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/logos.png" class="logo" />
              <h1 class="store-name">${siteName.toUpperCase()}®</h1>
              <div class="official">Official Payment Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Customer Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="section-title">Customer Info</div>
              <div class="row">
                <div class="label">Name:</div>
                <div class="value">${finalOrderData.customerName}</div>
              </div>
              <div class="row">
                <div class="label">Email:</div>
                <div class="value">${finalOrderData.email}</div>
              </div>
              <div class="row">
                <div class="label">Phone:</div>
                <div class="value">${finalOrderData.phone}</div>
              </div>
              <div class="row">
                <div class="label">Address:</div>
                <div class="value">${finalOrderData.address}</div>
              </div>

              <div class="section-title" style="margin-top: 20px;">Items Ordered</div>
              ${finalOrderData.items.map((item: any) => `
                <div class="item-row">
                  <span class="item-name">${item.name} (x${item.quantity})</span>
                  <span class="item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              `).join('')}

              <div class="total-row">
                <div class="total-label">Amount Paid:</div>
                <div class="total-value">₦${finalOrderData.totalAmount?.toLocaleString()}</div>
              </div>
              <p style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 12px; font-weight: bold; text-transform: uppercase;">Payment Status: Verified Successfully</p>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing ${siteName}®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <button class="no-print print-btn" onclick="window.print()">Print Your Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
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
            <FaCheckCircle size={30} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-muted-foreground mb-8 md:text-lg">
            Thank you for your purchase. Your order is being processed and will be shipped shortly. Check your email for the receipt.
          </p>
          <div className="flex flex-col gap-3 justify-center max-w-[280px] mx-auto">
            <button
              onClick={handlePrintReceipt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <FaPrint /> View Receipt
            </button>
            <Link href="/" className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md font-semibold transition-colors text-center">Back to Home</Link>
            <Link href="/shop" className="border border-border text-foreground hover:bg-muted px-6 py-2 rounded-md font-semibold transition-colors text-center">Continue Shopping</Link>
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
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
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
