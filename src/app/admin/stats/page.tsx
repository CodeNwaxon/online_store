'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc, setDoc, deleteDoc, getDocs, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaChartLine, FaBoxOpen, FaChartPie, FaShoppingCart, FaCouch, FaBolt, FaArrowRight, FaSearch, FaPlus, FaMinus, FaChevronDown, FaTimes, FaHistory, FaTrash, FaLock, FaEye, FaUtensils } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AdminStatsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'stats' | 'inventory') || 'stats';
  const [view, setView] = useState<'stats' | 'inventory' | 'history'>(initialTab);
  const [products, setProducts] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [cosmetics, setCosmetics] = useState<any[]>([]);
  const [wears, setWears] = useState<any[]>([]);
  const [toiletKitchen, setToiletKitchen] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [cartOrders, setCartOrders] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchQueryInventory, setSearchQueryInventory] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [visibleInventory, setVisibleInventory] = useState(100);
  const [showPasskeyModal, setShowPasskeyModal] = useState<{ type: 'delete' | 'clear_all' | 'delete_visitor_month' | 'clear_all_visitors'; id?: string; monthKey?: string } | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Visitor state
  const [visitorData, setVisitorData] = useState<Record<string, number>>({});
  const [showVisitorOverlay, setShowVisitorOverlay] = useState(false);
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<string[]>([]);

  useEffect(() => {
    const hidden = localStorage.getItem('hidden_history_ids');
    if (hidden) {
      try {
        setHiddenHistoryIds(JSON.parse(hidden));
      } catch (e) {}
    }
  }, []);

  const hideHistory = (ids: string[]) => {
    const updated = [...hiddenHistoryIds, ...ids];
    setHiddenHistoryIds(updated);
    localStorage.setItem('hidden_history_ids', JSON.stringify(updated));
  };
  const [expandedHistoryMonth, setExpandedHistoryMonth] = useState<string | null>(null);

  // Ref to prevent auto-save feedback loop (flicker fix)
  const lastSavedSnapshotRef = useRef<string>('');

  // Check authentication state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return; // Don't set up listeners if not authenticated

    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats products listener error:", error);
    });

    const unsubSales = onSnapshot(collection(db, 'installments'), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats sales listener error:", error);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setCartOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((o: any) => o.type !== 'installment'));
    }, (error) => {
      console.warn("Stats orders listener error:", error);
    });

    const unsubHistory = onSnapshot(query(collection(db, 'stats_history'), orderBy('createdAt', 'desc')), (snap) => {
      setHistoryList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats history listener error:", error);
    });

    const unsubVisitors = onSnapshot(doc(db, 'visitors', 'monthly'), (snap) => {
      if (snap.exists()) {
        setVisitorData(snap.data() as Record<string, number>);
      } else {
        setVisitorData({});
      }
    }, (error) => {
      console.warn("Visitors listener error:", error);
    });

    const unsubFoods = onSnapshot(collection(db, 'foods'), (snap) => {
      setFoods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats foods listener error:", error);
    });

    const unsubCosmetics = onSnapshot(collection(db, 'cosmetics'), (snap) => {
      setCosmetics(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats cosmetics listener error:", error);
    });

    const unsubWears = onSnapshot(collection(db, 'wears'), (snap) => {
      setWears(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats wears listener error:", error);
    });

    const unsubToiletKitchen = onSnapshot(collection(db, 'toilet_kitchen'), (snap) => {
      setToiletKitchen(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats toilet_kitchen listener error:", error);
    });

    return () => { unsubProds(); unsubSales(); unsubOrders(); unsubHistory(); unsubVisitors(); unsubFoods(); unsubCosmetics(); unsubWears(); unsubToiletKitchen(); };
  }, [isAuthenticated]);

  // Helper to check if a date is within the current calendar month
  const isCurrentMonth = (dateVal: any) => {
    if (!dateVal) return false;
    let d: Date;
    if (typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else {
      d = new Date(dateVal);
    }
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Calculate Stats (Current Calendar Month Only)
  const completedInstallments = sales.filter(s => s.status === 'completed' && isCurrentMonth(s.updatedAt || s.createdAt));
  const cancelledInstallments = sales.filter(s => s.status === 'cleared' && s.refundDetails && isCurrentMonth(s.refundDetails.clearedAt || s.updatedAt || s.createdAt));
  const cartOrdersCurrentMonth = cartOrders.filter(o => isCurrentMonth(o.createdAt || o.updatedAt));

  const normalizeGroupValue = (value?: string | null) => (value || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const resolveProductFromItem = (item: any) => {
    if (!item?.id) return null;

    const foundProduct = products.find(p => p.id === item.id);
    if (foundProduct) return foundProduct;

    const foundFood = foods.find(f => f.id === item.id);
    if (foundFood) return foundFood;

    const foundCosmetic = cosmetics.find(c => c.id === item.id);
    if (foundCosmetic) return foundCosmetic;

    const foundWear = wears.find(w => w.id === item.id);
    if (foundWear) return foundWear;

    const foundToiletKitchen = toiletKitchen.find(t => t.id === item.id);
    if (foundToiletKitchen) return foundToiletKitchen;

    return null;
  };

  const getGroupName = (product: any, item: any) => {
    const groupCandidate = product?.group || product?.category || item?.group || item?.category || item?.productCategory || item?.collectionName || '';
    const normalized = normalizeGroupValue(groupCandidate);

    if (normalized === 'foods' || normalized === 'food') return 'FOODS';
    if (normalized === 'cosmetics' || normalized === 'cosmetic') return 'COSMETICS';
    if (normalized === 'wears' || normalized === 'wear') return 'WEARS';
    if (normalized === 'toiletkitchen' || normalized === 'toilet' || normalized === 'kitchen') return 'TOILET & KITCHEN';
    if (item?.id && (foods.some(f => f.id === item.id) || normalizeGroupValue(item?.category) === 'food')) return 'FOODS';
    if (item?.id && (cosmetics.some(c => c.id === item.id) || normalizeGroupValue(item?.category) === 'cosmetic')) return 'COSMETICS';
    if (item?.id && (wears.some(w => w.id === item.id) || normalizeGroupValue(item?.category) === 'wear')) return 'WEARS';
    if (item?.id && (toiletKitchen.some(t => t.id === item.id) || normalizeGroupValue(item?.category) === 'toiletkitchen')) return 'TOILET & KITCHEN';

    return (groupCandidate || 'OTHER').toString().toUpperCase();
  };

  const getMeasurementValue = (product: any, item: any, field: 'price' | 'cost') => {
    const measurementKey = item?.selectedMeasurement;
    if (measurementKey) {
      const measurements = product?.measurements;
      const costPrices = product?.measurementCostPrices;
      try {
        if (field === 'price' && measurements) {
          const parsed = JSON.parse(measurements);
          const value = Number(parsed[measurementKey]);
          if (!Number.isNaN(value) && value > 0) return value;
        }
        if (field === 'cost' && costPrices) {
          const parsed = JSON.parse(costPrices);
          const value = Number(parsed[measurementKey]);
          if (!Number.isNaN(value) && value > 0) return value;
        }
      } catch {
        // ignore malformed measurement payloads
      }
    }

    if (field === 'price') {
      const saleValue = item?.measurementPrice ?? product?.price ?? item?.price ?? item?.sellPrice ?? 0;
      const parsed = Number(saleValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const costValue = item?.rdpPrice ?? item?.costPrice ?? product?.measurementCostPrices ?? product?.rdpPrice ?? product?.costPrice ?? 0;
    const parsed = Number(costValue);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getItemCost = (product: any, item: any) => {
    const measurementCost = getMeasurementValue(product, item, 'cost');
    if (measurementCost > 0) return measurementCost;

    const costValue = product?.rdpPrice ?? product?.costPrice ?? item?.rdpPrice ?? item?.costPrice ?? 0;
    const parsed = Number(costValue);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getItemSellPrice = (product: any, item: any) => {
    const measurementPrice = getMeasurementValue(product, item, 'price');
    if (measurementPrice > 0) return measurementPrice;

    const saleValue = product?.price ?? item?.price ?? item?.sellPrice ?? 0;
    const parsed = Number(saleValue);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const createFallbackProduct = (item: any) => ({
    id: item?.id || item?.productId || item?.product?.id || `fallback-${Math.random().toString(36).slice(2, 8)}`,
    name: item?.name || item?.productName || 'Unknown Product',
    group: item?.group || item?.category || '',
    category: item?.category || item?.productCategory || '',
    price: item?.price || 0,
    rdpPrice: item?.rdpPrice || item?.costPrice || 0,
  });

  const cartRevenue = cartOrdersCurrentMonth.reduce((acc, order) => {
    if (!order?.items || !Array.isArray(order.items)) return acc;

    return acc + order.items.reduce((sum: number, item: any) => {
      const matchedProduct = resolveProductFromItem(item);
      const sellPrice = getItemSellPrice(matchedProduct || createFallbackProduct(item), item);
      return sum + (sellPrice * Number(item.quantity || 1));
    }, 0);
  }, 0);

  const installmentRevenue = completedInstallments.reduce((acc, s) => {
    const product = products.find(p => p.id === (s.productId || s.product?.id));
    const sellPrice = Number(s.totalAmountPaid || s.totalAmount || s.product?.price || product?.price || 0);
    return acc + sellPrice;
  }, 0);

  const cancelledRevenue = cancelledInstallments.reduce((acc, s) => acc + (s.refundDetails?.cancellationFee || 0), 0);

  const totalRevenue = cartRevenue + installmentRevenue;

  const revenueByGroup = [...completedInstallments, ...cartOrdersCurrentMonth].reduce((acc: any, s) => {
    let group = 'OTHER';
    let amount = 0;

    const isInstallment = s.productId || s.planMonths || s.payments || s.downPaymentPaid;

    if (isInstallment) {
      const liveProduct = products.find(p => p.id === (s.productId || s.product?.id));
      const groupName = liveProduct?.group || s.product?.group || s.productGroup || 'OTHER';
      group = groupName.toUpperCase();
      amount = s.totalAmountPaid || s.totalAmount || s.product?.price || 0;
      acc[group] = (acc[group] || 0) + amount;
    } else if (s.items && Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const matchedProduct = resolveProductFromItem(item);
        const itemGroup = getGroupName(matchedProduct || createFallbackProduct(item), item);
        const quantity = Number(item.quantity || 1);
        const sellPrice = getItemSellPrice(matchedProduct || createFallbackProduct(item), item);

        acc[itemGroup] = (acc[itemGroup] || 0) + (sellPrice * quantity);
      });
    }

    return acc;
  }, {});

  const rdpCostByGroup = [...completedInstallments, ...cartOrdersCurrentMonth].reduce((acc: any, s) => {
    let group = 'OTHER';
    let cost = 0;

    const isInstallment = s.productId || s.planMonths || s.payments || s.downPaymentPaid;

    if (isInstallment) {
      const liveProduct = products.find(p => p.id === (s.productId || s.product?.id));
      const groupName = liveProduct?.group || s.product?.group || s.productGroup || 'OTHER';
      group = groupName.toUpperCase();
      cost = liveProduct?.rdpPrice || s.product?.rdpPrice || 0;
      acc[group] = (acc[group] || 0) + cost;
    } else if (s.items && Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const matchedProduct = resolveProductFromItem(item);
        const itemGroup = getGroupName(matchedProduct || createFallbackProduct(item), item);
        const quantity = Number(item.quantity || 1);
        const itemCost = getItemCost(matchedProduct || createFallbackProduct(item), item) * quantity;

        acc[itemGroup] = (acc[itemGroup] || 0) + itemCost;
      });
    }

    return acc;
  }, {});

  const totalRdpCost = [...completedInstallments, ...cartOrdersCurrentMonth].reduce((acc: number, s: any) => {
    const isInstallment = s.productId || s.planMonths || s.payments || s.downPaymentPaid;

    if (isInstallment) {
      const liveProduct = products.find(p => p.id === (s.productId || s.product?.id));
      const cost = Number(liveProduct?.rdpPrice || s.product?.rdpPrice || liveProduct?.costPrice || s.product?.costPrice || 0);
      return acc + cost;
    }

    if (!s.items || !Array.isArray(s.items)) return acc;

    return acc + s.items.reduce((sum: number, item: any) => {
      const matchedProduct = resolveProductFromItem(item);
      const itemCost = getItemCost(matchedProduct || createFallbackProduct(item), item);
      return sum + (itemCost * Number(item.quantity || 1));
    }, 0);
  }, 0);

  const totalProfit = Math.max(0, totalRevenue - totalRdpCost);

  const activeAndCompletedInstallments = sales.filter(s => s.status !== 'cleared');
  const totalInstallmentDealsAmount = activeAndCompletedInstallments.reduce((acc, s) => acc + (s.totalAmount || s.product?.price || 0), 0);
  const totalInstallmentDealsRdpCost = activeAndCompletedInstallments.reduce((acc, s) => {
    const liveProduct = products.find(p => p.id === (s.productId || s.product?.id));
    const cost = liveProduct?.rdpPrice || s.product?.rdpPrice || 0;
    return acc + cost;
  }, 0);
  const totalInstallmentDealsProfit = Math.max(0, totalInstallmentDealsAmount - totalInstallmentDealsRdpCost);

  const totalCancelledDealsAmount = cancelledInstallments.reduce((acc, s) => acc + (s.totalAmount || s.product?.price || 0), 0);
  const totalCancelledDealsProfit = Math.max(0, cancelledInstallments.reduce((acc, s) => acc + (s.refundDetails?.cancellationFee || 0), 0));

  const salesCountByProduct = [...completedInstallments].reduce((acc: any, s) => {
    const pid = s.product?.id || s.productId;
    if (pid) acc[pid] = (acc[pid] || 0) + 1;
    return acc;
  }, {});

  function accSalesCount(pid: string, qty: number) {
    if (pid) salesCountByProduct[pid] = (salesCountByProduct[pid] || 0) + qty;
  }

  cartOrdersCurrentMonth.forEach(o => {
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        accSalesCount(item.id, item.quantity);
      });
    }
  });

  const allProducts = [...products, ...foods, ...cosmetics, ...wears, ...toiletKitchen];

  const topProducts = Object.entries(salesCountByProduct)
    .map(([id, count]) => {
      const matchedProduct = allProducts.find(p => p.id === id);
      return {
        product: matchedProduct || createFallbackProduct({ id, name: id, category: '', group: '' }),
        count: count as number
      };
    })
    .filter(item => item.product)
    .sort((a, b) => b.count - a.count);


  const matchesGroup = (product: any, groupName: string) => {
    const target = normalizeGroupValue(groupName);
    if (!target || !product) return false;

    if (target === 'foods' && foods.some(f => f.id === product.id)) return true;
    if (target === 'cosmetics' && cosmetics.some(c => c.id === product.id)) return true;
    if (target === 'wears' && wears.some(w => w.id === product.id)) return true;
    if (target === 'toiletkitchen' && toiletKitchen.some(t => t.id === product.id)) return true;

    const productGroup = normalizeGroupValue(product?.group || product?.category || '');
    const productCategory = normalizeGroupValue(product?.category || '');
    const productName = normalizeGroupValue(product?.name || '');
    const productCollection = normalizeGroupValue(product?.collectionName || product?.collection || '');

    const aliases = {
      foods: ['food', 'foods', 'foodmarket', 'grocery', 'grain', 'grains', 'meat', 'meats', 'oil', 'oli', 'seasoning', 'cookingseasoning', 'cereal', 'cereals', 'garin'],
      cosmetics: ['cosmetic', 'cosmetics', 'beauty', 'bodylotion', 'lotion', 'cream', 'skincare'],
      wears: ['wear', 'wears', 'fashion', 'apparel', 'clothing', 'shoes'],
      toiletkitchen: ['toiletkitchen', 'toilet', 'kitchen', 'bathroom', 'home', 'utensil', 'utensils'],
      electronics: ['electronics', 'electronic', 'gadgets', 'tech', 'phone', 'phones', 'laptop', 'laptops'],
      furniture: ['furniture', 'furnitures', 'homefurniture', 'chair', 'table', 'bed'],
    } as Record<string, string[]>;

    const allowed = aliases[target] || [target];

    if (allowed.includes(productGroup) || allowed.includes(productCategory) || allowed.includes(productCollection)) return true;
    if (target === 'foods' && productName.includes('food')) return true;

    return false;
  };

  const getTopGeneral = (limit: number) => {
    const items = topProducts.filter(item => {
      const id = item.product.id;
      return foods.find(f => f.id === id) ||
             cosmetics.find(c => c.id === id) ||
             wears.find(w => w.id === id) ||
             toiletKitchen.find(t => t.id === id) ||
             matchesGroup(item.product, 'FOODS') ||
             matchesGroup(item.product, 'COSMETICS') ||
             matchesGroup(item.product, 'WEARS') ||
             matchesGroup(item.product, 'TOILET & KITCHEN');
    });
    return items.slice(0, limit);
  };

  const getTopByGroup = (groupName: string, limit: number) => {
    const topTenGlobal = topProducts.slice(0, 10);
    return topTenGlobal
      .filter(item => item.product && matchesGroup(item.product, groupName))
      .slice(0, limit);
  };

  // Automatically save current month's calculated stats to the stats_history Firestore collection
  useEffect(() => {
    if (products.length === 0) return; // wait until data loads

    const now = new Date();
    const docId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dateLabel = `${monthNames[now.getMonth()]}, ${now.getFullYear()}`;

    const salesCount = completedInstallments.length + cartOrdersCurrentMonth.length;

    // Top 10 selling snapshot
    const top10SellingSnapshot = topProducts.slice(0, 10).map(item => ({
      name: item.product?.name || 'Unknown Product',
      count: item.count
    }));

    // Top 5 Electronics snapshot
    const top5ElectronicsSnapshot = getTopByGroup('ELECTRONICS', 5).map(item => ({
      name: item.product?.name || 'Unknown Product',
      count: item.count
    }));

    // Top 5 Furniture snapshot
    const top5FurnitureSnapshot = getTopByGroup('FURNITURE', 5).map(item => ({
      name: item.product?.name || 'Unknown Product',
      count: item.count
    }));

    // Top 5 General snapshot (Cosmetics, Wears, Toilet & Kitchen, Foods)
    const top5GeneralSnapshot = getTopGeneral(5).map(item => ({
      name: item.product?.name || 'Unknown Product',
      count: item.count
    }));

    // Top 5 for other groups snapshot
    const otherGroupsSnapshots = otherGroups.reduce((acc: any, g: string) => {
      acc[g] = getTopByGroup(g, 5).map(item => ({
        name: item.product?.name || 'Unknown Product',
        count: item.count
      }));
      return acc;
    }, {});

    // Groups revenue/profit array
    const groupsSnapshot = ['ELECTRONICS', 'FURNITURE', 'COSMETICS', 'WEARS', 'TOILET & KITCHEN', 'FOODS', ...otherGroups].map(group => {
      const rev = (revenueByGroup[group] || 0) + (revenueByGroup[group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()] || 0);
      const cost = (rdpCostByGroup[group] || 0) + (rdpCostByGroup[group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()] || 0);
      const profit = rev - cost;
      return { name: group, revenue: rev, profit };
    });

    // All purchased items snapshot
    const allPurchasedItemsMap = new Map();
    [...completedInstallments, ...cartOrdersCurrentMonth].forEach((s: any) => {
      const isInstallment = s.productId || s.planMonths || s.payments || s.downPaymentPaid;
      if (isInstallment) {
        const liveProduct = products.find(p => p.id === (s.productId || s.product?.id));
        const name = liveProduct?.name || s.product?.name || 'Unknown Installment';
        allPurchasedItemsMap.set(name, (allPurchasedItemsMap.get(name) || 0) + 1);
      } else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((item: any) => {
          allPurchasedItemsMap.set(item.name, (allPurchasedItemsMap.get(item.name) || 0) + item.quantity);
        });
      }
    });
    const allPurchasedItemsSnapshot = Array.from(allPurchasedItemsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const timer = setTimeout(async () => {
      // Create a fingerprint of current values to avoid re-saving identical data
      const snapshotFingerprint = JSON.stringify({
        revenue: totalRevenue, profit: totalProfit, cancelled: cancelledRevenue,
        sales: salesCount, groups: groupsSnapshot.map(g => `${g.name}:${g.revenue}:${g.profit}`),
      });

      // Skip save if values haven't changed (prevents onSnapshot feedback loop / flicker)
      if (snapshotFingerprint === lastSavedSnapshotRef.current) return;

      try {
        await setDoc(doc(db, 'stats_history', docId), {
          id: docId,
          date: dateLabel,
          revenue: totalRevenue,
          profit: totalProfit,
          cancelledInstallment: cancelledRevenue,
          sales: salesCount,
          groups: groupsSnapshot,
          topSelling: top10SellingSnapshot,
          topElectronics: top5ElectronicsSnapshot,
          topFurniture: top5FurnitureSnapshot,
          topGeneral: top5GeneralSnapshot,
          topOtherGroups: otherGroupsSnapshots,
          allPurchasedItems: allPurchasedItemsSnapshot,
          createdAt: now.toISOString()
        }, { merge: true });
        lastSavedSnapshotRef.current = snapshotFingerprint;
      } catch (err) {
        console.error("Error auto-updating stats history in Firestore:", err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [totalRevenue, totalProfit, cancelledRevenue, completedInstallments.length, cartOrdersCurrentMonth.length, products, revenueByGroup]);

  // Passkey Actions
  const handleActionWithPasskey = (type: 'delete' | 'clear_all' | 'delete_visitor_month' | 'clear_all_visitors', id?: string, monthKey?: string) => {
    setShowPasskeyModal({ type, id, monthKey });
    setPasskeyInput('');
  };

  // Visitor total count
  const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const totalVisitors = visitorData.total || 0;

  const verifyPasskey = async () => {
    setIsVerifying(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const correctPasskey = settingsDoc.data()?.passkey || 'admin1234';

      if (passkeyInput === correctPasskey) {
        if (showPasskeyModal?.type === 'delete' && showPasskeyModal.id) {
          hideHistory([showPasskeyModal.id]);
          toast.success('History record hidden successfully');
        } else if (showPasskeyModal?.type === 'clear_all') {
          hideHistory(historyList.map(item => item.id));
          toast.success('All history records hidden');
        } else if (showPasskeyModal?.type === 'delete_visitor_month' && showPasskeyModal.monthKey) {
          const currentYear = new Date().getFullYear();
          const monthKey = `${currentYear}_${showPasskeyModal.monthKey}`;
          await setDoc(doc(db, 'visitors', 'monthly'), { [monthKey]: 0 }, { merge: true });
          toast.success(`${showPasskeyModal.monthKey.charAt(0).toUpperCase() + showPasskeyModal.monthKey.slice(1)} visitors reset to 0`);
        } else if (showPasskeyModal?.type === 'clear_all_visitors') {
          // Reset total and all months for the current year
          const resetData: Record<string, number> = { total: 0 };
          const currentYear = new Date().getFullYear();
          MONTH_KEYS.forEach(key => { resetData[`${currentYear}_${key}`] = 0; });
          await setDoc(doc(db, 'visitors', 'monthly'), resetData);
          // Delete all visitor_ids docs so devices can be re-counted
          const visitorIdSnap = await getDocs(collection(db, 'visitor_ids'));
          for (const visitorDoc of visitorIdSnap.docs) {
            await deleteDoc(doc(db, 'visitor_ids', visitorDoc.id));
          }
          toast.success('All visitor data cleared. Count reset to 0.');
        }
        setShowPasskeyModal(null);
        setPasskeyInput('');
      } else {
        toast.error('Incorrect CEO Passkey');
      }
    } catch (err) {
      console.error("Verification failed:", err);
      toast.error('Authorization failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setUpdatingId(productId);
    try {
      await updateDoc(doc(db, 'products', productId), {
        quantity: newQuantity,
        updatedAt: new Date().toISOString()
      });
      toast.success('Quantity updated');
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInventory = products.filter(p => {
    const searchTerms = searchQueryInventory.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return true;

    const normalize = (str: string) => {
      if (!str) return '';
      return str.toLowerCase()
        .replace(/sh/g, 'ch')
        .replace(/s/g, 'c')
        .replace(/ph/g, 'f')
        .replace(/k/g, 'c')
        .replace(/\s/g, '');
    };

    return searchTerms.every(term => {
      const normTerm = normalize(term);
      const checkField = (fieldVal: string) => {
        if (!fieldVal) return false;
        const lowerVal = fieldVal.toLowerCase();
        const normVal = normalize(fieldVal);
        return lowerVal.includes(term) || normVal.includes(normTerm);
      };

      return (
        checkField(p.name) ||
        checkField(p.group || '') ||
        checkField(p.category || '') ||
        checkField(p.manufacturer || '')
      );
    });
  }).sort((a, b) => {
    const parseDate = (v: any) => { if (!v) return 0; if (typeof v?.toDate === 'function') return v.toDate().getTime(); return new Date(v).getTime() || 0; };
    return parseDate(b.updatedAt) - parseDate(a.updatedAt);
  });

  const uniqueCategoriesCount = new Set(products.map(p => p.category)).size;

  const otherGroups = Array.from(new Set(
    products
      .map(p => (p.group || '').trim().toUpperCase())
      .filter(g => g !== '' && g !== 'ELECTRONICS' && g !== 'FURNITURE' && g !== 'COSMETICS' && g !== 'WEARS' && g !== 'TOILET & KITCHEN' && g !== 'FOODS')
  ));

  // Dynamic top cards list
  const cardsList = [
    {
      id: 'revenue',
      title: 'Revenue',
      value: `₦${totalRevenue.toLocaleString()}`,
      sub: `Profit: ₦${totalProfit.toLocaleString()}`,
      iconBg: 'bg-green-100 text-green-600',
      icon: <FaChartLine size={18} className="md:size-[24px]" />
    },
    // Dynamic Group Cards
    ...['FOODS', 'ELECTRONICS', 'FURNITURE', 'COSMETICS', 'WEARS', 'TOILET & KITCHEN', ...otherGroups].map(group => {
      const rev = (revenueByGroup[group] || 0) + (revenueByGroup[group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()] || 0);
      const cost = (rdpCostByGroup[group] || 0) + (rdpCostByGroup[group.charAt(0).toUpperCase() + group.slice(1).toLowerCase()] || 0);
      const profit = rev - cost;
      const displayName = group.charAt(0).toUpperCase() + group.slice(1).toLowerCase();

      let icon = <FaBolt size={18} className="md:size-[24px]" />;
      let iconBg = 'bg-blue-100 text-blue-600';
      if (group === 'FURNITURE') {
        icon = <FaCouch size={18} className="md:size-[24px]" />;
        iconBg = 'bg-orange-100 text-orange-600';
      } else if (group === 'FOODS') {
        icon = <FaUtensils size={18} className="md:size-[24px]" />;
        iconBg = 'bg-emerald-100 text-emerald-600';
      } else if (group !== 'ELECTRONICS') {
        icon = <FaBoxOpen size={18} className="md:size-[24px]" />;
        iconBg = 'bg-teal-100 text-teal-600';
      }

      return {
        id: `group-${group}`,
        title: displayName,
        value: `₦${rev.toLocaleString()}`,
        sub: `Profit: ₦${profit.toLocaleString()}`,
        iconBg,
        icon
      };
    }),
    {
      id: 'cancelled',
      title: 'Cancelled Inst.',
      value: `₦${cancelledRevenue.toLocaleString()}`,
      sub: `Profit: ₦${cancelledRevenue.toLocaleString()}`,
      iconBg: 'bg-red-100 text-red-600',
      icon: <FaTimes size={18} className="md:size-[24px]" />
    },
    {
      id: 'sales',
      title: 'Sales',
      value: `${completedInstallments.length + cartOrdersCurrentMonth.length}`,
      sub: null,
      iconBg: 'bg-purple-100 text-purple-600',
      icon: <FaShoppingCart size={18} className="md:size-[24px]" />
    }
  ];

  return (
    <div className="space-y-10 pb-20">

      <header className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 md:p-6 md:rounded-xl border border-border shadow-sm">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-bold">Store Insights</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Track your performance and inventory.</p>
          <button
            onClick={() => setShowVisitorOverlay(true)}
            className="text-[10px] font-bold text-red-800 hover:underline mt-0.5 inline-flex items-center gap-1 transition-colors hover:text-red-600"
          >
            <FaEye size={10} /> Visitors: {totalVisitors}
          </button>
        </div>
        <div className="flex bg-muted p-0.5 md:p-1 rounded-md md:rounded-lg border border-border w-full md:w-auto gap-0.5 md:gap-1">
          <button
            onClick={() => setView('stats')}
            className={`flex-1 md:flex-none px-2 md:px-6 py-1.5 md:py-2 rounded-md font-bold text-[10px] md:text-sm transition-all whitespace-nowrap ${view === 'stats' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            <FaChartPie className="inline mr-1 md:mr-2 text-[10px] md:text-sm" /> Stats
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`flex-1 md:flex-none px-2 md:px-6 py-1.5 md:py-2 rounded-md font-bold text-[10px] md:text-sm transition-all whitespace-nowrap ${view === 'inventory' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            <FaBoxOpen className="inline mr-1 md:mr-2 text-[10px] md:text-sm" /> Inventory
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 md:flex-none px-2 md:px-6 py-1.5 md:py-2 rounded-md font-bold text-[10px] md:text-sm transition-all whitespace-nowrap ${view === 'history' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            <FaHistory className="inline mr-1 md:mr-2 text-[10px] md:text-sm" /> History
          </button>
        </div>
      </header>

      {view === 'stats' && (
        <div className="space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 px-3 md:px-0">
            {cardsList.map((card, index) => {
              const isLast = index === cardsList.length - 1;
              const isOdd = cardsList.length % 2 !== 0;
              const mobileSpanClass = (isLast && isOdd) ? 'col-span-2' : 'col-span-1';

              const isSales = card.id === 'sales';
              const paddingClass = isSales ? 'p-2 md:p-6' : 'p-3 md:p-6';

              return (
                <div
                  key={card.id}
                  className={`bg-card ${paddingClass} md:rounded-xl border border-border shadow-sm ${mobileSpanClass} md:col-span-1 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                      <div className={`p-1.5 md:p-3 ${card.iconBg} rounded-lg shrink-0`}>{card.icon}</div>
                      <h3 className="font-bold text-muted-foreground text-[0.6rem] md:text-sm uppercase tracking-tight truncate">{card.title}</h3>
                    </div>
                    <p className="text-base md:text-2xl font-black text-primary px-1 md:px-0 truncate">{card.value}</p>
                  </div>
                  {card.sub && (
                    <p className="text-[0.7rem] md:text-xs font-bold text-green-700 mt-1 truncate">{card.sub}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-3 md:px-0">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Installment Deals Total Volume</span>
                <h4 className="text-2xl font-black text-foreground">₦{totalInstallmentDealsAmount.toLocaleString()}</h4>
                <p className="text-xs font-bold text-green-700 mt-1">Profit: ₦{totalInstallmentDealsProfit.toLocaleString()}</p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Margin Profitability</span>
                  <span className="font-bold text-foreground">
                    {totalInstallmentDealsAmount > 0 ? Math.round((totalInstallmentDealsProfit / totalInstallmentDealsAmount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalInstallmentDealsAmount > 0 ? Math.min(100, Math.round((totalInstallmentDealsProfit / totalInstallmentDealsAmount) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-red-500" />
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Cancelled Installment Deals Volume</span>
                <h4 className="text-2xl font-black text-foreground">₦{totalCancelledDealsAmount.toLocaleString()}</h4>
                <p className="text-xs font-bold text-green-700 mt-1">Cancellation Profit: ₦{totalCancelledDealsProfit.toLocaleString()}</p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Cancellation Penalty Fee Profit Rate</span>
                  <span className="font-bold text-foreground">
                    {totalCancelledDealsAmount > 0 ? ((totalCancelledDealsProfit / totalCancelledDealsAmount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalCancelledDealsAmount > 0 ? Math.min(100, Math.round((totalCancelledDealsProfit / totalCancelledDealsAmount) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section className="bg-card p-4 md:p-8 md:rounded-xl border border-border shadow-sm">
              <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 underline decoration-primary decoration-4 underline-offset-8">Top 10 Selling Items</h2>
              <div className="space-y-4">
                {topProducts.slice(0, 10).map((item, i) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 md:p-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <span className="text-base md:text-lg font-black text-muted-foreground w-5 md:w-6">#{i + 1}</span>
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded border border-border overflow-hidden shrink-0">
                        {(item.product.images?.[0] || item.product.image) ? (
                          <Image src={item.product.images?.[0] || item.product.image} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <FaBoxOpen className="text-muted-foreground opacity-20" size={20} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/products?edit=${item.product.id}`} className="hover:underline">
                          <p className="font-bold text-xs md:text-sm truncate">{item.product.name}</p>
                        </Link>
                        <p className="text-[9px] md:text-[10px] uppercase text-muted-foreground">{item.product.group}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-primary text-xs md:text-base">{item.count} Sold</p>
                      <p className="text-[9px] md:text-[10px] text-muted-foreground">₦{(item.count * item.product.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-6 md:space-y-10">
              {['Electronics', 'Furniture', 'Cosmetics', 'Wears', 'Foods', 'Toilet & Kitchen'].map(group => {
                const topItems = getTopByGroup(group, 5);
                const allZero = topItems.length === 0 || topItems.every(item => item.count === 0);
                return (
                  <section key={group} className="bg-card p-4 md:p-8 md:rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">Top 5 {group}</h2>
                    {allZero ? (
                      <p className="text-xs md:text-sm text-muted-foreground italic">No Top 5 products found</p>
                    ) : (
                      <div className="space-y-3">
                        {topItems.map((item, i) => (
                          <div key={item.product.id} className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-muted-foreground">{i + 1}. {item.product.name}</span>
                            <span className="font-bold">{item.count} units</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'inventory' && (
        <section className="bg-card rounded-md md:rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-lg text-center md:text-left">Product Inventory</h2>
              <p className="text-[10px] md:text-xs text-muted-foreground text-center md:text-left">Update quantities directly or click to edit full details.</p>
            </div>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search inventory..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-border bg-background text-sm"
                value={searchQueryInventory}
                onChange={e => setSearchQueryInventory(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-3 text-muted-foreground size-3" />
            </div>
          </div>

          <div className="md:hidden divide-y divide-border">
            {filteredInventory.slice(0, visibleInventory).map(product => (
              <div key={product.id} className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative w-10 h-10 rounded-md border border-border overflow-hidden shrink-0">
                    {(product.images?.[0] || product.image) ? (
                      <Image src={product.images?.[0] || product.image} alt={product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FaBoxOpen className="text-muted-foreground opacity-20" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[0.8rem] leading-tight truncate" title={product.name}>{product.name}</p>
                    <p className="text-[0.65rem] text-muted-foreground">₦{product.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pl-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(product.id, (product.quantity || 0) - 1)}
                      disabled={updatingId === product.id}
                      className="size-7 flex items-center justify-center bg-muted rounded-full text-muted-foreground disabled:opacity-50"
                    >
                      <FaMinus size={10} />
                    </button>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                      className={`w-12 text-center py-1 rounded border-2 text-xs font-black outline-none transition-all ${product.quantity <= 5
                        ? 'border-secondary/30 bg-secondary/5 text-secondary'
                        : 'border-green-200 bg-green-50 text-green-700'
                        } focus:border-primary`}
                    />
                    <button
                      onClick={() => updateQuantity(product.id, (product.quantity || 0) + 1)}
                      disabled={updatingId === product.id}
                      className="size-7 flex items-center justify-center bg-muted rounded-full text-muted-foreground disabled:opacity-50"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>
                  <Link
                    href={`/admin/products?edit=${product.id}`}
                    className="flex items-center gap-1.5 text-primary text-xs font-bold hover:underline"
                  >
                    Edit <FaArrowRight size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-xs font-bold uppercase text-muted-foreground">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInventory.slice(0, visibleInventory).map(product => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-10 h-10 rounded-md border border-border overflow-hidden shrink-0">
                          {(product.images?.[0] || product.image) ? (
                            <Image src={product.images?.[0] || product.image} alt={product.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <FaBoxOpen className="text-muted-foreground opacity-20" size={20} />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-sm truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">{product.category}</td>
                    <td className="px-6 py-4 text-sm font-bold">₦{product.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, (product.quantity || 0) - 1)}
                          disabled={updatingId === product.id}
                          className="size-8 flex items-center justify-center bg-muted hover:bg-border rounded-full transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <FaMinus size={10} />
                        </button>
                        <input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                          className={`w-14 text-center py-1 rounded border-2 text-xs font-black outline-none transition-all ${product.quantity <= 5
                            ? 'border-secondary/30 bg-secondary/5 text-secondary'
                            : 'border-green-200 bg-green-50 text-green-700'
                            } focus:border-primary`}
                        />
                        <button
                          onClick={() => updateQuantity(product.id, (product.quantity || 0) + 1)}
                          disabled={updatingId === product.id}
                          className="size-8 flex items-center justify-center bg-muted hover:bg-border rounded-full transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <FaPlus size={10} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/products?edit=${product.id}`}
                        className="text-primary hover:bg-primary/10 p-2 rounded-full inline-flex items-center justify-center transition-colors"
                        title="Edit Full Details"
                      >
                        <FaArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInventory.length > visibleInventory && (
            <div className="text-center p-6 border-t border-border flex flex-col items-center justify-center gap-4">
              <div className="text-xs text-muted-foreground font-medium tracking-wide">
                Showing {Math.min(visibleInventory, filteredInventory.length)} of {filteredInventory.length} items
              </div>
              <button
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background hover:bg-muted text-foreground hover:text-primary px-4 py-2 text-xs md:text-sm font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-95 active:shadow-sm"
                onClick={() => setVisibleInventory(prev => prev + 40)}
              >
                <span>Load More Products</span>
                <FaChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-all duration-300 ease-out" />
              </button>
            </div>
          )}
        </section>
      )}

      {view === 'history' && (
        <section className="bg-card md:rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-4 md:p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-lg text-center md:text-left flex items-center justify-center md:justify-start gap-2">
                <FaHistory className="text-primary size-5" /> Store Performance History
              </h2>
              <p className="text-[10px] md:text-xs text-muted-foreground text-center md:text-left mt-0.5">
                Archived performance snapshots of completed months.
              </p>
            </div>
            {historyList.filter(item => !hiddenHistoryIds.includes(item.id)).length > 0 && (
              <button
                onClick={() => handleActionWithPasskey('clear_all')}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md md:rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-red-600/20"
              >
                Clear All History
              </button>
            )}
          </div>

          <div className="p-2 md:p-6 space-y-6">
            {historyList.filter(item => !hiddenHistoryIds.includes(item.id)).length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
                  <FaHistory size={28} />
                </div>
                <h3 className="font-black text-xl text-foreground uppercase tracking-tight">No History Found</h3>
                <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">
                  Monthly performance history cards will automatically generate at the start of each new month.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {historyList.filter(item => !hiddenHistoryIds.includes(item.id)).map((item) => (
                  <div
                    key={item.id}
                    className="bg-card border-2 border-border rounded-md md:rounded-xl p-2 md:p-8 shadow-sm relative overflow-hidden flex flex-col gap-6"
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary" />

                    <div className="flex justify-between items-center pb-4 border-b border-border/80">
                      <div>
                        <h3 className="hidden md:block text-base font-black text-foreground">{item.date}</h3>
                        <h3 className="md:hidden text-xs font-black text-foreground">{item.date}</h3>
                      </div>
                      <button
                        onClick={() => handleActionWithPasskey('delete', item.id)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105"
                        title="Delete record"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold uppercase tracking-wider">
                      <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 p-4 rounded-md md:rounded-lg">
                        <span className="block text-[8px] md:text-[9px] text-green-700/80 mb-1">Total Revenue</span>
                        <strong className="text-xs md:text-base text-green-600 font-black">₦{(item.revenue || 0).toLocaleString()}</strong>
                      </div>
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-md md:rounded-lg">
                        <span className="block text-[8px] md:text-[9px] text-blue-700/80 mb-1">Total Profit</span>
                        <strong className="text-xs md:text-base text-blue-600 font-black">₦{(item.profit || 0).toLocaleString()}</strong>
                      </div>
                      <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-4 rounded-md md:rounded-lg">
                        <span className="block text-[8px] md:text-[9px] text-red-700/80 mb-1">Cancelled Installments</span>
                        <strong className="text-xs md:text-base text-red-600 font-black">₦{(item.cancelledInstallment || 0).toLocaleString()}</strong>
                      </div>
                      <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 p-4 rounded-md md:rounded-lg">
                        <span className="block text-[8px] md:text-[9px] text-purple-700/80 mb-1">Completed Sales</span>
                        <strong className="text-xs md:text-base text-purple-600 font-black">{item.sales || 0} Units</strong>
                      </div>
                    </div>

                    {item.groups && item.groups.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Group Sales & Profits</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[9px] md:text-xs">
                          {item.groups.map((g: any, i: number) => (
                            <div key={i} className="bg-muted/40 p-3 rounded-md md:rounded-lg border border-border/40">
                              <span className="block text-[8px] font-bold text-muted-foreground mb-0.5">{g.name}</span>
                              <div className="font-bold text-foreground">Rev: <span className="font-black">₦{(g.revenue || 0).toLocaleString()}</span></div>
                              <div className="text-green-700 font-bold">Profit: <span className="font-black">₦{(g.profit || 0).toLocaleString()}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-dashed border-border/80">
                      {item.topSelling && item.topSelling.length > 0 && (() => {
                        const allZero = item.topSelling.every((prod: any) => prod.count === 0);
                        return (
                          <div className="bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 space-y-3">
                            <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <FaShoppingCart className="text-purple-600 size-3" /> Top 10 Selling Products
                            </h4>
                            {allZero ? (
                              <p className="text-[9px] md:text-xs text-muted-foreground italic">No Top 10 products found</p>
                            ) : (
                              <ol className="list-decimal pl-4 space-y-1.5 text-[9px] md:text-xs font-bold text-foreground/80">
                                {item.topSelling.map((prod: any, idx: number) => (
                                  <li key={idx} className="leading-tight">
                                    <span className="text-foreground font-black">{prod.name}</span>
                                    <span className="text-muted-foreground font-normal"> ({prod.count} sold)</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })()}

                      {item.topGeneral && item.topGeneral.length > 0 && (() => {
                        const allZero = item.topGeneral.every((prod: any) => prod.count === 0);
                        return (
                          <div className="bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 space-y-3">
                            <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <FaBoxOpen className="text-teal-600 size-3" /> Top 5 General
                            </h4>
                            {allZero ? (
                              <p className="text-[9px] md:text-xs text-muted-foreground italic">No Top 5 general products found</p>
                            ) : (
                              <ol className="list-decimal pl-4 space-y-1.5 text-[9px] md:text-xs font-bold text-foreground/80">
                                {item.topGeneral.map((prod: any, idx: number) => (
                                  <li key={idx} className="leading-tight">
                                    <span className="text-foreground font-black">{prod.name}</span>
                                    <span className="text-muted-foreground font-normal"> ({prod.count} sold)</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })()}

                      {item.topElectronics && item.topElectronics.length > 0 && (() => {
                        const allZero = item.topElectronics.every((prod: any) => prod.count === 0);
                        return (
                          <div className="bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 space-y-3">
                            <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <FaBolt className="text-blue-600 size-3" /> Top 5 Electronics
                            </h4>
                            {allZero ? (
                              <p className="text-[9px] md:text-xs text-muted-foreground italic">No Top 5 products found</p>
                            ) : (
                              <ol className="list-decimal pl-4 space-y-1.5 text-[9px] md:text-xs font-bold text-foreground/80">
                                {item.topElectronics.map((prod: any, idx: number) => (
                                  <li key={idx} className="leading-tight">
                                    <span className="text-foreground font-black">{prod.name}</span>
                                    <span className="text-muted-foreground font-normal"> ({prod.count} sold)</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })()}

                      {item.topFurniture && item.topFurniture.length > 0 && (() => {
                        const allZero = item.topFurniture.every((prod: any) => prod.count === 0);
                        return (
                          <div className="bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 space-y-3">
                            <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                              <FaCouch className="text-orange-600 size-3" /> Top 5 Furniture
                            </h4>
                            {allZero ? (
                              <p className="text-[9px] md:text-xs text-muted-foreground italic">No Top 5 products found</p>
                            ) : (
                              <ol className="list-decimal pl-4 space-y-1.5 text-[9px] md:text-xs font-bold text-foreground/80">
                                {item.topFurniture.map((prod: any, idx: number) => (
                                  <li key={idx} className="leading-tight">
                                    <span className="text-foreground font-black">{prod.name}</span>
                                    <span className="text-muted-foreground font-normal"> ({prod.count} sold)</span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        );
                      })()}

                      {item.topOtherGroups && Object.keys(item.topOtherGroups).length > 0 && (
                        <>
                          {Object.entries(item.topOtherGroups).map(([groupName, prodList]: [string, any]) => {
                            const allZero = !prodList || prodList.length === 0 || prodList.every((prod: any) => prod.count === 0);
                            return (
                              <div key={groupName} className="bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 space-y-3">
                                <h4 className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                  <FaBoxOpen className="text-teal-600 size-3" /> Top 5 {groupName.charAt(0).toUpperCase() + groupName.slice(1).toLowerCase()}
                                </h4>
                                {allZero ? (
                                  <p className="text-[9px] md:text-xs text-muted-foreground italic">No Top 5 products found</p>
                                ) : (
                                  <ol className="list-decimal pl-4 space-y-1.5 text-[9px] md:text-xs font-bold text-foreground/80">
                                    {prodList.map((prod: any, idx: number) => (
                                      <li key={idx} className="leading-tight">
                                        <span className="text-foreground font-black">{prod.name}</span>
                                        <span className="text-muted-foreground font-normal"> ({prod.count} sold)</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                    
                    <div className="mt-2 border-t border-dashed border-border/80 pt-4">
                      <button
                        onClick={() => setExpandedHistoryMonth(expandedHistoryMonth === item.id ? null : item.id)}
                        className="text-sm font-bold text-primary flex items-center gap-2 hover:underline focus:outline-none"
                      >
                        Sales General History <FaChevronDown className={`transition-transform ${expandedHistoryMonth === item.id ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {expandedHistoryMonth === item.id && (
                        <div className="mt-4 bg-muted/20 p-4 rounded-md md:rounded-lg border border-border/40 max-h-[300px] overflow-y-auto">
                          <h4 className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">All Purchased Items</h4>
                          {item.allPurchasedItems && item.allPurchasedItems.length > 0 ? (
                            <ul className="space-y-2 text-xs">
                              {item.allPurchasedItems.map((prod: any, idx: number) => (
                                <li key={idx} className="flex justify-between items-center bg-card p-2 rounded-md border border-border/50">
                                  <span className="font-bold text-foreground truncate mr-2">{prod.name}</span>
                                  <span className="text-muted-foreground font-black bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{prod.count} qty</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No detailed purchase history available for this month.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* VISITOR OVERLAY MODAL */}
      {showVisitorOverlay && (
        <div className="fixed inset-0 z-[2500] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
                  <FaEye className="text-red-800" size={14} /> Visitor Breakdown
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total: <span className="font-black text-red-800">{totalVisitors}</span> unique visitors</p>
              </div>
              <button
                onClick={() => setShowVisitorOverlay(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="p-4 space-y-1 max-h-[400px] overflow-y-auto">
              {MONTH_KEYS.map((month) => {
                const currentYear = new Date().getFullYear();
                const monthKey = `${currentYear}_${month}`;
                return (
                  <div key={month} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground capitalize">{month}:</span>
                      <span className="text-xs font-black text-primary">{visitorData[monthKey] || 0}</span>
                    </div>
                    <button
                      onClick={() => handleActionWithPasskey('delete_visitor_month', undefined, month)}
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      title={`Reset ${month}`}
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-muted/10">
              <button
                onClick={() => handleActionWithPasskey('clear_all_visitors')}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-md shadow-red-600/20"
              >
                Clear All Visitors
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasskeyModal && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border-2 border-red-500/20 animate-in slide-in-from-bottom duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaLock size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">
              {showPasskeyModal.type === 'clear_all' ? 'Confirm Global Clear'
                : showPasskeyModal.type === 'clear_all_visitors' ? 'Clear All Visitors'
                  : showPasskeyModal.type === 'delete_visitor_month' ? `Reset ${showPasskeyModal.monthKey?.charAt(0).toUpperCase()}${showPasskeyModal.monthKey?.slice(1)}`
                    : 'Confirm Deletion'}
            </h3>
            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-4">
              Warning: Action Cannot Be Undone
            </p>
            <p className="text-muted-foreground mb-6 text-xs font-semibold leading-relaxed">
              {showPasskeyModal.type === 'clear_all'
                ? 'Are you absolutely sure you want to permanently delete all archived history records? Enter the CEO passcode below to authorize.'
                : showPasskeyModal.type === 'clear_all_visitors'
                  ? 'This will reset all monthly visitor counts to 0 and clear all tracked visitor IDs so counting starts fresh. Enter the CEO passcode to authorize.'
                  : showPasskeyModal.type === 'delete_visitor_month'
                    ? `This will reset the visitor count for ${showPasskeyModal.monthKey} to 0. Enter the CEO passcode to authorize.`
                    : 'Are you absolutely sure you want to permanently delete this monthly history snapshot? Enter the CEO passcode below to authorize.'
              }
            </p>
            <input
              type="password"
              className="w-full bg-muted border border-border rounded-2xl p-4 text-center text-xl font-black tracking-[1em] mb-6 focus:border-red-600 outline-none transition-all shadow-inner"
              placeholder="••••"
              autoFocus
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPasskey()}
            />
            <div className="flex gap-4">
              <button
                onClick={() => { setShowPasskeyModal(null); setPasskeyInput(''); }}
                className="flex-1 py-3 font-bold text-xs uppercase border border-border rounded-2xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isVerifying}
                onClick={verifyPasskey}
                className={`flex-1 py-3 font-bold text-xs uppercase bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20 transition-all ${isVerifying ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
              >
                {isVerifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStats() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading stats...</div>}>
      <AdminStatsContent />
    </Suspense>
  );
}
