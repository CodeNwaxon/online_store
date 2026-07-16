'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingBag, FaCreditCard, FaShieldAlt, FaCheckCircle, FaArrowLeft, FaPrint, FaMapMarkerAlt, FaTruck } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import ShippingBreakdownComponent from '@/components/ShippingBreakdown';
import { calculateCartShipping, calculateCartShippingForArea, CartItem } from '@/lib/shippingCalculator';
import { usePaystack } from '@/hooks/usePaystack';
import { verifyAndFulfillOrder } from '@/actions/verifyPayment';
import { createPendingTransaction } from '@/actions/pendingTransactions';

export default function Checkout() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [finalOrderData, setFinalOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCityError, setShowCityError] = useState(false);
  const [showPickupOnlyError, setShowPickupOnlyError] = useState(false);
  const [minShippingOverlay, setMinShippingOverlay] = useState<{ name: string; needed: number, current: number, required: number } | null>(null);

  // Delivery State
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'ship'>('pickup');
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedPickupArea, setSelectedPickupArea] = useState<string>('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const citySuggestionsRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    address: ''
  });

  const [siteName, setSiteName] = useState('');

  // Shipping Breakdown State
  const [shippingBreakdown, setShippingBreakdown] = useState<any>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

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

  const [dbProducts, setDbProducts] = useState<Record<string, any>>({});

  useEffect(() => {
    const collections = ['products', 'foods', 'wears', 'cosmetics', 'toilet_kitchen'];
    const unsubs = collections.map(collName => 
      onSnapshot(collection(db, collName), (snap) => {
        setDbProducts(prev => {
          const newMap = { ...prev };
          snap.forEach(doc => {
            newMap[doc.id] = doc.data();
          });
          return newMap;
        });
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'distribution_areas'), (snap) => {
      setAreas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Distribution areas listener error:", error);
    });
    return () => unsub();
  }, []);

  // Close city suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (citySuggestionsRef.current && !citySuggestionsRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'city') setShowCitySuggestions(true);
  };

  // Normalize city names for fuzzy matching (strips hyphens, spaces, lowercases)
  const normalizeCity = (name: string) => name.toLowerCase().replace(/[-\s]/g, '');

  // Filter city suggestions based on user input
  const citySuggestions = useMemo(() => {
    if (!formData.city.trim()) return areas;
    const norm = normalizeCity(formData.city);
    return areas.filter(a => normalizeCity(a.city).includes(norm));
  }, [formData.city, areas]);

  // Calculate Shipping with New System
  useEffect(() => {
    if (deliveryMethod === 'pickup' || !formData.city.trim()) {
      setShippingBreakdown(null);
      setShippingError(null);
      return;
    }

    const calculateShipping = async () => {
      setCalculatingShipping(true);
      setShippingError(null);

      try {
        // Find matching area
        const normInput = normalizeCity(formData.city);
        const matchedArea = areas.find(a => normalizeCity(a.city) === normInput);

        if (!matchedArea) {
          setShippingError('City not found in our delivery areas');
          setShippingBreakdown(null);
          setCalculatingShipping(false);
          return;
        }

        if (matchedArea.isActive === false) {
          setShippingError('Pickup only available for this location');
          setShippingBreakdown(null);
          setCalculatingShipping(false);
          return;
        }

        const hasStandardItem = items.some(item => !dbProducts[item.id]?.requiresMinShipping);
        if (!hasStandardItem && items.length > 0) {
          const maxRequired = Math.max(...items.map(item => dbProducts[item.id]?.minShippingQty || 0));
          const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
          
          if (totalQty < maxRequired) {
            setShippingError(`Your cart requires at least ${maxRequired} total items to qualify for shipping, or you must add a standard product.`);
            setShippingBreakdown(null);
            setCalculatingShipping(false);
            return;
          }
        }

        // Convert cart items to CartItem format
        const cartItemsForShipping: CartItem[] = items.map(item => ({
          id: item.id,
          name: item.name,
          size: (dbProducts[item.id]?.size || item.size || 'medium') as any,
          quantity: item.quantity,
          price: dbProducts[item.id]?.price || item.price,
          selectedMeasurement: (item as any).selectedMeasurement,
          customShippingAmount: dbProducts[item.id]?.customShippingAmount,
        }));

        // Calculate shipping
        const breakdown = await calculateCartShipping(cartItemsForShipping, matchedArea.id || normalizeCity(formData.city));
        setShippingBreakdown(breakdown);
        setCalculatingShipping(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate shipping';
        setShippingError(message);
        setShippingBreakdown(null);
        setCalculatingShipping(false);
      }
    };

    calculateShipping();
  }, [deliveryMethod, formData.city, areas, items, dbProducts]);

  // Calculate Shipping Cost (fallback for compatibility)
  const shippingCost = useMemo(() => {
    if (shippingBreakdown) return shippingBreakdown.totalShipping;
    if (deliveryMethod === 'pickup') return 0;
    if (!formData.city.trim()) return 0;

    const normInput = normalizeCity(formData.city);
    const matchedArea = areas.find(a => normalizeCity(a.city) === normInput);
    if (!matchedArea) return -1;
    if (matchedArea.isActive === false) return -2;

    const hasStandardItem = items.some(item => !dbProducts[item.id]?.requiresMinShipping);
    if (!hasStandardItem && items.length > 0) {
      const maxRequired = Math.max(...items.map(item => dbProducts[item.id]?.minShippingQty || 0));
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQty < maxRequired) return -3;
    }

    let totalShipping = 0;
    const cartItems: CartItem[] = items.map(item => ({
      id: item.id,
      name: item.name,
      size: (dbProducts[item.id]?.size || item.size || 'medium') as any,
      quantity: item.quantity,
      price: dbProducts[item.id]?.price || item.price,
    }));

    if (matchedArea) {
      totalShipping = calculateCartShippingForArea(cartItems, matchedArea).totalShipping;
    }

    return totalShipping;
  }, [shippingBreakdown, deliveryMethod, formData.city, areas, items, dbProducts]);

  const finalTotalAmount = getTotalPrice() + (shippingCost > 0 ? shippingCost : 0);

  const processOrder = async (reference?: any) => {
    setLoading(true);

    try {
      if (!reference?.reference) {
        toast.error('No payment reference found.');
        setLoading(false);
        return;
      }

      // Send the reference to the SERVER for verification (which reads from pending_transactions)
      const result = await verifyAndFulfillOrder(reference.reference);

      if (!result.success) {
        toast.error(result.error || 'Payment verification failed.');
        setLoading(false);
        return;
      }

      // Save to local history for customer
      const fullOrderData = { ...result.orderData, status: 'paid', type: 'normal', paystackReference: reference.reference, createdAt: new Date().toISOString() };
      const history = JSON.parse(localStorage.getItem('purchase_history') || '[]');
      history.unshift({ id: result.orderId, ...fullOrderData });
      localStorage.setItem('purchase_history', JSON.stringify(history.slice(0, 50)));

      setOrderId(result.orderId || null);
      setFinalOrderData(fullOrderData);
      setLoading(false);
      setIsSuccess(true);
      clearCart();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const pay = usePaystack();

  const handlePrintReceipt = () => {
    if (!finalOrderData || !orderId) return;
    const displayUid = orderId.substring(0, 10).toUpperCase();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
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
              <img src="/logo_nomo.png" class="logo" />
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
                <div class="label">Delivery:</div>
                <div class="value">${finalOrderData.address}</div>
              </div>

              <div class="section-title" style="margin-top: 20px;">Items Ordered</div>
              ${finalOrderData.items.map((item: any) => `
                <div class="item-row">
                  <span class="item-name">${item.name} ${item.selectedSize || item.selectedColor || item.selectedMeasurement ? `(${[item.selectedSize, item.selectedColor, item.selectedMeasurement].filter(Boolean).join(', ')})` : ''} (x${item.quantity})</span>
                  <span class="item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              `).join('')}
              
              ${finalOrderData.shippingFee > 0 ? `
              <div class="item-row" style="margin-top: 8px; color: #D48806;">
                <span class="item-name">Shipping Fee</span>
                <span class="item-price">₦${finalOrderData.shippingFee.toLocaleString()}</span>
              </div>
              ` : ''}

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

      {/* City Not Found Overlay */}
      {showCityError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-background rounded-xl p-8 max-w-sm text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
              <FaMapMarkerAlt size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">City Not Found</h3>
            <p className="text-muted-foreground mb-6">
              City not found for now!!!! We will get to your city soon.
            </p>
            <button onClick={() => setShowCityError(false)} className="w-full bg-primary text-white py-3 rounded-md font-bold hover:bg-primary-hover transition-colors">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Office Pickup Only Overlay */}
      {showPickupOnlyError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-background rounded-xl p-8 max-w-sm text-center animate-in zoom-in duration-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center">
              <FaMapMarkerAlt size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Office Pick-up Only</h3>
            <p className="text-muted-foreground mb-6">
              Only office pick-up is available for this city.
            </p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setDeliveryMethod('pickup'); setShowPickupOnlyError(false); }} className="w-full bg-primary text-white py-3 rounded-md font-bold hover:bg-primary-hover transition-colors">
                Switch to Pick-up
              </button>
              <button type="button" onClick={() => setShowPickupOnlyError(false)} className="w-full bg-muted text-foreground py-3 rounded-md font-bold hover:bg-muted/80 transition-colors border border-border">
                Change City
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="mb-12">
          <Link href="/shop" className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors w-fit">
            <FaArrowLeft size={16} /> Back to Shop
          </Link>
          <h1 className="text-4xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 items-start">

          <div className="flex flex-col gap-10">

            {/* Delivery Method Selection */}
            <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <FaTruck size={24} className="text-primary" /> Delivery Options
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-4 border-2 rounded-xl text-left transition-all relative ${deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                    Free Delivery
                  </div>
                  <FaMapMarkerAlt className={`mb-3 text-2xl ${deliveryMethod === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h4 className="font-bold mb-1">Office Pick Up</h4>
                  <p className="text-xs text-muted-foreground">Pick up your item from our designated locations.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hasStandardItem = items.some(item => !dbProducts[item.id]?.requiresMinShipping);
                    if (!hasStandardItem && items.length > 0) {
                      let maxReqItem = items[0];
                      let maxRequired = 0;
                      
                      for (const item of items) {
                        const req = dbProducts[item.id]?.minShippingQty || 0;
                        if (req > maxRequired) {
                          maxRequired = req;
                          maxReqItem = item;
                        }
                      }
                      
                      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                      if (totalQty < maxRequired) {
                         setMinShippingOverlay({
                            name: maxReqItem.name,
                            needed: maxRequired - totalQty,
                            current: totalQty,
                            required: maxRequired
                         });
                         return;
                      }
                    }
                    setDeliveryMethod('ship');
                  }}
                  className={`p-4 border-2 rounded-xl text-left transition-all relative ${deliveryMethod === 'ship' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <FaTruck className={`mb-3 text-2xl ${deliveryMethod === 'ship' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h4 className="font-bold mb-1">Ship to My Address</h4>
                  <p className="text-xs text-muted-foreground">We deliver right to your doorstep.</p>
                </button>
              </div>
            </div>

            {/* Shipping & Payment Form */}
            <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <FaShieldAlt size={24} className="text-primary" /> Customer Information
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

                {deliveryMethod === 'ship' ? (
                  <>
                    <div ref={citySuggestionsRef} className="relative">
                      <label htmlFor="city" className="block mb-2 text-sm font-semibold">City</label>
                      <input
                        type="text"
                        id="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        onFocus={() => setShowCitySuggestions(true)}
                        required
                        placeholder="Start typing your city..."
                        autoComplete="off"
                        className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                      />
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {citySuggestions.map(area => (
                            <button
                              key={area.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, city: area.city }));
                                setShowCitySuggestions(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 transition-colors border-b border-border last:border-b-0 flex justify-between items-center"
                            >
                              <span className="font-semibold capitalize">{area.city}, <span className="text-muted-foreground capitalize">{area.state}</span></span>
                              {area.isActive === false ? (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Pickup Only</span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Delivery Available</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="address" className="block mb-2 text-sm font-semibold">House Address</label>
                      <textarea id="address" value={formData.address} onChange={handleInputChange} required rows={3} className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors resize-none"></textarea>
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="pickupArea" className="block mb-2 text-sm font-semibold">Select Pickup Location</label>
                    <select
                      id="pickupArea"
                      required
                      value={selectedPickupArea}
                      onChange={(e) => setSelectedPickupArea(e.target.value)}
                      className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Select a location...</option>
                      {areas.map(area => (
                        <option key={area.id} value={`${area.address}, ${area.city}, ${area.state}`}>
                          {area.city}, {area.state} - {area.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
            </div>


          </div>

          {/* Order Summary */}
          <div className="bg-muted p-8 rounded-[var(--radius)] sticky top-[100px] border border-border">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            <div className="flex flex-col gap-4 mb-6">
              {items.map((item, idx) => (
                <div key={`${item.id}-${item.selectedSize || ''}-${item.selectedColor || ''}-${item.selectedMeasurement || ''}-${idx}`} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded shrink-0 overflow-hidden">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                    </div>
                    <span className="text-muted-foreground">
                      {item.name} {(item.selectedSize || item.selectedColor || item.selectedMeasurement) && <span className="font-bold text-foreground text-[10px]">({[item.selectedSize, item.selectedColor, item.selectedMeasurement].filter(Boolean).join(', ')})</span>} x {item.quantity}
                    </span>
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
                {deliveryMethod === 'pickup' ? (
                  !selectedPickupArea ? (
                    <span className="text-red-700 font-semibold">No Address Selected</span>
                  ) : (
                    <span className="text-[#059669] font-semibold">FREE</span>
                  )
                ) : (
                  !formData.city ? (
                    <span className="text-red-700 font-semibold">No City Selected</span>
                  ) : shippingCost === -1 ? (
                    <span className="text-red-700 font-semibold">City Not Found</span>
                  ) : calculatingShipping ? (
                    <span className="text-muted-foreground">Calculating...</span>
                  ) : shippingCost === -2 ? (
                    <span className="text-muted-foreground">Office Pick Up Only</span>
                  ) : shippingCost === -3 ? (
                    <span className="text-red-700 font-semibold">Min Qty Not Met</span>
                  ) : shippingCost > 0 ? (
                    <span className="text-primary font-semibold">+₦{shippingCost.toLocaleString()}</span>
                  ) : (
                    <span className="text-[#059669] font-semibold">FREE</span>
                  )
                )}
              </div>

              {/* Shipping Breakdown Component */}
              {deliveryMethod === 'ship' && formData.city && (shippingCost > 0 || shippingCost === -3) && (
                <div className="mb-6">
                  {shippingCost === -3 ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                      <h4 className="font-bold mb-1">Shipping Unavailable</h4>
                      <p className="text-sm">{shippingError || "Minimum quantity required for standalone shipping is not met."}</p>
                    </div>
                  ) : (
                    <ShippingBreakdownComponent
                      breakdown={shippingBreakdown || { totalShipping: 0, itemBreakdown: [], highestFeeItem: '' }}
                      isLoading={calculatingShipping}
                      error={shippingError || undefined}
                    />
                  )}
                </div>
              )}

              <div className="flex justify-between text-xl font-bold border-t border-border pt-6">
                <span>Total Amount</span>
                <span className="text-primary">₦{finalTotalAmount.toLocaleString()}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                // Validate required fields before showing payment overlay
                if (!formData.fullName.trim()) {
                  toast.error('Please enter your full name.');
                  return;
                }
                if (!formData.phone.trim()) {
                  toast.error('Please enter your phone number.');
                  return;
                }
                if (deliveryMethod === 'pickup' && !selectedPickupArea) {
                  toast.error('Please select a pick-up location.');
                  return;
                }
                if (deliveryMethod === 'ship') {
                  if (!formData.city.trim()) {
                    toast.error('Please enter your city.');
                    return;
                  }
                  if (shippingCost === -1) {
                    setShowCityError(true);
                    return;
                  }
                  if (shippingCost === -2) {
                    setShowPickupOnlyError(true);
                    return;
                  }
                  if (shippingCost === -3) {
                    const maxRequired = Math.max(...items.map(item => dbProducts[item.id]?.minShippingQty || 0));
                    toast.error(`Your cart requires at least ${maxRequired} items to qualify for shipping, or add a standard product.`);
                    return;
                  }
                  if (!formData.address.trim()) {
                    toast.error('Please enter your house address.');
                    return;
                  }
                }

                setLoading(true);
                const orderData = {
                  userId: auth.currentUser?.uid || 'guest',
                  customerName: formData.fullName,
                  email: formData.email || "customer@example.com",
                  phone: formData.phone,
                  address: deliveryMethod === 'pickup' ? `Pickup at: ${selectedPickupArea}` : `${formData.address}, ${formData.city}`,
                  city: deliveryMethod === 'pickup'
                    ? selectedPickupArea.split(',').map(part => part.trim()).filter(Boolean)[1] ?? selectedPickupArea
                    : formData.city,
                  items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: dbProducts[item.id]?.price || item.price,
                    quantity: item.quantity,
                    image: item.image,
                    size: dbProducts[item.id]?.size || item.size || 'medium',
                    selectedSize: item.selectedSize || null,
                    selectedColor: item.selectedColor || null,
                    selectedMeasurement: item.selectedMeasurement || null,
                    category: item.category,
                    vendor: dbProducts[item.id]?.vendor || null
                  })),
                  totalAmount: finalTotalAmount,
                  shippingFee: shippingCost > 0 ? shippingCost : 0,
                  deliveryMethod,
                  referralCode: localStorage.getItem('partner_ref_code') || null,
                };

                const res = await createPendingTransaction('checkout', orderData);
                if (!res.success || !res.reference) {
                  toast.error(res.error || 'Failed to initialize payment');
                  setLoading(false);
                  return;
                }

                pay({
                  reference: res.reference,
                  email: formData.email || 'customer@example.com',
                  amount: finalTotalAmount * 100,
                  publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
                  onSuccess: processOrder,
                  onClose: () => {
                    toast.error('Payment cancelled');
                    setLoading(false);
                  },
                });
              }}
              className={`w-full mt-8 p-4 bg-primary hover:bg-primary-hover text-white rounded-md font-semibold transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : `Pay ₦${finalTotalAmount.toLocaleString()}`}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure payment powered by Paystack.
            </p>
          </div>
        </div>
      </div>

      {/* Min Shipping Quantity Overlay */}
      {minShippingOverlay && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[200] flex items-center justify-center p-6 text-center">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-w-md w-full relative">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-200">
              <FaTruck size={28} />
            </div>
            <h3 className="text-xl font-black uppercase text-foreground mb-3 tracking-wide">Shipping Requirement Not Met</h3>
            <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">
              The quantity for <span className="font-bold text-foreground">"{minShippingOverlay.name}"</span> is below the minimum quantity required to ship to an address.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 mb-6 border border-amber-100 dark:border-amber-900/30">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You need to add <span className="font-black text-amber-600 dark:text-amber-400 text-lg mx-1">{minShippingOverlay.needed}</span> more to the currently selected quantity.
              </p>
              <div className="flex justify-between items-center mt-3 text-xs text-amber-700/70 dark:text-amber-500/70 font-bold uppercase">
                <span>Current: {minShippingOverlay.current}</span>
                <span>Required: {minShippingOverlay.required}</span>
              </div>
            </div>
            <button 
              onClick={() => setMinShippingOverlay(null)} 
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-black uppercase transition-colors shadow-md tracking-wider"
            >
              Okay, I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

