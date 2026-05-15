'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { FaChartLine, FaBoxOpen, FaChartPie, FaShoppingCart, FaCouch, FaBolt, FaArrowRight, FaSearch, FaPlus, FaMinus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AdminStatsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'stats' | 'inventory') || 'stats';
  const [view, setView] = useState<'stats' | 'inventory'>(initialTab);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [cartOrders, setCartOrders] = useState<any[]>([]);
  const [searchQueryInventory, setSearchQueryInventory] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [visibleInventory, setVisibleInventory] = useState(25);

  useEffect(() => {
    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats products listener error:", error);
    });
    // Assuming a 'sales' or 'orders' collection exists or we derive from completed installments
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

    return () => { unsubProds(); unsubSales(); unsubOrders(); };
  }, []);

  // Calculate Stats
  const completedInstallments = sales.filter(s => s.status === 'completed');
  const cancelledInstallments = sales.filter(s => s.status === 'cleared' && s.refundDetails); // 'cleared' often means refund processed
  
  const cartRevenue = cartOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const installmentRevenue = completedInstallments.reduce((acc, s) => acc + (s.totalAmountPaid || s.totalAmount || s.product?.price || 0), 0);
  const cancelledRevenue = cancelledInstallments.reduce((acc, s) => acc + (s.refundDetails?.cancellationFee || 0), 0);
  
  const totalRevenue = cartRevenue + installmentRevenue + cancelledRevenue;

  const revenueByGroup = [...completedInstallments, ...cartOrders].reduce((acc: any, s) => {
    // For installments, product group might be in s.product.group. For orders, we'd need to check items.
    let group = 'Other';
    let amount = 0;
    
    if (s.product?.group) {
      group = s.product.group;
      amount = s.totalAmountPaid || s.totalAmount || s.product.price || 0;
      acc[group] = (acc[group] || 0) + amount;
    } else if (s.items && Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        let itemGroup = 'Other';
        const foundProduct = products.find(p => p.id === item.id);
        if (foundProduct?.group) itemGroup = foundProduct.group;
        acc[itemGroup] = (acc[itemGroup] || 0) + (item.price * item.quantity);
      });
    }
    
    return acc;
  }, {});

  const salesCountByProduct = [...completedInstallments].reduce((acc: any, s) => {
    const pid = s.product?.id || s.productId;
    if (pid) acc[pid] = (acc[pid] || 0) + 1;
    return acc;
  }, {});
  
  cartOrders.forEach(o => {
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        accSalesCount(item.id, item.quantity);
      });
    }
  });
  
  function accSalesCount(pid: string, qty: number) {
    if (pid) salesCountByProduct[pid] = (salesCountByProduct[pid] || 0) + qty;
  }

  const topProducts = Object.entries(salesCountByProduct)
    .map(([id, count]) => ({
      product: products.find(p => p.id === id),
      count: count as number
    }))
    .filter(item => item.product)
    .sort((a, b) => b.count - a.count);

  const getTopByGroup = (groupName: string, limit: number) => {
    return topProducts
      .filter(item => item.product.group === groupName)
      .slice(0, limit);
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

  const filteredInventory = products.filter(p => 
    p.name.toLowerCase().includes(searchQueryInventory.toLowerCase())
  ).sort((a, b) => {
    const parseDate = (v: any) => { if (!v) return 0; if (typeof v?.toDate === 'function') return v.toDate().getTime(); return new Date(v).getTime() || 0; };
    return parseDate(b.updatedAt) - parseDate(a.updatedAt);
  });

  const uniqueCategoriesCount = new Set(products.map(p => p.category)).size;

  return (
    <div className="space-y-10 pb-20">
      <Toaster position="top-center" />
      <header className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 md:p-6 md:rounded-xl border border-border shadow-sm">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-bold">Store Insights</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Track your performance and inventory.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg border border-border w-full md:w-auto">
          <button
            onClick={() => setView('stats')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${view === 'stats' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            <FaChartPie className="inline mr-2" /> Stats
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-md font-bold text-xs md:text-sm transition-all ${view === 'inventory' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            <FaBoxOpen className="inline mr-2" /> Inventory
          </button>
        </div>
      </header>

      {view === 'stats' ? (
        <div className="space-y-10">
          {/* TOP CARDS */}
          {/* TOP CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 px-3 md:px-0">
            <div className="bg-card p-3 md:p-6 md:rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                <div className="p-1.5 md:p-3 bg-green-100 text-green-600 rounded-lg"><FaChartLine size={18} className="md:size-[24px]" /></div>
                <h3 className="font-bold text-muted-foreground text-[0.6rem] md:text-sm uppercase tracking-tight">Revenue</h3>
              </div>
              <p className="text-base md:text-2xl font-black text-primary">₦{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-card p-3 md:p-6 md:rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                <div className="p-1.5 md:p-3 bg-blue-100 text-blue-600 rounded-lg"><FaBolt size={18} className="md:size-[24px]" /></div>
                <h3 className="font-bold text-muted-foreground text-[0.6rem] md:text-sm uppercase tracking-tight">Electronics</h3>
              </div>
              <p className="text-base md:text-2xl font-black text-primary">₦{(revenueByGroup['Electronics'] || 0).toLocaleString()}</p>
            </div>
            <div className="bg-card p-3 md:p-6 md:rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                <div className="p-1.5 md:p-3 bg-orange-100 text-orange-600 rounded-lg"><FaCouch size={18} className="md:size-[24px]" /></div>
                <h3 className="font-bold text-muted-foreground text-[0.6rem] md:text-sm uppercase tracking-tight">Furniture</h3>
              </div>
              <p className="text-base md:text-2xl font-black text-primary">₦{(revenueByGroup['Furniture'] || 0).toLocaleString()}</p>
            </div>
            <div className="bg-card p-3 md:p-6 md:rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4">
                <div className="p-1.5 md:p-3 bg-purple-100 text-purple-600 rounded-lg"><FaShoppingCart size={18} className="md:size-[24px]" /></div>
                <h3 className="font-bold text-muted-foreground text-[0.6rem] md:text-sm uppercase tracking-tight">Sales</h3>
              </div>
              <p className="text-base md:text-2xl font-black text-primary">{completedInstallments.length + cartOrders.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* TOP 10 OVERALL */}
            <section className="bg-card p-4 md:p-8 md:rounded-xl border border-border shadow-sm">
              <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2 underline decoration-primary decoration-4 underline-offset-8">Top 10 Selling Items</h2>
              <div className="space-y-4">
                {topProducts.slice(0, 10).map((item, i) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 md:p-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <span className="text-base md:text-lg font-black text-muted-foreground w-5 md:w-6">#{i + 1}</span>
                      <div className="relative w-10 h-10 md:w-12 md:h-12 rounded border border-border overflow-hidden shrink-0">
                        <Image src={item.product.images?.[0] || item.product.image} alt={item.product.name} fill className="object-cover" />
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

            {/* CATEGORY BREAKDOWN */}
            <div className="space-y-6 md:space-y-10">
              <section className="bg-card p-4 md:p-8 md:rounded-xl border border-border shadow-sm">
                <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">Top 5 Electronics</h2>
                <div className="space-y-3">
                  {getTopByGroup('Electronics', 5).map((item, i) => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-muted-foreground">{i + 1}. {item.product.name}</span>
                      <span className="font-bold">{item.count} units</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-card p-4 md:p-8 md:rounded-xl border border-border shadow-sm">
                <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">Top 5 Furniture</h2>
                <div className="space-y-3">
                  {getTopByGroup('Furniture', 5).map((item, i) => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-muted-foreground">{i + 1}. {item.product.name}</span>
                      <span className="font-bold">{item.count} units</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        /* INVENTORY VIEW */
        <section className="bg-card md:rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-lg text-center md:text-left">Product Inventory</h2>
              <p className="text-[10px] md:text-xs text-muted-foreground text-center md:text-left">Update quantities directly or click to edit full details.</p>
              <div className="flex items-center justify-center md:justify-start gap-2 text-[9px] text-muted-foreground mt-1 md:hidden font-medium">
                <span>Products ({products.length})</span>
                <span className="opacity-40">•</span>
                <span>Categories ({uniqueCategoriesCount})</span>
              </div>
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

          {/* ── MOBILE CARD LIST (2-row layout) ── */}
          <div className="md:hidden divide-y divide-border">
            {filteredInventory.slice(0, visibleInventory).map(product => (
              <div key={product.id} className="p-3 flex flex-col gap-2">
                {/* Row 1: Image + Name */}
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative w-10 h-10 rounded-md border border-border overflow-hidden shrink-0">
                    <Image src={product.images?.[0] || product.image} alt={product.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[0.8rem] leading-tight truncate" title={product.name}>{product.name}</p>
                    <p className="text-[0.65rem] text-muted-foreground">₦{product.price.toLocaleString()}</p>
                  </div>
                </div>
                {/* Row 2: Quantity controls + Action */}
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
                      className={`w-12 text-center py-1 rounded border-2 text-xs font-black outline-none transition-all ${
                        product.quantity <= 5
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

          {/* ── DESKTOP TABLE ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-xs font-bold uppercase text-muted-foreground">
                  <th className="px-6 py-4">Product <span className="hidden md:inline">({products.length})</span></th>
                  <th className="px-6 py-4">Category <span className="hidden md:inline">({uniqueCategoriesCount})</span></th>
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
                          <Image src={product.images?.[0] || product.image} alt={product.name} fill className="object-cover" />
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
                          className={`w-14 text-center py-1 rounded border-2 text-xs font-black outline-none transition-all ${
                            product.quantity <= 5
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
            <div className="p-4 md:p-6 border-t border-border bg-muted/5 flex justify-center">
              <button 
                onClick={() => setVisibleInventory(prev => prev + 25)}
                className="px-8 py-2 bg-primary text-white rounded-full font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Load More Products ({filteredInventory.length - visibleInventory} remaining)
              </button>
            </div>
          )}
        </section>
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
