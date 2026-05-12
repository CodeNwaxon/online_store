'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { FaArrowRight, FaShieldAlt, FaBolt, FaCreditCard } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PromoCarousel from '@/components/PromoCarousel';
import ReviewSection from '@/components/ReviewSection';
import InstallPrompt from '@/components/InstallPrompt';
import { products as staticProducts } from '@/data/products';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const heroThemes = [
  { bg: 'bg-[#F8FAFC]', text: 'text-slate-900', subtext: 'text-slate-600', accent: 'text-primary', button: 'border-slate-900 text-slate-900 hover:bg-slate-900/5' },
  { bg: 'bg-[#F0F9FF]', text: 'text-blue-900', subtext: 'text-blue-700', accent: 'text-blue-600', button: 'border-blue-900 text-blue-900 hover:bg-blue-900/5' },
  { bg: 'bg-[#FFF1F2]', text: 'text-rose-900', subtext: 'text-rose-700', accent: 'text-rose-600', button: 'border-rose-900 text-rose-900 hover:bg-rose-900/5' },
  { bg: 'bg-[#F0FDFA]', text: 'text-teal-900', subtext: 'text-teal-700', accent: 'text-teal-600', button: 'border-teal-900 text-teal-900 hover:bg-teal-900/5' },
  { bg: 'bg-[#FFFBEB]', text: 'text-amber-900', subtext: 'text-amber-700', accent: 'text-amber-600', button: 'border-amber-900 text-amber-900 hover:bg-amber-900/5' },
  { bg: 'bg-[#F5F3FF]', text: 'text-violet-900', subtext: 'text-violet-700', accent: 'text-violet-600', button: 'border-violet-900 text-violet-900 hover:bg-violet-900/5' },
  { bg: 'bg-[#ECFDF5]', text: 'text-emerald-900', subtext: 'text-emerald-700', accent: 'text-emerald-600', button: 'border-emerald-900 text-emerald-900 hover:bg-emerald-900/5' },
  { bg: 'bg-[#FFF7ED]', text: 'text-orange-900', subtext: 'text-orange-700', accent: 'text-orange-600', button: 'border-orange-900 text-orange-900 hover:bg-orange-900/5' },
];

