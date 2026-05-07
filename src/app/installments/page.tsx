'use client';

import { Suspense, useState, useEffect } from 'react';
import { products, Product, Category } from '@/data/products';
import { installmentSettings } from '@/data/installmentSettings';
import { FaSearch, FaInfoCircle, FaCreditCard, FaTimes, FaGoogle } from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import InstallmentOverlay from '@/components/InstallmentOverlay';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { useSearchParams } from 'next/navigation';

function InstallmentsContent() {
  const searchParams = useSearchParams();
  const querySearch = searchParams.get('search');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | 'All'>('All');

  useEffect(() => {
    if (querySearch) {
      setSearchQuery(querySearch);
      setSelectedCategory('All');
    }
  }, [querySearch]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<3 | 4 | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeLoan, setActiveLoan] = useState<any | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [pendingPlanSelection, setPendingPlanSelection] = useState<{product: Product, plan: 3 | 4} | null>(null);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory('All');
  }, [selectedCategory]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check for active loan
        const q = query(
          collection(db, 'installments'),
          where('userEmail', '==', currentUser.email),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setActiveLoan(querySnapshot.docs[0].data());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'All' || product.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handleSelectPlan = (product: Product, plan: 3 | 4) => {
    if (!user) {
      setPendingPlanSelection({ product, plan });
      setShowAuthOverlay(true);
      return;
    }
    setSelectedProduct(product);
    setSelectedPlan(plan);
    setIsOverlayOpen(true);
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast.success('Signed in successfully!');
      setShowAuthOverlay(false);
      if (pendingPlanSelection) {
        setSelectedProduct(pendingPlanSelection.product);
        setSelectedPlan(pendingPlanSelection.plan);
        setIsOverlayOpen(true);
        setPendingPlanSelection(null);
      }
    } catch {
      toast.error('Sign in failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const categories: (Category | 'All')[] = ['All', 'Electronics', 'Furniture'];

  return (
    <div className="py-16">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Toaster position="top-center" />

        {/* Header & Pay Loan Button */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold">Installmental Payments</h1>
            <p className="text-muted-foreground mt-2">Pay small-small for the things you love.</p>
          </div>
          <Link href="/installments/pay-loan" className="bg-primary hover:bg-primary-hover text-white flex items-center gap-2 rounded-md font-semibold px-4 py-2 transition-colors">
            <FaCreditCard /> Pay Loan
          </Link>
        </div>

        {/* Info Card */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-6 md:p-8 mb-12 shadow-md">
          <div className="flex items-center gap-4 mb-6">
            <FaInfoCircle size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">How it Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-2">Flexible Plans</h3>
              <p className="text-sm text-muted-foreground">
                Choose between <strong>3 months</strong> ({installmentSettings.threeMonthIncrease * 100}% increase)
                or <strong>4 months</strong> ({installmentSettings.fourMonthIncrease * 100}% increase).
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Delivery Policy</h3>
              <p className="text-sm text-muted-foreground">
                Goods are only delivered at the <strong>completion of payment</strong>.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Late Payment & Grace</h3>
              <p className="text-sm text-muted-foreground">
                Each month has a <strong>{installmentSettings.gracePeriodDays}-day grace period</strong>.
                After that, a <strong>{installmentSettings.latePaymentFee * 100}% increase</strong> is added.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Cancellation</h3>
              <p className="text-sm text-muted-foreground">
                Withdrawing payments attracts a <strong>{installmentSettings.cancellationFee * 100}% charge</strong> from the total amount paid.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex flex-wrap gap-6 items-center justify-between p-2 md:p-6 bg-card border border-border rounded-sm md:rounded-lg">
            <div className="flex gap-3 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => { setSelectedCategory(category); setVisibleCount(20); }}
                  className={`px-5 py-2 text-sm rounded-md transition-colors ${selectedCategory === category ? 'bg-primary text-white border-none' : 'bg-transparent text-foreground border border-border hover:bg-muted'}`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Subcategories Bar - Only shown when a specific category is selected */}
            {selectedCategory !== 'All' && (
              <div className="flex gap-3 flex-wrap mt-4 w-full p-4 bg-muted rounded-[var(--radius)] border border-border">
                <button
                  onClick={() => setSelectedSubcategory('All')}
                  className={`px-4 py-1.5 text-xs border border-border rounded-full transition-colors ${selectedSubcategory === 'All' ? 'bg-secondary text-white' : 'bg-white text-foreground hover:bg-gray-50'}`}
                >
                  All {selectedCategory}
                </button>
                {Array.from(new Set(
                  products
                    .filter(p => p.category === selectedCategory)
                    .map(p => p.subcategory)
                    .filter((s): s is string => !!s)
                )).sort().map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubcategory(sub)}
                    className={`px-4 py-1.5 text-xs border border-border rounded-full transition-colors ${selectedSubcategory === sub ? 'bg-secondary text-white' : 'bg-white text-foreground hover:bg-gray-50'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search for an item to start a plan..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(20); }}
                className="w-full py-2.5 pr-4 pl-10 rounded-[var(--radius)] border border-border bg-background font-sans outline-none focus:border-primary"
              />
              <FaSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedProducts.map(product => (
            <div key={product.id} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col h-full">
              <div className="h-[200px] bg-muted relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-bold mb-2">{product.name}</h3>
                <p className="text-primary font-bold text-xl mb-4 mt-auto">
                  {formatCurrency(product.price)}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button
                    onClick={() => handleSelectPlan(product, 3)}
                    className="border border-border text-foreground hover:bg-muted text-xs p-2 rounded-md font-semibold transition-colors"
                  >
                    3 Months Plan
                  </button>
                  <button
                    onClick={() => handleSelectPlan(product, 4)}
                    className="border border-border text-foreground hover:bg-muted text-xs p-2 rounded-md font-semibold transition-colors"
                  >
                    4 Months Plan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length > visibleCount && (
          <div className="text-center mt-12">
            <button
              className="border border-border text-foreground hover:bg-muted px-8 py-3 rounded-md font-semibold transition-colors"
              onClick={() => setVisibleCount(prev => prev + 20)}
            >
              Load More Products
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No products found matching your search.</p>
          </div>
        )}
      </div>

      {isOverlayOpen && selectedProduct && selectedPlan && (
        <InstallmentOverlay
          product={selectedProduct}
          plan={selectedPlan}
          onClose={() => setIsOverlayOpen(false)}
        />
      )}

      {/* Auth Overlay */}
      {showAuthOverlay && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex flex-col items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-[var(--radius)] shadow-lg overflow-hidden relative p-8 text-center">
            <button 
              onClick={() => { setShowAuthOverlay(false); setPendingPlanSelection(null); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <FaTimes size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              You must be signed in to apply for an installment plan.
            </p>
            <button 
              onClick={handleSignIn}
              className="w-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-3 p-3 rounded-md font-bold transition-colors"
            >
              <FaGoogle size={20} /> Sign in with Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InstallmentsPage() {
  return (
    <Suspense fallback={<div className="max-w-[1200px] mx-auto px-4 md:px-6 py-16">Loading installments...</div>}>
      <InstallmentsContent />
    </Suspense>
  );
}
