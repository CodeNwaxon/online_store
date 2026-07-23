'use client';

import { Product } from '@/data/products';
import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEllipsisV, FaEdit, FaTrash } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LikeButton from './LikeButton';
import WarrantyModal from './WarrantyModal';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


const getOrdinal = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  priority?: boolean;
  index?: number;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const cardThemes = [
  { accent: 'text-primary', borderTop: 'border-primary', btn: 'bg-primary hover:bg-primary-hover', lightBg: 'bg-primary/10', lightBorder: 'border-primary/20' },
  { accent: 'text-blue-600', borderTop: 'border-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', lightBg: 'bg-blue-50', lightBorder: 'border-blue-100' },
  { accent: 'text-rose-600', borderTop: 'border-rose-600', btn: 'bg-rose-600 hover:bg-rose-700', lightBg: 'bg-rose-50', lightBorder: 'border-rose-100' },
  { accent: 'text-teal-600', borderTop: 'border-teal-600', btn: 'bg-teal-600 hover:bg-teal-700', lightBg: 'bg-teal-50', lightBorder: 'border-teal-100' },
  { accent: 'text-amber-600', borderTop: 'border-amber-600', btn: 'bg-amber-600 hover:bg-amber-700', lightBg: 'bg-amber-50', lightBorder: 'border-amber-100' },
  { accent: 'text-violet-600', borderTop: 'border-violet-600', btn: 'bg-violet-600 hover:bg-violet-700', lightBg: 'bg-violet-50', lightBorder: 'border-violet-100' },
  { accent: 'text-emerald-600', borderTop: 'border-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', lightBg: 'bg-emerald-50', lightBorder: 'border-emerald-100' },
  { accent: 'text-orange-600', borderTop: 'border-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', lightBg: 'bg-orange-50', lightBorder: 'border-orange-100' },
  { accent: 'text-indigo-600', borderTop: 'border-indigo-600', btn: 'bg-indigo-600 hover:bg-indigo-700', lightBg: 'bg-indigo-50', lightBorder: 'border-indigo-100' },
  { accent: 'text-fuchsia-600', borderTop: 'border-fuchsia-600', btn: 'bg-fuchsia-600 hover:bg-fuchsia-700', lightBg: 'bg-fuchsia-50', lightBorder: 'border-fuchsia-100' },
  { accent: 'text-lime-600', borderTop: 'border-lime-600', btn: 'bg-lime-600 hover:bg-lime-700', lightBg: 'bg-lime-50', lightBorder: 'border-lime-100' },
  { accent: 'text-cyan-600', borderTop: 'border-cyan-600', btn: 'bg-cyan-600 hover:bg-cyan-700', lightBg: 'bg-cyan-50', lightBorder: 'border-cyan-100' },
];

