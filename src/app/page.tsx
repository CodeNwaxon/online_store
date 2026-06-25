'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { FaArrowRight, FaShieldAlt, FaBolt, FaCreditCard, FaLeaf, FaHandshake } from 'react-icons/fa';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PromoCarousel from '@/components/PromoCarousel';
import ReviewSection from '@/components/ReviewSection';
import InstallPrompt from '@/components/InstallPrompt';
import { products as staticProducts } from '@/data/products';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

const getOrdinal = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const heroThemes = [
  { bg: 'bg-[#F8FAFC]', text: 'text-slate-900', subtext: 'text-slate-600', accent: 'text-primary', button: 'border-slate-900 text-slate-900 hover:bg-slate-900/5', viewBtn: 'bg-primary text-white hover:bg-primary-hover' },
  { bg: 'bg-[#F0F9FF]', text: 'text-blue-900', subtext: 'text-blue-700', accent: 'text-blue-600', button: 'border-blue-900 text-blue-900 hover:bg-blue-900/5', viewBtn: 'bg-blue-900 text-white hover:bg-blue-800' },
  { bg: 'bg-[#FFF1F2]', text: 'text-rose-900', subtext: 'text-rose-700', accent: 'text-rose-600', button: 'border-rose-900 text-rose-900 hover:bg-rose-900/5', viewBtn: 'bg-rose-900 text-white hover:bg-rose-800' },
  { bg: 'bg-[#F0FDFA]', text: 'text-teal-900', subtext: 'text-teal-700', accent: 'text-teal-600', button: 'border-teal-900 text-teal-900 hover:bg-teal-900/5', viewBtn: 'bg-teal-900 text-white hover:bg-teal-800' },
  { bg: 'bg-[#FFFBEB]', text: 'text-amber-900', subtext: 'text-amber-700', accent: 'text-amber-600', button: 'border-amber-900 text-amber-900 hover:bg-amber-900/5', viewBtn: 'bg-amber-900 text-white hover:bg-amber-800' },
  { bg: 'bg-[#F5F3FF]', text: 'text-violet-900', subtext: 'text-violet-700', accent: 'text-violet-600', button: 'border-violet-900 text-violet-900 hover:bg-violet-900/5', viewBtn: 'bg-violet-900 text-white hover:bg-violet-800' },
  { bg: 'bg-[#ECFDF5]', text: 'text-emerald-900', subtext: 'text-emerald-700', accent: 'text-emerald-600', button: 'border-emerald-900 text-emerald-900 hover:bg-emerald-900/5', viewBtn: 'bg-emerald-900 text-white hover:bg-emerald-800' },
  { bg: 'bg-[#FFF7ED]', text: 'text-orange-900', subtext: 'text-orange-700', accent: 'text-orange-600', button: 'border-orange-900 text-orange-900 hover:bg-orange-900/5', viewBtn: 'bg-orange-900 text-white hover:bg-orange-800' },
  { bg: 'bg-[#EEF2FF]', text: 'text-indigo-900', subtext: 'text-indigo-700', accent: 'text-indigo-600', button: 'border-indigo-900 text-indigo-900 hover:bg-indigo-900/5', viewBtn: 'bg-indigo-900 text-white hover:bg-indigo-800' },
  { bg: 'bg-[#FDF4FF]', text: 'text-fuchsia-900', subtext: 'text-fuchsia-700', accent: 'text-fuchsia-600', button: 'border-fuchsia-900 text-fuchsia-900 hover:bg-fuchsia-900/5', viewBtn: 'bg-fuchsia-900 text-white hover:bg-fuchsia-800' },
  { bg: 'bg-[#F7FEE7]', text: 'text-lime-900', subtext: 'text-lime-700', accent: 'text-lime-600', button: 'border-lime-900 text-lime-900 hover:bg-lime-900/5', viewBtn: 'bg-lime-900 text-white hover:bg-lime-800' },
  { bg: 'bg-[#ECFEFF]', text: 'text-cyan-900', subtext: 'text-cyan-700', accent: 'text-cyan-600', button: 'border-cyan-900 text-cyan-900 hover:bg-cyan-900/5', viewBtn: 'bg-cyan-900 text-white hover:bg-cyan-800' },
];

