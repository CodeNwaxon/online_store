'use client';

import { useParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaLeaf, FaChevronLeft, FaChevronRight, FaShareAlt } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import ShopCard, { ShopProduct } from '@/components/ShopCard';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { usePartner } from '@/hooks/usePartner';

export default function FoodDetail() {
  const params = useParams();
  const id = params.id as string;
  const [food, setFood] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [allFoods, setAllFoods] = useState<any[]>([]);
  const { isApprovedPartner, partnerData } = usePartner();
  const [showSizeOverlay, setShowSizeOverlay] = useState(false);

  const [contactNumber, setContactNumber] = useState('2347034632037');

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    const fetchSettings = async () => {
      try {
        const foodSettingsRef = doc(db, 'settings', 'food_market');
        const foodSettingsSnap = await getDoc(foodSettingsRef);
        
        if (foodSettingsSnap.exists() && foodSettingsSnap.data().whatsappNumber) {
          const rawNumber = foodSettingsSnap.data().whatsappNumber;
          const cleanNumber = rawNumber.replace(/\D/g, '');
          if (cleanNumber) {
            setContactNumber(cleanNumber);
            return;
          }
        }

        // Fallback to general settings
        const settingsRef = doc(db, 'settings', 'general');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const settingsData = settingsSnap.data();
          if (settingsData.phones && settingsData.phones.length > 0) {
            const rawNumber = settingsData.phones[0].number;
            const cleanNumber = rawNumber.replace(/\D/g, '');
            setContactNumber(cleanNumber);
          }
        }
      } catch (e) {
        console.error("Error fetching settings:", e);
      }
    };
    fetchSettings();

    const q = query(collection(db, 'foods'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const dynamicFoods = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const currentFood = dynamicFoods.find(p => p.id === id);
      
      if (currentFood) {
        setFood(currentFood);
      }
      setAllFoods(dynamicFoods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching foods:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center bg-green-50/30">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-green-700 font-bold animate-pulse">Loading food details...</p>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="py-16 max-w-[1200px] mx-auto px-4 md:px-6 text-center">
        <h2 className="text-2xl font-bold mb-4 text-green-800">Food not found</h2>
        <Link href="/foods" className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md px-6 py-3 inline-block transition-colors">
          Back to Food Market
        </Link>
      </div>
    );
  }

  const sanitizeImageUrl = (url: string) => {
    if (!url) return '/images/placeholder.png';
    try {
      if (url.includes('_next/image?url=')) {
        const urlObj = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
        const actualUrl = urlObj.searchParams.get('url');
        if (actualUrl) return actualUrl;
      }
    } catch (e) {}
    return url;
  };

  const foodImages = (food.images && food.images.length > 0
    ? food.images
    : ['/images/placeholder.png']).map(sanitizeImageUrl);

  const sizeKeys = food.sizeQuantities ? Object.keys(food.sizeQuantities).filter(k => (food.sizeQuantities as Record<string, number>)[k] > 0) : [];

  const whatsappMessage = `I want to order ${food.name}, priced at ₦${food.price.toLocaleString()} from your Food Market.`;
  const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleShareFood = () => {
    if (!partnerData?.referralCode) return;
    const currentReferralLink = typeof window !== 'undefined' ? `${window.location.origin}/foods/${food.id}?ref=${partnerData.referralCode}` : '';
    const shareText = `Craving ${food.name}? 🍲\n\nOrder it fresh at Nomo Storez! ✨\n`;

    if (navigator.share) {
      navigator.share({
        title: food.name,
        text: shareText,
        url: currentReferralLink
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(`${shareText}\n${currentReferralLink}`);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="py-12 max-md:py-4 bg-slate-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Link href="/foods" className="flex items-center gap-2 text-green-700 mb-8 hover:text-green-900 transition-colors w-fit font-semibold">
          <FaArrowLeft size={16} /> Back to Food Market
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8 items-start bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-green-100">
          {/* Images Section */}
          <div>
            <div className="relative h-[400px] max-md:h-[300px] w-full rounded-[var(--radius)] overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
              <Image
                src={foodImages[activeImageIndex]}
                alt={food.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {isApprovedPartner && (
                <button
                  onClick={handleShareFood}
                  className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm p-2 md:p-3 rounded-full shadow-md text-[#4B0082] hover:bg-[#4B0082] hover:text-white transition-colors z-10"
                  title="Share with Referral Link"
                >
                  <FaShareAlt className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
            </div>

            {foodImages.length > 1 && (
              <div className="flex gap-4 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-green-200 [&::-webkit-scrollbar-thumb]:rounded">
                {foodImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative w-[80px] h-[80px] rounded overflow-hidden shrink-0 transition-colors ${activeImageIndex === index ? `border-2 border-green-600` : 'border border-border'}`}
                  >
                    <Image src={img} alt={`${food.name} ${index}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <h1 className={`text-2xl md:text-4xl font-black mb-2 text-green-900`}>{food.name}</h1>
            
            <div className={`text-3xl font-black mb-8 text-emerald-600 mt-4`}>
              ₦{food.price.toLocaleString()}
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-bold mb-3 text-green-800 border-b border-green-100 pb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {food.description || 'No description available for this delicious item.'}
              </p>
            </div>

            {/* CTA Buttons */}
            {(food.quantity ?? 0) <= 0 ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-md text-sm w-full font-bold flex flex-col items-center justify-center gap-3">
                <span className="text-lg md:text-xl">⚠️ Sold Out</span>
                <span className="font-normal text-xs text-muted-foreground text-center">
                  This food item is currently out of stock. Please check back later!
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:flex gap-3">
                <button
                  className={`text-base md:flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 p-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg`}
                  onClick={async () => {
                    if (sizeKeys.length > 0) {
                      setShowSizeOverlay(true);
                      return;
                    }

                    const existing = cartItems.find(item => item.id === food.id);
                    const currentInCart = existing ? existing.quantity : 0;
                    try {
                      const docSnap = await getDoc(doc(db, 'foods', food.id));
                      const liveQty = docSnap.exists() ? (Number(docSnap.data().quantity) || 0) : (food.quantity ?? 0);
                      if (currentInCart + 1 > liveQty) {
                        toast.error(`Only ${liveQty} available in stock`, { duration: 3000 });
                        return;
                      }
                    } catch (err) {
                      if (currentInCart + 1 > (food.quantity ?? 0)) {
                        toast.error(`Only ${food.quantity ?? 0} available in stock`, { duration: 3000 });
                        return;
                      }
                    }
                    addItem({
                      id: food.id,
                      name: food.name,
                      price: food.price,
                      image: food.images?.[0] || '/images/placeholder.png',
                      category: 'Food',
                      description: food.description,
                    } as any);
                    toast.success(`${food.name} added to cart`);
                  }}
                >
                  <FaShoppingCart size={20} /> Add to Cart
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md:flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center gap-2 p-4 rounded-xl transition-all font-bold shadow-md hover:shadow-lg"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={20} /> Order via WhatsApp
                </a>
              </div>
            )}

            {/* Size Selection Overlay */}
            {showSizeOverlay && sizeKeys.length > 0 && (
              <div
                className="fixed inset-0 bg-background/60 backdrop-blur-[3px] z-50 p-4 flex items-center justify-center animate-in fade-in duration-200"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
              >
                <div
                  className="bg-card w-full max-w-[400px] max-h-[90%] rounded-xl shadow-2xl border border-border p-5 flex flex-col relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
                    className="absolute top-2 right-2 text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
                  >
                    ✕
                  </button>
                  <h3 className="text-lg font-bold mb-4 pr-8 text-foreground leading-tight">Select Size</h3>
                  <div className="flex flex-wrap gap-2 overflow-y-auto max-h-64">
                    {sizeKeys.map(sz => {
                      const qty = (food.sizeQuantities as Record<string, number>)[sz];
                      return (
                        <button
                          key={sz}
                          disabled={qty <= 0}
                          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${qty <= 0 ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border' : `bg-green-600 text-white border-transparent hover:bg-green-700`}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const existing = cartItems.find(item => item.id === food.id && item.selectedSize === sz);
                            const currentInCart = existing ? existing.quantity : 0;
                            if (currentInCart + 1 > qty) {
                              toast.error(`Only ${qty} available for size ${sz}`);
                              return;
                            }
                            addItem({
                              id: food.id,
                              name: food.name,
                              price: food.price,
                              image: food.images?.[0] || '/images/placeholder.png',
                              category: 'Food',
                              description: food.description,
                              selectedSize: sz,
                            } as any);
                            toast.success(`${food.name} (${sz}) added to cart`, {
                              style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' },
                              position: 'bottom-center',
                              duration: 2000,
                            });
                            setShowSizeOverlay(false);
                          }}
                        >
                          {sz} {qty > 0 && <span className="opacity-70 text-xs ml-1">({qty})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Carousel (Independent Container) */}
      <div className="max-w-[1200px] mx-auto w-full px-4 md:px-6 mt-16">
        <RelatedCarousel
          allFoods={allFoods}
          currentFood={food}
        />
      </div>
    </div>
  );
}

function RelatedCarousel({
  allFoods,
  currentFood,
}: {
  allFoods: any[];
  currentFood: any;
}) {
  const getSimilarityScore = (f: any, current: any) => {
    let score = 0;
    // name similarity
    if (f.name && current.name) {
      const currentWords = current.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const fWords = f.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      let shared = 0;
      for (const w of fWords) {
        if (currentWords.includes(w)) shared += 1;
      }
      score += shared;
    }
    return score;
  };

  const related = allFoods
    .filter(f => f.id !== currentFood.id)
    .sort((a, b) => getSimilarityScore(b, currentFood) - getSimilarityScore(a, currentFood))
    .slice(0, 10);

  const [startIndex, setStartIndex] = useState(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [itemsToShow, setItemsToShow] = useState(4);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setItemsToShow(4);
      else if (window.innerWidth >= 768) setItemsToShow(3);
      else if (window.innerWidth >= 640) setItemsToShow(2);
      else setItemsToShow(2);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalItems = related.length;
  const maxIndex = Math.max(0, totalItems - itemsToShow);

  const next = useCallback(() => setStartIndex(prev => Math.min(prev + 1, maxIndex)), [maxIndex]);
  const prev = useCallback(() => setStartIndex(prev => Math.max(prev - 1, 0)), []);

  const handleMobileScroll = () => {
    if (mobileScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mobileScrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 5) {
        setActiveMobileIndex(totalItems - 1);
      } else {
        const itemWidth = mobileScrollRef.current.scrollWidth / totalItems;
        setActiveMobileIndex(Math.round(scrollLeft / itemWidth));
      }
    }
  };

  const displayedFoods = related.slice(startIndex, startIndex + itemsToShow);

  const gridCols = itemsToShow === 4
    ? 'grid-cols-4'
    : itemsToShow === 3
      ? 'grid-cols-3'
      : 'grid-cols-2';

  if (related.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8 text-green-900 border-b border-green-200 pb-3">You May Also Like</h2>

      {/* Desktop Carousel */}
      <div className="relative hidden sm:block px-4">
        <div className={`grid ${gridCols} gap-4 transition-all duration-500 ease-in-out`}>
          {displayedFoods.map((f, i) => (
            <ShopCard key={f.id} food={f} />
          ))}
        </div>

        {totalItems > itemsToShow && (
          <>
            <button
              onClick={prev}
              disabled={startIndex === 0}
              className="absolute -left-6 top-1/2 -translate-y-1/2 text-green-600 opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer"
              title="Previous"
            >
              <FaChevronLeft size={30} />
            </button>
            <button
              onClick={next}
              disabled={startIndex >= maxIndex}
              className="absolute -right-6 top-1/2 -translate-y-1/2 text-green-600 opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer"
              title="Next"
            >
              <FaChevronRight size={30} />
            </button>
          </>
        )}
      </div>

      {/* Mobile Swipe View */}
      <div className="block sm:hidden px-2">
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto gap-3 snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {related.map((f, index) => (
            <div key={f.id} className="min-w-[48%] w-[48%] shrink-0 snap-start">
              <ShopCard food={f} />
            </div>
          ))}
        </div>

        {/* Mobile Dots */}
        <div className="flex justify-center gap-1.5 mt-4 flex-wrap">
          {related.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${activeMobileIndex === i ? 'bg-green-600 w-5' : 'bg-green-200 w-1.5'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
