'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { products as staticProducts, Category } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { FaFilter, FaSearch, FaChevronDown, FaCreditCard, FaHeart, FaRegHeart, FaShareAlt } from 'react-icons/fa';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useLikeStore } from '@/store/useLikeStore';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category');

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>(searchParams.get('group') || 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [visibleCount, setVisibleCount] = useState(84);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [showPromoOnly, setShowPromoOnly] = useState(false);
  const { likedProductIds } = useLikeStore();
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'default' | 'top_rated' | 'newest'>('default');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), async (prodSnap) => {
      try {
        const dynamicProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Auto-remove expired promos
        const now = new Date();
        const expiredPromos = dynamicProducts.filter((p: any) =>
          p.isPromo &&
          p.promoEndDate &&
          new Date(p.promoEndDate) < now
        );

        if (expiredPromos.length > 0) {
          let hasExpired = false;
          for (const promo of expiredPromos) {
            try {
              await updateDoc(doc(db, 'products', promo.id), {
                isPromo: false,
                promoEndDate: null,
                updatedAt: now.toISOString()
              });
              hasExpired = true;
            } catch (err) {
              console.error("Error auto-removing promo:", err);
            }
          }
          // If we updated documents, onSnapshot will fire again automatically.
          if (hasExpired) return;
        }

        const parseDate = (dateVal: any) => {
          if (!dateVal) return 0;
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
          return new Date(dateVal).getTime() || 0;
        };

        const sortedProducts = (dynamicProducts.length > 0 ? dynamicProducts : staticProducts).sort((a: any, b: any) => {
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
    }, (error) => {
      console.error("Error fetching products:", error);
      setProducts(staticProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Get unique categories for the selected group
  const availableCategories = Array.from(new Set(
    products
      .filter(p => p.group === selectedGroup)
      .map(p => p.category)
      .filter((c): c is string => !!c)
  )).sort();

  const filteredProducts = products.filter(product => {
    const matchesGroup = selectedGroup === 'All' || product.group === selectedGroup;
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesLiked = !showLikedOnly || likedProductIds[product.id];
    const matchesPromo = !showPromoOnly || product.isPromo;
    const isVisible = (product.quantity ?? 0) > 0;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let matchesSearch = true;
    if (searchTerms.length > 0) {
      const normalize = (str: string) => {
        if (!str) return '';
        return str.toLowerCase()
          .replace(/sh/g, 'ch')
          .replace(/s/g, 'c')
          .replace(/ph/g, 'f')
          .replace(/k/g, 'c')
          .replace(/\s/g, '');
      };

      matchesSearch = searchTerms.every(term => {
        const normTerm = normalize(term);
        const checkField = (fieldVal: string) => {
          if (!fieldVal) return false;
          const lowerVal = fieldVal.toLowerCase();
          const normVal = normalize(fieldVal);
          return lowerVal.includes(term) || normVal.includes(normTerm);
        };

        return (
          checkField(product.name) ||
          checkField(product.group || '') ||
          checkField(product.category || '') ||
          checkField(product.manufacturer || '')
        );
      });
    }

    return matchesGroup && matchesCategory && matchesSearch && matchesLiked && matchesPromo && isVisible;
  });

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

  const displayedProducts = sortedFilteredProducts.slice(0, visibleCount);

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
            </div>
            <button 
              onClick={() => {
                const urlObj = new URL(window.location.origin + window.location.pathname);
                if (searchQuery) urlObj.searchParams.set('search', searchQuery);
                if (selectedGroup !== 'All') urlObj.searchParams.set('group', selectedGroup);
                if (selectedCategory !== 'All') urlObj.searchParams.set('category', selectedCategory);
                const url = urlObj.toString();
                const title = 'Our Collection | Nomo Storez';
                if (navigator.share) {
                  navigator.share({ title, url }).catch(()=>{});
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
          <Link href="/installments" className="text-xs md:text-base bg-primary hover:bg-primary-hover text-white flex items-center gap-2 rounded-md font-semibold px-4 py-2 transition-colors">
            <FaCreditCard /> Installmental Payment
          </Link>
        </header>

        <div className="flex flex-col gap-3 md:gap-6 mb-6 md:mb-12 max-md:-mx-1">
          {/* Main Filters Bar */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center justify-between p-2 md:p-6 bg-card border-y md:border border-border md:rounded-[var(--radius)]">
            <div className="flex gap-2 w-full overflow-x-auto pb-2 custom-scrollbar flex-nowrap px-2 md:px-0" style={{ '--scrollbar-thumb': '#D48806' } as React.CSSProperties}>
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1.5 md:px-5 md:py-2 text-[10px] md:text-sm rounded-md transition-colors whitespace-nowrap ${selectedGroup === group ? 'bg-primary text-white border-transparent' : 'bg-transparent text-slate-800 dark:text-slate-200 border border-border hover:bg-muted'}`}
                >
                  {group === 'All' ? 'ALL' : group.toUpperCase()}
                </button>
              ))}

              <button
                onClick={() => setShowPromoOnly(!showPromoOnly)}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm border rounded-md flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap ${showPromoOnly ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
              >
                Promos
              </button>

              <button
                onClick={() => setShowLikedOnly(!showLikedOnly)}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm border rounded-md flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap ${showLikedOnly ? 'bg-[#ff4d4f] text-white border-[#ff4d4f]' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
              >
                {showLikedOnly ? <FaHeart /> : <FaRegHeart />}
                Favorites
              </button>

              <button
                onClick={() => setSortBy(sortBy === 'top_rated' ? 'default' : 'top_rated')}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm border rounded-md flex items-center gap-1.5 md:gap-2 transition-colors whitespace-nowrap ${sortBy === 'top_rated' ? 'bg-secondary text-white border-secondary' : 'bg-transparent text-slate-800 dark:text-slate-200 border-border hover:bg-muted'}`}
              >
                Top Rated
              </button>



            </div>

            <div className="relative flex-1 min-w-[250px] max-md:w-full max-md:px-2">
              <input
                type="text"
                placeholder="Search by name, brand or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pr-4 pl-8 md:pl-10 rounded-[var(--radius)] border border-border bg-background outline-none focus:border-primary"
              />
              <FaSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
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
              onClick={() => { setSelectedGroup('All'); setSelectedCategory('All'); setSearchQuery(''); setVisibleCount(32); }}
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