export default function ProductCard({ product, isAdmin, priority = false, index = 0, onEdit, onDelete }: ProductCardProps) {
  const pathname = usePathname();
  const isFurniturePage = pathname?.includes('/shop/furniture');
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showColorOverlay, setShowColorOverlay] = useState(false);
  const [tempSelectedColor, setTempSelectedColor] = useState('');
  const [mounted, setMounted] = useState(false);

  const getContrastTextColor = (colorName: string) => {
    const lightColors = ['white', 'yellow', 'lime', 'cyan', 'gold', 'silver', 'pink', 'beige', 'ivory', 'light', 'cream', 'peach', 'wheat', 'lemon'];
    if (lightColors.some(c => colorName.toLowerCase().includes(c))) {
      return 'text-black';
    }
    return 'text-white';
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = cardThemes[index % 12];
  const colors = (product as any).color ? (product as any).color.split(',').map((c: string) => c.trim()).filter(Boolean) : [];
  const scrollbarColor = '#6b7280';


  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [currentImgIndex]);

  const sanitizeImageUrl = (url: string) => {
    if (!url) return '/images/placeholder.png';
    try {
      if (url.includes('_next/image?url=')) {
        const urlObj = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
        const actualUrl = urlObj.searchParams.get('url');
        if (actualUrl) return actualUrl;
      }
    } catch (e) { }
    return url;
  };

  const rawImgUrl = imgError ? '/images/placeholder.png' : (product.images && product.images.length > 0 ? product.images[currentImgIndex] : product.image);
  const safeImgUrl = sanitizeImageUrl(rawImgUrl);

  const CardContent = (
    <div className={`relative h-45 max-md:h-40 w-full cursor-pointer bg-muted/20 p-0.5`}>
      <div className="relative w-full h-full overflow-hidden rounded-[calc(var(--radius)-2px)] md:rounded-[calc(var(--radius)-1px)]">
        <Image
          src={safeImgUrl}
          alt={product.name}
          fill
          className={`${isAdmin ? 'object-contain' : 'object-cover object-top'} transition-all duration-300 group-hover:scale-110`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
        {(product.quantity ?? 0) <= 0 && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-2 text-center select-none">
            <div className="bg-red-600/90 text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 transform rotate-[-5deg] animate-pulse">
              Out of Stock
            </div>
          </div>
        )}
        {product.isPromo && (
          <span className={`absolute top-0.5 left-0.5 ${theme.btn.split(' ')[0]} text-white px-1 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-bold z-10 shadow-sm flex flex-col items-center`}>
            <span>SPECIAL PROMO</span>
            {product.promoEndDate && (
              <span className="text-[8px] md:text-[11px] bg-white text-slate-800 px-1 md:px-1.5 py-0.5 rounded mt-0.5 md:mt-1 border border-white/20 whitespace-nowrap">
                Ends {new Date(product.promoEndDate).getDate()}
                <span className="text-[5px] md:text-[7px] align-top font-normal">{getOrdinal(new Date(product.promoEndDate).getDate())}</span>
                {' '}{new Date(product.promoEndDate).toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            )}
          </span>
        )}
        {!product.isPromo && (() => {
          let showNewTag = false;
          if ((product as any).isNewItem === true) {
             showNewTag = true;
          } else if ((product as any).isNewItem !== false) {
             const createdAtTime = (product as any).createdAt ? new Date((product as any).createdAt).getTime() : 0;
             if (createdAtTime > 0 && (Date.now() - createdAtTime <= 5 * 24 * 60 * 60 * 1000)) {
                 showNewTag = true;
             }
          }
          return showNewTag ? (
            <span className="absolute top-0.5 left-0.5 bg-red-600 text-white px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-bold z-10 shadow-sm flex items-center animate-pulse">
              NEW
            </span>
          ) : null;
        })()}
        {isAdmin && (product.quantity ?? 0) <= 5 && (
          <div className="absolute top-1 right-10 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-[40] shadow-lg border-2 border-white animate-bounce">
            {product.quantity}
          </div>
        )}
        {product.images && product.images.length > 1 && (
          <>
            <button
              onClick={cycleImage}
              className="absolute top-2.5 right-2.5 bg-white/90 p-1.5 rounded-full flex items-center justify-center z-30 shadow-sm hover:bg-white transition-colors"
              title="See next image"
            >
              <FaEllipsisV size={14} className={theme.accent} />
            </button>
            <div className="absolute bottom-4 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImgIndex === i
                    ? `${theme.btn.split(' ')[0]} w-4`
                    : 'bg-white/60 w-1.5 hover:bg-white'
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative bg-white border-x border-b border-muted shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-lg md:rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 h-full flex flex-col group`}>
      {isAdmin && onEdit && onDelete && (
        <div className="absolute top-14 right-2 z-[40] flex flex-col gap-2 transition-all duration-300 opacity-100 translate-x-0 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:translate-x-4">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(product); }}
            className="bg-primary text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Edit Product"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(product.id); }}
            className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Delete Product"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )}
      <div className={`w-full h-[3px] shrink-0 ${theme.btn.split(' ')[0]}`} />
      {!isAdmin ? (
        <Link href={`/product/${product.id}?theme=${index}`}>
          {CardContent}
        </Link>
      ) : (
        CardContent
      )}

      {/* Color bar below image */}
      {colors.length > 0 && (
        <div className="flex overflow-x-auto gap-1 mx-1 md:py-2 py-1 bg-gray-50 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:h-[3px] md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:rounded-full" style={{ scrollbarColor: `${scrollbarColor} transparent`, ['--scrollbar-thumb' as string]: scrollbarColor } as React.CSSProperties}>
          {colors.map((c: string, i: number) => (
            <span key={i} className={`shrink-0 text-[10px] font-bold capitalize px-1.5 py-1 rounded bg-white border border-gray-100 shadow-sm ${c.toLowerCase().includes('white') ? 'text-gray-300' : ''}`} style={{ color: c.toLowerCase().includes('white') ? undefined : c.toLowerCase().replace(/\s/g, '') }}>{c}</span>
          ))}
        </div>
      )}

      <div className="p-3 max-md:p-2 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
            {product.category}
          </div>
          {isAdmin && (
            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
              {product.productCode}
            </div>
          )}
          {!isAdmin && <LikeButton productId={product.id} />}
        </div>
        <div className="flex flex-col mb-0.5">
          <h3
            className={`text-[0.95rem] max-md:text-[0.75rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis ${theme.accent} leading-tight`}
            title={product.name}
          >
            {product.name}
          </h3>
          {product.group && (product.group.toUpperCase().includes('PHONE') || product.group.toUpperCase().includes('PHONES') || product.group.toUpperCase().includes('LAPTOP') || product.group.toUpperCase().includes('LAPTOPS')) && product.ramRom && (
            <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mt-0.5 font-bold">
              ({product.ramRom}) GB
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col md:flex-row justify-between items-start">
          {/* Manufacturer and warranty section */}
          <div className="flex flex-col justify-start items-start gap-2 mb-2">
            {product.manufacturer && (
              <span className="text-[0.65rem] text-muted-foreground font-medium italic">
                By {product.manufacturer.toUpperCase()}
              </span>
            )}
            {product.warranty && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowWarrantyModal(true);
                }}
                className={`text-[0.65rem] px-1.5 py-0.5 rounded font-medium border transition-colors ${theme.accent} ${theme.lightBg} ${theme.lightBorder} hover:opacity-80`}
              >
                ✓ {product.warranty} {!isNaN(Number(product.warranty)) && (Number(product.warranty) > 1 ? 'Years' : 'Year')} Warranty
              </button>
            )}
          </div>

          {/* Description button and overlay */}
          <button
            onClick={() => setShowDescription(true)}
            className={`mb-2 md:mb-0 underline font-semibold text-[11px] md:text-xs ${theme.accent}`}
          >
            Description
          </button>
        </div>
        {product.minShippingQty && product.minShippingQty > 0 ? (
          <p className="mt-0 text-[9px] text-muted-foreground font-medium">
            Min. shipping qty: {product.minShippingQty}
          </p>
        ) : null}



        <WarrantyModal
          isOpen={showWarrantyModal}
          onClose={() => setShowWarrantyModal(false)}
          warrantyValue={product.warranty}
        />

        {showDescription && (
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-[3px] z-50 p-2 max-md:p-1 flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
          >
            <div
              className="bg-card w-full max-h-[90%] rounded-md shadow-xl border border-border p-3 max-md:p-2 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDescription(false); }}
                className="absolute top-1.5 right-1.5 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
              >
                ✕
              </button>
              <h3 className="text-[0.75rem] font-bold mb-1.5 pr-6 text-foreground leading-tight">{product.name}</h3>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-[0.7rem] text-foreground/90 whitespace-pre-wrap break-words overflow-hidden">
                  {product.description?.split(/(https?:\/\/nomo-store[^\s]*)/g).map((part: string, i: number) => 
                    part.match(/^https?:\/\/nomo-store/) ? (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        {part}
                      </a>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className='flex items-end justify-between'>
          {/* Price section */}
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-[0.75rem] text-muted-foreground line-through -mb-1 opacity-70">
                &#8358;{product.oldPrice.toLocaleString()}
              </span>
            )}
            <span className={`text-lg max-md:text-[0.95rem] font-bold ${theme.accent}`}>
              &#8358;{product.price.toLocaleString()}
            </span>
            {isAdmin && product.rdpPrice && (
              <span className="text-[11px] md:text-xs font-bold text-black">
                RDP: &#8358;{product.rdpPrice.toLocaleString()}
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex flex-col">
              <div className="text-[0.55rem] text-muted-foreground uppercase">
                <span className="text-black font-bold">kg: </span>{product.size}
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(product.quantity ?? 0) <= 5
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-muted text-muted-foreground border-border'
                }`}>
                Stock: {product.quantity}
              </div>
            </div>
          )}
          {!isAdmin && (
            (product.quantity ?? 0) <= 0 && isFurniturePage ? (
              <button
                disabled
                className="flex items-center justify-center gap-1.5 rounded md:rounded-md font-bold px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem] bg-gray-400 text-white cursor-not-allowed opacity-50 whitespace-nowrap"
              >
                Out of Stock
              </button>
            ) : (
            <button
              disabled={(product.quantity ?? 0) <= 0}
              className={`flex items-center justify-center gap-1.5 rounded md:rounded-md font-bold transition-all duration-200 px-3 py-1.5 max-md:px-2 max-md:py-1 max-md:text-[0.65rem] text-[0.8rem] ${(product.quantity ?? 0) <= 0
                ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-50'
                : `${theme.btn} text-white`
                }`}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (colors.length > 0) {
                  setShowColorOverlay(true);
                  setTempSelectedColor('Any Color');
                  return;
                }
                
                const toastId = toast.loading(`Adding ${product.name}...`, {
                  position: 'bottom-center',
                  style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' }
                });

                // Check quantity in cart vs available stock
                const existing = cartItems.find(item => item.id === product.id);
                const currentInCart = existing ? existing.quantity : 0;
                try {
                  const docSnap = await getDoc(doc(db, 'products', product.id));
                  const liveQty = docSnap.exists() ? (Number(docSnap.data().quantity) || 0) : (product.quantity ?? 0);
                  if (currentInCart + 1 > liveQty) {
                    toast.error(`Only ${liveQty} available in stock`, { id: toastId, duration: 3000 });
                    return;
                  }
                } catch (err) {
                  if (currentInCart + 1 > (product.quantity ?? 0)) {
                    toast.error(`Only ${product.quantity ?? 0} available in stock`, { id: toastId, duration: 3000 });
                    return;
                  }
                }
                addItem(product);
                toast.success(`${product.name} added to cart`, {
                  id: toastId,
                  style: {
                    fontSize: '11px',
                    padding: '4px 8px',
                    minWidth: '120px',
                    marginTop: '20px'
                  },
                  position: 'bottom-center',
                  duration: 2000,
                });
              }}
            >
              <FaShoppingCart size={13} />
            </button>
            )
          )}
        </div>
      </div>

      {/* Color Selection Overlay */}
      {mounted && showColorOverlay && colors.length > 0 && createPortal(
        <div
          className="fixed inset-0 bg-black/50 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorOverlay(false); }}
        >
          <div
            className="bg-card w-[calc(100%-16px)] md:w-full mb-2 md:mb-0 md:mx-0 md:max-w-[400px] max-h-[80vh] md:max-h-[90vh] rounded-2xl md:rounded-xl shadow-2xl border border-border p-5 flex flex-col relative animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorOverlay(false); }}
              className="absolute top-3 right-3 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
            >
              ✕
            </button>
            
            <h3 className="text-[0.75rem] font-bold mb-2 pr-6 text-foreground leading-tight">Select Color</h3>
            <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-40 mb-3">
              <button
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${tempSelectedColor === 'Any Color' ? `bg-gray-500 text-white border-transparent` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTempSelectedColor('Any Color');
                }}
              >
                Any Color
              </button>
              {colors.map((c: string) => {
                return (
                  <button
                    key={c}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${tempSelectedColor === c ? `${getContrastTextColor(c)} ${c.toLowerCase().includes('white') ? 'border-gray-300' : 'border-transparent'}` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    style={tempSelectedColor === c ? { backgroundColor: c.toLowerCase().replace(/\s/g, '') } : { borderLeftColor: c.toLowerCase().includes('white') ? '#ccc' : c.toLowerCase().replace(/\s/g, ''), borderLeftWidth: '4px' }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTempSelectedColor(c);
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-border">
              <button
                className={`w-full py-1.5 rounded-md text-xs font-bold transition-all ${!tempSelectedColor ? 'bg-gray-300 cursor-not-allowed text-gray-500' : (tempSelectedColor === 'Any Color' ? `${theme.btn.split(' ')[0]} text-white hover:opacity-90` : `${getContrastTextColor(tempSelectedColor)} hover:opacity-90`)}`}
                style={tempSelectedColor && tempSelectedColor !== 'Any Color' ? { backgroundColor: tempSelectedColor.toLowerCase().replace(/\s/g, '') } : undefined}
                disabled={!tempSelectedColor}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!tempSelectedColor) return;
                  
                  const finalColor = tempSelectedColor === 'Any Color' ? undefined : tempSelectedColor;
                  
                  const toastId = toast.loading(`Adding ${product.name}...`, {
                    position: 'bottom-center',
                    style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' }
                  });
                  
                  const existing = cartItems.find(item => item.id === product.id && item.selectedColor === finalColor);
                  const currentInCart = existing ? existing.quantity : 0;
                  try {
                    const docSnap = await getDoc(doc(db, 'products', product.id));
                    const liveQty = docSnap.exists() ? (Number(docSnap.data().quantity) || 0) : (product.quantity ?? 0);
                    if (currentInCart + 1 > liveQty) {
                      toast.error(`Only ${liveQty} available in stock`, { id: toastId, duration: 3000 });
                      return;
                    }
                  } catch (err) {
                    if (currentInCart + 1 > (product.quantity ?? 0)) {
                      toast.error(`Only ${product.quantity ?? 0} available in stock`, { id: toastId, duration: 3000 });
                      return;
                    }
                  }
                  const cartProduct = { ...product } as any;
                  if (finalColor) {
                    cartProduct.selectedColor = finalColor;
                  }
                  addItem(cartProduct);
                  toast.success(`${product.name} ${finalColor ? `(${finalColor}) ` : ''}added to cart`, {
                    id: toastId,
                    style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' },
                    position: 'bottom-center',
                    duration: 2000,
                  });
                  setShowColorOverlay(false);
                }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
