'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'orders', id as string));
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error('Error fetching order', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
        <div className="text-sm font-bold text-slate-500 animate-pulse">Loading Receipt...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
        <div className="text-sm font-bold text-red-500">Receipt Not Found</div>
      </div>
    );
  }

  const displayUid = order.id?.substring(0, 10).toUpperCase();
  const getOrderCity = (order: any) => {
    if (!order) return '';
    if (order.city) return order.city;
    const addressParts = order.address?.split(',').map((part: string) => part.trim()).filter(Boolean) || [];
    if (order.deliveryMethod === 'pickup') {
      return addressParts[1] ?? addressParts[addressParts.length - 1] ?? order.address;
    }
    return addressParts[addressParts.length - 1] ?? order.address;
  };

  const deliveryLabel = order.deliveryMethod === 'pickup' ? 'Pick Up Location' : "Ship To Customer's Address";
  const deliveryValue = getOrderCity(order);
  const shippingFee = order.shippingFee || 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex justify-center py-10 font-sans text-slate-900 print:py-0 print:bg-white">
      <div className="w-[380px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:w-full">
        
        {/* Customer Copy Banner */}
        <div className="bg-slate-800 text-white text-center py-1.5 text-[10px] font-black uppercase tracking-widest print:bg-slate-100 print:text-slate-800">
          Customer's Copy
        </div>

        <div className="p-6 bg-slate-50 border-b border-dashed border-slate-300 text-center print:bg-white">
          <h1 className="text-xl font-black text-slate-900 m-0 tracking-tight">Order Receipt</h1>
          <div className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">ID: {displayUid}</div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between gap-3 mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Customer</span>
            <span className="text-xs font-bold text-slate-900 text-right">{order.customerName || 'N/A'}</span>
          </div>
          <div className="flex justify-between gap-3 mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Date</span>
            <span className="text-xs font-bold text-slate-900 text-right">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-3 mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{deliveryLabel}</span>
            <span className="text-xs font-bold text-slate-900 text-right">{deliveryValue}</span>
          </div>
          <div className="flex justify-between gap-3 mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Address</span>
            <span className="text-xs font-bold text-slate-900 text-right">{order.address || 'N/A'}</span>
          </div>
          
          <div className="border-t border-slate-200 my-5"></div>
          
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between mb-3 text-xs">
              <span className="text-slate-600 max-w-[190px]">
                {item.name} {item.selectedSize || item.selectedColor ? `(${[item.selectedSize, item.selectedColor].filter(Boolean).join(', ')})` : ''} x{item.quantity}
              </span>
              <span className="font-black">₦{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          
          <div className="border-t border-slate-200 my-5"></div>
          
          <div className="flex justify-between gap-3 mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Shipping Fee</span>
            <span className="text-xs font-bold text-slate-900 text-right">₦{shippingFee.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] font-black text-slate-700 uppercase">Total Paid</span>
            <span className="text-2xl font-black text-[#D48806]">₦{order.totalAmount?.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="p-6 pt-5 bg-slate-50 border-t border-slate-200 text-center print:bg-white">
          <p className="text-[10px] font-bold text-slate-500">Thank you for shopping with us!</p>
          <button 
            onClick={() => window.print()}
            className="mt-4 px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-700 transition-colors print:hidden shadow-sm"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
