'use client';

import { useCartStore } from '@/store/useCartStore';
import { FaShoppingCart, FaEdit, FaTrash, FaLeaf, FaEllipsisV } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createPortal } from 'react-dom';

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  price: number; // selling price
  images: string[];
  quantity?: number;
  group?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  size?: string;
  itemSize?: string;
  color?: string;
  sizeQuantities?: Record<string, number>;
  selectedSize?: string;
  requiresMinShipping?: boolean;
  minShippingQty?: number;
  measurements?: string;
}

interface ShopCardProps {
  food: ShopProduct;
  isAdmin?: boolean;
  isFood?: boolean;
  onEdit?: (food: ShopProduct) => void;
  onDelete?: (id: string) => void;
  themeColor?: 'green' | 'pink' | 'purple' | 'teal' | 'amber';
}

const themeStyles = {
  green: {
    bgGradient: "from-green-50 to-emerald-100",
    textPrimary: "text-green-600",
    bgPrimary: "bg-green-600",
    hoverBgPrimary: "hover:bg-green-700",
    hoverBgLight: "hover:bg-green-50",
    border: "border-green-200",
    shadow: "shadow-[0_4px_20px_rgba(34,197,94,0.08)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.15)]",
    divider: "from-green-400 to-emerald-600",
    textPrice: "text-emerald-600",
  },
  pink: {
    bgGradient: "from-pink-50 to-rose-100",
    textPrimary: "text-pink-600",
    bgPrimary: "bg-pink-600",
    hoverBgPrimary: "hover:bg-pink-700",
    hoverBgLight: "hover:bg-pink-50",
    border: "border-pink-200",
    shadow: "shadow-[0_4px_20px_rgba(219,39,119,0.08)] hover:shadow-[0_8px_30px_rgba(219,39,119,0.15)]",
    divider: "from-pink-400 to-rose-600",
    textPrice: "text-rose-600",
  },
  purple: {
    bgGradient: "from-purple-50 to-violet-100",
    textPrimary: "text-purple-600",
    bgPrimary: "bg-purple-600",
    hoverBgPrimary: "hover:bg-purple-700",
    hoverBgLight: "hover:bg-purple-50",
    border: "border-purple-200",
    shadow: "shadow-[0_4px_20px_rgba(147,51,234,0.08)] hover:shadow-[0_8px_30px_rgba(147,51,234,0.15)]",
    divider: "from-purple-400 to-violet-600",
    textPrice: "text-violet-600",
  },
  teal: {
    bgGradient: "from-teal-50 to-cyan-100",
    textPrimary: "text-teal-600",
    bgPrimary: "bg-teal-600",
    hoverBgPrimary: "hover:bg-teal-700",
    hoverBgLight: "hover:bg-teal-50",
    border: "border-teal-200",
    shadow: "shadow-[0_4px_20px_rgba(13,148,136,0.08)] hover:shadow-[0_8px_30px_rgba(13,148,136,0.15)]",
    divider: "from-teal-400 to-cyan-600",
    textPrice: "text-cyan-600",
  },
  amber: {
    bgGradient: "from-amber-50 to-yellow-100",
    textPrimary: "text-amber-600",
    bgPrimary: "bg-amber-600",
    hoverBgPrimary: "hover:bg-amber-700",
    hoverBgLight: "hover:bg-amber-50",
    border: "border-amber-200",
    shadow: "shadow-[0_4px_20px_rgba(217,119,6,0.08)] hover:shadow-[0_8px_30px_rgba(217,119,6,0.15)]",
    divider: "from-amber-400 to-yellow-600",
    textPrice: "text-amber-600",
  }
};

