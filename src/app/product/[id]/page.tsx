'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { products as staticProducts } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaCreditCard, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import WarrantyModal from '@/components/WarrantyModal';

const cardThemes = [
  { accent: 'text-primary', btn: 'bg-primary hover:bg-primary-hover', lightBg: 'bg-primary/10', lightBorder: 'border-primary/20' },
  { accent: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', lightBg: 'bg-blue-50', lightBorder: 'border-blue-100' },
  { accent: 'text-rose-600', btn: 'bg-rose-600 hover:bg-rose-700', lightBg: 'bg-rose-50', lightBorder: 'border-rose-100' },
  { accent: 'text-teal-600', btn: 'bg-teal-600 hover:bg-teal-700', lightBg: 'bg-teal-50', lightBorder: 'border-teal-100' },
  { accent: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700', lightBg: 'bg-amber-50', lightBorder: 'border-amber-100' },
  { accent: 'text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', lightBg: 'bg-violet-50', lightBorder: 'border-violet-100' },
  { accent: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-100' },
  { accent: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', lightBg: 'bg-orange-50', lightBorder: 'border-orange-100' },
  { accent: 'text-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700', lightBg: 'bg-indigo-50', lightBorder: 'border-indigo-100' },
  { accent: 'text-fuchsia-600', btn: 'bg-fuchsia-600 hover:bg-fuchsia-700', lightBg: 'bg-fuchsia-50', lightBorder: 'border-fuchsia-100' },
  { accent: 'text-lime-600', btn: 'bg-lime-600 hover:bg-lime-700', lightBg: 'bg-lime-50', lightBorder: 'border-lime-100' },
  { accent: 'text-cyan-600', btn: 'bg-cyan-600 hover:bg-cyan-700', lightBg: 'bg-cyan-50', lightBorder: 'border-cyan-100' },
];


export default function ProductDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const themeParam = searchParams.get('theme');
  const themeIndex = themeParam ? parseInt(themeParam, 10) : 0;
  const theme = !isNaN(themeIndex) ? cardThemes[themeIndex % 12] : cardThemes[0];
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  // State for dynamic WhatsApp number
  const [contactNumber, setContactNumber] = useState('2347034632037'); // Default fallback

  useEffect(() => {
    if (!id) return;

    setLoading(true);

    // Fetch WhatsApp Number from Site Settings
    const fetchSettings = async () => {
      try {
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

    const unsubscribe = onSnapshot(collection(db, 'products'), (prodSnap) => {
      const dynamicProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      const currentProduct = dynamicProducts.find(p => p.id === id);
      if (currentProduct) {
        setProduct(currentProduct);
      } else {
        const staticProd = staticProducts.find((p) => p.id === id);
        if (staticProd) setProduct(staticProd);
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
      
      setAllProducts(sortedProducts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      const staticProd = staticProducts.find((p) => p.id === id);
      if (staticProd) setProduct(staticProd);
      setAllProducts(staticProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16 max-w-[1200px] mx-auto px-4 md:px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link href="/shop" className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-md px-6 py-3 inline-block transition-colors">
          Back to Shop
        </Link>
      </div>
    );
  }

  const productImages = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  const whatsappMessage = `I want to make enquiries about ${product.name}${product.manufacturer ? `, made by ${product.manufacturer}` : ''}, priced at ₦${product.price.toLocaleString()}.`;
  // Uses dynamic contactNumber from state
  const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="py-12 max-md:py-4">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Link href="/shop" className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8 items-start">
          {/* Images Section */}
          <div>
            <div className="relative h-[500px] max-md:h-[300px] w-full rounded-[var(--radius)] overflow-hidden bg-white">
              <Image
                src={productImages[activeImageIndex]}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-4 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
                {productImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative w-[80px] h-[80px] rounded overflow-hidden shrink-0 transition-colors ${activeImageIndex === index ? `border-2 border-current ${theme.accent}` : 'border border-border'}`}
                  >
                    <Image src={img} alt={`${product.name} ${index}`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <div className={`text-sm font-semibold uppercase mb-2 ${theme.accent}`}>
              {product.group} / {product.category}
            </div>
            <h1 className={`text-xl md:text-3xl font-bold mb-2 ${theme.accent}`}>{product.name}</h1>
            {product.manufacturer && (
              <div className="text-lg text-muted-foreground mb-6">
                Manufactured by <span className="font-semibold text-foreground">{product.manufacturer}</span>
              </div>
            )}

            <div className={`text-2xl font-bold mb-8 ${theme.accent}`}>
              ₦{product.price.toLocaleString()}
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-bold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed italic">
                {product.description}
              </p>
            </div>

            {/* CTA Buttons */}
            {(product.quantity ?? 0) <= 0 ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-md text-sm w-full font-bold flex flex-col items-center justify-center gap-3">
                <span className="text-lg md:text-xl">⚠️ Product Out of Stock</span>
                <span className="font-normal text-xs text-muted-foreground text-center">
                  This product has just sold out. Another customer completed their payment first.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
                <button
                  className={`text-sm md:text-base col-span-1 md:flex-[2] order-1 ${theme.btn} text-white flex items-center justify-center gap-2 p-3 rounded-md font-semibold transition-colors`}
                  onClick={() => addItem(product)}
                >
                  <FaShoppingCart size={18} className="max-md:hidden" /> Add to Cart
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 md:flex-[1] order-3 md:order-2 bg-[#25D366] hover:bg-[#1DA851] text-white flex items-center justify-center gap-2 p-2 md:p-3 rounded-md transition-colors font-semibold"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={18} /> <span className="md:hidden">Contact via WhatsApp</span>
                </a>

                <Link
                  href={`/installments?search=${encodeURIComponent(product.name)}`}
                  className="col-span-1 md:flex-[2] order-2 md:order-3 bg-foreground text-background hover:opacity-90 flex items-center justify-center gap-1 p-3 text-xs font-semibold rounded-md transition-opacity text-center"
                >
                  <FaCreditCard size={16} className="max-md:hidden" /> Installment pay
                </Link>
              </div>
            )}

            <div className="mt-8 p-6 bg-muted rounded-[var(--radius)] text-sm space-y-2">
              <div><strong>Group:</strong> {product.group}</div>
              <div><strong>Category:</strong> {product.category}</div>
              {product.manufacturer && (
                <div><strong>Manufacturer:</strong> {product.manufacturer}</div>
              )}
              {product.warranty && (
                <div className="flex items-center gap-2">
                  <strong>Warranty:</strong>
                  <button
                    onClick={() => setShowWarrantyModal(true)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors border ${theme.accent} ${theme.lightBg} ${theme.lightBorder} hover:opacity-80`}
                  >
                    ✓ {product.warranty} {!isNaN(Number(product.warranty)) && (Number(product.warranty) > 1 ? 'years' : 'year')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <WarrantyModal
          isOpen={showWarrantyModal}
          onClose={() => setShowWarrantyModal(false)}
          warrantyValue={product.warranty}
        />
      </div>

      {/* Related Products Carousel (Independent Container) */}
      <div className="max-w-[1600px] mx-auto w-full px-2 md:px-6 mt-12">
        <RelatedCarousel
          allProducts={allProducts}
          currentProductId={product.id}
          currentCategory={product.category}
          currentSubcategory={product.subcategory}
        />
      </div>
    </div>
  );
}

function RelatedCarousel({
  allProducts,
  currentProductId,
  currentCategory,
  currentSubcategory,
}: {
  allProducts: any[];
  currentProductId: string;
  currentCategory: string;
  currentSubcategory: string;
}) {
  const related = allProducts
    .filter(p => p.id !== currentProductId)
    .sort((a, b) => {
      if (a.subcategory === currentSubcategory && b.subcategory !== currentSubcategory) return -1;
      if (b.subcategory === currentSubcategory && a.subcategory !== currentSubcategory) return 1;
      if (a.category === currentCategory && b.category !== currentCategory) return -1;
      if (b.category === currentCategory && a.category !== currentCategory) return 1;
      return 0;
    })
    .slice(0, 16);

  const [startIndex, setStartIndex] = useState(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Determine items visible per breakpoint
  const [itemsToShow, setItemsToShow] = useState(6);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setItemsToShow(6);
      else if (window.innerWidth >= 768) setItemsToShow(5);
      else if (window.innerWidth >= 640) setItemsToShow(4);
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

  const displayedProducts = related.slice(startIndex, startIndex + itemsToShow);

  const gridCols = itemsToShow === 6
    ? 'grid-cols-6'
    : itemsToShow === 5
      ? 'grid-cols-5'
      : itemsToShow === 4
        ? 'grid-cols-4'
        : itemsToShow === 3
          ? 'grid-cols-3'
          : 'grid-cols-2';

  if (related.length === 0) return null;

  return (
    <div className="mt-24 max-md:mt-16">
      <h2 className="md:px-8 text-2xl font-bold mb-10 max-md:mb-6">You May Also Like</h2>

      {/* Desktop Carousel */}
      <div className="relative hidden sm:block px-8">
        <div className={`grid ${gridCols} gap-3 transition-all duration-500 ease-in-out`}>
          {displayedProducts.map((p, i) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {totalItems > itemsToShow && (
          <>
            <button
              onClick={prev}
              disabled={startIndex === 0}
              className="absolute -left-2 top-1/2 -translate-y-1/2 text-primary opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer"
              title="Previous"
            >
              <FaChevronLeft size={40} />
            </button>
            <button
              onClick={next}
              disabled={startIndex >= maxIndex}
              className="absolute -right-2 top-1/2 -translate-y-1/2 text-primary opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer"
              title="Next"
            >
              <FaChevronRight size={40} />
            </button>
          </>
        )}

        {/* Desktop Dot Indicators */}
        {totalItems > itemsToShow && (
          <div className="flex justify-center gap-2 mt-8 flex-wrap">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStartIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${startIndex === i ? 'bg-primary w-8' : 'bg-border w-2 hover:bg-primary/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Swipe View */}
      <div className="block sm:hidden px-2">
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto gap-2 snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {related.map(p => (
            <div key={p.id} className="min-w-[48%] w-[48%] shrink-0 snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Mobile Dots */}
        <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
          {related.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${activeMobileIndex === i ? 'bg-primary w-4' : 'bg-border w-1'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}