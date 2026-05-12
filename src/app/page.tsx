'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { FaArrowRight, FaShieldAlt, FaBolt, FaCreditCard } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PromoCarousel from '@/components/PromoCarousel';
import ReviewSection from '@/components/ReviewSection';
import InstallPrompt from '@/components/InstallPrompt';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';


export default function Home() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [installmentBg, setInstallmentBg] = useState('/images/environment.jpeg');

  // Load hero slides and promo products from Firestore
  useEffect(() => {
    const loadData = async () => {
      // Fetch all products
      const prodSnap = await getDocs(collection(db, 'products'));
      const allProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Fetch hero config
      const heroSnap = await getDoc(doc(db, 'settings', 'hero'));
      if (heroSnap.exists()) {
        const ids: string[] = heroSnap.data().productIds || [];
        const slides = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
        setHeroSlides(slides);
      }

      // Fetch general settings (installment bg)
      const generalSnap = await getDoc(doc(db, 'settings', 'general'));
      if (generalSnap.exists() && generalSnap.data().installmentBg) {
        setInstallmentBg(generalSnap.data().installmentBg);
      }

      // Promo products for carousel
      setPromoProducts(allProducts.filter((p: any) => p.isPromo).slice(0, 8));
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
      <section className="relative h-[70vh] max-h-[650px] max-md:h-[60vh] max-md:max-h-[500px] overflow-y-auto bg-foreground scrollbar-hide">
        {heroSlides.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <p className="p-3 md:text-xl font-bold">No hero slides configured. Set them in Admin → Products.</p>
          </div>
        ) : (
          heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out bg-cover bg-center cursor-pointer ${currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              onClick={() => router.push(`/product/${slide.id}`)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex items-center">
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 w-full">
                  <div className="max-w-[650px] text-white">
                    {slide.isPromo && (
                      <span className="bg-secondary px-3 py-1 rounded text-sm font-bold mb-4 inline-block">
                        SPECIAL PROMO
                      </span>
                    )}
                    <div className="text-lg text-primary font-semibold mb-2">
                      {slide.manufacturer || slide.group}
                    </div>
                    <h1 className="text-5xl max-md:text-4xl font-bold mb-4 leading-[1.1]">
                      {slide.name}
                    </h1>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-3xl max-md:text-2xl font-bold text-primary">
                        ₦{slide.price?.toLocaleString()}
                      </span>
                      {slide.oldPrice && (
                        <span className="text-xl max-md:text-lg line-through text-white/60 font-bold bg-white/10 px-2 py-0.5 rounded">
                          ₦{slide.oldPrice?.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-lg mb-10 opacity-90 leading-relaxed max-md:text-base">
                      {slide.description}
                    </p>
                    <div className="flex gap-4 flex-wrap">
                      <Link href={`/product/${slide.id}`} className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 rounded-md font-semibold transition-colors px-6 py-3">
                        View Product <FaArrowRight size={18} />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuyNow(slide); }}
                        className="border-2 border-white text-white hover:bg-white/10 rounded-md font-semibold transition-colors px-6 py-3"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Hero Dots */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-primary w-10' : 'bg-white/40 w-4 hover:bg-white/60'}`}
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
