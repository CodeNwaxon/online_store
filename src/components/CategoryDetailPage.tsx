'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaCreditCard, FaChevronLeft, FaChevronRight, FaShareAlt } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import CategoryProductCard, { CategoryProduct } from '@/components/CategoryProductCard';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { usePartner } from '@/hooks/usePartner';

interface CategoryDetailPageProps {
  id: string;
  collectionName: string;
  themeConfig: {
    accent: string;
    btn: string;
    lightBg: string;
    lightBorder: string;
  };
  backPath: string; // e.g. /shop/cosmetics
  categoryName: string; // e.g. Cosmetics
}

export default function CategoryDetailPage({ 
  id, 
  collectionName, 
  themeConfig,
  backPath,
  categoryName
}: CategoryDetailPageProps) {
  const [product, setProduct] = useState<CategoryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [allProducts, setAllProducts] = useState<CategoryProduct[]>([]);
  const { isApprovedPartner, partnerData } = usePartner();
  const [installmentMinAmount, setInstallmentMinAmount] = useState<number>(20000);
  const [showSizeOverlay, setShowSizeOverlay] = useState(false);
  const [tempSelectedSize, setTempSelectedSize] = useState('');
  const [tempSelectedColor, setTempSelectedColor] = useState('');
  const [tempSelectedMeasurement, setTempSelectedMeasurement] = useState('');

  // State for dynamic WhatsApp number
  const [contactNumber, setContactNumber] = useState('2347034632037');

  // Scroll to top on mount to fix back-navigation scroll position on mobile
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoading(true);

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

    // Fetch Installment settings for minAmount threshold
    const fetchInstallmentSettings = async () => {
      try {
        const instRef = doc(db, 'settings', 'installments');
        const instSnap = await getDoc(instRef);
        if (instSnap.exists()) {
          const instData = instSnap.data();
          if (instData.minAmount !== undefined) {
            setInstallmentMinAmount(instData.minAmount);
          }
        }
      } catch (e) {
        console.error("Error fetching installment settings:", e);
      }
    };
    fetchInstallmentSettings();

    const unsubscribe = onSnapshot(collection(db, collectionName), (prodSnap) => {
      const dynamicProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CategoryProduct[];
      
      const currentProduct = dynamicProducts.find(p => p.id === id);
      if (currentProduct) {
        setProduct(currentProduct);
      }

      const sortedProducts = dynamicProducts.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllProducts(sortedProducts);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, collectionName]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center">
        <div className={`w-12 h-12 border-4 ${themeConfig.accent.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin mb-4`} />
        <p className="text-muted-foreground animate-pulse">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16 max-w-[1200px] mx-auto px-4 md:px-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Product not found</h2>
        <Link href={backPath} className={`${themeConfig.btn} text-white font-semibold rounded-md px-6 py-3 inline-block transition-colors`}>
          Back to {categoryName}
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

  const sizeKeys = product.sizeQuantities ? Object.keys(product.sizeQuantities).filter(k => (product.sizeQuantities as Record<string, number>)[k] > 0) : [];
  let parsedMeasurements: Record<string, string> = {};
  if (product.measurements) {
    try {
      const parsed = JSON.parse(product.measurements);
      Object.entries(parsed).forEach(([k, v]) => {
        parsedMeasurements[k] = String(v);
      });
    } catch {
      product.measurements.split(',').forEach((m: string) => {
        const trimmed = m.trim();
        if (trimmed) parsedMeasurements[trimmed] = '';
      });
    }
  }
  const measurementKeys = Object.keys(parsedMeasurements);

  const productImages = (product.images && product.images.length > 0
    ? product.images
    : [product.image || '/images/placeholder.png']).map(sanitizeImageUrl);

  const whatsappMessage = `I want to make enquiries about ${product.name}${product.group ? `, by ${product.group}` : ''}, priced at ₦${product.price.toLocaleString()}.`;
  const whatsappUrl = `https://wa.me/${contactNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleShareProduct = () => {
    if (!partnerData?.referralCode) return;
    const currentReferralLink = typeof window !== 'undefined' ? `${window.location.origin}${backPath}/${product.id}?ref=${partnerData.referralCode}` : '';
    const shareText = `Looking for ${product.name}? 🛍️\n\nGet it today at Nomo Storez! ✨\n`;

    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: shareText,
        url: currentReferralLink
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(`${shareText}\n${currentReferralLink}`);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <div className="py-12 max-md:py-4">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Link href={backPath} className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaArrowLeft size={16} /> Back to {categoryName}
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
              {isApprovedPartner && (
                <button
                  onClick={handleShareProduct}
                  className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm p-2 md:p-3 rounded-full shadow-md text-[#4B0082] hover:bg-[#4B0082] hover:text-white transition-colors z-10"
                  title="Share with Referral Link"
                >
                  <FaShareAlt className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-4 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
                {productImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative w-[80px] h-[80px] rounded overflow-hidden shrink-0 transition-colors ${activeImageIndex === index ? `border-2 border-current ${themeConfig.accent}` : 'border border-border'}`}
                  >
                    <Image src={img} alt={`${product.name} ${index}`} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <div className={`text-sm font-semibold uppercase mb-2 ${themeConfig.accent}`}>
              {product.group} / {product.category}
            </div>
            <h1 className={`text-xl md:text-3xl font-bold mb-2 ${themeConfig.accent}`}>{product.name}</h1>

            <div className={`text-2xl font-bold mb-8 ${themeConfig.accent} flex items-center gap-3`}>
              ₦{product.price.toLocaleString()}
            </div>

            {/* Color Cards Section (display only) */}
            {product.color && product.color.trim() && (() => {
              const colors = product.color.split(',').map((c: string) => c.trim()).filter(Boolean);
              return colors.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Available Colors</h3>
                  <div className="flex flex-row gap-2 overflow-x-auto pb-1 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:h-[3px] md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:bg-border md:[&::-webkit-scrollbar-thumb]:rounded-full md:[scrollbar-width:thin]">
                    {colors.map((c: string, i: number) => (
                      <span
                        key={i}
                        className={`shrink-0 text-xs font-bold capitalize px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm transition-colors hover:shadow-md ${c.toLowerCase().includes('white') ? 'text-gray-400' : ''}`}
                        style={{ color: c.toLowerCase().includes('white') ? undefined : c.toLowerCase().replace(/\s/g, '') }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Measurement Cards Section (display only) */}
            {measurementKeys.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">Available Measurements</h3>
                <div className="flex flex-row gap-2 overflow-x-auto pb-1 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:h-[3px] md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:bg-border md:[&::-webkit-scrollbar-thumb]:rounded-full md:[scrollbar-width:thin]">
                  {measurementKeys.map((m: string, i: number) => {
                    const mPrice = parsedMeasurements[m];
                    return (
                      <span
                        key={i}
                        className="shrink-0 text-xs font-bold capitalize px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm transition-colors hover:shadow-md"
                      >
                        {m} {mPrice && <span className="opacity-75"> - ₦{Number(mPrice).toLocaleString()}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-10">
              <h3 className="text-lg font-bold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed italic whitespace-pre-wrap break-words overflow-hidden">
                {product.description?.split(/(https?:\/\/nomo-store[^\s]*)/g).map((part: string, i: number) => 
                  part.match(/^https?:\/\/nomo-store/) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline cursor-pointer">
                      {part}
                    </a>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </p>
            </div>

            {/* CTA Buttons */}
            {(product.quantity ?? 0) <= 0 ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-md text-sm w-full font-bold flex flex-col items-center justify-center gap-3">
                <span className="text-lg md:text-xl">⚠️ Product Out of Stock</span>
                <span className="font-normal text-xs text-muted-foreground text-center">
                  This product has just sold out.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
                <button
                  className={`text-sm md:text-base ${product.price >= installmentMinAmount ? 'col-span-1' : 'col-span-2'} md:flex-[2] order-1 ${themeConfig.btn} text-white flex items-center justify-center gap-2 p-3 rounded-md font-semibold transition-colors`}
                  onClick={async () => {
                    const colors = product.color ? product.color.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
                    // Show overlay if there are sizes, colors, or measurements to select
                    if (sizeKeys.length > 0 || colors.length > 0 || measurementKeys.length > 0) {
                      setShowSizeOverlay(true);
                      setTempSelectedSize('');
                      setTempSelectedColor('');
                      setTempSelectedMeasurement('');
                      return;
                    }

                    const existing = cartItems.find(item => item.id === product.id);
                    const currentInCart = existing ? existing.quantity : 0;
                    
                    if (currentInCart + 1 > (product.quantity ?? 0)) {
                      toast.error(`Only ${product.quantity ?? 0} available in stock`, { duration: 3000 });
                      return;
                    }
                    
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: productImages[0],
                      images: productImages,
                      quantity: product.quantity,
                      category: product.category as any,
                      description: product.description,
                      productCode: 'N/A',
                      rdpPrice: product.costPrice,
                      manufacturer: product.group,
                      shipping: 0
                    });
                    toast.success(`${product.name} added to cart`);
                  }}
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

                {product.price >= installmentMinAmount && (
                  <a
                    href={`/installments?search=${encodeURIComponent(product.name)}#search-section`}
                    className="col-span-1 md:flex-[2] order-2 md:order-3 bg-foreground text-background hover:opacity-90 flex items-center justify-center gap-1 p-3 text-xs font-semibold rounded-md transition-opacity text-center"
                  >
                    <FaCreditCard size={16} className="max-md:hidden" /> Installment pay
                  </a>
                )}
              </div>
            )}

            {/* Size & Color Selection Overlay */}
            {(() => {
              const colors = product.color ? product.color.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
              const hasSelections = sizeKeys.length > 0 || colors.length > 0 || measurementKeys.length > 0;
              if (!showSizeOverlay || !hasSelections) return null;

              const needsSize = sizeKeys.length > 0;
              const needsColor = colors.length > 0;
              const needsMeasurement = measurementKeys.length > 0;
              const canAdd = (!needsSize || tempSelectedSize) && (!needsColor || tempSelectedColor) && (!needsMeasurement || tempSelectedMeasurement);

              return (
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
                >
                  <div
                    className="bg-card w-[calc(100%-16px)] md:w-full mb-2 md:mb-0 md:mx-0 md:max-w-[420px] max-h-[80vh] md:max-h-[90vh] rounded-2xl md:rounded-xl shadow-2xl border border-border p-5 flex flex-col relative animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
                      className="absolute top-3 right-3 text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
                    >
                      ✕
                    </button>

                    {/* Drag handle for mobile */}
                    <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />

                    <div className="overflow-y-auto flex-1 pr-1">
                      {needsSize && (
                        <div className="mb-5">
                          <h3 className="text-base font-bold mb-3 text-foreground">Select Size</h3>
                          <div className="flex flex-wrap gap-2">
                            {sizeKeys.map(sz => {
                              const qty = (product.sizeQuantities as Record<string, number>)[sz];
                              return (
                                <button
                                  key={sz}
                                  disabled={qty <= 0}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                    qty <= 0 
                                      ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border' 
                                      : tempSelectedSize === sz 
                                        ? `${themeConfig.btn} text-white border-transparent`
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTempSelectedSize(sz);
                                  }}
                                >
                                  {sz} {qty > 0 && <span className="opacity-70 text-xs ml-1">({qty})</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {needsColor && (
                        <div className="mb-3">
                          <h3 className="text-base font-bold mb-3 text-foreground">Select Color</h3>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((c: string, i: number) => (
                              <button
                                key={i}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border capitalize transition-colors ${
                                  tempSelectedColor === c 
                                    ? `${themeConfig.btn} text-white border-transparent`
                                    : 'bg-white border-gray-300 hover:bg-gray-50'
                                }`}
                                style={tempSelectedColor === c ? undefined : { color: c.toLowerCase().includes('white') ? '#9ca3af' : c.toLowerCase().replace(/\s/g, '') }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setTempSelectedColor(c);
                                }}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {needsMeasurement && (
                        <div className="mb-3">
                          <h3 className="text-base font-bold mb-3 text-foreground">Select Measurement</h3>
                          <div className="flex flex-wrap gap-2">
                            {measurementKeys.map((m: string, i: number) => {
                              const mPrice = parsedMeasurements[m];
                              return (
                                <button
                                  key={i}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold border capitalize transition-colors ${
                                    tempSelectedMeasurement === m 
                                      ? `${themeConfig.btn} text-white border-transparent`
                                      : 'bg-white border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTempSelectedMeasurement(m);
                                  }}
                                >
                                  {m} {mPrice && <span className="opacity-75"> - ₦{Number(mPrice).toLocaleString()}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border shrink-0">
                      <button
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all text-sm ${
                          !canAdd ? 'bg-gray-300 cursor-not-allowed text-gray-500' : `${themeConfig.btn}`
                        }`}
                        disabled={!canAdd}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!canAdd) return;

                          const qtyToCheck = tempSelectedSize 
                            ? (product.sizeQuantities as Record<string, number>)[tempSelectedSize] 
                            : product.quantity;
                          
                          const existing = cartItems.find(item => 
                            item.id === product.id && 
                            item.selectedSize === (tempSelectedSize || undefined) && 
                            (item as any).selectedColor === (tempSelectedColor || undefined) &&
                            (item as any).selectedMeasurement === (tempSelectedMeasurement || undefined)
                          );
                          const currentInCart = existing ? existing.quantity : 0;
                          
                          if (currentInCart + 1 > (qtyToCheck ?? 0)) {
                            toast.error(`Only ${qtyToCheck ?? 0} available`);
                            return;
                          }

                          const measurePriceStr = tempSelectedMeasurement ? parsedMeasurements[tempSelectedMeasurement] : null;
                          const finalPrice = measurePriceStr ? Number(measurePriceStr) : product.price;

                          addItem({
                            id: product.id,
                            name: product.name,
                            price: finalPrice,
                            image: productImages[0],
                            images: productImages,
                            quantity: product.quantity,
                            category: product.category as any,
                            description: product.description,
                            productCode: 'N/A',
                            rdpPrice: product.costPrice,
                            manufacturer: product.group,
                            shipping: 0,
                            selectedSize: tempSelectedSize || undefined,
                            selectedColor: tempSelectedColor || undefined,
                            selectedMeasurement: tempSelectedMeasurement || undefined,
                            measurementPrice: measurePriceStr ? finalPrice : undefined,
                          } as any);

                          const parts = [tempSelectedSize, tempSelectedColor, tempSelectedMeasurement].filter(Boolean);
                          const label = parts.length > 0 ? ` (${parts.join(', ')})` : '';
                          toast.success(`${product.name}${label} added to cart`, {
                            style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' },
                            position: 'bottom-center',
                            duration: 2000,
                          });
                          setShowSizeOverlay(false);
                        }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {product.minShippingQty && product.minShippingQty > 0 ? (
              <p className="mt-4 text-xs text-muted-foreground font-medium">
                Min. shipping qty: {product.minShippingQty}
              </p>
            ) : null}

            <div className="mt-8 p-6 bg-muted rounded-[var(--radius)] text-sm space-y-2">
              <div><strong>Brand / Group:</strong> {product.group}</div>
              <div><strong>Category:</strong> {product.category}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Carousel */}
      <div className="max-w-[1600px] mx-auto w-full px-2 md:px-6 mt-12">
        <RelatedCarousel
          allProducts={allProducts}
          currentProduct={product}
          themeConfig={themeConfig}
          categoryName={categoryName}
          backPath={backPath}
        />
      </div>
    </div>
  );
}

function RelatedCarousel({
  allProducts,
  currentProduct,
  themeConfig,
  categoryName,
  backPath
}: {
  allProducts: CategoryProduct[];
  currentProduct: CategoryProduct;
  themeConfig: any;
  categoryName: string;
  backPath: string;
}) {
  const getSimilarityScore = (p: CategoryProduct, current: CategoryProduct) => {
    let score = 0;
    if (p.category === current.category && p.category) score += 5;
    if (p.group && current.group && p.group.toLowerCase() === current.group.toLowerCase()) score += 2;
    
    if (p.name && current.name) {
      const currentWords = current.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const pWords = p.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      let shared = 0;
      for (const w of pWords) {
        if (currentWords.includes(w)) shared += 1;
      }
      score += shared;
    }
    return score;
  };

  const related = allProducts
    .filter(p => p.id !== currentProduct.id)
    .sort((a, b) => getSimilarityScore(b, currentProduct) - getSimilarityScore(a, currentProduct))
    .slice(0, 30);

  const [startIndex, setStartIndex] = useState(0);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
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
            <CategoryProductCard 
              key={p.id} 
              product={p} 
              themeClass={themeConfig.btn.split(' ')[0]} 
              categoryName={categoryName}
              detailPath={`${backPath}/`}
            />
          ))}
        </div>

        {totalItems > itemsToShow && (
          <>
            <button
              onClick={prev}
              disabled={startIndex === 0}
              className={`absolute -left-2 top-1/2 -translate-y-1/2 ${themeConfig.accent} opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer`}
              title="Previous"
            >
              <FaChevronLeft size={40} />
            </button>
            <button
              onClick={next}
              disabled={startIndex >= maxIndex}
              className={`absolute -right-2 top-1/2 -translate-y-1/2 ${themeConfig.accent} opacity-60 hover:opacity-100 disabled:opacity-10 transition-opacity duration-200 cursor-pointer`}
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
                className={`h-1.5 rounded-full transition-all duration-300 ${startIndex === i ? `${themeConfig.btn.split(' ')[0]} w-8` : 'bg-border w-2 hover:bg-gray-400'}`}
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
          {related.map((p, index) => (
            <div key={p.id} className="min-w-[48%] w-[48%] shrink-0 snap-start">
              <CategoryProductCard 
                product={p} 
                themeClass={themeConfig.btn.split(' ')[0]} 
                categoryName={categoryName}
                detailPath={`${backPath}/`}
              />
            </div>
          ))}
        </div>

        {/* Mobile Dots */}
        <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
          {related.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${activeMobileIndex === i ? `${themeConfig.btn.split(' ')[0]} w-4` : 'bg-border w-1'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
