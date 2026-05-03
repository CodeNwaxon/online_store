'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { products, Category } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { FaFilter, FaSearch, FaChevronDown } from 'react-icons/fa';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') as Category | 'All' | null;
  
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>(initialCategory || 'All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubcategory('All');
  }, [selectedCategory]);

  const categories: (Category | 'All')[] = ['All', 'Electronics', 'Furniture'];

  // Get unique subcategories for the selected category
  const availableSubcategories = Array.from(new Set(
    products
      .filter(p => p.category === selectedCategory)
      .map(p => p.subcategory)
      .filter((s): s is string => !!s)
  )).sort();

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'All' || product.subcategory === selectedSubcategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  return (
    <div className="section">
      <div className="container">
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Our Collection</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Explore our range of premium African-inspired goods.</p>
        </header>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Main Filters Bar */}
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
                  onClick={() => setSelectedCategory(category)}
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

            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <input
                type="text"
                placeholder="Search by name, brand (LG, TCL, etc.) or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Subcategories Bar - Only shown when a specific category is selected and has subcategories */}
          {selectedCategory !== 'All' && availableSubcategories.length > 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              flexWrap: 'wrap',
              padding: '1rem',
              backgroundColor: 'var(--muted)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              animation: 'fadeIn 0.3s ease-out'
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
              {availableSubcategories.map(sub => (
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
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-4">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No products found</h3>
            <p style={{ color: 'var(--muted-foreground)' }}>Try adjusting your filters or search terms.</p>
            <button 
              className="btn btn-outline" 
              style={{ marginTop: '1.5rem' }}
              onClick={() => { setSelectedCategory('All'); setSelectedSubcategory('All'); setSearchQuery(''); }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '4rem 0' }}>Loading products...</div>}>
      <ShopContent />
    </Suspense>
  );
}
