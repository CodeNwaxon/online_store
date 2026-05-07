'use client';

import { useParams } from 'next/navigation';
import { products } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaWhatsapp, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import ProductCard from '@/components/ProductCard';

export default function ProductDetail() {
  const params = useParams();
  const id = params.id as string;
  const product = products.find((p) => p.id === id);
  const addItem = useCartStore((state) => state.addItem);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  const whatsappMessage = `I want to make enquiries about ${product.name}, ${product.manufacturer}, and ₦${product.price.toLocaleString()}.`;
  const whatsappUrl = `https://wa.me/2347034632037?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="py-16 max-md:py-8">
      <div className="max-w-[1200px] mx-auto px-3 md:px-6">
        <Link href="/shop" className="flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors w-fit">
          <FaArrowLeft size={16} /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-md:gap-8 items-start">
          {/* Left Side: Images */}
          <div>
            <div className="relative h-[500px] max-md:h-[300px] w-full rounded-[var(--radius)] overflow-hidden bg-muted">
              <Image
                src={product.images[activeImageIndex]}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex gap-4 mt-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative w-[80px] h-[80px] rounded overflow-hidden shrink-0 transition-colors ${activeImageIndex === index ? 'border-2 border-primary' : 'border border-border'}`}
                >
                  <Image src={img} alt={`${product.name} ${index}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Details */}
          <div>
            <div className="text-sm text-primary font-semibold uppercase mb-2">
              {product.category}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
            <div className="text-lg text-muted-foreground mb-6">
              Manufactured by <span className="font-semibold text-foreground">{product.manufacturer}</span>
            </div>

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

            <div className="mt-8 p-6 bg-muted rounded-[var(--radius)] text-sm">
              <div className="mb-2"><strong>Category:</strong> {product.category} {product.subcategory && `/ ${product.subcategory}`}</div>
              <div><strong>Product ID:</strong> {product.id}</div>
            </div>
          </div>
        </div>

        <div className="mt-24 max-md:mt-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 max-md:mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-8">
            {products
              .filter(p => p.id !== product.id)
              .sort((a, b) => {
                // Priority 1: Same subcategory
                if (a.subcategory === product.subcategory && b.subcategory !== product.subcategory) return -1;
                if (b.subcategory === product.subcategory && a.subcategory !== product.subcategory) return 1;
                // Priority 2: Same category
                if (a.category === product.category && b.category !== product.category) return -1;
                if (b.category === product.category && a.category !== product.category) return 1;
                return 0;
              })
              .slice(0, 4)
              .map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
