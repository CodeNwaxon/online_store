'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import { useProductCache } from '@/store/useProductCache';
import { FaSearch, FaHandshake, FaChevronDown, FaStore, FaFilter, FaTimes, FaShareAlt, FaCommentDots } from 'react-icons/fa';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import CategoryProductCard, { CategoryProduct } from '@/components/CategoryProductCard';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { toast } from 'react-hot-toast';
import { useLikeStore } from '@/store/useLikeStore';
import { useStoreSales } from '@/hooks/useStoreSales';
import StoreRatingStars from '@/components/StoreRatingStars';
import SpecialStoreMessageOverlay from '@/components/SpecialStoreMessageOverlay';
import { useSpecialStoreUnreadCount } from '@/hooks/useSpecialStoreUnreadCount';
import StoreBillboard from '@/components/StoreBillboard';

function UkUsedPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeSlug = searchParams?.get('store');

  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [allProductsCount, setAllProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(!!storeSlug);
  const [activeStores, setActiveStores] = useState<any[]>([]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [navigatingStoreSlug, setNavigatingStoreSlug] = useState<string | null>(null);
  const [showMessageOverlay, setShowMessageOverlay] = useState(false);
  const navigationResetTimerRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [selectedGroup, setSelectedGroup] = useState(searchParams?.get('group') || 'All');
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.get('category') || 'All');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState(searchParams?.get('price') || 'All');
  const [groups, setGroups] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(86);
  const { likedProductIds } = useLikeStore();
  const { getVendorSales, storeTypeSales } = useStoreSales();
  const currentSalesCount = storeData ? getVendorSales(storeData.ownerEmail) : storeTypeSales.uk_used;
  const unreadMessageCount = useSpecialStoreUnreadCount(storeSlug || undefined);
  const showSwapCard = storeData?.doesSwapping === 'yes';

  const { fetchCollection } = useProductCache();

  useEffect(() => {
    if (storeSlug && storeLoading) return; // Wait for store data

    const loadProducts = async () => {
      setLoading(true);
      try {
        const sortedProds = await fetchCollection('uk_used');
        setAllProductsCount(sortedProds.length);

        const filteredForStore = storeData ? sortedProds.filter(p => p.vendor === storeData.ownerEmail) : sortedProds;

        setProducts(filteredForStore);

        const uniqueGroups = Array.from(new Set(filteredForStore.map(p => p.group).filter(Boolean)));
        setGroups(uniqueGroups);
      } catch (error) {
        console.warn("UkUsed fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [storeData, storeSlug, storeLoading, fetchCollection]);

  // Fetch store data if slug exists
  useEffect(() => {
    if (!storeSlug) {
      setStoreData(null);
      return;
    }
    const fetchStore = async () => {
      setStoreLoading(true);
      try {
        const q = query(collection(db, 'admins'), where('specialStore.slug', '==', storeSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setStoreData(snap.docs[0].data().specialStore);
        } else {
          setStoreData(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setStoreLoading(false);
      }
    };
    fetchStore();
  }, [storeSlug]);

  // Fetch all active special stores for dropdown
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(collection(db, 'admins'), where('specialStore', '!=', null));
        const snap = await getDocs(q);
        const stores = snap.docs
          .map(doc => doc.data())
          .filter(admin => admin.assignedRoutes?.includes('/ADMIN/UK-USED') || admin.role === 'CEO')
          .map(admin => admin.specialStore)
          .filter(Boolean);
        setActiveStores(stores);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStores();
  }, []);

  const priceFilters = [
    { label: 'All Prices', value: 'All' },
    { label: 'My favourite', value: 'favourite' },
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

  useEffect(() => {
    return () => {
      if (navigationResetTimerRef.current) {
        window.clearTimeout(navigationResetTimerRef.current);
      }
    };
  }, []);

  const handleStoreNavigation = (slug: string) => {
    if (storeSlug === slug) {
      setIsStoreDropdownOpen(false);
      return;
    }

    if (navigationResetTimerRef.current) {
      window.clearTimeout(navigationResetTimerRef.current);
    }

    setNavigatingStoreSlug(slug);
    setIsStoreDropdownOpen(false);
    router.push(`/shop/uk-used?store=${slug}`);

    navigationResetTimerRef.current = window.setTimeout(() => {
      setNavigatingStoreSlug(null);
      navigationResetTimerRef.current = null;
    }, 1200);
  };

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

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFD] pb-20">
        <div className={`bg-gradient-to-r ${storeData ? 'from-slate-900 via-gray-800 to-slate-900' : 'from-slate-800 via-gray-700 to-slate-900'} text-white py-4 md:py-8 px-4 relative overflow-hidden`}>
          {storeData?.banner && (
            <div className="absolute inset-0 opacity-40 z-0">
              <img src={storeData.banner} alt="Store Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50"></div>
            </div>
          )}
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 z-0"><FaHandshake size={300} /></div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-black mb-2 md:mb-4 flex items-center gap-4">
              <FaHandshake className="text-slate-300" />
              {storeData ? storeData.name : 'UkUsed & Beauty'}
            </h1>
            <p className="text-sm md:text-xl text-slate-200 max-w-2xl">
              {storeData ? (storeData.slogan || 'Welcome to our premium storefront') : 'Discover our range of premium skincare, makeup, and beauty products.'}
            </p>
          </div>
        </div>
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium animate-pulse">Loading UK Used...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F9] pb-20 relative">
      {/* Store Filter Badge */}
      {storeData && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-white/90 backdrop-blur border border-gray-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FaStore className="text-slate-500" /> {storeData.name}
            </span>
            <Link href="/shop/uk-used" className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors" title="Clear Store Filter">
              <FaTimes size={10} />
            </Link>
          </div>
        </div>
      )}

      {/* Store Billboard (Global Advert) */}
      <StoreBillboard categoryName="uk-used" />

      {/* Header */}
      <div className={`bg-gradient-to-r ${storeData ? 'from-slate-900 via-gray-800 to-slate-900' : 'from-slate-800 via-gray-600 to-slate-900'} text-white py-4 md:py-8 px-4 relative overflow-hidden`}>
        {storeData?.banner && (
          <div className="absolute inset-0 opacity-40 z-0">
            <img src={storeData.banner} alt="Store Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
        )}
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FaHandshake size={300} />
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-5xl font-black mb-0 md:mb-4 flex items-center gap-4">
              <FaHandshake className="text-slate-300" /> {storeData ? storeData.name : 'UK Used'}
            </h1>
            <p className="text-xs md:text-xl text-gray-200 max-w-2xl">
              {storeData ? (storeData.slogan || 'Welcome to our premium storefront') : 'Discover our range of standard UK Used products.'}
            </p>
            {showSwapCard && (
              <div className="mt-1 inline-flex flex-wrap items-center gap-3 rounded bg-white p-1 text-xs md:text-sm font-bold text-orange-600 shadow-sm">
                <span>Yes, we do swapping</span>
                <button
                  type="button"
                  onClick={() => setShowMessageOverlay(true)}
                  className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] md:text-xs font-black text-orange-600 transition-colors hover:bg-orange-100"
                >
                  Contact Us
                </button>
              </div>
            )}
            <StoreRatingStars salesCount={currentSalesCount} textColor="text-gray-200" className="mt-2" />
          </div>
          <div className="flex items-center gap-2">
            {storeData && (
              <button
                onClick={() => setShowMessageOverlay(true)}
                className="relative p-2 md:p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors text-white mt-1 md:mt-2 shrink-0"
                title="Message this special store"
              >
                <FaCommentDots className="w-4 h-4 md:w-5 md:h-5" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-bold shadow-sm">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => {
                const urlObj = new URL(window.location.origin + window.location.pathname);
                if (storeSlug) urlObj.searchParams.set('store', storeSlug);
                if (searchQuery) urlObj.searchParams.set('search', searchQuery);
                if (selectedGroup !== 'All') urlObj.searchParams.set('group', selectedGroup);
                if (selectedCategory !== 'All') urlObj.searchParams.set('category', selectedCategory);
                if (selectedPriceFilter !== 'All') urlObj.searchParams.set('price', selectedPriceFilter);
                const url = urlObj.toString();
                const title = storeData ? `${storeData.name} | Nomo Storez` : 'UkUsed & Beauty | Nomo Storez';
                const text = storeData ? (storeData.slogan || `Shop premium beauty from ${storeData.name}`) : 'Discover our range of premium skincare, makeup, and beauty products.';
                if (navigator.share) {
                  navigator.share({ title, text, url }).catch(() => { });
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
      </div>

      <SpecialStoreMessageOverlay isOpen={showMessageOverlay} onClose={() => setShowMessageOverlay(false)} storeData={storeData} />

      {products.length === 0 ? (
        <div className="py-20 md:py-32 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaHandshake size={24} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No items found</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            We are currently stocking up our UkUsed collection. Check back soon for amazing products.
          </p>
          <Link href={allProductsCount > 0 ? "/shop/uk-used" : "/shop"} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2">
            <FaStore /> Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mx-auto mt-0">
          <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-10">
            {/* Main Filters Bar */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between px-2 py-3 md:py-6 md:px-24 mb-0 bg-white border-y md:border border-slate-100 shadow-sm">

              {/* Groups Pill Buttons */}
              <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar flex-nowrap px-2 md:px-0" style={{ '--scrollbar-thumb': '#475569' } as React.CSSProperties}>
                <button
                  onClick={() => {
                    setSelectedGroup('All');
                    setSelectedCategory('All');
                  }}
                  className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === 'All' ? 'bg-slate-800 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-slate-50'}`}
                >
                  ALL BRANDS
                </button>
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedCategory('All');
                    }}
                    className={`px-3 py-1.5 md:px-5 md:py-2 text-[9px] md:text-xs rounded-md transition-colors whitespace-nowrap font-bold ${selectedGroup === group ? 'bg-slate-800 text-white border-transparent' : 'bg-transparent text-gray-700 border border-gray-200 hover:bg-slate-50'}`}
                  >
                    {group.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 md:flex flex-row gap-2 md:gap-3 w-full md:w-auto max-md:px-1 flex-1 md:max-w-xl">
                <div className="col-span-2 md:col-span-1 relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search UkUsed..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 transition-all text-xs md:text-sm"
                  />
                  <FaSearch
                    size={16}
                    className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <div className="col-span-1 relative w-full sm:w-40">
                  <select
                    value={selectedPriceFilter}
                    onChange={(e) => setSelectedPriceFilter(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 pr-10 rounded-md md:rounded-xl border border-gray-200 bg-slate-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 outline-none text-xs md:text-sm font-semibold text-gray-700 cursor-pointer"
                  >
                    {priceFilters.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                </div>

                {/* Special Stores Dropdown */}
                <div className="col-span-3 md:col-span-1 relative w-full sm:w-48">
                  {storeData ? (
                    <button
                      onClick={() => router.push('/shop/uk-used')}
                      className="w-full px-4 py-2.5 rounded-md md:rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-between text-xs md:text-sm font-bold shadow-sm transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FaStore className="shrink-0" />
                        <span className="truncate">{storeData.name}</span>
                      </div>
                      <FaTimes className="text-[12px] shrink-0 ml-2" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (navigatingStoreSlug) return;
                        setIsStoreDropdownOpen(!isStoreDropdownOpen);
                      }}
                      disabled={Boolean(navigatingStoreSlug)}
                      className={`w-full px-4 py-2.5 rounded-md md:rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-between text-xs md:text-sm font-bold shadow-sm transition-colors ${Boolean(navigatingStoreSlug) ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {Boolean(navigatingStoreSlug) ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <FaStore className="shrink-0" />
                        )}
                        <span className="truncate">Special Stores</span>
                      </div>
                      {Boolean(navigatingStoreSlug) ? null : <FaChevronDown className="text-[10px] shrink-0 ml-2" />}
                    </button>
                  )}

                  {!storeData && isStoreDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-full md:w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {activeStores.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground font-semibold">No stores available</div>
                        ) : activeStores.map(store => (
                          <button
                            key={store.slug}
                            onClick={() => handleStoreNavigation(store.slug)}
                            disabled={navigatingStoreSlug === store.slug}
                            className="w-full text-left p-3 hover:bg-slate-50 text-xs font-bold text-gray-800 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{store.name}</span>
                            <FaStore className="text-slate-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categories Bar - Only shown when a specific group is selected and has categories */}
            {selectedGroup !== 'All' && categories.length > 1 && (
              <div className="flex gap-3 flex-wrap p-3 md:py-4 md:px-24 bg-slate-50/50 border border-slate-100 -mt-2 md:-mt-4 animate-in fade-in duration-300">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-bold border rounded-full transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white border-transparent' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="max-w-7xl mx-auto text-center px-2 py-20 bg-white rounded-2xl shadow-sm border border-slate-50">
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
                  setSelectedGroup('All');
                  setSelectedCategory('All');
                  setSelectedPriceFilter('All');
                }}
                className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="my-4 px-1.5 md:px-6 max-w-8xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-1 gap-y-3 sm:gap-4 md:gap-6">
                {displayedProducts.map(product => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    themeClass="bg-gray-600 hover:bg-gray-700"
                    categoryName="UkUsed"
                    detailPath="/shop/uk-used/"
                  />
                ))}
              </div>

              {filteredProducts.length > visibleCount && (
                <div className="text-center mt-12 flex justify-center">
                  <button
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-gray-400 hover:shadow-md"
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

export default function UkUsedClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBFD] flex items-center justify-center"><div className="w-12 h-12 border-4 border-gray-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <UkUsedPageContent />
    </Suspense>
  );
}

