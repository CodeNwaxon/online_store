'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  where
} from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { 
  FaShoppingBag, 
  FaSearch, 
  FaFilter, 
  FaTrash, 
  FaCheckCircle, 
  FaUser, 
  FaPhoneAlt, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaCreditCard, 
  FaTimes, 
  FaArrowRight, 
  FaLock,
  FaReceipt,
  FaPrint
} from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'normal' | 'installment'>('all');
  const [showPasskeyModal, setShowPasskeyModal] = useState<string | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [visibleCards, setVisibleCards] = useState(25);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const markAsRead = async (order: any) => {
    if (order.isNew) {
      await updateDoc(doc(db, 'orders', order.id), { isNew: false });
    }
    setSelectedOrder(order);
  };

  const verifyPasskey = async () => {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    const correctPasskey = settingsDoc.data()?.passkey || 'admin1234';

    if (passkeyInput === correctPasskey) {
      if (confirmDelete) {
        await deleteDoc(doc(db, 'orders', confirmDelete));
        toast.success('Order deleted successfully');
      }
      setShowPasskeyModal(null);
      setConfirmDelete(null);
      setPasskeyInput('');
    } else {
      toast.error('Incorrect CEO Passkey');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filter === 'all' || order.type === filter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <FaShoppingBag className="text-primary" /> Store Orders
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all online payments and completed installments.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center justify-center md:justify-end">
          <div className="relative flex-1 sm:w-64 w-full">
            <input 
              type="text" 
              placeholder="Search by name or product..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:border-primary outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-3.5 top-3.5 text-muted-foreground size-4" />
          </div>

          <div className="flex bg-muted p-1 rounded-xl border border-border w-full sm:w-auto justify-center">
            {(['all', 'normal', 'installment'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-card'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-bold animate-pulse">Fetching orders...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.slice(0, visibleCards).map(order => (
            <div 
              key={order.id}
              onClick={() => markAsRead(order)}
              className={`group relative bg-card p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                order.type === 'installment' 
                  ? 'border-primary/20 hover:border-primary/50' 
                  : 'border-border hover:border-border'
              } ${order.isNew ? 'ring-2 ring-green-500 animate-[pulse_3s_infinite]' : ''}`}
            >
              {order.isNew && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-green-500/20 z-10">
                  NEW ORDER
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    order.type === 'installment' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {order.type === 'installment' ? <FaCreditCard /> : <FaShoppingBag />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight truncate max-w-[150px]">{order.customerName}</h3>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {order.type === 'installment' ? 'Installment Completed' : 'Online Payment'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${order.type === 'installment' ? 'text-muted-foreground' : 'text-green-700'}`}>
                    ₦{order.totalAmount?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-bold">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                {order.items.slice(0, 2).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                    <div className="relative w-10 h-10 rounded border border-border overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                    </div>
                    <span className="text-xs font-bold truncate flex-1">{item.name}</span>
                    <span className="text-[10px] font-black text-muted-foreground">x{item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-[10px] text-muted-foreground font-bold text-center">+{order.items.length - 2} more items</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FaMapMarkerAlt size={12} />
                  <span className="text-[10px] font-bold truncate max-w-[120px]">{order.address}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(order.id);
                  }}
                  className="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
            ))}
          </div>

          {visibleCards < filteredOrders.length && (
            <div className="flex justify-center mt-8 mb-4">
              <button
                onClick={() => setVisibleCards(prev => prev + 25)}
                className="px-6 py-3 bg-muted text-foreground hover:bg-border rounded-md font-bold transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-32 text-center bg-card border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <FaShoppingBag size={40} />
          </div>
          <h2 className="text-xl font-bold">No orders found</h2>
          <p className="text-muted-foreground mt-2">Any completed payments will appear here.</p>
        </div>
      )}

      {/* ── ORDER DETAILS OVERLAY ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            {/* Header */}
            <div className={`p-8 ${selectedOrder.type === 'installment' ? 'bg-primary text-white' : 'bg-foreground text-background'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Order Details
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      selectedOrder.type === 'installment' ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}>
                      {selectedOrder.type}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-black">{selectedOrder.customerName}</h2>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FaTimes size={24} /></button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm opacity-90 font-bold">
                <div className="flex items-center gap-2"><FaCalendarAlt /> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                <div className="flex items-center gap-2"><FaCreditCard /> ID: {selectedOrder.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Customer Info */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Customer Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm"><FaPhoneAlt /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Phone</p>
                      <p className="font-bold text-sm">{selectedOrder.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm"><FaEnvelope /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                      <p className="font-bold text-sm truncate max-w-[150px]">{selectedOrder.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl md:col-span-2">
                    <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm"><FaMapMarkerAlt /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Shipping Address</p>
                      <p className="font-bold text-sm">{selectedOrder.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Ordered Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-6 bg-muted/20 p-4 rounded-2xl border border-border/50">
                      <div className="relative w-16 h-16 rounded-xl border border-border overflow-hidden shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="120px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-black text-sm truncate">{item.name}</h5>
                        <p className="text-xs text-muted-foreground font-bold">₦{item.price.toLocaleString()} per unit</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-bold">Qty: {item.quantity}</p>
                        <p className="font-black text-sm text-primary">₦{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 p-6 rounded-3xl border-2 border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground font-bold">Payment Method</span>
                  <span className="text-sm font-black uppercase">{selectedOrder.type === 'installment' ? 'Installments (Completed)' : 'Online Cart Payment'}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                  <span className="text-sm md:text-lg font-black uppercase">Total Amount Paid</span>
                  <span className="text-2xl md:text-3xl font-black text-primary">₦{selectedOrder.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.type === 'installment' && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center"><FaCheckCircle /></div>
                  <div className="text-xs font-bold text-primary">
                    This order was automatically generated after a successful installment plan completion.
                  </div>
                  <Link 
                    href={`/admin/installments?search=${selectedOrder.installmentId}`}
                    className="ml-auto bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all"
                  >
                    View Plan
                  </Link>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 md:p-6 bg-muted border-t border-border flex gap-3 md:gap-4">
              <button onClick={() => window.print()} className="flex-1 py-3 md:py-4 bg-card border border-border rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-muted/50 transition-all">
                <FaPrint className="text-sm md:text-base" /> 
                <span className="md:hidden">Print</span>
                <span className="hidden md:inline">Print Order Details</span>
              </button>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setConfirmDelete(selectedOrder.id);
                }}
                className="flex-1 py-3 md:py-4 bg-secondary text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-secondary/90 shadow-lg shadow-secondary/20 transition-all"
              >
                <FaTrash className="text-xs md:text-sm" /> 
                <span className="md:hidden">Delete</span>
                <span className="hidden md:inline">Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border-2 border-secondary/20 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <FaTrash size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2">Delete Order?</h3>
            <p className="text-muted-foreground mb-8 text-sm font-medium">
              Are you sure you want to permanently remove this order record? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmDelete(null)} 
                className="flex-1 py-4 font-black text-xs uppercase border border-border rounded-2xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowPasskeyModal(confirmDelete)} 
                className="flex-1 py-4 font-black text-xs uppercase bg-secondary text-white rounded-2xl hover:bg-secondary/90 shadow-lg shadow-secondary/20 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CEO PASSKEY MODAL ── */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-card p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border-2 border-primary/20 animate-in slide-in-from-bottom duration-300">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <FaLock size={28} />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">CEO Authorization</h3>
            <p className="text-muted-foreground mb-8 text-xs font-bold uppercase tracking-widest opacity-60">
              Enter secure passkey to authorize deletion
            </p>
            <input 
              type="password" 
              className="w-full bg-muted border border-border rounded-2xl p-5 text-center text-2xl font-black tracking-[1em] mb-6 focus:border-primary outline-none transition-all shadow-inner"
              placeholder="••••"
              autoFocus
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPasskey()}
            />
            <div className="flex gap-4">
              <button 
                onClick={() => { setShowPasskeyModal(null); setPasskeyInput(''); setConfirmDelete(null); }} 
                className="flex-1 py-4 font-black text-xs uppercase border border-border rounded-2xl hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={verifyPasskey} 
                className="flex-1 py-4 font-black text-xs uppercase bg-primary text-white rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all"
              >
                Verify & Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