export default function Home() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [installmentBg, setInstallmentBg] = useState('/images/environment.jpeg');
  const [dataLoading, setDataLoading] = useState(true);

  // Load hero slides and promo products from Firestore
  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      try {
        // Fetch all products
        const prodSnap = await getDocs(collection(db, 'products'));
        let allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        
        // Fallback to static products if dynamic collection is empty
        if (allProducts.length === 0) {
          allProducts = staticProducts;
        }

        // Fetch hero config
        const heroSnap = await getDoc(doc(db, 'settings', 'hero'));
        if (heroSnap.exists()) {
          const ids: string[] = heroSnap.data().productIds || [];
          const slides = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
          setHeroSlides(slides.length > 0 ? slides : allProducts.filter(p => p.isPromo).slice(0, 5));
        } else {
          // Default hero slides if no config
          setHeroSlides(allProducts.filter(p => p.isPromo).slice(0, 5));
        }

        // Fetch general settings (installment bg)
        const generalSnap = await getDoc(doc(db, 'settings', 'general'));
        if (generalSnap.exists() && generalSnap.data().installmentBg) {
          setInstallmentBg(generalSnap.data().installmentBg);
        }

        // Promo products for carousel
        setPromoProducts(allProducts.filter((p: any) => p.isPromo).slice(0, 10));
      } catch (error) {
        console.error("Error loading home data:", error);
        setPromoProducts(staticProducts.filter(p => p.isPromo).slice(0, 10));
        setHeroSlides(staticProducts.filter(p => p.isPromo).slice(0, 5));
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, []);

  const handleBuyNow = (slide: any) => {
    const product = {
      id: slide.id,
      name: slide.name,
      price: slide.price,
      description: slide.description,
      image: slide.image,
      images: slide.images || [slide.image],
      category: slide.category,
      manufacturer: slide.manufacturer || 'Quick Choice',
      shipping: slide.shipping || 0
    };
    addItem(product);
    router.push('/checkout');
  };

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="relative">
      <InstallPrompt />
      {/* Hero Section */}
      <section className="relative h-[650px] max-md:h-[550px] overflow-y-auto bg-slate-50 scrollbar-hide">
        {dataLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium animate-pulse">Loading amazing deals...</p>
          </div>
        ) : heroSlides.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <p className="p-3 md:text-xl font-bold">No hero slides configured. Set them in Admin → Products.</p>
          </div>
        ) : (
          heroSlides.map((slide, index) => {
            const theme = heroThemes[index % heroThemes.length];
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${theme.bg} ${currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}
                onClick={() => router.push(`/product/${slide.id}`)}
              >
                {/* Subtle background for depth */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent flex items-center">
                  <div className="max-w-[1200px] mx-auto px-4 md:px-6 w-full h-full">
                    <div className="flex flex-col-reverse md:flex-row items-center justify-between h-full gap-4 md:gap-8 py-8 md:py-0">
                      {/* Text Content */}
                      <div className={`max-w-[600px] ${theme.text} flex-1 z-10 max-md:text-center max-md:px-4`}>
                        <div className={`text-lg ${theme.accent} font-semibold mb-2`}>
                          {slide.manufacturer || slide.group}
                        </div>
                        <h1 className={`text-5xl max-md:text-2xl font-bold mb-4 leading-[1.1] ${theme.text}`}>
                          {slide.name}
                        </h1>
                        <div className="flex items-center gap-4 mb-6 max-md:justify-center">
                          <span className={`text-3xl max-md:text-xl font-bold ${theme.accent}`}>
                            ₦{slide.price?.toLocaleString()}
                          </span>
                          {slide.oldPrice && (
                            <span className="text-xl max-md:text-base line-through text-slate-400 font-bold bg-white/50 px-2 py-0.5 rounded">
                              ₦{slide.oldPrice?.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className={`text-lg mb-10 ${theme.subtext} leading-relaxed max-md:text-xs max-md:mb-6 line-clamp-3`}>
                          {slide.description}
                        </p>
                        <div className="flex gap-4 flex-wrap max-md:justify-center">
                          <Link href={`/product/${slide.id}`} className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 rounded-md font-semibold transition-colors px-6 py-3 max-md:px-4 max-md:py-2 max-md:text-xs">
                            View Product <FaArrowRight size={18} />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleBuyNow(slide); }}
                            className={`border-2 ${theme.button} rounded-md font-semibold transition-colors px-6 py-3 max-md:px-4 max-md:py-2 max-md:text-xs`}
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>

                      {/* Product Image Container */}
                      <div className="flex-1 flex justify-center md:justify-end items-center h-full max-md:h-[60%] w-full">
                        <div className="relative w-full h-full flex items-center justify-center md:justify-end md:p-8">
                          {slide.isPromo && (
                            <span className="absolute top-10 right-4 max-md:top-14 max-md:right-2 bg-secondary text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold z-20 shadow-sm">
                              SPECIAL PROMO
                            </span>
                          )}
                          <img
                            src={slide.image}
                            alt={slide.name}
                            className="w-full h-full object-cover md:rounded-xl md:shadow-2xl transform hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Hero Dots */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-primary w-10' : 'bg-slate-300 w-4 hover:bg-slate-400'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="py-16 max-md:py-5 bg-muted">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 max-md:grid-cols-3 gap-8 max-md:gap-1">
            <div className="text-center p-8 max-md:p-3">
              <div className="text-primary mb-4 max-md:mb-1.5 flex justify-center">
                <FaBolt size={40} className="max-md:w-[22px] max-md:h-[22px]" />
              </div>
              <h3 className="mb-2 max-md:text-[0.72rem] max-md:mb-1 max-md:font-bold font-bold text-xl">Fast Delivery</h3>
              <p className="text-muted-foreground text-[0.9rem] max-md:text-[0.65rem] max-md:leading-[1.35] max-md:line-clamp-3">Prompt and secure delivery across the continent.</p>
            </div>
            <div className="text-center p-8 max-md:p-3">
              <div className="text-primary mb-4 max-md:mb-1.5 flex justify-center">
                <FaShieldAlt size={40} className="max-md:w-[22px] max-md:h-[22px]" />
              </div>
              <h3 className="mb-2 max-md:text-[0.72rem] max-md:mb-1 max-md:font-bold font-bold text-xl">Quality Assurance</h3>
              <p className="text-muted-foreground text-[0.9rem] max-md:text-[0.65rem] max-md:leading-[1.35] max-md:line-clamp-3">Every product is vetted for durability and excellence.</p>
            </div>
            <div className="text-center p-8 max-md:p-3">
              <div className="text-primary mb-4 max-md:mb-1.5 flex justify-center">
                <FaCreditCard size={40} className="max-md:w-[22px] max-md:h-[22px]" />
              </div>
              <h3 className="mb-2 max-md:text-[0.72rem] max-md:mb-1 max-md:font-bold font-bold text-xl">Flexible Payments</h3>
              <p className="text-muted-foreground text-[0.9rem] max-md:text-[0.65rem] max-md:leading-[1.35] max-md:line-clamp-3">Buy now and pay later with our installment plans.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Products */}
      <section className="py-16 max-md:py-8 max-md:px-0">
        <div className="max-w-[1440px] mx-auto md:px-8">
          <div className="px-4 flex justify-between items-end mb-12 max-md:flex-col max-md:items-start max-md:gap-3 max-md:mb-6">
            <div>
              <h2 className="text-3xl font-bold max-md:text-2xl">Promotional Offers</h2>
              <p className="text-muted-foreground max-md:text-[0.85rem]">Grab these amazing deals before they are gone!</p>
            </div>
            <Link href="/shop" className="flex items-center gap-2 text-primary font-semibold max-md:text-[0.9rem] justify-end">
              View All <FaArrowRight size={16} />
            </Link>
          </div>
          <PromoCarousel products={promoProducts} />
        </div>
      </section>

      {/* Installment Section */}
      <section
        className="py-32 bg-cover bg-center text-white text-center"
        style={{ backgroundImage: `linear-gradient(rgba(139, 38, 53, 0.9), rgba(139, 38, 53, 0.9)), url(${installmentBg})` }}
      >
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-4xl max-md:text-3xl font-bold mb-6">Pay in Easy Installments</h2>
            <p className="text-lg mb-10 opacity-90 max-md:text-base max-md:mb-8">
              We believe everyone deserves the best. That's why we offer flexible payment plans that fit your budget.
              Get your dream items today and spread the cost over 3, 6, or 12 months.
            </p>
            <Link href="/installments" className="bg-white text-secondary hover:bg-gray-100 rounded-md font-semibold transition-colors px-6 py-3 inline-block">
              Learn More About Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewSection />
    </div>
  );
}
