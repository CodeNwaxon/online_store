'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  FaShoppingCart, FaBars, FaTimes, FaWhatsapp, FaHome, FaStore,
  FaInfoCircle, FaPhone, FaSignOutAlt, FaSignInAlt, FaUserShield,
  FaChartBar, FaBoxes, FaCog, FaCreditCard, FaArrowLeft, FaUserTie,
  FaUtensils, FaHandshake, FaChevronDown, FaBell, FaBullhorn
} from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useThemeStore, useHydrateTheme } from '@/store/useThemeStore';
import CartSlider from './CartSlider';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { useAdmin } from '@/hooks/useAdmin';
import { usePartner } from '@/hooks/usePartner';
import { toast } from 'react-hot-toast';
import { usePartnerNotificationStore } from '@/store/usePartnerNotificationStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import NotificationWrapper from './NotificationWrapper';

const navLinks = [
  { href: '/', label: 'Home', icon: <FaHome /> },
  { href: '/shop', label: 'Shop', icon: <FaStore /> },
  { href: '/about', label: 'About', icon: <FaInfoCircle /> },
  { href: '/contact', label: 'Contact', icon: <FaPhone /> },
  { href: '/partnership', label: 'Partnership', icon: <FaHandshake /> },
];

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: <FaHome />, id: 'dashboard' },
  { href: '/admin/management', label: 'Management', icon: <FaUserShield />, id: '/ADMIN/MANAGEMENT', ceoOnly: true },
  { href: '/admin/products', label: 'Products', icon: <FaBoxes />, id: '/ADMIN/PRODUCTS' },
  { href: '/admin/foods', label: 'Foods', icon: <FaUtensils />, id: '/ADMIN/FOODS' },
  { href: '/admin/cosmetics', label: 'Cosmetics', icon: <FaBoxes />, id: '/ADMIN/COSMETICS' },
  { href: '/admin/wears', label: 'Wears', icon: <FaUserTie />, id: '/ADMIN/WEARS' },
  { href: '/admin/toilet-kitchen', label: 'Toilet & Kitchen', icon: <FaBoxes />, id: '/ADMIN/TOILET-KITCHEN' },
  { href: '/admin/uk-used', label: 'UK Used', icon: <FaHandshake />, id: '/ADMIN/UK-USED' },
  { href: '/admin/installments', label: 'Installments', icon: <FaCreditCard />, id: '/ADMIN/INSTALLMENTS' },
  { href: '/admin/orders', label: 'Orders', icon: <FaShoppingCart />, id: '/ADMIN/ORDERS' },
  { href: '/admin/partnership', label: 'Partnership', icon: <FaHandshake />, id: '/ADMIN/PARTNERSHIP' },
  { href: '/admin/settings', label: 'Settings', icon: <FaCog />, id: '/ADMIN/SETTINGS' },
  { href: '/admin/stats', label: 'Statistics', icon: <FaChartBar />, id: '/ADMIN/STATS' },
  { href: '/admin/about', label: 'Admin About Editor', icon: <FaUserTie />, id: '/ADMIN/ABOUT' },
  { href: '/admin/broadcast', label: 'Broadcast', icon: <FaBullhorn />, id: '/ADMIN/BROADCAST' },
];

