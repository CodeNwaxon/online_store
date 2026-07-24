'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('NOMO STOREZ');
  const [logoUrl, setLogoUrl] = useState('/logo_nomo.png');

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'orders', id as string));
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        }
        
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.siteName) setSiteName(data.siteName);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const handlePrintReceipt = () => {
    if (!order) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <meta charset="UTF-8">
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
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <h1 class="store-name">${siteName.toUpperCase()}®</h1>
              <div class="official">Official Payment Receipt</div>
              <div class="copy-container">
                <span class="id-badge">ID: ${displayUid}</span>
                <span class="copy-badge">Customer Copy</span>
              </div>
            </div>
            <div class="content">
              <div class="section-title">Customer Info</div>
              <div class="row">
                <div class="label">Name:</div>
                <div class="value">${order.customerName || 'N/A'}</div>
              </div>
              <div class="row">
                <div class="label">Delivery:</div>
                <div class="value">${deliveryValue}</div>
              </div>
              <div class="row">
                <div class="label">Address:</div>
                <div class="value">${order.address || 'N/A'}</div>
              </div>

              <div class="section-title" style="margin-top: 20px;">Items Ordered</div>
              ${(order.items || []).map((item: any) => `
                <div class="item-row">
                  <span class="item-name">${item.name} ${item.selectedSize || item.selectedColor || item.selectedMeasurement ? `(${[item.selectedSize, item.selectedColor, item.selectedMeasurement].filter(Boolean).join(', ')})` : ''} (x${item.quantity})</span>
                  <span class="item-price">₦${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              `).join('')}
              
              ${shippingFee > 0 ? `
              <div class="item-row" style="margin-top: 8px; color: #D48806;">
                <span class="item-name">Shipping Fee</span>
                <span class="item-price">₦${shippingFee.toLocaleString()}</span>
              </div>
              ` : ''}

              <div class="total-row">
                <div class="total-label">Amount Paid:</div>
                <div class="total-value">₦${order.totalAmount?.toLocaleString()}</div>
              </div>
              <p style="text-align: center; font-size: 8px; color: #94a3b8; margin-top: 12px; font-weight: bold; text-transform: uppercase;">Payment Status: Verified Successfully</p>
            </div>
            <div class="footer">
              <p class="footer-thanks">Thank you for shopping with us!</p>
              <p class="footer-addr">168, Akarigbo Road, Sabo Sagamu, Ogun State.</p>
            </div>
          </div>
          <button class="no-print print-btn" onclick="window.print()">Print Your Receipt</button>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 font-sans text-slate-900 pb-32">
      <div className="w-[380px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Customer Copy Banner */}
        <div className="bg-slate-800 text-white text-center py-1.5 text-[10px] font-black uppercase tracking-widest">
          Customer's Copy
        </div>

        <div className="p-6 bg-slate-50 border-b border-dashed border-slate-300 text-center">
          {logoUrl && (
            <img src={logoUrl} alt="Store Logo" className="h-12 w-auto mx-auto mb-2 object-contain" />
          )}
          <h1 className="text-xl font-black text-slate-900 m-0 tracking-tight uppercase">{siteName}</h1>
          <h2 className="text-sm font-bold text-slate-600 m-0 tracking-tight mt-1">Order Receipt</h2>
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
                {item.name} {item.selectedSize || item.selectedColor || item.selectedMeasurement ? `(${[item.selectedSize, item.selectedColor, item.selectedMeasurement].filter(Boolean).join(', ')})` : ''} x{item.quantity}
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
        
        <div className="p-6 pt-5 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-500">Thank you for shopping with us!</p>
          <button 
            onClick={handlePrintReceipt}
            className="mt-4 px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