export default function ShopCard({ food, isAdmin, isFood = true, onEdit, onDelete, themeColor = 'green' }: ShopCardProps) {
  const theme = themeStyles[themeColor];
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [showSizeOverlay, setShowSizeOverlay] = useState(false);
  const [tempSelectedMeasurement, setTempSelectedMeasurement] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImgError(false);
  }, [currentImgIndex]);

  const safeImgUrl = imgError || !food.images?.length
    ? '/images/placeholder.png'
    : food.images[currentImgIndex % food.images.length];

  const cycleImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (food.images && food.images.length > 1) {
      setCurrentImgIndex((prev) => (prev + 1) % food.images.length);
    }
  };

  // Parse colors
  const colors = food.color ? food.color.split(',').map(c => c.trim()).filter(Boolean) : [];

  // Scrollbar color matching the top border theme
  const scrollbarColorMap: Record<string, string> = {
    green: '#16a34a',
    pink: '#db2777',
    purple: '#9333ea',
    teal: '#0d9488',
    amber: '#d97706',
  };
  const scrollbarColor = scrollbarColorMap[themeColor] || '#6b7280';

  // Compute size display
  const sizeKeys = food.sizeQuantities ? Object.keys(food.sizeQuantities).filter(k => (food.sizeQuantities as Record<string, number>)[k] > 0) : [];
  const getSizeDisplay = () => {
    if (sizeKeys.length === 0 && food.itemSize) {
      const parts = food.itemSize.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 1) return `Size: ${parts[0]}`;
      if (parts.length > 1) {
        const nums = parts.map(p => parseInt(p.replace(/\D/g, ''))).filter(n => !isNaN(n));
        if (nums.length >= 2) return `Sizes: ${Math.min(...nums)} - ${Math.max(...nums)}`;
        return `Sizes: ${parts[0]} - ${parts[parts.length - 1]}`;
      }
    }
    if (sizeKeys.length === 1) return `Size: ${sizeKeys[0]}`;
    if (sizeKeys.length > 1) {
      // try numeric sort
      const nums = sizeKeys.map(k => parseInt(k.replace(/\D/g, ''))).filter(n => !isNaN(n));
      if (nums.length >= 2) return `Sizes: ${Math.min(...nums)} - ${Math.max(...nums)}`;
      return `Sizes: ${sizeKeys[0]} - ${sizeKeys[sizeKeys.length - 1]}`;
    }
    return null;
  };
  const sizeLabel = getSizeDisplay();
  
  const measurementKeys = food.measurements ? food.measurements.split(',').map(m => m.trim()).filter(Boolean) : [];

  const CardContent = (
    <div className={`relative h-52 max-md:h-40 w-full cursor-pointer bg-gradient-to-br ${theme.bgGradient} p-1`}>
      <div className="relative w-full h-full overflow-hidden rounded-[calc(var(--radius)-2px)]">
        <Image
          src={safeImgUrl}
          alt={food.name}
          fill
          className="object-cover transition-all duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgError(true)}
        />
        {sizeLabel && (
          <div className="absolute top-1 left-1 bg-white dark:bg-zinc-800 py-1 px-1.5 rounded z-30 shadow-sm border border-gray-100 dark:border-zinc-700 text-[8px] md:text-[10px] leading-tight">
            <span className="font-bold text-gray-800 dark:text-zinc-200">{sizeLabel}</span>
          </div>
        )}
        {food.images && food.images.length > 1 && (
          <>
            <button
              onClick={cycleImage}
              className={`absolute top-2.5 right-2.5 bg-white/90 p-1.5 rounded-full flex items-center justify-center z-30 shadow-sm transition-colors ${isFood ? `${theme.hoverBgLight} ${theme.textPrimary}` : 'hover:bg-white text-gray-700'}`}
              title="View next image"
            >
              {isFood ? <FaLeaf size={14} /> : <FaEllipsisV size={14} />}
            </button>
            <div className="absolute bottom-4 left-3 flex gap-1.5 max-md:gap-2.5 z-20">
              {food.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentImgIndex(i); }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImgIndex === i
                    ? `${theme.bgPrimary} w-4`
                    : 'bg-white/80 w-1.5 hover:bg-white'
                    }`}
                />
              ))}
            </div>
          </>
        )}
        {(food.quantity ?? 0) <= 0 && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-2 text-center select-none">
            <div className="bg-red-600/90 text-white font-black text-[10px] md:text-xs tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 transform rotate-[-5deg] animate-pulse">
              Out of Stock
            </div>
          </div>
        )}
        {isAdmin && (food.quantity ?? 0) <= 5 && (
          <div className="absolute top-1 right-2 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black z-[40] shadow-lg border-2 border-white animate-bounce">
            {food.quantity}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative bg-white border ${theme.border} ${theme.shadow} rounded-lg md:rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 h-full flex flex-col group`}>
      {isAdmin && onEdit && onDelete && (
        <div className="absolute top-14 right-2 z-[40] flex flex-col gap-2 transition-all duration-300 opacity-100 translate-x-0 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:translate-x-4">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(food); }}
            className={`${theme.bgPrimary} text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20`}
            title="Edit Food"
          >
            <FaEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(food.id); }}
            className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-white/20"
            title="Delete Food"
          >
            <FaTrash size={14} />
          </button>
        </div>
      )}

      <div className={`w-full h-1 shrink-0 bg-gradient-to-r ${theme.divider}`} />

      {isAdmin ? (
        CardContent
      ) : (
        <Link href={`/foods/${food.id}`}>
          {CardContent}
        </Link>
      )}

      {/* Color bar below image */}
      {colors.length > 0 && (
        <div className="flex overflow-x-auto gap-1 mx-1 md:py-2 py-1 bg-gray-50 max-md:[&::-webkit-scrollbar]:hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:h-[3px] md:[&::-webkit-scrollbar-track]:bg-transparent md:[&::-webkit-scrollbar-thumb]:rounded-full" style={{ scrollbarColor: `${scrollbarColor} transparent`, ['--scrollbar-thumb' as string]: scrollbarColor } as React.CSSProperties}>
          {colors.map((c, i) => (
            <span key={i} className={`shrink-0 text-[10px] font-bold capitalize px-1.5 py-1 rounded bg-white border border-gray-100 shadow-sm ${c.toLowerCase().includes('white') ? 'text-gray-300' : ''}`} style={{ color: c.toLowerCase().includes('white') ? undefined : c.toLowerCase().replace(/\s/g, '') }}>{c}</span>
          ))}
        </div>
      )}

      <div className="p-4 max-md:p-3 flex-1 flex flex-col justify-between">
        <div className="mb-2">
          <div className="flex justify-between items-start mb-1">
            <h3 className="capitalize text-lg max-md:text-base font-bold text-gray-900 leading-tight line-clamp-2">
              {food.name}
            </h3>
          </div>
          {food.description && (
            <button
              onClick={() => setShowDescription(true)}
              className={`text-xs ${theme.textPrimary} font-semibold hover:underline`}
            >
              Description
            </button>
          )}
          {food.minShippingQty && food.minShippingQty > 0 ? (
            <p className="mt-0 text-[9px] text-muted-foreground font-medium">
              Min. shipping qty: {food.minShippingQty}
            </p>
          ) : null}
        </div>

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
              <h3 className="text-[0.75rem] font-bold mb-1.5 pr-6 text-foreground leading-tight">{food.name}</h3>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-[0.7rem] text-foreground/90 whitespace-pre-wrap break-words overflow-hidden">
                  {food.description?.split(/(https?:\/\/nomo-store[^\s]*)/g).map((part, i) => 
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

        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className={`text-xl max-md:text-lg font-black ${theme.textPrice}`}>
              &#8358;{food.price.toLocaleString()}
            </span>
            {isAdmin && (
              <span className="text-[10px] md:text-xs font-bold text-gray-500">
                Cost: &#8358;{food.costPrice.toLocaleString()}
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-col items-end">
              <div className={`px-2 py-0.5 rounded-full text-[0.65rem] font-black border transition-colors ${(food.quantity ?? 0) <= 5
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-muted text-muted-foreground border-border'
                }`}>
                Stock: {food.quantity}
              </div>
            </div>
          )}

          {!isAdmin && (
            (food.quantity ?? 0) <= 0 ? (
              <button
                disabled
                className="flex items-center justify-center gap-2 rounded md:rounded-md font-bold px-4 py-2 max-md:px-3 max-md:py-1.5 text-sm max-md:text-xs bg-gray-400 text-white cursor-not-allowed opacity-50"
              >
                Out of Stock
              </button>
            ) : (
              <button
                className={`flex items-center justify-center gap-1 md:gap-2 rounded md:rounded-md font-bold transition-all duration-200 px-4 py-2 max-md:p-1.5 text-sm max-md:text-xs ${theme.bgPrimary} ${theme.hoverBgPrimary} text-white shadow-md hover:shadow-lg`}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (sizeKeys.length > 0 || measurementKeys.length > 0) {
                    setShowSizeOverlay(true);
                    setTempSelectedMeasurement('');
                    return;
                  }

                  // Check quantity in cart vs available stock
                  const cartItem = cartItems.find(item => item.id === food.id);
                  const currentInCart = cartItem ? cartItem.quantity : 0;
                  try {
                    const docSnap = await getDoc(doc(db, 'foods', food.id));
                    const liveQty = docSnap.exists() ? (Number(docSnap.data().quantity) || 0) : (food.quantity || 0);
                    if (currentInCart + 1 > liveQty) {
                      toast.error(`Only ${liveQty} available in stock for ${food.name}`, { duration: 3000 });
                      return;
                    }
                  } catch (err) {
                    // If check fails, fallback to local quantity
                    if (currentInCart + 1 > (food.quantity || 0)) {
                      toast.error(`Only ${food.quantity || 0} available in stock for ${food.name}`, { duration: 3000 });
                      return;
                    }
                  }
                  const cartProduct = {
                    id: food.id,
                    name: food.name,
                    price: food.price,
                    image: food.images?.[0] || '/images/placeholder.png',
                    category: 'Food',
                    description: food.description,
                  };
                  addItem(cartProduct as any);
                  toast.success(`${food.name} added to cart`);
                }}
              >
                <FaShoppingCart size={14} /> Buy
              </button>
            )
          )}
        </div>

        {/* Size/Measurement Selection Overlay */}
        {mounted && showSizeOverlay && (sizeKeys.length > 0 || measurementKeys.length > 0) && createPortal(
          <div
            className="fixed inset-0 bg-black/50 dark:bg-zinc-950/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
          >
            <div
              className="bg-card w-[calc(100%-16px)] md:w-full mb-2 md:mb-0 md:mx-0 md:max-w-[400px] max-h-[80vh] md:max-h-[90vh] rounded-2xl md:rounded-xl shadow-2xl border border-border p-5 flex flex-col relative animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizeOverlay(false); }}
                className="absolute top-3 right-3 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-foreground z-10"
              >
                ✕
              </button>
              
              {sizeKeys.length > 0 && (
                <>
                  <h3 className="text-[0.75rem] font-bold mb-2 pr-6 text-foreground leading-tight">Select Size</h3>
                  <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-40 mb-3">
                    {sizeKeys.map(sz => {
                      const qty = (food.sizeQuantities as Record<string, number>)[sz];
                      return (
                        <button
                          key={sz}
                          disabled={qty <= 0}
                          className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-colors ${qty <= 0 ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border' : `${theme.bgPrimary} text-white border-transparent hover:opacity-90`}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const existing = cartItems.find(item => item.id === food.id && item.selectedSize === sz);
                            const currentInCart = existing ? existing.quantity : 0;
                            if (currentInCart + 1 > qty) {
                              toast.error(`Only ${qty} available for size ${sz}`);
                              return;
                            }
                            const cartProduct = {
                              id: food.id,
                              name: food.name,
                              price: food.price,
                              image: food.images?.[0] || '/images/placeholder.png',
                              category: 'Food',
                              description: food.description,
                              selectedSize: sz,
                            };
                            addItem(cartProduct as any);
                            toast.success(`${food.name} (${sz}) added to cart`, {
                              style: { fontSize: '11px', padding: '4px 8px', minWidth: '120px', marginTop: '20px' },
                              position: 'bottom-center',
                              duration: 2000,
                            });
                            setShowSizeOverlay(false);
                          }}
                        >
                          {sz} {qty > 0 && <span className="opacity-70">({qty})</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {measurementKeys.length > 0 && (
                <>
                  <h3 className="text-[0.75rem] font-bold mb-2 pr-6 text-foreground leading-tight">Select Measurement</h3>
                  <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-40 mb-3">
                    {measurementKeys.map(m => (
                      <button
                        key={m}
                        className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-colors ${tempSelectedMeasurement === m ? `${theme.bgPrimary} text-white border-transparent` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTempSelectedMeasurement(m);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border">
                    <button
                      className={`w-full py-1.5 rounded-md text-xs font-bold text-white transition-all ${!tempSelectedMeasurement ? 'bg-gray-300 cursor-not-allowed text-gray-500' : `${theme.bgPrimary} ${theme.hoverBgPrimary}`}`}
                      disabled={!tempSelectedMeasurement}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!tempSelectedMeasurement) return;

                        const existing = cartItems.find(item => item.id === food.id && item.selectedSize === tempSelectedMeasurement);
                        const currentInCart = existing ? existing.quantity : 0;
                        if (currentInCart + 1 > (food.quantity ?? 0)) {
                          toast.error(`Only ${food.quantity ?? 0} available in stock`);
                          return;
                        }
                        const cartProduct = {
                          id: food.id,
                          name: food.name,
                          price: food.price,
                          image: food.images?.[0] || '/images/placeholder.png',
                          category: 'Food',
                          description: food.description,
                          selectedSize: tempSelectedMeasurement, // Map measurement to selectedSize for cart
                        };
                        addItem(cartProduct as any);
                        toast.success(`${food.name} (${tempSelectedMeasurement}) added to cart`, {
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
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
