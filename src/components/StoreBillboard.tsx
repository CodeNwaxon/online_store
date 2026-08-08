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
  isSpecialStoreView?: boolean; // true when viewing a specific vendor's store
}

export default function StoreBillboard({ categoryName, isSpecialStoreView }: StoreBillboardProps) {
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
          const data = snap.data();
          const selections = data.selections || {};
          const minSlots = data.minSlots || 1;
          const productIds = new Set<string>();

          // Only include selections from vendors who meet the minSlots requirement
          Object.entries(selections).forEach(([vendorEmail, ids]: [string, any]) => {
            if (Array.isArray(ids) && ids.length >= minSlots) {
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

          while (hasMore) {
            hasMore = false;
            for (const queue of queues) {
              if (index < queue.length) {
                interleaved.push(queue[index]);
                hasMore = true;
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

    // Deterministic rotation based on time so all users see the same image
    const updateIndex = () => {
      const now = Date.now();
      const interval = 5000;
      const index = Math.floor(now / interval) % advertProducts.length;
      setCurrentIndex(index);
    };

    updateIndex();
    const timer = setInterval(updateIndex, 1000);

    return () => clearInterval(timer);
  }, [advertProducts.length, isVisible]);

  // Don't render if on a special store page, or hidden, or no adverts
  if (isSpecialStoreView || !isVisible || advertProducts.length === 0) return null;

  const product = advertProducts[currentIndex];
  if (!product) return null;

  const storeSlug = storeSlugs[product.vendor];
  const isSpecialStore = !!storeSlug;
  const imageUrl = product.images?.[0] || product.image || '/images/placeholder.png';

  const handleVisitStoreClick = (e: React.MouseEvent) => {
    if (!isSpecialStore) {
      e.preventDefault();
      const el = document.getElementById(`product-${product.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-primary', 'transition-all', 'duration-500');
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 2000);
      } else {
        window.location.href = `/product/${product.id}`;
      }
    }
  };

  return (
    <div className="relative w-full overflow-hidden transition-all duration-500 ease-in-out">
      {/* Blurred Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover blur-lg scale-110 opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Close Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 md:top-4 md:right-4 z-20 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-sm"
        title="Close Billboard"
      >
        <FaTimes />
      </button>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-between max-w-[1200px] mx-auto p-4 md:p-6 gap-4 md:gap-6 min-h-[220px] md:min-h-[280px]">
        {/* Left: Image Card */}
        <div className="w-full md:w-2/5 lg:w-1/3 flex-shrink-0">
          <div className="relative w-full h-44 md:h-full rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/15 shadow-lg">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2"
              priority
            />
            <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-md">
              Featured
            </div>
          </div>
        </div>

        {/* Right: Write-up Card */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10">
            <div className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
              {product.group} {product.category && `› ${product.category}`}
            </div>
            <h2 className="text-lg md:text-2xl font-black text-white mb-2 line-clamp-2 leading-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="text-xl md:text-3xl font-black text-white">
                ₦{product.price?.toLocaleString()}
              </div>
              {product.oldPrice > product.price && (
                <div className="text-xs md:text-base text-white/40 line-through font-bold">
                  ₦{product.oldPrice.toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {isSpecialStore ? (
                <Link
                  href={`/shop/${categoryName}?store=${storeSlug}`}
                  className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg hover:-translate-y-0.5"
                >
                  <FaStore /> Visit Store
                </Link>
              ) : (
                <button
                  onClick={handleVisitStoreClick}
                  className="flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all shadow-lg hover:-translate-y-0.5"
                >
                  <FaArrowRight /> View Here
                </button>
              )}
              <Link
                href={`/shop/${categoryName}/${product.id}`}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm transition-all backdrop-blur-sm"
              >
                <FaInfoCircle /> Learn More
              </Link>
            </div>
          </div>

          {/* Dots Navigation */}
          {advertProducts.length > 1 && (
            <div className="flex gap-1.5 mt-3 justify-center md:justify-start">
              {advertProducts.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === dotIndex ? 'bg-white w-5' : 'bg-white/30 w-1.5 hover:bg-white/50'}`}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
