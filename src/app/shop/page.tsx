'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { products, Category } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { FaFilter, FaSearch, FaChevronDown, FaCreditCard, FaHeart, FaRegHeart } from 'react-icons/fa';
import Link from 'next/link';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') as Category | 'All' | null;

  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>(initialCategory || 'All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('user_likes') || '{}');
    setUserLikes(stored);
  }, []);

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
    const matchesLiked = !showLikedOnly || userLikes[product.id];
    const matchesPromo = !showPromoOnly || product.isPromo;
    return matchesCategory && matchesSubcategory && matchesSearch && matchesLiked && matchesPromo;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="py-16">
      <div className="max-w-[1440px] mx-auto px-2 md:px-6">
        <header className="px-2 md:px-0 mb-8 md:mb-12 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-4">Our Collection</h1>
            <p className="text-muted-foreground">Explore our range of premium African-inspired goods.</p>
          </div>
          <Link href="/installments" className="bg-primary hover:bg-primary-hover text-white flex items-center gap-2 rounded-md font-semibold px-4 py-2 transition-colors">
            <FaCreditCard /> Installmental Payment
          </Link>
        </header>

        <div className="flex flex-col gap-3 md:gap-6 mb-12">
          {/* Main Filters Bar */}
          <div className="flex flex-wrap gap-6 items-center justify-between p-3 md:p-6 bg-card border border-border md:rounded-[var(--radius)]">
            <div className="flex gap-3 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2 text-sm rounded-md transition-colors ${selectedCategory === category ? 'bg-primary text-white border-transparent' : 'bg-transparent text-foreground border border-border hover:bg-muted'}`}
                >
                  {category}
                </button>
              ))}

              <button
                onClick={() => setShowPromoOnly(!showPromoOnly)}
                className={`px-4 py-2 text-sm border rounded-md flex items-center gap-2 transition-colors ${showPromoOnly ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-foreground border-border hover:bg-muted'}`}
              >
                {showPromoOnly ? 'Showing Promos' : 'Promos'}
              </button>

              <button
                onClick={() => setShowLikedOnly(!showLikedOnly)}
                className={`px-4 py-2 text-sm border rounded-md flex items-center gap-2 transition-colors ${showLikedOnly ? 'bg-[#ff4d4f] text-white border-[#ff4d4f]' : 'bg-transparent text-foreground border-border hover:bg-muted'}`}
              >
                {showLikedOnly ? <FaHeart /> : <FaRegHeart />}
                {showLikedOnly ? 'Showing Favorites' : 'Favorites'}
              </button>

            </div>

            <div className="relative flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search by name, brand (LG, TCL, etc.) or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pr-4 pl-10 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary"
              />
              <FaSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>

          {/* Subcategories Bar - Only shown when a specific category is selected and has subcategories */}
          {selectedCategory !== 'All' && availableSubcategories.length > 0 && (
            <div className="flex gap-3 flex-wrap p-4 bg-muted rounded-[var(--radius)] border border-border animate-[fadeIn_0.3s_ease-out]">
              <button
                onClick={() => setSelectedSubcategory('All')}
                className={`px-4 py-1.5 text-xs border border-border rounded-full transition-colors ${selectedSubcategory === 'All' ? 'bg-secondary text-white' : 'bg-white text-foreground hover:bg-gray-50'}`}
              >
                All {selectedCategory}
              </button>
              {availableSubcategories.map(sub => (
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
        </div>

        {/* Product lists */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-8">
            {displayedProducts.map(product => (
              <div key={product.id} className="mb-4  md:mb-0"><ProductCard product={product} /> </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-2xl mb-4">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            <button
              className="border border-border hover:bg-muted text-foreground px-4 py-2 rounded-md font-semibold mt-6 inline-block transition-colors"
              onClick={() => { setSelectedCategory('All'); setSelectedSubcategory('All'); setSearchQuery(''); setVisibleCount(20); }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {filteredProducts.length > visibleCount && (
          <div className="text-center mt-12">
            <button
              className="border border-border hover:bg-muted text-foreground px-8 py-3 rounded-md font-semibold transition-colors"
              onClick={() => setVisibleCount(prev => prev + 20)}
            >
              Load More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto px-4 md:px-6 py-16">Loading products...</div>}>
      <ShopContent />
    </Suspense>
  );
}
