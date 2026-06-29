'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FaSearch, FaCouch, FaChevronDown, FaStore, FaFilter } from 'react-icons/fa';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/data/products';
import Link from 'next/link';

export default function FurniturePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      const sortedProds = [...prods].sort((a: any, b: any) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Filter for only Furniture group
      const furnitureProds = sortedProds.filter(p => p.group && p.group.toLowerCase() === 'furniture');
      
      setProducts(furnitureProds);

      const uniqueCats = Array.from(new Set(furnitureProds.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCats);
      
      setLoading(false);
    }, (error) => {
      console.warn("Furniture listener error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-[#FDFBF9] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-white py-4 md:py-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FaCouch size={300} />
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4">
            <FaCouch className="text-amber-300" /> Furniture & Decor
          </h1>
          <p className="text-sm md:text-xl text-amber-100 max-w-2xl">
            Discover premium furniture and beautiful artifacts for your space.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-primary font-medium animate-pulse">Loading furniture...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 md:py-32 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <FaCouch className="text-4xl text-amber-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            We are currently stocking up our Furniture collection. Check back soon for amazing pieces.
          </p>
          <Link href="/shop" className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2">
            <FaStore /> Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mx-auto mt-0">
          <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-10 max-md:-mx-1">
            {/* Main Filters Bar */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between px-2 py-3 md:py-6 md:px-24 mb-0 bg-white border-y md:border border-amber-100 shadow-sm">

              {/* Category Pill Buttons */}
              <div className="flex gap-2 max-md:w-full max-md:overflow-x-auto max-md:pb-2 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] flex-nowrap md:flex-wrap px-2 md:px-0">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedCategory === 'All' ? 'bg-amber-700 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-amber-50'}`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedCategory === cat ? 'bg-amber-700 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-amber-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 md:flex flex-row gap-2 md:gap-3 w-full md:w-auto max-md:px-1 flex-1 md:max-w-xl">
                {/* Search Bar */}
                <div className="col-span-3 relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search furniture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all text-xs md:text-sm"
                  />
                  <FaSearch
                    size={16}
                    className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="max-w-7xl mx-auto text-center px-2 py-20 bg-white rounded-2xl shadow-sm border border-amber-50">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                <FaSearch size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-6 px-6 py-2 bg-amber-50 text-amber-700 font-bold rounded-full hover:bg-amber-100 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="px-1.5 md:px-4 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-4 md:gap-6">
                {displayedProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                  />
                ))}
              </div>

              {filteredProducts.length > visibleCount && (
                <div className="text-center mt-12 flex justify-center">
                  <button
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-amber-200 bg-white hover:bg-amber-50 text-amber-800 px-6 py-3 text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-amber-300 hover:shadow-md"
                    onClick={() => setVisibleCount(prev => prev + 24)}
                  >
                    <span>Load More Products</span>
                    <FaChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-all duration-300 ease-out" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
