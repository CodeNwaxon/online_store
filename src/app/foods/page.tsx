'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import FoodCard, { FoodProduct } from '@/components/FoodCard';
import { FaLeaf, FaUtensils, FaSearch, FaFilter } from 'react-icons/fa';

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'foods'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodProduct[];
      setFoods(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching foods:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Derived unique filter options
  const groups = useMemo(() => {
    const g = Array.from(new Set(foods.map(f => f.group).filter(Boolean) as string[]));
    return ['All', ...g.sort()];
  }, [foods]);

  const categories = useMemo(() => {
    // If a group is selected, we could restrict categories, but showing all is simpler for now.
    const validFoods = selectedGroup === 'All' ? foods : foods.filter(f => f.group === selectedGroup);
    const c = Array.from(new Set(validFoods.map(f => f.category).filter(Boolean) as string[]));
    return ['All', ...c.sort()];
  }, [foods, selectedGroup]);

  const priceFilters = [
    { label: 'All Prices', value: 'All' },
    { label: 'High-End / Expensive (> 100,000)', value: 'high' },
    { label: '50,000 - 100,000', value: 'mid-high' },
    { label: 'Mid-Range (10,000 - 50,000)', value: 'mid' },
    { label: 'Low Price / Below 10,000', value: 'low' },
  ];

  // Filtering Logic
  const filteredFoods = useMemo(() => {
    return foods.filter(f => {
      // Search
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Group
      if (selectedGroup !== 'All' && f.group !== selectedGroup) return false;

      // Category
      if (selectedCategory !== 'All' && f.category !== selectedCategory) return false;

      // Price
      if (selectedPriceFilter !== 'All') {
        if (selectedPriceFilter === 'high' && f.price <= 100000) return false;
        if (selectedPriceFilter === 'mid-high' && (f.price < 50000 || f.price > 100000)) return false;
        if (selectedPriceFilter === 'mid' && (f.price < 10000 || f.price >= 50000)) return false;
        if (selectedPriceFilter === 'low' && f.price >= 10000) return false;
      }

      return true;
    });
  }, [foods, searchQuery, selectedGroup, selectedCategory, selectedPriceFilter]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-green-50/30">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-green-700 font-bold animate-pulse">Loading fresh foods...</p>
      </div>
    );
  }

  if (foods.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
        <div className="bg-white p-6 md:p-12 rounded-3xl shadow-2xl border border-green-100 text-center max-w-lg animate-in slide-in-from-bottom-8 duration-700">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative overflow-hidden">
            <FaUtensils size={40} className="relative z-10 animate-bounce" />
            <div className="absolute inset-0 bg-green-200/50 animate-pulse rounded-full" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-green-800 mb-4 tracking-tight">
            Food Market
            <span className="block text-xl text-green-600 mt-2">Coming Soon!</span>
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We are preparing the freshest and most delicious offerings for you. Our food market will be open very soon. Stay tuned!
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
            <FaLeaf /> Farm Fresh Quality
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-emerald-900 text-white py-4 md:py-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FaUtensils size={300} />
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4">
            <FaLeaf className="text-green-300" /> Food Market
          </h1>
          <p className="text-sm md:text-xl text-green-100 max-w-2xl">
            Fresh, delicious, and healthy choices curated just for you. Browse our premium selection.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-0">
        <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-10 max-md:-mx-1">
          {/* Main Filters Bar */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between px-2 py-3 md:py-6 md:px-24 mb-0 bg-white border-y md:border border-green-100 shadow-sm">

            {/* Groups Pill Buttons */}
            <div className="flex gap-2 max-md:w-full max-md:overflow-x-auto max-md:pb-2 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] flex-nowrap md:flex-wrap px-2 md:px-0">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedGroup(group);
                    setSelectedCategory('All'); // Reset category when group changes
                  }}
                  className={`px-3 py-1.5 md:px-5 md:py-2 text-[10px] md:text-sm rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === group ? 'bg-green-600 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-green-50'}`}
                >
                  {group === 'All' ? 'All Groups' : group}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 md:flex flex-row gap-2 md:gap-3 w-full md:w-auto max-md:px-1 flex-1 md:max-w-xl">
              {/* Search Bar */}
              <div className="col-span-2 relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-xs md:text-sm"
                />
                <FaSearch
                  size={16}
                  className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>

              {/* Price Filter Dropdown */}
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedPriceFilter}
                  onChange={(e) => setSelectedPriceFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 pr-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-xs md:text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  {priceFilters.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Categories Bar - Only shown when a specific group is selected and has categories */}
          {selectedGroup !== 'All' && categories.length > 1 && (
            <div className="flex gap-3 flex-wrap p-3 md:py-4 md:px-24 bg-green-50/50 border border-green-100 -mt-2 md:-mt-4 animate-in fade-in duration-300">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-bold border rounded-full transition-colors ${selectedCategory === cat ? 'bg-green-600 text-white border-transparent' : 'bg-white text-green-800 border-green-200 hover:bg-green-100'}`}
                >
                  {cat === 'All' ? `All ${selectedGroup}` : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        {filteredFoods.length === 0 ? (
          <div className="max-w-7xl mx-auto text-center px-2 py-20 bg-white rounded-2xl shadow-sm border border-green-50">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
              <FaSearch size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No foods found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('All');
                setSelectedCategory('All');
                setSelectedPriceFilter('All');
              }}
              className="mt-6 px-6 py-2 bg-green-50 text-green-700 font-bold rounded-full hover:bg-green-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="px-1.5 md:px-4 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-4 md:gap-6">
            {filteredFoods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
