'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { FaCreditCard, FaTruck, FaStore, FaLock, FaChevronLeft, FaMapMarkerAlt, FaShieldAlt } from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import ShippingBreakdownComponent from '@/components/ShippingBreakdown';
import { calculateCartShipping, calculateCartShippingForArea, CartItem } from '@/lib/shippingCalculator';
import { usePaystack } from '@/hooks/usePaystack';
import { verifyAndProcessInstallmentPayment } from '@/actions/verifyPayment';
import { createPendingTransaction } from '@/actions/pendingTransactions';

function LoanCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanId = searchParams.get('loanId');
  const monthsToPay = searchParams.get('months')?.split(',').map(Number) || [];

  const [user, setUser] = useState<User | null>(null);
  const [loan, setLoan] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [siteName, setSiteName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    address: ''
  });

  // Delivery State
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'ship'>('pickup');
  const [areas, setAreas] = useState<any[]>([]);
  const [selectedPickupArea, setSelectedPickupArea] = useState<string>('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const citySuggestionsRef = useRef<HTMLDivElement>(null);
  
  const [showCityError, setShowCityError] = useState(false);
  const [showPickupOnlyError, setShowPickupOnlyError] = useState(false);

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

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        toast.error('You must be signed in.');
        router.push('/installments');
      } else {
        setUser(u);
        setFormData(prev => ({
          ...prev,
          email: u.email || '',
          fullName: u.displayName || ''
        }));
      }
    });
    return () => unsubAuth();
  }, [router]);

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

  useEffect(() => {
    if (loanId && user) {
      fetchLoan(user);
    } else if (!loanId) {
      setLoading(false);
    }
  }, [loanId, user]);

  useEffect(() => {
    if (!loan?.productId) return;

    const collectionName = loan.productCollection || 'products';
    const productRef = doc(db, collectionName, loan.productId);
    const unsub = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProduct({ id: loan.productId, name: loan.productName, size: 'medium' });
      }
    });

    return () => unsub();
  }, [loan?.productId, loan?.productName, loan?.productCollection]);

  const fetchLoan = async (currentUser: User) => {
    const docRef = doc(db, 'installments', loanId!);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.userEmail !== currentUser.email) {
        toast.error('Unauthorized access to this installment.');
        router.push('/installments');
        return;
      }
      setLoan({ id: docSnap.id, ...data });
      
      setFormData(prev => ({
        ...prev,
        fullName: data.customerName || currentUser.displayName || '',
        phone: data.phone || prev.phone
      }));
    } else {
      toast.error('Loan not found.');
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (id === 'city') setShowCitySuggestions(true);
  };

  // Normalize city names for fuzzy matching
  const normalizeCity = (name: string) => name.toLowerCase().replace(/[-\s]/g, '');

  const citySuggestions = useMemo(() => {
    if (!formData.city.trim()) return areas;
    const norm = normalizeCity(formData.city);
    return areas.filter(a => normalizeCity(a.city).includes(norm));
  }, [formData.city, areas]);

  const isLastPayment = loan && (loan.monthsPaid + monthsToPay.length >= loan.planMonths);
  const baseAmount = loan ? monthsToPay.reduce((sum: number, idx: number) => sum + loan.payments[idx].amount, 0) : 0;

  // Calculate Shipping with New System
  useEffect(() => {
    if (!isLastPayment || deliveryMethod === 'pickup' || !formData.city.trim() || !product) {
      setShippingBreakdown(null);
      setShippingError(null);
      return;
    }

    const calculateShipping = async () => {
      setCalculatingShipping(true);
      setShippingError(null);

      try {
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

        const hasStandardItem = !product.requiresMinShipping;
        if (!hasStandardItem) {
          const maxRequired = product.minShippingQty || 0;
          if (1 < maxRequired) {
            setShippingError(`This product requires at least ${maxRequired} items to qualify for standalone shipping.`);
            setShippingBreakdown(null);
            setCalculatingShipping(false);
            return;
          }
        }

        const cartItems: CartItem[] = [{
          id: product.id,
          name: product.name,
          size: (product.size || 'medium') as any,
          quantity: 1,
          price: loan.totalAmount,
        }];

        const breakdown = await calculateCartShipping(cartItems, matchedArea.id || normalizeCity(formData.city));
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
  }, [isLastPayment, deliveryMethod, formData.city, areas, product, loan]);

  // Calculate Shipping Cost
  const shippingCost = useMemo(() => {
    if (!isLastPayment) return 0;
    if (shippingBreakdown) return shippingBreakdown.totalShipping;
    if (deliveryMethod === 'pickup') return 0;
    if (!formData.city.trim()) return 0;

    const normInput = normalizeCity(formData.city);
    const matchedArea = areas.find(a => normalizeCity(a.city) === normInput);
    if (!matchedArea) return -1;
    if (matchedArea.isActive === false) return -2;

    const hasStandardItem = !product?.requiresMinShipping;
    if (!hasStandardItem && product) {
      const maxRequired = product.minShippingQty || 0;
      if (1 < maxRequired) return -3;
    }

    let totalShipping = 0;
    if (product) {
      const cartItems: CartItem[] = [{
        id: product.id,
        name: product.name,
        size: (product.size || 'medium') as any,
        quantity: 1,
        price: loan.totalAmount,
      }];
      totalShipping = calculateCartShippingForArea(cartItems, matchedArea).totalShipping;
    }

    return totalShipping;
  }, [isLastPayment, shippingBreakdown, deliveryMethod, formData.city, areas, product, loan]);

  const totalAmount = baseAmount + (shippingCost > 0 ? shippingCost : 0);

  const processFinalPayment = async (reference?: any) => {
    setIsProcessing(true);
    try {
      if (!reference?.reference) {
        toast.error('No payment reference found.');
        setIsProcessing(false);
        return;
      }

      const shippingAddress = deliveryMethod === 'pickup'
        ? `Pickup at: ${selectedPickupArea}`
        : `${formData.address}, ${formData.city}`;

      const city = deliveryMethod === 'pickup'
        ? selectedPickupArea.split(',').map((part: string) => part.trim()).filter(Boolean)[1] ?? selectedPickupArea
        : formData.city;

      // Send the reference to the SERVER for verification
      // Send the reference to the SERVER for verification (reads from pending_transactions)
      const result = await verifyAndProcessInstallmentPayment(reference.reference);

      if (!result.success) {
        toast.error(result.error || 'Payment verification failed.');
        setIsProcessing(false);
        return;
      }

      toast.success('Payment successful!');
      router.push('/installments/pay-loan');
    } catch (error) {
      toast.error('Payment failed.');
      setIsProcessing(false);
    }
  };

  const pay = usePaystack();

  const handleInitiatePayment = async () => {
    if (isLastPayment) {
      if (!formData.fullName.trim()) { toast.error('Please enter your full name.'); return; }
      if (!formData.phone.trim()) { toast.error('Please enter your phone number.'); return; }
      if (deliveryMethod === 'pickup' && !selectedPickupArea) { toast.error('Please select a pick-up location.'); return; }
      if (deliveryMethod === 'ship') {
        if (!formData.city.trim()) { toast.error('Please enter your city.'); return; }
        if (shippingCost === -1) { setShowCityError(true); return; }
        if (shippingCost === -2) { setShowPickupOnlyError(true); return; }
        if (shippingCost === -3) { 
          const maxRequired = product?.minShippingQty || 0;
          toast.error(`This product requires at least ${maxRequired} items to qualify for standalone shipping.`); 
          return; 
        }
        if (!formData.address.trim()) { toast.error('Please enter your house address.'); return; }
      }
    }

    setIsProcessing(true);

    try {
      const shippingAddress = deliveryMethod === 'pickup'
        ? `Pickup at: ${selectedPickupArea}`
        : `${formData.address}, ${formData.city}`;

      const city = deliveryMethod === 'pickup'
        ? selectedPickupArea.split(',').map((part: string) => part.trim()).filter(Boolean)[1] ?? selectedPickupArea
        : formData.city;

      const dataToSave = {
        loanId: loan.id,
        userId: loan.userId,
        userEmail: loan.userEmail,
        monthsToPay: monthsToPay,
        baseAmount: baseAmount,
        totalAmount: totalAmount,
        isLastPayment: isLastPayment,
        deliveryMethod: deliveryMethod,
        shippingAddress: shippingAddress,
        shippingFee: shippingCost > 0 ? shippingCost : 0,
        phone: formData.phone,
        city: city,
        customerName: formData.fullName || loan.customerName,
        email: formData.email || loan.userEmail,
      };

      const res = await createPendingTransaction('installment_repayment', dataToSave);
      if (!res.success || !res.reference) {
        toast.error(res.error || 'Failed to initialize payment');
        setIsProcessing(false);
        return;
      }

      pay({
        reference: res.reference,
        email: formData.email || loan?.userEmail || 'customer@example.com',
        amount: totalAmount * 100,
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        onSuccess: processFinalPayment,
        onClose: () => {
          toast.error('Payment cancelled');
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) return <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loading payment details...</div>;
  if (!loan) return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-20 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto mb-4">
        <FaLock size={24} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Installment Not Found</h2>
      <p className="text-muted-foreground mb-6">We couldn't find the installment plan you're trying to pay for.</p>
      <Link href="/installments/pay-loan" className="bg-primary text-white px-6 py-2 rounded-md font-bold hover:bg-primary-hover transition-colors">
        Go to My Loans
      </Link>
    </div>
  );

  return (
    <div className="py-16 bg-muted min-h-screen">
      
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

        
        <Link href="/installments/pay-loan" className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaChevronLeft /> Back to Loan Tracking
        </Link>

        <h1 className="text-3xl font-bold mb-8">Secure Payment</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          
          {/* Main Content (Delivery & Customer Info if last payment) */}
          <div className="flex flex-col gap-8">
            {isLastPayment ? (
              <>
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
                      onClick={() => setDeliveryMethod('ship')}
                      className={`p-4 border-2 rounded-xl text-left transition-all relative ${deliveryMethod === 'ship' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <FaTruck className={`mb-3 text-2xl ${deliveryMethod === 'ship' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <h4 className="font-bold mb-1">Ship to My Address</h4>
                      <p className="text-xs text-muted-foreground">We deliver right to your doorstep.</p>
                    </button>
                  </div>
                </div>

                {/* Customer Info Form */}
                <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <FaShieldAlt size={24} className="text-primary" /> Customer Information
                  </h3>

                  <div className="flex flex-col gap-5">
                    <div>
                      <label htmlFor="fullName" className="block mb-2 text-sm font-semibold">Full Name</label>
                      <input type="text" id="fullName" value={formData.fullName} readOnly className="w-full p-3 rounded-[var(--radius)] border border-border bg-muted text-muted-foreground outline-none cursor-not-allowed" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block mb-2 text-sm font-semibold">Phone Number</label>
                        <input type="tel" id="phone" value={formData.phone} onChange={handleInputChange} required className="w-full p-3 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary transition-colors" />
                      </div>
                      <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-semibold">Email</label>
                        <input type="email" id="email" value={formData.email} readOnly className="w-full p-3 rounded-[var(--radius)] border border-border bg-muted text-muted-foreground outline-none cursor-not-allowed" />
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
              </>
            ) : (
              <div className="bg-card p-8 rounded-[var(--radius)] border border-border shadow-sm flex flex-col items-center justify-center text-center py-24">
                <FaLock size={48} className="text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-2xl font-bold mb-2">Ongoing Installment</h3>
                <p className="text-muted-foreground max-w-md">
                  You are paying for Month(s): {monthsToPay.map(idx => `${loan.payments[idx].month - 1}`).join(', ')}. Delivery options will be available on your final payment.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar (Order Summary) */}
          <div className="bg-card p-8 rounded-[var(--radius)] sticky top-[100px] border border-border shadow-sm h-fit">
            <h3 className="text-xl font-bold mb-6">Order Summary</h3>
            
            <div className="flex gap-4 mb-6 items-center">
              <div className="relative w-16 h-16 rounded overflow-hidden shrink-0">
                <Image src={loan.productImage} alt={loan.productName} fill className="object-cover" sizes="64px" />
              </div>
              <div>
                <div className="font-bold text-sm">{loan.productName}</div>
                <div className="text-xs text-muted-foreground">
                  Months: {monthsToPay.map(idx => `${loan.payments[idx].month - 1}`).join(', ')}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex justify-between mb-3 text-sm">
                <span>Installment Amount</span>
                <span>{formatCurrency(baseAmount)}</span>
              </div>
              
              {isLastPayment && (
                <>
                  <div className="flex justify-between mb-6 text-sm">
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
                        <span className="text-primary font-semibold">+ {formatCurrency(shippingCost)}</span>
                      ) : (
                        <span className="text-[#059669] font-semibold">FREE</span>
                      )
                    )}
                  </div>

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
                </>
              )}

              <div className="flex justify-between text-xl font-bold border-t border-border pt-6 mt-4">
                <span>Total Amount</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleInitiatePayment}
              className={`w-full mt-8 p-4 bg-primary hover:bg-primary-hover text-white rounded-md font-semibold transition-colors ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? 'Processing...' : `Pay ${formatCurrency(totalAmount)}`}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure payment powered by Paystack.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoanCheckout() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loading...</div>}>
      <LoanCheckoutContent />
    </Suspense>
  );
}
