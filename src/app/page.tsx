'use client';

import Link from 'next/link';
import { products, Category } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaArrowRight, FaShieldAlt, FaBolt, FaCreditCard } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PromoCarousel from '@/components/PromoCarousel';
import ReviewSection from '@/components/ReviewSection';
import InstallPrompt from '@/components/InstallPrompt';

const heroSlides = [
  {
    id: 'h1',
    name: 'Mahogany Furniture Set',
    price: 1250000,
    description: 'Premium handcrafted mahogany set for modern African homes.',
    image: 'https://picsum.photos/seed/hero1/1600/900',
    images: ['https://picsum.photos/seed/hero1/1600/900'],
    category: 'Furniture' as Category,
    manufacturer: 'Lagos Artisans',
    link: '/shop?category=Furniture',
    isPromo: true,
    oldPrice: 1500000,
    shipping: 50
  },
  {
    id: 'h2',
    name: 'Smart Home Electronics Bundle',
    price: 850000,
    description: 'The complete set for your smart home upgrade.',
    image: 'https://picsum.photos/seed/hero2/1600/900',
    images: ['https://picsum.photos/seed/hero2/1600/900'],
    category: 'Electronics' as Category,
    manufacturer: 'LG Electronics',
    link: '/shop?category=Electronics',
    isPromo: true,
    shipping: 35
  },
  {
    id: 'h3',
    name: 'Royal Sofa Set',
    price: 1850000,
    description: 'Ultimate luxury and comfort for your living room.',
    image: 'https://picsum.photos/seed/hero3/1600/900',
    images: ['https://picsum.photos/seed/hero3/1600/900'],
    category: 'Furniture' as Category,
    manufacturer: 'Royal Designs',
    link: '/shop?category=Furniture',
    isPromo: true,
    oldPrice: 2200000,
    shipping: 60
  }
];

export default function Home() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [currentSlide, setCurrentSlide] = useState(0);
  const promoProducts = products.filter(p => p.isPromo).slice(0, 8);

  const handleBuyNow = (slide: typeof heroSlides[0]) => {
    const product = {
      id: slide.id,
      name: slide.name,
      price: slide.price,
      description: slide.description,
      image: slide.image,
      images: slide.images,
      category: slide.category,
      manufacturer: slide.manufacturer,
      shipping: slide.shipping
    };
    addItem(product);
    router.push('/checkout');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <InstallPrompt />
      {/* Hero Section */}
      <section className="relative h-[650px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out bg-cover bg-center cursor-pointer ${currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}
            style={{ backgroundImage: `url(${slide.image})` }}
            onClick={() => router.push(slide.link)}
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
                    {slide.manufacturer}
                  </div>
                  <h1 className="text-5xl max-md:text-4xl font-bold mb-4 leading-[1.1]">
                    {slide.name}
                  </h1>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl max-md:text-2xl font-bold text-primary">
                      ₦{slide.price.toLocaleString()}
                    </span>
                    {slide.oldPrice && (
                      <span className="text-xl max-md:text-lg line-through text-white/60 font-bold bg-white/10 px-2 py-0.5 rounded">
                        ₦{slide.oldPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-lg mb-10 opacity-90 leading-relaxed max-md:text-base">
                    {slide.description}
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    <Link href={slide.link} className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 rounded-md font-semibold transition-colors px-6 py-3">
                      Shop Collection <FaArrowRight size={18} />
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
        ))}
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
        style={{ backgroundImage: 'linear-gradient(rgba(139, 38, 53, 0.9), rgba(139, 38, 53, 0.9)), url(https://picsum.photos/seed/payment/1600/900)' }}
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
