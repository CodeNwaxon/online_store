'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FaHistory, FaTimes, FaCheckCircle, FaTrash } from 'react-icons/fa';

interface VendorSalesHistoryProps {
  userEmail: string | null;
  isCEO: boolean;
  inventoryCollection?: string;
  allowAll?: boolean;
}

export default function VendorSalesHistory({ userEmail, isCEO, inventoryCollection, allowAll = false }: VendorSalesHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [inventoryKeys, setInventoryKeys] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inventoryKeysRef = useRef<Set<string>>(new Set());

  const normalizeKey = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value).trim().toLowerCase();
  };

  const isHiddenForCurrentAdmin = (item: any) => {
    if (!userEmail) return false;
    const readBy = Array.isArray(item?.readBy) ? item.readBy : item?.readBy ? [item.readBy] : [];
    return readBy.includes(userEmail);
  };

  const clearVisibleHistory = async () => {
    if (sales.length === 0) {
      setShowClearConfirm(false);
      return;
    }

    try {
      const updates = new Map<string, any[]>();

      sales.forEach((sale) => {
        if (!sale.orderId || sale.itemIndex === undefined) return;
        const existing = updates.get(sale.orderId) || [];
        existing.push({ itemIndex: sale.itemIndex });
        updates.set(sale.orderId, existing);
      });

      const updatePromises = Array.from(updates.entries()).map(async ([orderId, entries]) => {
        const orderRef = doc(db, 'orders', orderId);
        const snapshot = await getDocs(collection(db, 'orders'));
        const matchingDoc = snapshot.docs.find((document) => document.id === orderId);
        if (!matchingDoc) return;

        const orderData = matchingDoc.data() as any;
        const currentItems = Array.isArray(orderData.items) ? orderData.items : [];

        const updatedItems = currentItems.map((item: any, index: number) => {
          const shouldMarkRead = entries.some((entry) => entry.itemIndex === index);
          if (!shouldMarkRead) return item;

          const currentReadBy = Array.isArray(item?.readBy) ? item.readBy : item?.readBy ? [item.readBy] : [];
          const nextReadBy = Array.from(new Set([...currentReadBy, userEmail || 'unknown-admin']));

          return {
            ...item,
            readBy: nextReadBy,
          };
        });

        await updateDoc(orderRef, { items: updatedItems });
      });

      await Promise.all(updatePromises);
      setSales([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error marking history as read:', error);
    }
  };

  const setInventoryKeysState = (keys: Set<string>) => {
    inventoryKeysRef.current = keys;
    setInventoryKeys(keys);
  };

  const matchesInventory = (item: any, activeKeys: Set<string> = inventoryKeysRef.current) => {
    if (!inventoryCollection) return true;

    const candidateKeys = [
      item.id,
      item.productId,
      item.product?.id,
      item.product?.productId,
      item.name,
      item.title,
      item.productName,
      item.product?.name,
      item.product?.title,
    ]
      .map(normalizeKey)
      .filter(Boolean);

    if (candidateKeys.length === 0) return false;

    const normalizedCandidates = candidateKeys.flatMap((key) => [
      key,
      key.replace(/[^a-z0-9]/g, ''),
    ]);

    return normalizedCandidates.some((candidate) => {
      if (!candidate) return false;
      return Array.from(activeKeys).some((inventoryKey) => {
        const normalizedInventoryKey = normalizeKey(inventoryKey).replace(/[^a-z0-9]/g, '');
        return normalizedInventoryKey === candidate || normalizedInventoryKey.includes(candidate) || candidate.includes(normalizedInventoryKey);
      });
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let unsubscribeOrders: (() => void) | undefined;
    setLoading(sales.length === 0);

    const loadInventoryKeys = async () => {
      if (!inventoryCollection) {
        if (!cancelled) setInventoryKeysState(new Set());
        return new Set<string>();
      }

      try {
        const snapshot = await getDocs(collection(db, inventoryCollection));
        const keys = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          const addKey = (value?: string | null) => {
            const normalized = normalizeKey(value);
            if (normalized) keys.add(normalized);
          };

          addKey(doc.id);
          addKey(data?.id);
          addKey(data?.name);
          addKey(data?.title);
          addKey(data?.productName);
        });

        if (!cancelled) setInventoryKeysState(keys);
        return keys;
      } catch (error) {
        console.error('Error loading inventory keys for history:', error);
        if (!cancelled) setInventoryKeysState(new Set());
        return new Set<string>();
      }
    };

    const q = query(collection(db, 'orders'), where('delivered', '==', true));

    loadInventoryKeys().then((keys) => {
      if (cancelled) return;

      unsubscribeOrders = onSnapshot(q, (snapshot) => {
        const deliveredItems: any[] = [];

        snapshot.docs.forEach((doc) => {
          const order = doc.data();
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any, itemIndex: number) => {
              if (isHiddenForCurrentAdmin(item)) return;

              if (matchesInventory(item, keys) && (isCEO || allowAll || !userEmail || !item.vendor || item.vendor === userEmail)) {
                deliveredItems.push({
                  ...item,
                  orderId: doc.id,
                  itemIndex,
                  orderDate: order.createdAt || order.updatedAt,
                  customerName: order.customerDetails?.name || 'Unknown',
                });
              }
            });
          }
        });

        deliveredItems.sort((a, b) => {
          const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
          const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
          return dateB - dateA;
        });

        if (!cancelled) {
          setSales(deliveredItems);
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }, (error) => {
        console.error('Error fetching vendor sales history:', error);
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [isOpen, userEmail, isCEO, allowAll, inventoryCollection]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-gray-400 font-semibold text-sm hover:text-gray-500 transition-colors"
      >
        Sales General History v
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-xl border border-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 md:p-5 border-b border-border bg-muted/30 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <FaHistory className="text-primary" /> Sales History
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Delivered items {isCEO ? 'across all vendors' : 'for your products'}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <FaTimes size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-h-[70vh]">
              {loading && !hasLoadedOnce ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-3">
                  <FaHistory size={40} className="text-border" />
                  <p className="font-bold">No sales history found.</p>
                  <p className="text-xs">Items appear here once they are marked as delivered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sales.map((sale, idx) => (
                    <div key={`${sale.orderId}-${idx}`} className="bg-muted/20 border border-border/50 rounded-lg p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                      <div className="flex items-start gap-4">
                        {sale.image ? (
                          <img src={sale.image} alt={sale.name} className="w-16 h-16 rounded-md object-cover border border-border" />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center border border-border">
                            <FaCheckCircle className="text-muted-foreground" size={24} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-foreground text-sm md:text-base">{sale.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Qty: <strong className="text-foreground">{sale.quantity}</strong></span>
                            <span>•</span>
                            <span>Size: <strong className="text-foreground uppercase">{sale.size || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Price: <strong className="text-foreground">₦{(sale.price || 0).toLocaleString()}</strong></span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-2 font-mono bg-background px-2 py-0.5 rounded border border-border inline-block">
                            Order: {sale.orderId.substring(0, 8)}... | Customer: {sale.customerName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-primary/10 text-primary px-3 py-2 rounded-md font-bold text-sm text-center md:text-right mt-2 md:mt-0 flex-shrink-0 border border-primary/20">
                        Total: ₦{((sale.price || 0) * (sale.quantity || 1)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 font-bold text-sm transition-colors"
              >
                <FaTrash size={14} /> Clear History View
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-background border border-border rounded-md hover:bg-muted font-bold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[3100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5">
            <h4 className="text-lg font-black text-foreground">Clear visible history?</h4>
            <p className="text-sm text-muted-foreground mt-2">
              This marks the currently shown entries as read and hides them from this history view going forward.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-md border border-border bg-background hover:bg-muted font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={clearVisibleHistory}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-semibold text-sm"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
