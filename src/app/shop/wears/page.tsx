'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FaSearch, FaUserTie, FaChevronDown, FaStore, FaFilter } from 'react-icons/fa';
import CategoryProductCard, { CategoryProduct } from '@/components/CategoryProductCard';
import Link from 'next/link';

export default function WearsPage() {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('All');
  const [groups, setGroups] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const q = query(collection(db, 'wears'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CategoryProduct[];
      const sortedProds = [...prods].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      setProducts(sortedProds);
      const uniqueGroups = Array.from(new Set(sortedProds.map(p => p.group).filter(Boolean)));
      setGroups(uniqueGroups);
      setLoading(false);
    }, (error) => {
      console.warn("Wears listener error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const priceFilters = [
    { label: 'All Prices', value: 'All' },
    { label: 'High-End / Expensive (> 100,000)', value: 'high' },
    { label: '50,000 - 100,000', value: 'mid-high' },
    { label: 'Mid-Range (10,000 - 50,000)', value: 'mid' },
    { label: 'Low Price / Below 10,000', value: 'low' },
  ];

  useEffect(() => {
    if (selectedGroup === 'All') {
      const uniqueCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCats);
    } else {
      const groupProds = products.filter(p => p.group === selectedGroup);
      const uniqueCats = Array.from(new Set(groupProds.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCats);
    }
    setSelectedCategory('All');
  }, [selectedGroup, products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'All' || p.group === selectedGroup;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    let matchesPrice = true;
    if (selectedPriceFilter !== 'All') {
      if (selectedPriceFilter === 'high' && p.price <= 100000) matchesPrice = false;
      if (selectedPriceFilter === 'mid-high' && (p.price < 50000 || p.price > 100000)) matchesPrice = false;
      if (selectedPriceFilter === 'mid' && (p.price < 10000 || p.price >= 50000)) matchesPrice = false;
      if (selectedPriceFilter === 'low' && p.price >= 10000) matchesPrice = false;
    }

    return matchesSearch && matchesGroup && matchesCategory && matchesPrice;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBFD] pb-20">
        <div className="bg-gradient-to-r from-purple-800 via-violet-700 to-purple-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaUserTie size={300} /></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4"><FaUserTie className="text-purple-300" /> Fashion & Wears</h1>
            <p className="text-sm md:text-xl text-purple-100 max-w-2xl">Explore our collection of trendy clothing, shoes, and stylish accessories.</p>
          </div>
        </div>
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-purple-600 font-medium animate-pulse">Loading wears...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFBFD] pb-20">
        <div className="bg-gradient-to-r from-purple-800 via-violet-700 to-purple-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaUserTie size={300} /></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4"><FaUserTie className="text-purple-300" /> Fashion & Wears</h1>
            <p className="text-sm md:text-xl text-purple-100 max-w-2xl">Explore our collection of trendy clothing, shoes, and stylish accessories.</p>
          </div>
        </div>
        <div className="py-20 md:py-32 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6"><FaUserTie className="text-4xl text-purple-500" /></div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-800">Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">We are currently stocking up our fashion collection. Check back soon for amazing wears.</p>
          <Link href="/shop" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2"><FaStore /> Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFD] pb-20">
      <div className="bg-gradient-to-r from-purple-800 via-violet-700 to-purple-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4"><FaUserTie size={300} /></div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4"><FaUserTie className="text-purple-300" /> Fashion & Wears</h1>
          <p className="text-sm md:text-xl text-purple-100 max-w-2xl">Explore our collection of trendy clothing, shoes, and stylish accessories.</p>
        </div>
      </div>

      <div className="mx-auto mt-0">
        <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-10 max-md:-mx-1">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between px-2 py-3 md:py-6 md:px-24 mb-0 bg-white border-y md:border border-purple-100 shadow-sm">
            <div className="flex gap-2 max-md:w-full max-md:overflow-x-auto max-md:pb-2 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] flex-nowrap md:flex-wrap px-2 md:px-0">
              <button onClick={() => { setSelectedGroup('All'); setSelectedCategory('All'); }} className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === 'All' ? 'bg-purple-600 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-purple-50'}`}>ALL GROUPS</button>
              {groups.map(group => (
                <button key={group} onClick={() => { setSelectedGroup(group); setSelectedCategory('All'); }} className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === group ? 'bg-purple-600 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-purple-50'}`}>{group.toUpperCase()}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 md:flex flex-row gap-2 md:gap-3 w-full md:w-auto max-md:px-1 flex-1 md:max-w-xl">
              <div className="col-span-2 relative flex-1 min-w-[200px]">
                <input type="text" placeholder="Search wears..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-xs md:text-sm" />
                <FaSearch size={16} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="col-span-1 relative w-full sm:w-48">
                <select
                  value={selectedPriceFilter}
                  onChange={(e) => setSelectedPriceFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 pr-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none text-xs md:text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  {priceFilters.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
            </div>
          </div>

          {selectedGroup !== 'All' && categories.length > 1 && (
            <div className="flex gap-3 flex-wrap p-3 md:py-4 md:px-24 bg-purple-50/50 border border-purple-100 -mt-2 md:-mt-4 animate-in fade-in duration-300">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-bold border rounded-full transition-colors ${selectedCategory === cat ? 'bg-purple-600 text-white border-transparent' : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-100'}`}>{cat.toUpperCase()}</button>
              ))}
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="max-w-7xl mx-auto text-center px-2 py-20 bg-white rounded-2xl shadow-sm border border-purple-50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4"><FaSearch size={24} /></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-500 max-w-md mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
            <button onClick={() => { setSearchQuery(''); setSelectedGroup('All'); setSelectedCategory('All'); setSelectedPriceFilter('All'); }} className="mt-6 px-6 py-2 bg-purple-50 text-purple-700 font-bold rounded-full hover:bg-purple-100 transition-colors">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="px-1.5 md:px-4 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 sm:gap-4 md:gap-6">
              {displayedProducts.map(product => (
                <CategoryProductCard key={product.id} product={product} themeClass="bg-purple-600 hover:bg-purple-700" categoryName="Wears" detailPath="/shop/wears/" />
              ))}
            </div>
            {filteredProducts.length > visibleCount && (
              <div className="text-center mt-12 flex justify-center">
                <button className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 px-6 py-3 text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-md" onClick={() => setVisibleCount(prev => prev + 24)}>
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
