'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaTimes, FaStore, FaInfoCircle, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useProductCache } from '@/store/useProductCache';

interface StoreBillboardProps {
  categoryName: string; // e.g., 'uk-used', 'wears', 'cosmetics'
}

export default function StoreBillboard({ categoryName }: StoreBillboardProps) {
  const { fetchCollection } = useProductCache();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [storeSlugs, setStoreSlugs] = useState<Record<string, string>>({});
  const [advertProducts, setAdvertProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch admins to map vendor email to store slug
    const fetchStores = async () => {
      try {
        const q = query(collection(db, 'admins'), where('specialStore', '!=', null));
        const snap = await getDocs(q);
        const mapping: Record<string, string> = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.specialStore?.slug) {
            mapping[data.email] = data.specialStore.slug;
          }
        });
        setStoreSlugs(mapping);
      } catch (err) {
        console.error("Failed to fetch stores for billboard", err);
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const prods = await fetchCollection(categoryName.replace('-', '_') as any);
      setAllProducts(prods);
    };
    loadProducts();
  }, [categoryName, fetchCollection]);

  useEffect(() => {
    // Fetch advert settings and filter products
    const fetchAdverts = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', `advert_${categoryName.replace('-', '_')}`));
        if (snap.exists()) {
          const selections = snap.data().selections || {};
          const productIds = new Set<string>();
          Object.values(selections).forEach((ids: any) => {
            if (Array.isArray(ids)) {
              ids.forEach(id => productIds.add(id));
            }
          });
          
          const filtered = allProducts.filter(p => productIds.has(p.id));
          
          // Group by vendor to interleave
          const vendorGroups: { [vendorEmail: string]: any[] } = {};
          filtered.forEach(p => {
            const vendorEmail = p.vendor || 'unknown';
            if (!vendorGroups[vendorEmail]) vendorGroups[vendorEmail] = [];
            vendorGroups[vendorEmail].push(p);
          });

          // Interleave products round-robin
          const interleaved: any[] = [];
          const queues = Object.values(vendorGroups);
          let hasMore = true;
          let index = 0;
          
          while(hasMore) {
            hasMore = false;
            for (const queue of queues) {
              if (index < queue.length) {
                interleaved.push(queue[index]);
                hasMore = true; // as long as we pushed something, we might have more in other queues
              }
            }
            index++;
          }

          setAdvertProducts(interleaved);
        }
      } catch (err) {
        console.error("Failed to fetch advert settings", err);
      }
    };
    if (allProducts.length > 0) {
      fetchAdverts();
    }
  }, [allProducts, categoryName]);

  useEffect(() => {
    if (advertProducts.length <= 1 || !isVisible) return;

    // Use a deterministic rotation based on time so all users see the same image (roughly)
    // We rotate every 5 seconds (5000ms).
    const updateIndex = () => {
      const now = Date.now();
      const interval = 5000;
      const index = Math.floor(now / interval) % advertProducts.length;
      setCurrentIndex(index);
    };

    updateIndex(); // initial call
    const timer = setInterval(updateIndex, 1000); // Check every second to keep synced

    return () => clearInterval(timer);
  }, [advertProducts.length, isVisible]);

  if (!isVisible || advertProducts.length === 0) return null;

  const product = advertProducts[currentIndex];
  if (!product) return null;

  const storeSlug = storeSlugs[product.vendor];
  const isSpecialStore = !!storeSlug;

  const handleVisitStoreClick = (e: React.MouseEvent) => {
    if (!isSpecialStore) {
      e.preventDefault();
      // Scroll to the product on the page
      const el = document.getElementById(`product-${product.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optional: highlight it briefly
        el.classList.add('ring-4', 'ring-primary', 'transition-all', 'duration-500');
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 2000);
      } else {
        // Fallback if not rendered (e.g. pagination) - go to detail page
        window.location.href = `/product/${product.id}`;
      }
    }
  };

  const themeColors = {
    'uk-used': 'from-slate-900 to-slate-800 text-slate-100 button-bg-slate',
    'wears': 'from-purple-900 to-fuchsia-900 text-purple-100 button-bg-purple',
    'cosmetics': 'from-pink-900 to-rose-900 text-pink-100 button-bg-pink'
  };

  const currentTheme = themeColors[categoryName as keyof typeof themeColors] || themeColors['uk-used'];
  const gradientClass = currentTheme.split(' ').slice(0, 2).join(' ');

  return (
    <div className={`relative w-full bg-gradient-to-r ${gradientClass} overflow-hidden shadow-xl mb-4 transition-all duration-500 ease-in-out`}>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 md:top-4 md:right-4 z-20 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-sm"
        title="Close Billboard"
      >
        <FaTimes />
      </button>

      <div className="flex flex-col md:flex-row h-full">
        {/* Left: Image (Top on mobile, left on desktop) */}
        <div className="w-full md:w-2/5 lg:w-1/3 h-48 md:h-72 relative bg-white/5 flex-shrink-0 group">
          <Image 
            src={product.images?.[0] || product.image || '/images/placeholder.png'} 
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-md">
            Featured Advert
          </div>
        </div>

        {/* Right: Content (Bottom on mobile, right on desktop) */}
        <div className="flex-1 p-5 md:p-8 flex flex-col justify-center">
          <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
            {product.group} {product.category && `> ${product.category}`}
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 line-clamp-2 leading-tight">
            {product.name}
          </h2>
          
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 flex-wrap">
            <div className="text-2xl md:text-4xl font-black text-white">
              ₦{product.price?.toLocaleString()}
            </div>
            {product.oldPrice > product.price && (
              <div className="text-sm md:text-lg text-white/50 line-through font-bold">
                ₦{product.oldPrice.toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-auto">
            {isSpecialStore ? (
              <Link 
                href={`/shop/${categoryName}?store=${storeSlug}`}
                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg hover:-translate-y-0.5"
              >
                <FaStore /> Visit Store
              </Link>
            ) : (
              <button 
                onClick={handleVisitStoreClick}
                className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg hover:-translate-y-0.5"
              >
                <FaArrowRight /> View Here
              </button>
            )}
            <Link 
              href={`/product/${product.id}`}
              className="flex items-center gap-2 bg-black/30 hover:bg-black/50 text-white border border-white/20 px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold text-xs md:text-sm transition-all backdrop-blur-sm"
            >
              <FaInfoCircle /> Learn More
            </Link>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {advertProducts.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20">
          <div 
            key={currentIndex} // Reset animation on slide change
            className="h-full bg-white/50 transition-all ease-linear"
            style={{ 
              width: '100%',
              animation: 'progress 5s linear forwards'
            }}
          />
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />
    </div>
  );
}