export default function Navbar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const lastPage = localStorage.getItem('lastVisitedPage');
    const hasRedirected = sessionStorage.getItem('hasRedirectedLastPage');

    // Mark as redirected on the very first execution in this tab, 
    // so we don't intercept organic client-side navigation to Home later.
    if (!hasRedirected) {
      sessionStorage.setItem('hasRedirectedLastPage', 'true');
      // If we're on the site root on initial load and have a saved last page, redirect
      if (pathname === '/' && lastPage && lastPage !== '/') {
        router.replace(lastPage);
        return;
      }
    }

    // Save the user's current page (except admin, checkout, about, or root)
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/checkout') && !pathname.startsWith('/about') && pathname !== '/') {
      try {
        localStorage.setItem('lastVisitedPage', pathname + window.location.search);
      } catch (e) {
        // ignore storage errors (e.g., private mode)
      }
    }
  }, [pathname, router]);
  const { user, isAdmin, isCEO, adminData } = useAdmin();
  const [siteName, setSiteName] = useState('');
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  useHydrateTheme();
  const { isPartnershipDarkMode } = useThemeStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [unreadPartners, setUnreadPartners] = useState(0);
  const { partnerData, isApprovedPartner } = usePartner();
  const { unreadSales, setUnreadSales, setLastSalesCount, clearUnreadSales, hasUnseenApproval, setHasUnseenApproval, setLastSeenPartnerStatus } = usePartnerNotificationStore();
  const partnerNotifCount = unreadSales + (hasUnseenApproval ? 1 : 0);

  const notifications = useNotificationStore(state => state.notifications);
  const addNotification = useNotificationStore(state => state.addNotification);
  const getUnreadCount = useNotificationStore(state => state.getUnreadCount);
  const notifUnreadCount = getUnreadCount({
    userUid: user?.uid,
    userEmail: user?.email || undefined,
    isAdmin: isAdmin,
    isCEO: isCEO,
    isVip: adminData?.vip,
    assignedRoutes: adminData?.assignedRoutes
  });

  const isAdminRoute = pathname?.startsWith('/admin') || false;
  const isDarkNav = !isAdminRoute && ((pathname === '/partnership' && isPartnershipDarkMode) || pathname?.startsWith('/foods') || pathname?.startsWith('/shop/cosmetics') || pathname?.startsWith('/shop/wears') || pathname?.startsWith('/shop/furniture') || pathname?.startsWith('/shop/toilet-kitchen'));

  useEffect(() => {
    setMounted(true);
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) setSiteName(docSnap.data().siteName || '');
    };
    fetchSettings();

    // Setup listeners only if authenticated and is admin
    if (!isAdmin && !isCEO) {
      setUnreadCount(0);
      setUnreadOrders(0);
      setUnreadPartners(0);
      return;
    }

    let instCount = 0;
    let compCount = 0;
    let partCount = 0;

    // Fetch notification templates for installment messages
    let instTemplate = '';
    const fetchTemplates = async () => {
      try {
        const tplSnap = await getDoc(doc(db, 'settings', 'notification_templates'));
        if (tplSnap.exists()) {
          instTemplate = tplSnap.data().installmentNotification || '';
        }
      } catch (e) {
        console.warn('Failed to fetch notification templates:', e);
      }
    };
    fetchTemplates();

    let isInitialOrdersLoad = true;
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), where('isNew', '==', true)), (snap) => {
      let count = 0;
      snap.forEach(docSnap => {
        const orderData = docSnap.data();
        let isVIPForOrder = false;
        if (adminData?.vip) {
          const ROUTE_TO_COLLECTION: Record<string, string> = {
            '/ADMIN/PRODUCTS': 'products',
            '/ADMIN/FOODS': 'foods',
            '/ADMIN/WEARS': 'wears',
            '/ADMIN/COSMETICS': 'cosmetics',
            '/ADMIN/TOILET-KITCHEN': 'toilet_kitchen',
          };
          const allowedCols = (adminData.assignedRoutes || []).flatMap((r: string) => ROUTE_TO_COLLECTION[r] ? [ROUTE_TO_COLLECTION[r]] : []);
          isVIPForOrder = allowedCols.length > 0 && orderData.items?.some((item: any) => item.collectionName && allowedCols.includes(item.collectionName));
        }

        const hasOrderAccess = isCEO || adminData?.assignedRoutes?.includes('/ADMIN/ORDERS') || isVIPForOrder;
        
        if (hasOrderAccess) {
          count++;
        } else if (orderData.items?.some((item: any) => item.vendor === adminData?.email)) {
          count++;
        }
      });
      setUnreadOrders(count);

      snap.docChanges().forEach(change => {
        if (isInitialOrdersLoad) return;
        if (change.type !== 'added') return;

        const orderData = change.doc.data();
        const isVendorOrder = Boolean(orderData.items?.some((item: any) => item.vendor === adminData?.email));
        
        let isVIPForOrder = false;
        if (adminData?.vip) {
          const ROUTE_TO_COLLECTION: Record<string, string> = {
            '/ADMIN/PRODUCTS': 'products',
            '/ADMIN/FOODS': 'foods',
            '/ADMIN/WEARS': 'wears',
            '/ADMIN/COSMETICS': 'cosmetics',
            '/ADMIN/TOILET-KITCHEN': 'toilet_kitchen',
          };
          const allowedCols = (adminData.assignedRoutes || []).flatMap((r: string) => ROUTE_TO_COLLECTION[r] ? [ROUTE_TO_COLLECTION[r]] : []);
          isVIPForOrder = allowedCols.length > 0 && orderData.items?.some((item: any) => item.collectionName && allowedCols.includes(item.collectionName));
        }

        const hasOrderAccess = isCEO || adminData?.assignedRoutes?.includes('/ADMIN/ORDERS') || isVIPForOrder;
        
        const shouldNotify = hasOrderAccess || isVendorOrder;
        if (!shouldNotify) return;

        addNotification({
          id: `order-${change.doc.id}`,
          type: isVendorOrder ? 'vendor_order' : 'order',
          title: isVendorOrder ? 'New Vendor Order' : 'New Order',
          message: isVendorOrder
            ? `A new purchase was made for one of your products.`
            : `A new purchase was made in the store.`,
          createdAt: orderData.createdAt || new Date().toISOString(),
          read: false,
          link: '/admin/orders',
          adminRoute: '/ADMIN/ORDERS',
          vendorEmail: isVendorOrder ? adminData?.email : undefined,
          orderItems: (orderData.items || []).map((item: any) => ({
            name: item.name || 'Product',
            image: item.image || '',
            quantity: item.quantity || 1,
            price: item.price || 0,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          })),
          orderId: change.doc.id,
        });
      });

      isInitialOrdersLoad = false;
    }, (error) => {
      console.warn("Navbar orders listener error:", error);
    });

    const unsubInst = onSnapshot(query(collection(db, 'installments'), where('isNew', '==', true)), (snap) => {
      instCount = snap.size;
      setUnreadCount(instCount + compCount);
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (isCEO || adminData?.assignedRoutes?.includes('/ADMIN/INSTALLMENTS')) {
            const userName = data.userName || data.userEmail || 'a user';
            const templateMsg = instTemplate
              ? instTemplate.replace(/\{user\}/gi, userName)
              : `A new installment plan was started by ${userName}.`;
            addNotification({
              id: `inst-${change.doc.id}`,
              type: 'installment',
              title: 'New Installment',
              message: templateMsg,
              createdAt: new Date().toISOString(),
              read: false,
              link: '/admin/installments'
            });
          }
        }
      });
    }, (error) => {
      console.warn("Navbar installments listener error:", error);
    });

    const unsubComp = onSnapshot(query(collection(db, 'complaints'), where('isNew', '==', true)), (snap) => {
      compCount = snap.size;
      setUnreadCount(instCount + compCount);
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          if (isCEO || adminData?.assignedRoutes?.includes('/ADMIN/INSTALLMENTS')) {
            addNotification({
              id: `comp-${change.doc.id}`,
              type: 'complaint',
              title: 'New Complaint',
              message: `A new complain has been sent to your Admin`,
              createdAt: new Date().toISOString(),
              read: false,
              link: '/admin/installments'
            });
          }
        }
      });
    }, (error) => {
      console.warn("Navbar complaints listener error:", error);
    });

    let isInitialPartnersLoad = true;
    const unsubPart = onSnapshot(query(collection(db, 'partners'), where('status', '==', 'pending')), (snap) => {
      partCount = snap.size;
      setUnreadPartners(partCount);

      snap.docChanges().forEach(change => {
        if (isInitialPartnersLoad) return;
        if (change.type !== 'added') return;

        const data = change.doc.data();
        if (isCEO || adminData?.assignedRoutes?.includes('/ADMIN/PARTNERSHIP')) {
          addNotification({
            id: `partner-${change.doc.id}`,
            type: 'partnership',
            title: 'New Partnership Request',
            message: `${data.email || data.accountName || 'Someone'} has applied to become a partner.`,
            createdAt: data.createdAt || new Date().toISOString(),
            read: false,
            link: '/admin/partnership',
            adminRoute: '/ADMIN/PARTNERSHIP',
          });
        }
      });

      isInitialPartnersLoad = false;
    }, (error) => {
      console.warn("Navbar partners listener error:", error);
    });

    return () => {
      unsubOrders();
      unsubInst();
      unsubComp();
      unsubPart();
    };
  }, [isAdmin, isCEO, adminData, addNotification]);

  // Global Listeners for useNotificationStore
  useEffect(() => {
    if (!user) return;

    // Listen for Broadcasts
    const unsubBroadcasts = onSnapshot(query(collection(db, 'broadcasts'), where('createdAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          // If this broadcast is meant for a specific customer (like a delivery notification), 
          // skip it if the current user is not that customer.
          if (data.customerUid && data.customerUid !== user.uid) {
            return;
          }
          
          addNotification({
            id: change.doc.id,
            type: (data.type === 'delivery' ? 'order_delivered' : data.type) || 'broadcast',
            title: data.title,
            message: data.message,
            image: data.image,
            link: data.link,
            linkLabel: data.linkLabel,
            createdAt: data.createdAt || new Date().toISOString(),
            read: false,
            vendorEmail: data.vendorEmail
          });
        }
      });
    }, (err) => console.warn("Broadcasts listener error:", err));

    return () => {
      unsubBroadcasts();
    };
  }, [user]);

  // Partner Sales Listener
  useEffect(() => {
    if (!isApprovedPartner || !partnerData?.referralCode) return;

    let isInitialLoad = true;
    const q = query(collection(db, 'orders'), where('referralCode', '==', partnerData.referralCode));

    const unsubSales = onSnapshot(q, (snap) => {
      let totalItems = 0;
      snap.forEach(docSnap => {
        const order = docSnap.data();
        if (order.items && Array.isArray(order.items)) {
          totalItems += order.items.length;
        }
      });

      const { lastSalesCount, setUnreadSales } = usePartnerNotificationStore.getState();

      if (isInitialLoad) {
        if (totalItems > lastSalesCount) {
          setUnreadSales(totalItems - lastSalesCount);
        }
        isInitialLoad = false;
      } else {
        if (totalItems > lastSalesCount) {
          setUnreadSales(totalItems - lastSalesCount);
        }
      }
    });

    return () => unsubSales();
  }, [isApprovedPartner, partnerData?.referralCode]);

  const handlePartnershipClick = () => {
    // Clear the bubble and update the last viewed count.
    const state = usePartnerNotificationStore.getState();
    const newTotal = state.lastSalesCount + state.unreadSales;
    state.setLastSalesCount(newTotal);
    state.clearUnreadSales();
    // Clear approval notification
    if (state.hasUnseenApproval) {
      state.setHasUnseenApproval(false);
      state.setLastSeenPartnerStatus('approved');
    }
  };

  // Auto-clear partner notifications when visiting the partnership page directly
  useEffect(() => {
    if (pathname === '/partnership') {
      handlePartnershipClick();
    }
  }, [pathname]);

  // Close drawer on route change
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  // Auto-close menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        lastLogin: serverTimestamp(),
      }, { merge: true });
      toast.success('Signed in!');
      setIsMenuOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') return;
      if (err?.code === 'auth/network-request-failed') {
        toast.error('No internet connection. Please try again.');
      } else {
        toast.error('Sign in failed. Please try again.');
      }
    }
  };
  const handleSignOut = async () => {
    try { await signOut(auth); toast.success('Signed out.'); setIsMenuOpen(false); }
    catch { toast.error('Sign out failed.'); }
  };

  const whatsappUrl = `https://wa.me/2347034632037?text=Hello, I'd like to make an enquiry.`;

  // Filter admin links based on permissions
  const filteredAdminLinks = adminLinks.filter(item => {
    if (item.id === 'dashboard') return true;
    if (isCEO) return true;
    
    // VIP admins with product routes should see the Orders link
    if (adminData?.vip && item.id === '/ADMIN/ORDERS') {
      const hasProductRoute = adminData?.assignedRoutes?.some((r: string) => ['/ADMIN/PRODUCTS', '/ADMIN/FOODS', '/ADMIN/WEARS', '/ADMIN/COSMETICS', '/ADMIN/TOILET-KITCHEN'].includes(r));
      if (hasProductRoute) return true;
    }

    return adminData?.assignedRoutes?.includes(item.id);
  });

  return (
    <>
      {/* --- NAV BAR --------------------------------------- */}
      <nav className={`${isAdminRoute ? 'bg-card border-border' : (pathname === '/partnership' && isPartnershipDarkMode) ? 'bg-zinc-950 border-white/10' : (pathname === '/partnership' && !isPartnershipDarkMode) ? 'bg-slate-50 border-slate-200' : pathname.startsWith('/foods') ? 'bg-emerald-900 border-emerald-800' : pathname.startsWith('/shop/cosmetics') ? 'bg-pink-900 border-pink-800' : pathname.startsWith('/shop/wears') ? 'bg-purple-900 border-purple-800' : pathname.startsWith('/shop/furniture') ? 'bg-amber-950 border-amber-900' : pathname.startsWith('/shop/toilet-kitchen') ? 'bg-teal-900 border-teal-800' : 'bg-card border-border'} border-b sticky top-0 z-[200] py-[0.875rem] transition-colors duration-300`}>
        <div className={`container mx-auto px-4 md:px-6 flex justify-between items-center max-w-[1350px] ${isDarkNav ? 'text-white' : 'text-foreground'}`}>

          {/* Logo  always visible */}
          <Link href="/" className="flex items-end md:items-center gap-2">
            <div className={`${isDarkNav ? 'bg-white p-0.5 rounded-md shadow-sm' : ''} flex items-center justify-center`}>
              <Image src="/logo_nomo.png" alt="Logo" width={30} height={30} className="md:hidden object-contain" />
              <Image src="/logo_nomo.png" alt="Logo" width={38} height={38} className="hidden md:block object-contain" />
            </div>
            <span className={`text-[0.8rem] md:text-[1.2rem] font-bold ${isDarkNav ? 'text-white' : 'text-primary'}`}>{siteName}&reg;</span>
          </Link>

          {/* Desktop centre links */}
          <div className="hidden md:flex gap-10 items-center">
            {navLinks.map(l => {
              if (l.label === 'Partnership') return null;

              if (l.label === 'Shop') {
                return (
                  <div key="shop-and-market" className="flex items-center gap-10">
                    <Link href="/shop" className={`text-[0.95rem] pb-[2px] transition-all duration-200 border-b-2 ${pathname === '/shop' ? `font-bold ${isDarkNav ? 'text-white border-white' : 'text-primary border-primary'}` : `font-medium ${isDarkNav ? 'text-white/80 border-transparent hover:text-white' : 'text-foreground border-transparent'}`}`}>
                      Shop
                    </Link>

                    <div key="market-dropdown" className="relative group py-2">
                      <span className={`cursor-pointer flex items-center gap-1 text-[0.95rem] pb-[2px] transition-all duration-200 border-b-2 ${(pathname.startsWith('/foods') || pathname.startsWith('/shop/cosmetics') || pathname.startsWith('/shop/wears') || pathname.startsWith('/shop/furniture') || pathname.startsWith('/shop/toilet-kitchen') || pathname.startsWith('/shop/uk-used')) ? `font-bold ${isDarkNav ? 'text-white border-white' : 'text-primary border-primary'}` : `font-medium ${isDarkNav ? 'text-white/80 border-transparent hover:text-white' : 'text-foreground border-transparent'}`}`}>
                        Market <FaChevronDown size={10} className="group-hover:rotate-180 transition-transform" />
                      </span>
                      <div className="absolute top-full left-0 mt-0 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden">
                        <Link href="/foods" className={`px-4 py-3 text-sm hover:bg-muted font-medium border-b border-border ${pathname === '/foods' ? 'text-primary font-bold' : 'text-foreground'}`}>Food Market</Link>
                        <Link href="/shop/cosmetics" className={`px-4 py-3 text-sm hover:bg-muted font-medium border-b border-border ${pathname === '/shop/cosmetics' ? 'text-primary font-bold' : 'text-foreground'}`}>Cosmetics</Link>
                        <Link href="/shop/wears" className={`px-4 py-3 text-sm hover:bg-muted font-medium border-b border-border ${pathname === '/shop/wears' ? 'text-primary font-bold' : 'text-foreground'}`}>Wears</Link>
                        <Link href="/shop/furniture" className={`px-4 py-3 text-sm hover:bg-muted font-medium border-b border-border ${pathname === '/shop/furniture' ? 'text-primary font-bold' : 'text-foreground'}`}>Furniture</Link>
                        <Link href="/shop/toilet-kitchen" className={`px-4 py-3 text-sm hover:bg-muted font-medium border-b border-border ${pathname === '/shop/toilet-kitchen' ? 'text-primary font-bold' : 'text-foreground'}`}>Toilet & Kitchen</Link>
                        <Link href="/shop/uk-used" className={`px-4 py-3 text-sm hover:bg-muted font-medium ${pathname === '/shop/uk-used' ? 'text-primary font-bold' : 'text-foreground'}`}>UK Used</Link>
                      </div>
                    </div>
                  </div>
                );
              }

              if (l.label === 'About') {
                return (
                  <div key="about-dropdown" className="relative group py-2">
                    <span className={`cursor-pointer flex items-center gap-1 text-[0.95rem] pb-[2px] transition-all duration-200 border-b-2 ${(pathname === '/about' || pathname === '/partnership') ? `font-bold ${isDarkNav ? 'text-white border-white' : 'text-primary border-primary'}` : `font-medium ${isDarkNav ? 'text-white/80 border-transparent hover:text-white' : 'text-foreground border-transparent'}`}`}>
                      About <FaChevronDown size={10} className="group-hover:rotate-180 transition-transform" />
                      {mounted && partnerNotifCount > 0 && (
                        <span className="absolute -top-1 -right-3 bg-[#4B0082] text-white rounded-full w-[14px] h-[14px] text-[8px] flex items-center justify-center font-bold shadow-sm">
                          {partnerNotifCount}
                        </span>
                      )}
                    </span>
                    <div className="absolute top-full left-0 mt-0 w-40 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden">
                      <Link href="/about" className="px-4 py-3 text-sm hover:bg-muted font-medium text-foreground">About Us</Link>
                      <Link href="/partnership" onClick={handlePartnershipClick} className="px-4 py-3 text-sm hover:bg-muted font-medium text-foreground border-t border-border flex items-center justify-between">
                        Partnership
                        {mounted && partnerNotifCount > 0 && (
                          <span className="bg-[#4B0082] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {partnerNotifCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              }
              return (
                <Link key={l.href} href={l.href} className={`text-[0.95rem] pb-[2px] transition-all duration-200 border-b-2 ${pathname === l.href ? `font-bold ${isDarkNav ? 'text-white border-white' : 'text-primary border-primary'}` : `font-medium ${isDarkNav ? 'text-white/80 border-transparent hover:text-white' : 'text-foreground border-transparent'}`}`}>
                  {l.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" className={`flex items-center gap-1.5 text-[0.82rem] px-3.5 py-1.5 rounded-full font-bold transition-all duration-200 shadow-sm ${pathname.startsWith('/admin') ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-secondary text-white hover:bg-primary hover:shadow-md'}`}>
                <FaUserShield size={13} />
                {isCEO ? 'CEO Panel' : 'Admin Panel'}
              </Link>
            )}
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[0.4rem] text-[0.85rem] font-bold border-2 border-current px-[0.9rem] py-[0.45rem] rounded-md">
              <FaWhatsapp size={16} /> Contact Us
            </a>
            {user ? (
              <div className="flex items-center gap-[0.6rem]">
                <img src={user.photoURL || ''} alt="avatar" className={`w-[30px] h-[30px] rounded-full border-2 ${(!isAdminRoute && pathname === '/partnership' && isPartnershipDarkMode) ? 'border-white/50' : 'border-primary'} object-cover`} />
                <button onClick={handleSignOut} className={`text-[0.78rem] ${isDarkNav ? 'text-white/80 hover:text-white' : 'text-muted-foreground'} underline`}>Sign Out</button>
              </div>
            ) : (
              <button onClick={handleSignIn} className={`border ${isDarkNav ? 'border-white/20 text-white hover:bg-white/10' : 'border-border text-foreground hover:bg-muted'} px-[0.9rem] py-[0.4rem] text-[0.85rem] rounded-md font-semibold transition-colors duration-200`}>
                Sign In
              </button>
            )}
          </div>

          {/* RIGHT ICONS  Cart always visible, hamburger only on mobile */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <button onClick={() => setIsCartOpen(true)} className="relative flex items-center p-1">
              <FaShoppingCart size={20} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white rounded-full w-[18px] h-[18px] text-[0.65rem] flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Notifications */}
            {user && (
              <button onClick={() => setIsNotifOpen(true)} className="relative flex items-center p-1">
                <FaBell size={20} className={notifUnreadCount > 0 ? 'animate-pulse text-primary' : ''} />
                {mounted && notifUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-[16px] h-[16px] text-[9px] flex items-center justify-center font-bold shadow-sm">
                    {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Hamburger  only on mobile */}
            <button className="relative flex md:hidden items-center p-1" onClick={() => setIsMenuOpen(true)}>
              <FaBars size={22} />
              {mounted && partnerNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4B0082] text-white rounded-full w-[14px] h-[14px] text-[8px] flex items-center justify-center font-bold shadow-sm">
                  {partnerNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* --- DRAWER BACKDROP ------------------------------- */}
      <div onClick={() => setIsMenuOpen(false)} className={`fixed inset-0 z-[300] bg-black/60 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* --- DRAWER PANEL (slides right ? left) ------------ */}
      <div className={`fixed top-0 right-0 h-full w-[min(290px,82vw)] bg-card z-[400] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col shadow-[-6px_0_30px_rgba(0,0,0,0.15)] overflow-y-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex justify-between items-center px-[1.25rem] py-[1.1rem] border-b border-border">
          <div className="flex items-center gap-2">
            <Image src="/logo_nomo.png" alt="logo" width={28} height={28} className="p-0.5" />
            <span className="font-bold text-primary text-[0.95rem]">{isAdminRoute ? (isCEO ? 'CEO Dashboard' : 'Admin Staff') : siteName + ''}</span>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="text-foreground p-1"><FaTimes size={22} /></button>
        </div>

        {/* Home/Switch Toggle */}
        {isAdminRoute ? (
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="mx-[1.25rem] mt-4 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary/10 text-primary font-bold text-sm border border-primary/20">
            <FaArrowLeft size={12} /> Switch to Home
          </Link>
        ) : isAdmin && (
          <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="mx-[1.25rem] mt-4 flex items-center justify-center gap-2 py-3 rounded-lg bg-secondary/10 text-secondary font-bold text-sm border border-secondary/20">
            <FaUserShield size={14} /> {isCEO ? 'CEO Panel' : 'Admin Panel'}
          </Link>
        )}

        {/* User strip */}
        {user && (
          <div className="flex items-center gap-3 px-[1.25rem] py-[0.9rem] bg-muted mt-4 border-y border-border">
            <img src={user.photoURL || ''} alt="avatar" className="w-[36px] h-[36px] rounded-full border-2 border-primary object-cover" />
            <div>
              <div className="font-semibold text-[0.88rem]">{user.displayName}</div>
              <div className="text-[0.72rem] text-muted-foreground break-all">{user.email}</div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 pt-2">
          {isAdminRoute ? (
            // Admin Drawer Links
            filteredAdminLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] transition-all duration-150 border-l-[3px] ${pathname === l.href ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                <div className="flex items-center gap-[0.85rem] text-[0.97rem]">
                  <span className={`text-[0.85rem] ${pathname === l.href ? 'text-primary' : 'text-muted-foreground'}`}>{l.icon}</span>
                  {l.label}
                </div>
                {l.label === 'Installments' && unreadCount > 0 && (
                  <span className="bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadCount}
                  </span>
                )}
                {l.label === 'Orders' && unreadOrders > 0 && (
                  <span className="bg-[#4B0082] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadOrders}
                  </span>
                )}
                {l.label === 'Partnership' && unreadPartners > 0 && (
                  <span className="bg-[#4B0082] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {unreadPartners}
                  </span>
                )}
              </Link>
            ))
          ) : (
            // Normal Store Links
            <div className="flex flex-col">
              {navLinks.map(l => {
                if (l.label === 'Shop') {
                  return (
                    <div key="mobile-shop-group" className="flex flex-col">
                      <Link href="/shop" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop' ? 'text-primary' : 'text-muted-foreground'}`}><FaStore /></span>
                          Shop
                        </div>
                      </Link>

                      <Link href="/foods" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/foods' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/foods' ? 'text-primary' : 'text-muted-foreground'}`}><FaUtensils /></span>
                          Food Market
                        </div>
                      </Link>
                      <Link href="/shop/cosmetics" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop/cosmetics' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop/cosmetics' ? 'text-primary' : 'text-muted-foreground'}`}><FaBoxes /></span>
                          Cosmetics
                        </div>
                      </Link>
                      <Link href="/shop/wears" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop/wears' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop/wears' ? 'text-primary' : 'text-muted-foreground'}`}><FaUserTie /></span>
                          Wears
                        </div>
                      </Link>
                      <Link href="/shop/furniture" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop/furniture' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop/furniture' ? 'text-primary' : 'text-muted-foreground'}`}><FaStore /></span>
                          Furniture
                        </div>
                      </Link>
                      <Link href="/shop/toilet-kitchen" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop/toilet-kitchen' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop/toilet-kitchen' ? 'text-primary' : 'text-muted-foreground'}`}><FaBoxes /></span>
                          Toilet & Kitchen
                        </div>
                      </Link>
                      <Link href="/shop/uk-used" onClick={() => setIsMenuOpen(false)} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === '/shop/uk-used' ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                        <div className="flex items-center gap-[0.85rem]">
                          <span className={`text-[0.85rem] ${pathname === '/shop/uk-used' ? 'text-primary' : 'text-muted-foreground'}`}><FaHandshake /></span>
                          UK Used
                        </div>
                      </Link>
                    </div>
                  );
                }
                return (
                  <Link key={l.href} href={l.href} onClick={() => { setIsMenuOpen(false); if (l.label === 'Partnership') handlePartnershipClick(); }} className={`flex items-center justify-between px-[1.25rem] py-[0.85rem] text-[0.97rem] no-underline transition-all duration-150 border-l-[3px] ${pathname === l.href ? 'font-bold text-primary bg-[rgba(212,136,6,0.08)] border-primary' : 'font-medium text-foreground bg-transparent border-transparent'}`}>
                    <div className="flex items-center gap-[0.85rem]">
                      <span className={`text-[0.85rem] ${pathname === l.href ? 'text-primary' : 'text-muted-foreground'}`}>{l.icon}</span>
                      {l.label}
                    </div>
                    {mounted && l.label === 'Partnership' && partnerNotifCount > 0 && (
                      <span className="bg-[#4B0082] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {partnerNotifCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="px-[1.25rem] py-4 border-t border-border flex flex-col gap-[0.65rem]">
          {!isAdminRoute && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg bg-[#25D366] text-white font-bold text-[0.88rem] no-underline">
              <FaWhatsapp size={18} /> WhatsApp Us
            </a>
          )}

          {user ? (
            <button onClick={handleSignOut} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg border border-border bg-transparent font-semibold text-[0.88rem] text-foreground cursor-pointer">
              <FaSignOutAlt /> Sign Out
            </button>
          ) : (
            <button onClick={handleSignIn} className="flex items-center justify-center gap-2 p-[0.7rem] rounded-lg bg-primary text-white font-bold text-[0.88rem] cursor-pointer border-none">
              <FaSignInAlt /> Sign In with Google
            </button>
          )}
        </div>
      </div>

      <CartSlider isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <NotificationWrapper isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}