export default function Home() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [installmentBg, setInstallmentBg] = useState('/images/environment.jpeg');
  const [siteName, setSiteName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Food Market Section
  const [foodSection, setFoodSection] = useState<{ image: string; title: string; description: string }>({
    image: '',
    title: 'Fresh From the Farm to Your Table',
    description: 'Discover our curated selection of premium grains, rice, beans, and fresh produce. Quality food at unbeatable prices — shop the Food Market today.',
  });

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

        // Filter out out-of-stock products for public visibility
        allProducts = allProducts.filter(p => (p.quantity ?? 0) > 0);

        const parseDate = (dateVal: any) => {
          if (!dateVal) return 0;
          if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
          return new Date(dateVal).getTime() || 0;
        };

        // Sort products by updatedAt descending
        allProducts.sort((a, b) => {
          const dateA = parseDate(a.updatedAt);
          const dateB = parseDate(b.updatedAt);
          return dateB - dateA;
        });

        // Auto-remove expired promos
        const now = new Date();
        const expiredPromos = allProducts.filter((p: any) =>
          p.isPromo &&
          p.promoEndDate &&
          new Date(p.promoEndDate) < now
        );

        if (expiredPromos.length > 0) {
          for (const promo of expiredPromos) {
            try {
              await updateDoc(doc(db, 'products', promo.id), {
                isPromo: false,
                promoEndDate: null,
                updatedAt: now.toISOString()
              });
            } catch (err) {
              console.error("Error auto-removing promo:", err);
            }
          }
          // Refresh data after auto-removal
          loadData();
          return;
        }

        // Fetch hero config
        const heroSnap = await getDoc(doc(db, 'settings', 'hero'));
        let slidesToSet = [];
        if (heroSnap.exists()) {
          const ids: string[] = heroSnap.data().productIds || [];
          const slides = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
          slidesToSet = slides.length > 0 ? slides : allProducts.filter(p => p.isPromo).slice(0, 5);
        } else {
          // Default hero slides if no config
          slidesToSet = allProducts.filter(p => p.isPromo).slice(0, 5);
        }
        setHeroSlides(slidesToSet);
        if (slidesToSet.length > 0) {
          setCurrentSlide(Math.floor(Math.random() * slidesToSet.length));
        }

        // Fetch general settings (installment bg)
        const generalSnap = await getDoc(doc(db, 'settings', 'general'));
        if (generalSnap.exists()) {
          const gData = generalSnap.data();
          if (gData.installmentBg) setInstallmentBg(gData.installmentBg);
          if (gData.siteName) setSiteName(gData.siteName);
        }

        // Promo products for carousel
        setPromoProducts(allProducts.filter((p: any) => p.isPromo));

        // Fetch food section settings
        const foodSettingsSnap = await getDoc(doc(db, 'settings', 'food_market'));
        if (foodSettingsSnap.exists()) {
          const fData = foodSettingsSnap.data();
          setFoodSection(prev => ({
            image: fData.sectionImage || prev.image,
            title: fData.sectionTitle || prev.title,
            description: fData.sectionDescription || prev.description,
          }));
        }
      } catch (error) {
        console.error("Error loading home data:", error);
        const fallbackSlides = staticProducts.filter(p => p.isPromo).slice(0, 5);
        setPromoProducts(staticProducts.filter(p => p.isPromo));
        setHeroSlides(fallbackSlides);
        if (fallbackSlides.length > 0) {
          setCurrentSlide(Math.floor(Math.random() * fallbackSlides.length));
        }
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
      manufacturer: slide.manufacturer || siteName,
      shipping: slide.shipping || 0,
      productCode: slide.productCode || '',
      rdpPrice: slide.rdpPrice || 0
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
      <section className="relative h-[620px] max-md:h-[670px] overflow-hidden bg-slate-50">
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
                  <div className="max-w-[1200px] mx-auto px-3 md:px-6 w-full h-full">
                    <div className="flex flex-col-reverse md:flex-row items-center justify-between h-full gap-2 md:gap-8 max-md:pt-4 max-md:pb-14 md:py-0">
                      {/* Text Content */}
                      <div className={`max-w-[600px] ${theme.text} flex-1 z-10 max-md:text-center max-md:px-3`}>
                        <div className={`text-lg ${theme.accent} font-semibold mb-2`}>
                          {slide.manufacturer || slide.group}
                        </div>
                        <h1 className={`text-4xl max-md:text-xl font-bold mb-4 leading-[1.1] ${theme.text}`}>
                          {slide.name}
                        </h1>
                        <div className="flex flex-col md:gap-1 mb-6 max-md:flex-row max-md:gap-4 max-md:items-center max-md:justify-center">
                          {slide.oldPrice && (
                            <span className="text-2xl max-md:text-base line-through text-slate-400 font-bold">
                              ₦{slide.oldPrice?.toLocaleString()}
                            </span>
                          )}
                          <span className={`text-4xl max-md:text-xl font-bold ${theme.accent}`}>
                            ₦{slide.price?.toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-base mb-8 ${theme.subtext} leading-relaxed max-md:text-xs max-md:mb-4 line-clamp-3`}>
                          {slide.description}
                        </p>
                        <div className="flex gap-4 flex-wrap max-md:justify-center">
                          <Link href={`/product/${slide.id}`} className={`${theme.viewBtn} flex items-center justify-center gap-2 rounded-md font-semibold transition-colors px-6 py-3 max-md:px-4 max-md:py-2 max-md:text-xs`}>
                            View Product <FaArrowRight size={18} />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleBuyNow(slide); }}
                            className={`border-2 ${theme.button} rounded-md font-semibold transition-colors px-6 py-3 max-md:px-4 max-md:py-2 max-md:text-xs`}
                          >
                            Buy Now
                          </button>
                        </div>

                        {/* Hero Dots - Anchored to content */}
                        {heroSlides.length > 1 && (
                          <div className="mt-6 max-md:mt-4 flex gap-2 max-md:gap-1.5 max-md:justify-center">
                            {heroSlides.map((_, dotIndex) => (
                              <button
                                key={dotIndex}
                                onClick={(e) => { e.stopPropagation(); setCurrentSlide(dotIndex); }}
                                className={`h-1 rounded-full transition-all duration-300 ${currentSlide === dotIndex ? 'bg-primary w-6' : 'bg-slate-300 w-2 hover:bg-slate-400'}`}
                                aria-label={`Go to slide ${dotIndex + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Product Image Container */}
                      <div className="flex-1 flex justify-center items-center h-full max-md:h-auto w-full max-md:px-3 max-md:mt-4">
                        <div className="relative w-full aspect-square md:h-[500px] md:rounded-[var(--radius)] overflow-hidden md:bg-muted/50 group/hero max-md:rounded-sm">
                          {slide.isPromo && (
                            <span className={`absolute top-4 left-4 ${theme.viewBtn.split(' ')[0]} text-white px-2 py-1 rounded text-[10px] md:text-xs font-bold z-20 shadow-sm flex flex-col items-center`}>
                              <span>SPECIAL PROMO</span>
                              {slide.promoEndDate && (
                                <span className="text-[10px] md:text-[11px] bg-white text-slate-800 px-1.5 py-0.5 rounded-sm mt-1 border border-white/20 whitespace-nowrap">
                                  Ends {new Date(slide.promoEndDate).getDate()}
                                  <span className="text-[7px] align-top font-normal">{getOrdinal(new Date(slide.promoEndDate).getDate())}</span>
                                  {' '}{new Date(slide.promoEndDate).toLocaleDateString('en-GB', { month: 'short' })}
                                </span>
                              )}
                            </span>
                          )}
                          <img
                            src={slide.images?.[0] || slide.image}
                            alt={slide.name}
                            loading="eager"
                            fetchPriority="high"
                            className="w-full h-full object-cover max-md:object-contain transform hover:scale-105 transition-transform duration-700"
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

          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-[var(--radius)] h-[400px] animate-pulse">
                  <div className="bg-muted h-[240px] w-full rounded-t-[var(--radius)]" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PromoCarousel products={promoProducts} />
          )}
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

      {/* Food Market Section */}
      <section className="border-t-2 border-green-200 relative py-24 max-md:py-14 overflow-hidden bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 text-white">
        {/* Background image */}
        {foodSection.image && (
          <div className="absolute inset-0 z-0">
            <Image
              src={foodSection.image}
              alt="Food Market"
              fill
              className="object-cover opacity-20"
              sizes="100vw"
            />
          </div>
        )}
        {/* Decorative elements */}
        <div className="absolute top-8 right-8 opacity-10 pointer-events-none max-md:hidden">
          <FaLeaf size={200} />
        </div>
        <div className="absolute bottom-8 left-8 opacity-10 pointer-events-none max-md:hidden rotate-45">
          <FaLeaf size={120} />
        </div>

        <div className="max-w-[1200px] mx-auto md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12 max-md:gap-8">
            {/* Image Side */}
            {foodSection.image && (
              <div className="flex-1 w-full max-md:order-1">
                <div className="relative w-full aspect-[4/3] md:aspect-square md:rounded-xl overflow-hidden shadow-2xl border-2 border-white/10">
                  <Image
                    src={foodSection.image}
                    alt="Food Market"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-transparent" />
                </div>
              </div>
            )}

            {/* Text Side */}
            <div className={`flex-1 ${foodSection.image ? '' : 'text-center max-w-[800px] mx-auto'} max-md:order-2 max-md:text-center`}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-6 text-green-200">
                <FaLeaf /> Food Market
              </div>
              <h2 className="text-4xl max-md:text-2xl font-black mb-6 leading-tight">
                {foodSection.title}
              </h2>
              <p className="text-lg max-md:text-sm text-green-100 mb-10 leading-relaxed opacity-90">
                {foodSection.description}
              </p>
              <Link
                href="/foods"
                className="inline-flex items-center gap-3 bg-white text-emerald-900 hover:bg-green-50 px-8 py-4 max-md:px-6 max-md:py-3 rounded-xl font-bold text-lg max-md:text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Shop Food Market <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <ReviewSection />

      {/* Partnership Section */}
      <section 
        className="py-24 max-md:py-16 text-white relative overflow-hidden border-t border-slate-800 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)), url(${installmentBg})` }}
      >
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <FaHandshake size={400} />
        </div>
        <div className="absolute bottom-0 left-0 opacity-5 pointer-events-none transform -translate-x-1/4 translate-y-1/4">
          <FaHandshake size={300} />
        </div>
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 text-white mb-8 backdrop-blur-sm border border-white/20 shadow-2xl">
            <FaHandshake size={40} />
          </div>
          <h2 className="text-4xl max-md:text-3xl font-black mb-6 tracking-tight">Partner With Us</h2>
          <p className="text-xl max-md:text-base text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Join our growing network of partners and distributors. Work with us to bring premium products to more customers, accelerate your business growth, and earn rewarding commissions.
          </p>
          <Link href="/partnership" className="inline-flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-xl font-bold text-lg max-md:text-base transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
            Explore Partnership <FaArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
