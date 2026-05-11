'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FaChartLine, FaBoxOpen, FaChartPie, FaShoppingCart, FaCouch, FaBolt, FaArrowRight } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminStats() {
  const [view, setView] = useState<'stats' | 'inventory'>('stats');
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Stats products listener error:", error);
    });
    // Assuming a 'sales' or 'orders' collection exists or we derive from completed installments
    const unsubSales = onSnapshot(collection(db, 'installments'), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((s: any) => s.status === 'completed' || s.status === 'cleared'));
    }, (error) => {
      console.warn("Stats sales listener error:", error);
    });
    return () => { unsubProds(); unsubSales(); };
  }, []);

  // Calculate Stats
  const totalRevenue = sales.reduce((acc, s) => acc + (s.product?.price || 0), 0);

  const revenueByGroup = sales.reduce((acc: any, s) => {
    const group = s.product?.group || 'Other';
    acc[group] = (acc[group] || 0) + (s.product?.price || 0);
    return acc;
  }, {});

  const salesCountByProduct = sales.reduce((acc: any, s) => {
    const pid = s.product?.id;
    if (pid) acc[pid] = (acc[pid] || 0) + 1;
    return acc;
  }, {});

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

  return (
    <div className="space-y-10">
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
              <p className="text-base md:text-2xl font-black text-primary">{sales.length}</p>
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
                        <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs md:text-sm truncate">{item.product.name}</p>
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
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="font-bold text-lg">Product Inventory</h2>
            <p className="text-xs text-muted-foreground">Click any product to update its quantity.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 text-[10px] md:text-xs font-bold uppercase text-muted-foreground">
                  <th className="px-3 md:px-6 py-4">Product</th>
                  <th className="px-3 md:px-6 py-4 hidden sm:table-cell">Category</th>
                  <th className="px-3 md:px-6 py-4">Price</th>
                  <th className="px-3 md:px-6 py-4 text-center">Stock</th>
                  <th className="px-3 md:px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.sort((a, b) => a.quantity - b.quantity).map(product => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-md border border-border overflow-hidden shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <span className="font-bold text-xs md:text-sm truncate max-w-[100px] md:max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-semibold text-muted-foreground hidden sm:table-cell">{product.category}</td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-bold">₦{product.price.toLocaleString()}</td>
                    <td className="px-3 md:px-6 py-4 text-center">
                      <span className={`px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black ${product.quantity <= 5 ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-green-100 text-green-700'}`}>
                        {product.quantity} <span className="hidden sm:inline">Left</span>
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 text-right">
                      <Link
                        href={`/admin/products?edit=${product.id}`}
                        className="text-primary hover:underline text-[10px] md:text-xs font-bold flex items-center justify-end gap-1"
                      >
                        <span className="hidden sm:inline">Update</span> <FaArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
