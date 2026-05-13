'use client';

import { useParams } from 'next/navigation';
import { products as staticProducts } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import WarrantyModal from '@/components/WarrantyModal';


export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Try to find in Firestore first
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Fallback to static products
          const staticProd = staticProducts.find((p) => p.id === id);
          if (staticProd) setProduct(staticProd);
        }

        // Fetch all products for related section
        const prodSnap = await getDocs(collection(db, 'products'));
        const dynamicProducts = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
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
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
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

  // Ensure images array exists
  const productImages = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  const whatsappMessage = `I want to make enquiries about ${product.name}${product.manufacturer ? `, made by ${product.manufacturer}` : ''}, priced at ₦${product.price.toLocaleString()}.`;
  const whatsappUrl = `https://wa.me/2347034632037?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="py-12 max-md:py-4">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Link href="/shop" className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8 items-start">
          {/* Left Side: Images */}
          <div>
            <div className="relative h-[500px] max-md:h-[300px] w-full rounded-[var(--radius)] overflow-hidden bg-muted">
              <Image
                src={productImages[activeImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-4 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
                {productImages.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative w-[80px] h-[80px] rounded overflow-hidden shrink-0 transition-colors ${activeImageIndex === index ? 'border-2 border-primary' : 'border border-border'}`}
                  >
                    <Image src={img} alt={`${product.name} ${index}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Details */}
          <div>
            <div className="text-sm text-primary font-semibold uppercase mb-2">
              {product.group} / {product.category}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
            {product.manufacturer && (
              <div className="text-lg text-muted-foreground mb-6">
                Manufactured by <span className="font-semibold text-foreground">{product.manufacturer}</span>
              </div>
            )}

            <div className="text-3xl font-bold text-primary mb-8">
              ₦{product.price.toLocaleString()}
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-bold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
              <button
                className="text-sm md:text-base col-span-1 md:flex-[2] order-1 bg-primary hover:bg-primary-hover text-white flex items-center justify-center gap-2 p-3 text-sm max-md:text-xs rounded-md font-semibold transition-colors"
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
                className="col-span-1 md:flex-[2] order-2 md:order-3 bg-foreground text-background hover:opacity-90 flex items-center justify-center gap-1 p-3 text-xs max-md:text-[0.7rem] font-semibold rounded-md transition-opacity text-center"
              >
                <FaCreditCard size={16} className="max-md:hidden" /> Installment pay
              </Link>
            </div>

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
                    className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full hover:bg-emerald-200 transition-colors"
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


        <div className="mt-24 max-md:mt-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 max-md:mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-8">
            {allProducts
              .filter(p => p.id !== product.id)
              .sort((a, b) => {
                if (a.subcategory === product.subcategory && b.subcategory !== product.subcategory) return -1;
                if (b.subcategory === product.subcategory && a.subcategory !== product.subcategory) return 1;
                if (a.category === product.category && b.category !== product.category) return -1;
                if (b.category === product.category && a.category !== product.category) return 1;
                return 0;
              })
              .slice(0, 4)
              .map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
          </div>
          {allProducts.filter(p => p.id !== product.id).length === 0 && (
            <div className="text-center py-8 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">No related products found at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

