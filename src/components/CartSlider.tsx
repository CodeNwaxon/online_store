'use client';

import { useCartStore } from '@/store/useCartStore';
import { useEffect, useState } from 'react';
import { FaTimes, FaPlus, FaMinus, FaTrashAlt, FaShoppingBag, FaHistory, FaReceipt, FaTrash, FaChevronLeft } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

interface CartSliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSlider({ isOpen, onClose }: CartSliderProps) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const [shouldRender, setShouldRender] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [siteName, setSiteName] = useState('Quick Choice');
  const [exceededStockItem, setExceededStockItem] = useState<{ id: string; name: string; available: number } | null>(null);

  const handleIncreaseQuantity = async (item: any) => {
    try {
      const docSnap = await getDoc(doc(db, 'products', item.id));
      if (docSnap.exists()) {
        const liveQty = Number(docSnap.data().quantity) || 0;
        if (item.quantity + 1 > liveQty) {
          setExceededStockItem({
            id: item.id,
            name: item.name,
            available: liveQty
          });
          return;
        }
      }
      updateQuantity(item.id, item.quantity + 1);
    } catch (error) {
      console.error("Error verifying quantity:", error);
      updateQuantity(item.id, item.quantity + 1);
    }
  };

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const saved = localStorage.getItem('purchase_history');
      if (saved) setPurchaseHistory(JSON.parse(saved));
      
      const fetchSettings = async () => {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) setSiteName(docSnap.data().siteName || 'Quick Choice');
      };
      fetchSettings();
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
      setShowHistory(false);
    }
  };

  const deleteHistoryItem = (id: string) => {
    const updated = purchaseHistory.filter(h => h.id !== id);
    setPurchaseHistory(updated);
    localStorage.setItem('purchase_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setPurchaseHistory([]);
    localStorage.removeItem('purchase_history');
    setShowClearConfirm(false);
  };

  const handlePrintReceipt = (order: any) => {
    const displayUid = order.id.substring(0, 10).toUpperCase();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${displayUid}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; display: flex; flex-direction: column; align-items: center; background: #f1f5f9; }
            .receipt { width: 380px; background: #fff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
            .header { padding: 24px; background: #f8fafc; border-bottom: 1px dashed #e2e8f0; text-align: center; }
            .logo { width: 48px; height: 48px; margin: 0 auto 8px; display: block; object-fit: contain; }
            .store-name { font-size: 18px; font-weight: 900; color: #D48806; text-transform: uppercase; letter-spacing: -0.05em; margin: 0; }
            .official { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }
            .copy-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 12px; }
            .id-badge { font-size: 8px; font-weight: bold; color: #94a3b8; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
            .copy-badge { font-size: 8px; font-weight: 900; color: #fff; background: #D48806; padding: 2px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.1em; }
            .content { padding: 24px; }
            .section-title { font-size: 10px; font-weight: 900; color: #1e293b; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
            .label { font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
            .value { font-size: 11px; font-weight: bold; color: #1e293b; text-align: right; max-width: 180px; word-break: break-all; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; }
            .item-name { font-weight: 500; color: #475569; }
            .item-price { font-weight: bold; color: #1e293b; }
            .total-row { margin-top: 20px; padding-top: 16px; border-top: 2px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
            .total-value { font-size: 24px; font-weight: 900; color: #D48806; }
            .footer { padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
            .footer-thanks { font-size: 9px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0; }
            .footer-addr { font-size: 8px; font-weight: 500; color: #94a3b8; margin: 4px 0 0; }
            .print-btn { margin-top: 20px; padding: 12px 24px; background: #1e293b; color: #fff; border: none; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
            .print-btn:hover { background: #334155; }
            @media print { 
              body { background: #fff; padding: 10px; display: block; } 
              .no-print { display: none; } 
              .receipt { border: 1px solid #e2e8f0; box-shadow: none; width: 380px; margin: 0 auto; break-inside: avoid; border-radius: 16px; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="/nomo_lg.png" class="logo" />
              <h1 class="store-name">${siteName.toUpperCase()}®</h1>
              <div class="official">Official Payment Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Customer Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="section-title">Order Info</div>
              <div class="row">
                <div class="label">Date:</div>
                <div class="value">${new Date(order.createdAt).toLocaleString()}</div>
              </div>
              <div class="row">
                <div class="label">Method:</div>
                <div class="value">Local Purchase Record</div>
              </div>

              <div class="section-title" style="margin-top: 20px;">Items Ordered</div>
              ${order.items.map((item: any) => `
                <div class="item-row">
                  <span class="item-name">${item.name} (x${item.quantity})</span>
                  <span class="item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              `).join('')}

              <div class="total-row">
                <div class="total-label">Total Amount:</div>
                <div class="total-value">₦${order.totalAmount?.toLocaleString()}</div>
              </div>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for choosing ${siteName}®!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <button class="no-print print-btn" onclick="window.print()">Print Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 cursor-pointer transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`relative w-full max-w-[400px] h-full bg-card shadow-[-4px_0_15px_rgba(0,0,0,0.1)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onTransitionEnd={handleAnimationEnd}
      >
        {exceededStockItem && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-[210] flex items-center justify-center p-6 text-center">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-w-[320px]">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <svg className="size-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-base font-black uppercase text-foreground mb-2">Quantity Limit</h3>
              <p className="text-xs text-muted-foreground mb-6 font-medium leading-relaxed">
                We only have <span className="font-bold text-amber-600 text-sm">{exceededStockItem.available}</span> quantity left of <span className="font-bold text-foreground">{exceededStockItem.name}</span> in stock.
              </p>
              <button 
                onClick={() => setExceededStockItem(null)} 
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase transition-colors shadow-md"
              >
                Okay, I understand
              </button>
            </div>
          </div>
        )}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)} 
              className={`flex items-center gap-1.5 transition-all ${showHistory ? 'text-primary font-black' : 'text-muted-foreground hover:text-foreground font-bold'}`}
            >
              {showHistory ? <FaChevronLeft size={14} /> : <FaHistory size={14} />}
              <span className="text-[9px] md:text-[11px] uppercase tracking-widest">{showHistory ? 'Back to Cart' : 'History'}</span>
            </button>
            <div className="w-[1px] h-4 bg-border" />
            <h2 className="text-base md:text-xl font-bold">{showHistory ? 'Purchase History' : 'Your Cart'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close cart" className="text-foreground hover:text-primary transition-colors"><FaTimes size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 relative">
          {showHistory ? (
            <div className="space-y-6">
              {purchaseHistory.length === 0 ? (
                <div className="text-center mt-16 opacity-50">
                  <FaHistory size={48} className="mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">History is empty</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{purchaseHistory.length} Past Purchases</span>
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[10px] font-black uppercase text-secondary hover:underline tracking-widest"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {purchaseHistory.map((order) => (
                    <div key={order.id} className="bg-muted/30 p-4 rounded-xl border border-border group relative">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[10px] font-bold text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
                          <div className="text-sm font-black text-primary">₦{order.totalAmount?.toLocaleString()}</div>
                        </div>
                        <button 
                          onClick={() => deleteHistoryItem(order.id)}
                          className="text-muted-foreground hover:text-secondary p-1"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.items.slice(0, 2).map((item: any, i: number) => (
                          <div key={i} className="text-[10px] font-bold text-foreground truncate">
                            • {item.name} <span className="text-muted-foreground">(x{item.quantity})</span>
                          </div>
                        ))}
                        {order.items.length > 2 && <div className="text-[9px] font-bold text-muted-foreground">+{order.items.length - 2} more...</div>}
                      </div>
                      <button 
                        onClick={() => handlePrintReceipt(order)}
                        className="w-full py-2 bg-card border border-border rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-muted transition-all"
                      >
                        <FaReceipt /> View Receipt
                      </button>
                    </div>
                  ))}
                </>
              )}

              {showClearConfirm && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center">
                  <div className="animate-in fade-in zoom-in duration-200">
                    <h3 className="text-lg font-black uppercase mb-2">Clear History?</h3>
                    <p className="text-xs text-muted-foreground mb-6 font-bold uppercase tracking-tighter">This will remove all local purchase records.</p>
                    <div className="flex gap-4">
                      <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 border border-border rounded-xl text-[10px] font-black uppercase">Cancel</button>
                      <button onClick={clearHistory} className="flex-1 py-3 bg-secondary text-white rounded-xl text-[10px] font-black uppercase">Yes, Clear</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            items.length === 0 ? (
              <div className="text-center mt-16 flex flex-col items-center">
                <FaShoppingBag size={64} className="text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Your cart is empty.</p>
                <Link 
                  href="/shop" 
                  onClick={onClose}
                  className="border border-border text-foreground hover:bg-muted px-6 py-3 rounded-md font-semibold mt-6 inline-block transition-colors" 
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-[80px] h-[80px] rounded shrink-0 overflow-hidden">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <h4 className="text-[0.9rem] font-semibold text-foreground">{item.name}</h4>
                        <button onClick={() => removeItem(item.id)} className="text-secondary hover:text-secondary-hover transition-colors"><FaTrashAlt size={16} /></button>
                      </div>
                      <div className="text-sm text-primary font-bold mb-2">
                        ₦{item.price.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          className="border border-border p-0.5 rounded hover:bg-muted text-foreground transition-colors"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <FaMinus size={14} />
                        </button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <button 
                          className="border border-border p-0.5 rounded hover:bg-muted text-foreground transition-colors"
                          onClick={() => handleIncreaseQuantity(item)}
                        >
                          <FaPlus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-muted">
            <div className="flex justify-between mb-6 text-[1.1rem] font-bold">
              <span className="text-foreground">Total Amount:</span>
              <span className="text-primary">₦{getTotalPrice().toLocaleString()}</span>
            </div>
            <Link 
              href="/checkout" 
              onClick={onClose}
              className="bg-primary hover:bg-primary-hover text-white flex items-center justify-center rounded-md font-semibold px-6 py-3 w-full text-center transition-colors" 
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

