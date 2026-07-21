'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaTrash, FaTimes, FaCheck, FaChevronDown, FaChevronUp, FaExternalLinkAlt } from 'react-icons/fa';
import { AppNotification, useNotificationStore } from '@/store/useNotificationStore';
import Image from 'next/image';
import Link from 'next/link';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
}

export default function NotificationPanel({ isOpen, onClose, notifications }: NotificationPanelProps) {
  const { removeNotification, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setExpandedId(null);
      setShowClearConfirm(false);
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    setExpandedId(expandedId === notif.id ? null : notif.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeNotification(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-[5000] bg-black/70 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      
      <div 
        ref={panelRef}
        className={`fixed top-0 right-0 w-full md:w-[450px] md:right-4 md:top-4 h-[90vh] md:h-[calc(100vh-2rem)] md:rounded-2xl z-[5001] bg-card shadow-2xl flex flex-col overflow-hidden transition-transform duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-y-0' : '-translate-y-[120%]'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/95 backdrop-blur z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaBell className="text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <FaTimes />
            </button>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <button 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <FaCheck size={10} /> Mark all as read
            </button>
            <button 
              onClick={() => setShowClearConfirm(true)}
              disabled={notifications.length === 0}
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <FaTrash size={10} /> Clear all
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {showClearConfirm ? (
            <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-xl text-center mb-4 animate-in fade-in zoom-in duration-200">
              <h3 className="font-bold text-secondary mb-2">Clear all notifications?</h3>
              <p className="text-xs text-muted-foreground mb-4">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 text-xs font-bold border border-border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleClearAll}
                  className="flex-1 py-2 text-xs font-bold bg-secondary text-white rounded-lg hover:bg-secondary/90"
                >
                  Yes, Clear All
                </button>
              </div>
            </div>
          ) : null}

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
              <FaBell size={40} className="mb-4" />
              <p className="font-bold">No notifications yet</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3 pb-10">
              {notifications.map((notif) => {
                const isExpanded = expandedId === notif.id;
                
                return (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer ${notif.read ? 'bg-card border-border' : 'bg-primary/5 border-primary/30'} ${isExpanded ? 'shadow-md' : 'hover:border-primary/50'}`}
                  >
                    {!notif.read && (
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                    )}
                    
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${notif.type === 'broadcast' ? 'bg-blue-100 text-blue-700' : (notif.type === 'order' || notif.type === 'order_delivered' || notif.type === 'vendor_order') ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                            {notif.type === 'order_delivered' ? 'Order Delivered' : notif.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold truncate pr-6 ${notif.read ? 'text-foreground' : 'text-primary'}`}>{notif.title}</h4>
                        
                        {!isExpanded && (
                          <p className="text-xs text-muted-foreground truncate mt-1">{notif.message}</p>
                        )}
                      </div>
                      
                      <button 
                        onClick={(e) => handleDelete(e, notif.id)}
                        className="text-muted-foreground hover:text-secondary hover:bg-secondary/10 p-1.5 rounded-full transition-colors flex-shrink-0"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>

                    {/* Expanded Content */}
                    <div className={`overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="pt-3 border-t border-border text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {notif.message}
                      </div>
                      
                      {notif.image && (
                        <div 
                          className="mt-3 relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted/50 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setSelectedImage(notif.image!); }}
                        >
                          <Image src={notif.image} alt="Notification Image" fill className="object-contain" />
                        </div>
                      )}

                      {notif.orderItems && notif.orderItems.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {notif.orderItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-muted/30 p-2 rounded-md text-xs">
                              <div className="relative w-8 h-8 rounded border border-border overflow-hidden shrink-0">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.selectedSize || item.selectedColor ? `(${[item.selectedSize, item.selectedColor].filter(Boolean).join(', ')}) ` : ''} 
                                  Qty: {item.quantity}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(notif.link || notif.orderId) && (
                        <div className="mt-4">
                          <Link 
                            href={notif.link || `/admin/orders?search=${notif.orderId}`}
                            onClick={onClose}
                            className="inline-flex items-center justify-center gap-2 w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors"
                          >
                            {notif.linkLabel || 'View Details'} <FaExternalLinkAlt size={10} />
                          </Link>
                        </div>
                      )}

                      <div className="mt-4 flex justify-center">
                         <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} className="text-muted-foreground hover:text-foreground text-xs font-bold flex items-center gap-1">
                            <FaChevronUp size={10} /> Collapse
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full Image Overlay - covers entire page */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full">
            <Image src={selectedImage} alt="Full screen image" fill className="object-contain" />
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} 
              className="absolute top-4 right-4 md:top-6 md:right-6 text-white bg-white/20 hover:bg-white/40 backdrop-blur-sm p-3 rounded-full transition-all duration-200 shadow-lg"
            >
              <FaTimes size={22} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
