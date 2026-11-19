'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { products as staticProducts, Category } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { FaFilter, FaSearch, FaChevronDown, FaChevronLeft, FaChevronRight, FaCreditCard, FaHeart, FaRegHeart, FaShareAlt, FaSyncAlt, FaTimes, FaRandom } from 'react-icons/fa';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useProductCache } from '@/store/useProductCache';
import { normalizeExpiredPromos } from '@/lib/promoUtils';
import { useLikeStore } from '@/store/useLikeStore';
import { useStoreSales } from '@/hooks/useStoreSales';
import StoreRatingStars from '@/components/StoreRatingStars';
import Fuse from 'fuse.js';
import { useAllowShuffle } from '@/hooks/useAllowShuffle';
import { shuffleWithCategorySpacing, shuffleWithLatestTwoFirst } from '@/lib/shuffleUtils';
import { searchProductsWithRamRom } from '@/lib/searchUtils';
import { useStableShuffle } from '@/hooks/useStableShuffle';

// Price range options for price filter - easily add more items here!
export interface PriceRangeOption {
  id: string;
  label: string;
  min: number;
  max: number | null;
}

export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
  { id: '10k+', label: '₦ 10k+', min: 10000, max: null },
  { id: '20k-50k', label: '20k - 50k', min: 20000, max: 50000 },
  { id: '50k-100k', label: '50k - 100k', min: 50000, max: 100000 },
  { id: '100k-200k', label: '100k - 200k', min: 100000, max: 200000 },
  { id: '200k-300k', label: '200k - 300k', min: 200000, max: 300000 },
  { id: '300k-500k', label: '300k - 500k', min: 300000, max: 500000 },
  { id: '500k-1m', label: '500k - 1m', min: 500000, max: 1000000 },
  { id: '1m+', label: '1,000,000+', min: 1000000, max: null },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category');

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>(searchParams.get('group') || 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || initialCategory || 'All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [visibleCount, setVisibleCount] = useState(84);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const { likedProductIds } = useLikeStore();
  const { storeTypeSales } = useStoreSales();
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'default' | 'top_rated' | 'newest'>('default');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('All');
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const { allowShuffle } = useAllowShuffle('products');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isManualShuffle, setIsManualShuffle] = useState(false);
  const priceFilterRef = useRef<HTMLDivElement>(null);
  const filterSliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (filterSliderRef.current) {
      filterSliderRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priceFilterRef.current && !priceFilterRef.current.contains(event.target as Node)) {
        setIsPriceFilterOpen(false);
      }
    };
    if (isPriceFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPriceFilterOpen]);

  const { fetchCollection } = useProductCache();

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const dynamicProducts = normalizeExpiredPromos(await fetchCollection('products'));

        // Auto-remove expired promos locally
        const promoNow = new Date();
        const mutatedProducts = dynamicProducts.map((p: any) => {
          const getPromoEndTime = (val: any) => {
            if (!val) return 0;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            return new Date(val).getTime() || 0;
          };
          const promoEndNum = getPromoEndTime(p.promoEndDate);
          if (p.isPromo && promoEndNum > 0 && promoEndNum < promoNow.getTime()) {
            try {
              const updateData: any = {
                isPromo: false,
                promoEndDate: null,
                updatedAt: promoNow.toISOString()
              };
              if ((p as any).oldPrice) {
                updateData.price = (p as any).oldPrice;
                updateData.oldPrice = null;
              }
              updateDoc(doc(db, 'products', p.id), updateData).catch(() => { });
            } catch (err) { }

            return {
              ...p,
              isPromo: false,
              promoEndDate: null,
              price: (p as any).oldPrice || p.price,
              oldPrice: null
            };
          }
          return p;
        });

        const parseDate = (dateVal: any) => {
          if (!dateVal) return 0;
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
          return new Date(dateVal).getTime() || 0;
        };

        const sortedProducts = (mutatedProducts.length > 0 ? mutatedProducts : staticProducts).sort((a: any, b: any) => {
          const dateA = parseDate(a.updatedAt);
          const dateB = parseDate(b.updatedAt);
          return dateB - dateA;
        });

        setProducts(sortedProducts);
      } catch (error) {
        console.error("Error processing products:", error);
        setProducts(staticProducts);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [fetchCollection]);

  useEffect(() => {
    const unsubscribeLikes = onSnapshot(collection(db, 'product_likes'), (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        counts[d.id] = d.data().count || 0;
      });
      setLikesCounts(counts);
    });
    return () => unsubscribeLikes();
  }, []);

  // Reset category when group changes
  useEffect(() => {
    setSelectedCategory('All');
  }, [selectedGroup]);

  const groups = (() => {
    const parseDate = (dateVal: any) => {
      if (!dateVal) return 0;
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
      return new Date(dateVal).getTime() || 0;
    };
    const uniqueGroups = Array.from(new Set(products.map(p => p.group))).filter(Boolean);
    // Sort by earliest product in each group (oldest group first)
    uniqueGroups.sort((a, b) => {
      const earliestA = Math.min(...products.filter(p => p.group === a).map(p => parseDate(p.createdAt || p.updatedAt)));
      const earliestB = Math.min(...products.filter(p => p.group === b).map(p => parseDate(p.createdAt || p.updatedAt)));
      return earliestA - earliestB;
    });
    return ['All', ...uniqueGroups];
  })();

  // Derived state
  // Extract and deduplicate categories case-insensitively
  const categoryMap = new Map();
  products
    .filter(p => selectedGroup === 'All' || (typeof p.group === 'string' && p.group.trim().toLowerCase() === selectedGroup.trim().toLowerCase()))
    .forEach(p => {
      if (p.category && typeof p.category === 'string' && p.category.trim()) {
        const key = p.category.trim().toLowerCase();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, p.category.trim());
        }
      }
    });
  const availableCategories = Array.from(categoryMap.values()).sort();

  const manufacturers = Array.from(new Set(products.map(p => {
    const m = p.manufacturer;
    return typeof m === 'string' ? m.trim().toLowerCase() : null;
  }).filter(Boolean))).sort();

  const baseFilteredProducts = products.filter(product => {
    const matchesGroup = selectedGroup === 'All' ||
      (typeof product.group === 'string' && product.group.trim().toLowerCase() === selectedGroup.trim().toLowerCase());

    const matchesCategory = selectedCategory === 'All' ||
      (typeof product.category === 'string' && product.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

    let matchesBrand = selectedBrand === 'All';
    if (!matchesBrand && selectedBrand) {
      const brandQ = selectedBrand.trim().toLowerCase();
      const mfg = typeof product.manufacturer === 'string' ? product.manufacturer.toLowerCase().trim() : '';
      const name = typeof product.name === 'string' ? product.name.toLowerCase() : '';

      matchesBrand = mfg.includes(brandQ) || name.includes(brandQ);
    }

    const matchesLiked = !showLikedOnly || likedProductIds[product.id];
    const matchesPromo = !showPromoOnly || product.isPromo;

    // Price range filtering
    let matchesPrice = true;
    if (selectedPriceRange !== 'All') {
      const option = PRICE_RANGE_OPTIONS.find(o => o.id === selectedPriceRange);
      if (option) {
        const prodPrice = Number(product.price) || 0;
        if (option.max !== null) {
          matchesPrice = prodPrice >= option.min && prodPrice <= option.max;
        } else {
          matchesPrice = prodPrice >= option.min;
        }
      }
    }

    const isVisible = (product.quantity ?? 0) > 0;
    return matchesGroup && matchesCategory && matchesBrand && matchesLiked && matchesPromo && matchesPrice && isVisible;
  });

  const filteredProducts = useMemo(() => {
    return searchProductsWithRamRom(baseFilteredProducts, searchQuery);
  }, [baseFilteredProducts, searchQuery]);

  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'top_rated') {
      const likesA = likesCounts[a.id] || 0;
      const likesB = likesCounts[b.id] || 0;
      return likesB - likesA;
    }
    if (sortBy === 'newest') {
      const parseDate = (dateVal: any) => {
        if (!dateVal) return 0;
        if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
        return new Date(dateVal).getTime() || 0;
      };
      return parseDate(b.updatedAt) - parseDate(a.updatedAt);
    }
    return 0;
  });

  const shuffleActive = (allowShuffle || isManualShuffle) && sortBy !== 'top_rated' && sortBy !== 'newest';
  const orderedProducts = useStableShuffle(sortedFilteredProducts, shuffleActive, shuffleSeed);

  const displayedProducts = orderedProducts.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse text-xl">Discovering our collection...</p>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-14 md:py-16">
      <div className="max-w-[1440px] mx-auto px-2 md:px-6">
        <header className="px-2 md:px-0 mb-4 md:mb-12 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-0 md:mb-2">Our Collection</h1>
              <p className="-mt-1 text-[10px] md:text-base text-muted-foreground">Explore our range of premium African-inspired goods.</p>
              <StoreRatingStars salesCount={storeTypeSales.shop} textColor="text-muted-foreground" className="mt-1" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="p-2 border border-border rounded-full hover:bg-muted transition-colors text-muted-foreground hidden sm:flex items-center justify-center"
                title="Refresh page to get latest data"
              >
                <FaSyncAlt className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const urlObj = new URL(window.location.origin + window.location.pathname);
                  if (searchQuery) urlObj.searchParams.set('search', searchQuery);
                  if (selectedGroup !== 'All') urlObj.searchParams.set('group', selectedGroup);
                  if (selectedCategory !== 'All') urlObj.searchParams.set('category', selectedCategory);
                  const url = urlObj.toString();
                  const title = 'Our Collection | Nomo Storez';
                  if (navigator.share) {
                    navigator.share({ title, url }).catch(() => { });
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success('Page link copied!');
                  }
                }}
                className="p-2 border border-border rounded-full hover:bg-muted transition-colors text-muted-foreground"
                title="Share this page"
              >
                <FaShareAlt className="w-4 h-4" />
              </button>
            </div>
          </div>
          <Link href="/installments" className="text-xs md:text-base bg-primary hover:bg-primary-hover text-white flex items-center gap-2 rounded-md font-semibold px-4 py-2 transition-colors">
            <FaCreditCard /> Installmental Payment
          </Link>
        </header>

        <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-12 max-md:-mx-1">
          {/* Main Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 md:gap-5 items-stretch md:items-start justify-between p-2 md:p-4 lg:p-5 bg-card border-y md:border border-border md:rounded-[var(--radius)]">
            {/* Filter Slider Container with Desktop Scroll Arrows (Expanded width) */}
            <div className="relative flex items-center flex-1 min-w-0 md:max-w-[67%] lg:max-w-[70%] xl:max-w-[72%] shrink">
              {/* Left Arrow Button (Desktop Only) - Compact Size */}
              <button
                type="button"
                onClick={() => scrollSlider('left')}
                className="hidden md:flex shrink-0 items-center justify-center w-5.5 h-5.5 md:w-6 md:h-6 mr-3 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm focus:outline-none"
                aria-label="Scroll filter left"
                title="Scroll left"
              >
                <FaChevronLeft className="w-2 h-2" />
              </button>

              {/* Scrollable Filter Buttons */}
              <div
                ref={filterSliderRef}
                className="flex items-center gap-2 w-full overflow-x-auto pb-1.5 md:pb-1 custom-scrollbar flex-nowrap px-1 md:px-0 scroll-smooth"
                style={{ '--scrollbar-thumb': '#D48806' } as React.CSSProperties}
              >
                {/* ALL Group Button (Always First) */}
                <button
                  onClick={() => setSelectedGroup('All')}
                  className={`h-[34px] px-3 md:px-4 text-[10px] md:text-xs rounded-md transition-colors whitespace-nowrap font-semibold shrink-0 flex items-center justify-center ${selectedGroup === 'All' ? 'bg-primary text-white border-transparent' : 'bg-transparent text-slate-800 dark:text-slate-200 border border-border hover:bg-muted'}`}
                >
                  ALL
                </button>

                {/* Brand Dropdown - Independent Filter */}
                <div className="relative inline-flex items-center shrink-0">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="appearance-none h-[34px] w-[98px] md:w-[120] pl-2 pr-5 md:pl-3 md:pr-7 text-[10px] md:text-xs rounded-md transition-colors whitespace-nowrap outline-none cursor-pointer uppercase text-ellipsis overflow-hidden bg-transparent text-slate-800 dark:text-slate-200 border border-border hover:bg-muted"
                  >
                    <option value="All" className="text-slate-900 bg-white font-bold normal-case">All Brands</option>
                    {manufacturers.map(m => {
                      const brandStr = m as string;
                      const displayBrand = brandStr.charAt(0).toUpperCase() + brandStr.slice(1).toLowerCase();
                      return (
                        <option key={brandStr} value={brandStr} className="text-slate-900 bg-white font-semibold normal-case">{displayBrand}</option>
                      );
                    })}
                  </select>
                  <FaChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 pointer-events-none text-slate-500" />
                </div>

                {/* Rest of the Group Buttons */}
                {groups.map(group => {
                  if (group === 'All') return null;
                  return (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                      className={`h-[34px] px-3 md:px-4 text-[10px] md:text-xs rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center justify-center ${selectedGroup === group ? 'bg-primary text-white border-transparent' : 'bg-transparent text-slate-800 dark:text-slate-200 border border-border hover:bg-muted'}`}
                    >
                      {group.toUpperCase()}
                    </button>
                  );
                })}

                <button
                  onClick={() => setShowPromoOnly(!showPromoOnly)}
                  className={`h-[34px] md:h-[38px] px-3 md:px-4 text-[10px] md:text-sm border rounded-md flex items-center justify-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap shrink-0 ${showPromoOnly ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
                >
                  Promos
                </button>

                <button
                  onClick={() => setShowLikedOnly(!showLikedOnly)}
                  className={`h-[34px] md:h-[38px] px-3 md:px-4 text-[10px] md:text-sm border rounded-md flex items-center justify-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap shrink-0 ${showLikedOnly ? 'bg-[#ff4d4f] text-white border-[#ff4d4f]' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
                >
                  {showLikedOnly ? <FaHeart /> : <FaRegHeart />}
                  Favorites
                </button>

                <button
                  onClick={() => setSortBy(sortBy === 'top_rated' ? 'default' : 'top_rated')}
                  className={`h-[34px] md:h-[38px] px-3 md:px-4 text-[10px] md:text-sm border rounded-md flex items-center justify-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap shrink-0 ${sortBy === 'top_rated' ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
                >
                  Top Rated
                </button>

                <button
                  onClick={() => {
                    if (allowShuffle) {
                      setShuffleSeed(prev => prev + 1);
                      toast.success('Products reshuffled!');
                    } else {
                      setIsManualShuffle(prev => {
                        const next = !prev;
                        if (next) {
                          setShuffleSeed(s => s + 1);
                          toast.success('Shuffle enabled!');
                        }
                        return next;
                      });
                    }
                  }}
                  className={`h-[34px] md:h-[38px] px-3 md:px-4 text-[10px] md:text-sm border rounded-md flex items-center justify-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap shrink-0 ${(allowShuffle || isManualShuffle) ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
                  title="Shuffle products"
                >
                  <FaRandom className="w-3 h-3" />
                  Shuffle
                </button>
              </div>

              {/* Right Arrow Button (Desktop Only) - Compact Size with safe margin */}
              <button
                type="button"
                onClick={() => scrollSlider('right')}
                className="hidden md:flex shrink-0 items-center justify-center w-5.5 h-5.5 md:w-6 md:h-6 ml-3 mr-0 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shadow-sm focus:outline-none"
                aria-label="Scroll filter right"
                title="Scroll right"
              >
                <FaChevronRight className="w-2 h-2" />
              </button>
            </div>

            {/* Search and Price Filter Wrapper (Reduced balanced width with safe spacing) */}
            <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[240px] md:max-w-[310px] lg:max-w-[340px] shrink-0 max-md:px-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name, brand or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs md:text-sm w-full h-[34px] md:h-[38px] pr-4 pl-8 md:pl-9 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary"
                />
                <FaSearch
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>

              {/* Price Filter Dropdown */}
              <div className="relative shrink-0" ref={priceFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 h-[34px] md:h-[38px] rounded-[var(--radius)] border transition-all duration-200 whitespace-nowrap min-w-[42px] ${selectedPriceRange !== 'All' ? 'min-w-[78px] md:min-w-[100px]' : ''
                    } ${selectedPriceRange !== 'All'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  title="Filter by Price"
                >
                  {selectedPriceRange !== 'All' ? (
                    <span className="text-[10px] md:text-xs font-bold leading-none truncate max-w-[85px] md:max-w-none">
                      {PRICE_RANGE_OPTIONS.find(o => o.id === selectedPriceRange)?.label || selectedPriceRange}
                    </span>
                  ) : (
                    <>
                      <FaFilter className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span className="hidden md:inline text-xs font-semibold">Prices</span>
                    </>
                  )}
                  <FaChevronDown
                    className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${isPriceFilterOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isPriceFilterOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 md:w-56 bg-card border border-border rounded-lg shadow-xl z-50 p-2 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border px-1">
                      <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Price Filter
                      </span>
                      {selectedPriceRange !== 'All' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange('All');
                            setIsPriceFilterOpen(false);
                          }}
                          className="text-[10px] md:text-xs text-primary hover:underline font-semibold"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div
                      className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar [scrollbar-width:thin] [scrollbar-color:#D48806_transparent]"
                      style={{ '--scrollbar-thumb': '#D48806' } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPriceRange('All');
                          setIsPriceFilterOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors text-[10px] md:text-xs font-medium ${selectedPriceRange === 'All'
                          ? 'bg-primary text-white font-bold'
                          : 'hover:bg-muted text-foreground'
                          }`}
                      >
                        All Prices
                      </button>

                      {PRICE_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange(option.id);
                            setIsPriceFilterOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors text-[10px] md:text-xs font-medium ${selectedPriceRange === option.id
                            ? 'bg-primary text-white font-bold'
                            : 'hover:bg-muted text-foreground'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Categories Bar - Only shown when a specific group is selected and has categories */}
          {selectedGroup !== 'All' && availableCategories.length > 0 && (
            <div className="flex gap-3 flex-wrap p-4 bg-muted rounded-[var(--radius)] border border-border animate-[fadeIn_0.3s_ease-out]">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs border border-border rounded-full transition-colors ${selectedCategory === 'All' ? 'bg-secondary text-white' : 'bg-white text-slate-800 hover:bg-gray-50'}`}
              >
                ALL {selectedGroup.toUpperCase()}
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs border border-border rounded-full transition-colors ${selectedCategory === cat ? 'bg-secondary text-white' : 'bg-white text-slate-800 hover:bg-gray-50'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product lists */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-1 md:gap-3">
            {displayedProducts.map((product, index) => (
              <div key={product.id} className="mb-4  md:mb-8">
                <ProductCard product={product} priority={index < 4} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-2xl mb-4 text-muted-foreground">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            <button
              className="border border-border hover:bg-muted text-foreground px-4 py-2 rounded-md font-semibold mt-6 inline-block transition-colors"
              onClick={() => { setSelectedGroup('All'); setSelectedCategory('All'); setSelectedBrand('All'); setSelectedPriceRange('All'); setSearchQuery(''); setVisibleCount(32); }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {filteredProducts.length > visibleCount && (
          <div className="text-center mt-16 flex flex-col items-center justify-center gap-4 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-xs text-muted-foreground font-medium tracking-wide">
              Showing {displayedProducts.length} of {filteredProducts.length} items
            </div>
            <button
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background hover:bg-muted text-foreground hover:text-primary px-4 py-2 text-xs md:text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-95 active:shadow-sm"
              onClick={() => setVisibleCount(prev => prev + 60)}
            >
              <span className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span>Load More Products</span>
              <FaChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-y-0.5 transition-all duration-300 ease-out" />
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

