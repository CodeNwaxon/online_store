'use client';

import Link from 'next/link';
import Image from 'next/image';
import { products, Category } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import ProductCard from '@/components/ProductCard';
import { FaArrowRight, FaStar, FaShieldAlt, FaBolt, FaCreditCard, } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    isPromo: true
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
    isPromo: true
  }
];

export default function Home() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [currentSlide, setCurrentSlide] = useState(0);
  const promoProducts = products.filter(p => p.isPromo).slice(0, 4);

  const handleBuyNow = (slide: typeof heroSlides[0]) => {
    const product = {
      id: slide.id,
      name: slide.name,
      price: slide.price,
      description: slide.description,
      image: slide.image,
      images: slide.images,
      category: slide.category,
      manufacturer: slide.manufacturer
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
    <div>
      {/* Hero Section */}
      <section style={{ position: 'relative', height: '650px', overflow: 'hidden' }}>
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: index === currentSlide ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }}
          >
            <Image
              src={slide.image}
              alt={slide.name}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.8), transparent)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div className="container">
                <div style={{ maxWidth: '650px', color: 'white' }}>
                  {slide.isPromo && (
                    <span style={{
                      backgroundColor: 'var(--secondary)',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                      display: 'inline-block'
                    }}>
                      SPECIAL PROMO
                    </span>
                  )}
                  <div style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {slide.manufacturer}
                  </div>
                  <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', marginBottom: '1rem', lineHeight: '1.1' }}>
                    {slide.name}
                  </h1>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    ₦{slide.price.toLocaleString()}
                  </div>
                  <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', opacity: 0.9, lineHeight: '1.6' }}>
                    {slide.description}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href={slide.link} className="btn btn-primary" style={{ padding: '0.8rem 1.5rem' }}>
                      Shop Collection <FaArrowRight size={18} />
                    </Link>
                    <button
                      onClick={() => handleBuyNow(slide)}
                      className="btn"
                      style={{
                        padding: '0.8rem 1.5rem',
                        border: '2px solid white',
                        color: 'white',
                        backgroundColor: 'transparent'
                      }}
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
      <section className="section" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="container">
          <div className="grid grid-3">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><FaBolt size={40} /></div>
              <h3 style={{ marginBottom: '0.5rem' }}>Fast Delivery</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Prompt and secure delivery across the continent.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><FaShieldAlt size={40} /></div>
              <h3 style={{ marginBottom: '0.5rem' }}>Quality Assurance</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Every product is vetted for durability and excellence.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><FaCreditCard size={40} /></div>
              <h3 style={{ marginBottom: '0.5rem' }}>Flexible Payments</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Buy now and pay later with our installment plans.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Products */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Promotional Offers</h2>
              <p style={{ color: 'var(--muted-foreground)' }}>Grab these amazing deals before they are gone!</p>
            </div>
            <Link href="/shop" style={{ color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              View All <FaArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-4">
            {promoProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Installment Section */}
      <section className="section" style={{
        background: 'linear-gradient(rgba(139, 38, 53, 0.9), rgba(139, 38, 53, 0.9)), url(https://picsum.photos/seed/payment/1600/900)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Pay in Easy Installments</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', opacity: 0.9 }}>
              We believe everyone deserves the best. That's why we offer flexible payment plans that fit your budget.
              Get your dream items today and spread the cost over 3, 6, or 12 months.
            </p>
            <Link href="/contact" className="btn" style={{ backgroundColor: 'white', color: 'var(--secondary)' }}>
              Learn More About Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="section">
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', marginBottom: '3rem' }}>What Our Customers Say</h2>
          <div className="grid grid-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', color: '#FFD700', marginBottom: '1rem' }}>
                  {[1, 2, 3, 4, 5].map(s => <FaStar key={s} size={16} fill="#FFD700" />)}
                </div>
                <p style={{ fontStyle: 'italic', marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
                  "The quality of the mahogany dining set exceeded my expectations. Delivery was smooth and the customer service was top-notch!"
                </p>
                <div style={{ fontWeight: 'bold' }}>Chidi K.</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Verified Buyer</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
