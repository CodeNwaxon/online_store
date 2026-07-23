'use client';

import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useProductCache } from '@/store/useProductCache';
import { FaSearch, FaBoxes, FaChevronDown, FaStore, FaShareAlt } from 'react-icons/fa';
import CategoryProductCard, { CategoryProduct } from '@/components/CategoryProductCard';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { useLikeStore } from '@/store/useLikeStore';
import { useStoreSales } from '@/hooks/useStoreSales';
import StoreRatingStars from '@/components/StoreRatingStars';

function ToiletKitchenContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [selectedGroup, setSelectedGroup] = useState(searchParams?.get('group') || 'All');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'All');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState(searchParams?.get('price') || 'All');
  const [groups, setGroups] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);
  const { likedProductIds } = useLikeStore();
  const { storeTypeSales } = useStoreSales();

  const { fetchCollection } = useProductCache();

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const sortedProds = await fetchCollection('toilet_kitchen');
        setProducts(sortedProds);
        const uniqueGroups = Array.from(new Set(sortedProds.map(p => p.group).filter(Boolean)));
        setGroups(uniqueGroups);
      } catch (error) {
        console.warn("ToiletKitchen fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [fetchCollection]);

  useEffect(() => {
    if (selectedGroup === 'All') {
      const uniqueCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCats);
    } else {
      const groupProds = products.filter(p => p.group === selectedGroup);
      const uniqueCats = Array.from(new Set(groupProds.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCats);
    }
  }, [selectedGroup, products]);

  const priceFilters = [
    { label: 'All Prices', value: 'All' },
    { label: 'My favourite', value: 'favourite' },
    { label: 'High-End / Expensive (> 100,000)', value: 'high' },
    { label: '50,000 - 100,000', value: 'mid-high' },
    { label: 'Mid-Range (10,000 - 50,000)', value: 'mid' },
    { label: 'Low Price / Below 10,000', value: 'low' },
  ];

  const baseFilteredProducts = products.filter(p => {
    const matchesGroup = selectedGroup === 'All' || p.group === selectedGroup;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesPrice = true;
    if (selectedPriceFilter !== 'All') {
      if (selectedPriceFilter === 'favourite') matchesPrice = !!likedProductIds[p.id];
      else if (selectedPriceFilter === 'high' && p.price <= 100000) matchesPrice = false;
      else if (selectedPriceFilter === 'mid-high' && (p.price < 50000 || p.price > 100000)) matchesPrice = false;
      else if (selectedPriceFilter === 'mid' && (p.price < 10000 || p.price >= 50000)) matchesPrice = false;
      else if (selectedPriceFilter === 'low' && p.price >= 10000) matchesPrice = false;
    }

    return matchesGroup && matchesCategory && matchesPrice;
  });

  const filteredProducts = (() => {
    if (!searchQuery.trim()) return baseFilteredProducts;
    const fuse = new Fuse(baseFilteredProducts, {
      keys: ['name', 'group', 'category', 'description', 'productCode'],
      threshold: 0.3,
      ignoreLocation: true
    });
    return fuse.search(searchQuery.trim()).map(r => r.item);
  })();

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] pb-20">
        <div className="bg-gradient-to-r from-teal-800 via-cyan-700 to-teal-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaBoxes size={300} /></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4"><FaBoxes className="text-teal-300" /> Toilet & Kitchen</h1>
            <p className="text-sm md:text-xl text-teal-100 max-w-2xl">Upgrade your home with premium kitchen and toilet fittings.</p>
          </div>
        </div>
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-teal-600 font-medium animate-pulse">Loading items...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFDFE] pb-20">
        <div className="bg-gradient-to-r from-teal-800 via-cyan-700 to-teal-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaBoxes size={300} /></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4"><FaBoxes className="text-teal-300" /> Toilet & Kitchen</h1>
            <p className="text-sm md:text-xl text-teal-100 max-w-2xl">Upgrade your home with premium kitchen and toilet fittings.</p>
          </div>
        </div>
        <div className="py-20 md:py-32 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6"><FaBoxes className="text-4xl text-teal-500" /></div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">We are currently stocking up our Toilet & Kitchen collection. Check back soon for amazing items.</p>
          <Link href="/shop" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2"><FaStore /> Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFE] pb-20">
      <div className="bg-gradient-to-r from-teal-800 via-cyan-700 to-teal-900 text-white py-3 md:py-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaBoxes size={300} /></div>
        <div className="max-w-[1200px] mx-auto relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-5xl font-black mb-0 md:mb-4 flex items-center gap-4"><FaBoxes className="text-teal-300" /> Toilet & Kitchen</h1>
            <p className="text-xs md:text-xl text-teal-100 max-w-2xl">Upgrade your home with premium kitchen and toilet fittings.</p>
            <StoreRatingStars salesCount={storeTypeSales.toilet_kitchen} textColor="text-teal-100" className="mt-2" />
          </div>
          <button 
            onClick={() => {
              const urlObj = new URL(window.location.origin + window.location.pathname);
              if (searchQuery) urlObj.searchParams.set('search', searchQuery);
              if (selectedGroup !== 'All') urlObj.searchParams.set('group', selectedGroup);
              if (selectedCategory !== 'All') urlObj.searchParams.set('category', selectedCategory);
              const url = urlObj.toString();
              const title = 'Toilet & Kitchen | Nomo Storez';
              if (navigator.share) {
                navigator.share({ title, url }).catch(()=>{});
              } else {
                navigator.clipboard.writeText(url);
                toast.success('Page link copied!');
              }
            }}
            className="p-2 md:p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors text-white mt-1 md:mt-2 shrink-0"
            title="Share this page"
          >
            <FaShareAlt className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-0">
        <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between px-2 py-3 md:py-6 md:px-24 mb-0 bg-white border-y md:border border-teal-100 shadow-sm">
            <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar flex-nowrap px-2 md:px-0" style={{ '--scrollbar-thumb': '#0d9488' } as React.CSSProperties}>
              <button onClick={() => { setSelectedGroup('All'); setSelectedCategory('All'); }} className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === 'All' ? 'bg-teal-600 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-teal-50'}`}>ALL GROUPS</button>
              {groups.map(group => (
                <button key={group} onClick={() => { setSelectedGroup(group); setSelectedCategory('All'); }} className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === group ? 'bg-teal-600 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-teal-50'}`}>{group.toUpperCase()}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 md:flex flex-row gap-2 md:gap-3 w-full md:w-auto max-md:px-1 flex-1 md:max-w-xl">
              <div className="col-span-2 md:col-span-1 relative flex-1 min-w-[200px]">
                <input type="text" placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all text-xs md:text-sm" />
                <FaSearch size={16} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="col-span-1 relative w-full sm:w-40">
                <select
                  value={selectedPriceFilter}
                  onChange={(e) => setSelectedPriceFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 pr-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-xs md:text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  {priceFilters.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedGroup !== 'All' && categories.length > 1 && (
            <div className="flex gap-3 flex-wrap p-3 md:py-4 md:px-24 bg-teal-50/50 border border-teal-100 -mt-2 md:-mt-4 animate-in fade-in duration-300">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-bold border rounded-full transition-colors ${selectedCategory === cat ? 'bg-teal-600 text-white border-transparent' : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100'}`}>{cat.toUpperCase()}</button>
              ))}
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="max-w-7xl mx-auto text-center px-2 py-20 bg-white rounded-2xl shadow-sm border border-teal-50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4"><FaSearch size={24} /></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedGroup('All'); setSelectedCategory('All'); }} className="mt-6 px-6 py-2 bg-teal-50 text-teal-700 font-bold rounded-full hover:bg-teal-100 transition-colors">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="px-1.5 md:px-4 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4 md:gap-6">
              {displayedProducts.map(product => (
                <CategoryProductCard key={product.id} product={product} themeClass="bg-teal-600 hover:bg-teal-700" categoryName="Toilet & Kitchen" detailPath="/shop/toilet-kitchen/" />
              ))}
            </div>
            {filteredProducts.length > visibleCount && (
              <div className="text-center mt-12 flex justify-center">
                <button className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-700 px-6 py-3 text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-teal-300 hover:shadow-md" onClick={() => setVisibleCount(prev => prev + 24)}>
                  <span>Load More Products</span>
                  <FaChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-all duration-300 ease-out" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ToiletKitchenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFDFE] flex items-center justify-center"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ToiletKitchenContent />
    </Suspense>
  );
}
