'use client';

import { Suspense, useState, useEffect } from 'react';
import { products, Product, Category } from '@/data/products';
import { installmentSettings } from '@/data/installmentSettings';
import { FaSearch, FaInfoCircle, FaCalendarAlt, FaCreditCard } from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import InstallmentOverlay from '@/components/InstallmentOverlay';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
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
    setSelectedProduct(product);
    setSelectedPlan(plan);
    setIsOverlayOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const categories: (Category | 'All')[] = ['All', 'Electronics', 'Furniture'];

  return (
    <div className="section">
      <div className="container">
        <Toaster position="top-center" />

        {/* Header & Pay Loan Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>

          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Installmental Payments</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>Pay small-small for the things you love.</p>
          </div>
          <Link href="/installments/pay-loan" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaCreditCard /> Pay Loan
          </Link>
        </div>

        {/* Info Card */}
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          marginBottom: '3rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <FaInfoCircle size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>How it Works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Flexible Plans</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Choose between <strong>3 months</strong> ({installmentSettings.threeMonthIncrease * 100}% increase)
                or <strong>4 months</strong> ({installmentSettings.fourMonthIncrease * 100}% increase).
              </p>
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Delivery Policy</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Goods are only delivered at the <strong>completion of payment</strong>.
              </p>
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Late Payment & Grace</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Each month has a <strong>{installmentSettings.gracePeriodDays}-day grace period</strong>.
                After that, a <strong>{installmentSettings.latePaymentFee * 100}% increase</strong> is added.
              </p>
            </div>
            <div>
              <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Cancellation</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Withdrawing payments attracts a <strong>{installmentSettings.cancellationFee * 100}% charge</strong> from the total amount paid.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '1.5rem', 
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => { setSelectedCategory(category); setVisibleCount(20); }}
                  className="btn"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.875rem',
                    backgroundColor: selectedCategory === category ? 'var(--primary)' : 'transparent',
                    color: selectedCategory === category ? 'white' : 'var(--foreground)',
                    border: selectedCategory === category ? 'none' : '1px solid var(--border)'
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Subcategories Bar - Only shown when a specific category is selected */}
            {selectedCategory !== 'All' && (
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                marginTop: '1rem',
                width: '100%',
                padding: '1rem',
                backgroundColor: 'var(--muted)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => setSelectedSubcategory('All')}
                  className="btn"
                  style={{
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    backgroundColor: selectedSubcategory === 'All' ? 'var(--secondary)' : 'white',
                    color: selectedSubcategory === 'All' ? 'white' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px'
                  }}
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
                    className="btn"
                    style={{
                      padding: '0.4rem 1rem',
                      fontSize: '0.8rem',
                      backgroundColor: selectedSubcategory === sub ? 'var(--secondary)' : 'white',
                      color: selectedSubcategory === sub ? 'white' : 'var(--foreground)',
                      border: '1px solid var(--border)',
                      borderRadius: '20px'
                    }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                placeholder="Search for an item to start a plan..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(20); }}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  fontFamily: 'inherit'
                }}
              />
              <FaSearch 
                size={18} 
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} 
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-3">
          {displayedProducts.map(product => (
            <div key={product.id} style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
              className="card-hover"
            >
              <div style={{ height: '200px', backgroundColor: 'var(--muted)', position: 'relative' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{product.name}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem' }}>
                  {formatCurrency(product.price)}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleSelectPlan(product, 3)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    3 Months Plan
                  </button>
                  <button
                    onClick={() => handleSelectPlan(product, 4)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    4 Months Plan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => setVisibleCount(prev => prev + 20)}
              style={{ padding: '0.75rem 2rem' }}
            >
              Load More Products
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: 'var(--muted-foreground)' }}>No products found matching your search.</p>
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

      <style jsx>{`
        .card-hover:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
}

export default function InstallmentsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '4rem 0' }}>Loading installments...</div>}>
      <InstallmentsContent />
    </Suspense>
  );
}
