"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isBlogPostExpired } from "@/lib/blogUtils";
import { blogContentClasses } from "@/lib/blogContentStyles";
import Link from "next/link";
import Image from "next/image";
import AdSenseBox from "@/components/AdSenseBox";
import { Clock, ChevronRight, User, Home, ShoppingBag, X, Sparkles, BookOpen, ArrowUp, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";

interface BlogPost {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  excerpt: string;
  imageUrl: string;
  author: string;
  tag?: string;
  fullImage?: boolean;
  createdAt: any;
  productLinks?: { name: string, url: string }[];
}

// Fallback initial 1000+ words blog post if DB is empty
const defaultPost: BlogPost = {
  id: "default-post",
  title: "The Ultimate Guide to Tech and Home Essentials at NomoStores",
  excerpt: "Discover the best electronics, furniture, and men's accessories available at NomoStores. A comprehensive guide to making the right choice.",
  imageUrl: "https://res.cloudinary.com/dfwpxohxg/image/upload/v1785519623/euo3jpon7aqikkox8dxh.jpg",
  author: "NomoStores Editorial",
  tag: "Buying Guides",
  createdAt: { toDate: () => new Date() },
  productLinks: [
    { name: "Shop Phones", url: "/shop/electronics" },
    { name: "Shop Men's Wears", url: "/shop/wears" },
    { name: "Shop Furniture", url: "/shop/furniture" }
  ],
  content: `
    <div class="prose prose-lg dark:prose-invert max-w-none space-y-6">
      <p class="text-lg leading-relaxed">
        Welcome to the NomoStores official blog! Today, we are diving deep into the world of premium African-inspired goods, focusing on how to get the most value out of your purchases in electronics, fashion, cosmetics, and furniture. Whether you're in Lagos or anywhere else, understanding product authenticity and quality is crucial.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">1. Spotting Fake vs. Original Electronics</h2>
      <p class="leading-relaxed">
        One of the biggest challenges when buying electronics, especially accessories like power banks and chargers, is identifying the original from the fake. Let's take the Oraimo charger, for instance. Oraimo has become a household name due to its durability and fast-charging capabilities, but this popularity has also attracted counterfeiters. 
        <br/><br/>
        <strong>How to tell the difference:</strong><br/>
        - <strong>Packaging:</strong> Original Oraimo products come in crisp, well-sealed packaging with a verifiable QR code or scratch-off authentication sticker. Fakes often have faded prints and spelling errors on the box.<br/>
        - <strong>Build Quality:</strong> The original charger feels weighty and solid. The seams where the plastic joins should be perfectly smooth. Fakes feel hollow and often have rough edges.<br/>
        - <strong>Charging Speed:</strong> An original 20W fast charger will charge a compatible phone from 0 to 50% in roughly 30 minutes. If your "fast charger" takes two hours, it's likely a counterfeit.<br/>
        At NomoStores, we guarantee 100% authenticity on all our electronics. When you buy a phone or an accessory from us, you're investing in peace of mind. Check out our <a href="/shop/electronics" class="text-primary hover:underline font-semibold">Electronics section</a> to explore guaranteed original products.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">2. The Best Phones Under 100k in Nigeria Right Now</h2>
      <p class="leading-relaxed">
        Finding a reliable smartphone on a budget is entirely possible if you know where to look. Here are some top contenders you can find at NomoStores:
        <br/><br/>
        - <strong>Infinix Smart Series:</strong> Known for long-lasting batteries and large displays, perfect for media consumption and basic daily tasks.<br/>
        - <strong>Tecno Spark Series:</strong> Offering decent camera setups for the price, the Spark series is great for social media enthusiasts who are mindful of their budget.<br/>
        - <strong>Itel S Series:</strong> For those who prioritize affordability above all, Itel provides essential smartphone features without breaking the bank.<br/>
        - <strong>UK Used iPhones:</strong> If you prefer the iOS ecosystem, a UK used iPhone 8 or XR offers exceptional value and premium build quality at a fraction of the cost of a new model. Explore our <a href="/shop/uk-used" class="text-primary hover:underline font-semibold">UK Used section</a> for thoroughly vetted and tested devices.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">3. Elevating Your Style with Men's Wears & Accessories</h2>
      <p class="leading-relaxed">
        A man's style is defined by the details. It's not just about the shirt or the trousers; it's about the watch, the chain, and the shoes. Let's talk about chains. A simple, well-crafted chain can transform a basic t-shirt into a styled outfit.
        <br/><br/>
        <strong>Choosing the right chain:</strong><br/>
        - <strong>Material matters:</strong> Stainless steel is durable, doesn't tarnish, and is hypoallergenic. Sterling silver offers a classic look but requires maintenance. Gold plating provides a luxurious appearance at a lower price point, though it may fade over time if not cared for.<br/>
        - <strong>Length and Thickness:</strong> A 20-inch chain sits right at the collarbone and is great for everyday wear. Thicker chains (like Cuban links) make a bold statement, while thinner chains are subtle and elegant.<br/>
        Pairing a solid chain with one of our premium wristwatches will instantly elevate your look. Visit the <a href="/shop/wears" class="text-primary hover:underline font-semibold">Men's Wears section</a> to browse our curated collection of chains, watches, and apparel.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">4. Furnishing Your Home: What Furniture Size Fits a 2-Bedroom in Lekki?</h2>
      <p class="leading-relaxed">
        Space in modern apartments, especially in areas like Lekki, can sometimes be at a premium. Choosing the right furniture is about balancing aesthetics with functionality. 
        <br/><br/>
        <strong>Living Room Essentials:</strong><br/>
        - <strong>The Sofa:</strong> Opt for a 3-seater or an L-shaped sectional that fits snugly into a corner to maximize open floor space. Avoid overly bulky armrests.<br/>
        - <strong>TV Console:</strong> A floating TV console or a slim-profile stand prevents the room from feeling cramped.<br/>
        - <strong>Coffee Table:</strong> Consider nesting tables or a glass coffee table. Glass creates an illusion of space because you can see through it.<br/>
        <br/>
        <strong>Bedroom Necessities:</strong><br/>
        - <strong>The Bed:</strong> A Queen-size bed (60x80 inches) is usually perfect for a standard 2-bedroom apartment. It offers ample sleeping space for two without overwhelming the room.<br/>
        - <strong>Storage:</strong> Built-in wardrobes are ideal. If you need freestanding storage, tall and narrow dressers utilize vertical space better than wide ones.<br/>
        NomoStores offers a range of modern, space-saving furniture designed for contemporary living. Redecorate your space by checking out our <a href="/shop/furniture" class="text-primary hover:underline font-semibold">Furniture collection</a>.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">5. The Ultimate Skincare Routine with Authentic Cosmetics</h2>
      <p class="leading-relaxed">
        The cosmetics market is flooded with products, but finding what works for your skin type—and ensuring it's authentic—is paramount.
        <br/><br/>
        <strong>A Simple, Effective Routine:</strong><br/>
        1. <strong>Cleanser:</strong> Use a gentle cleanser morning and night to remove dirt and oil without stripping the skin's natural moisture.<br/>
        2. <strong>Toner:</strong> A good toner balances the skin's pH and prepares it to absorb moisturizers.<br/>
        3. <strong>Serum:</strong> Depending on your needs (Vitamin C for brightening, Hyaluronic Acid for hydration), serums deliver concentrated active ingredients.<br/>
        4. <strong>Moisturizer:</strong> Lock in hydration. Even oily skin needs a lightweight, non-comedogenic moisturizer.<br/>
        5. <strong>Sunscreen:</strong> The most crucial step during the day. Protect your skin from harmful UV rays to prevent premature aging and hyperpigmentation.<br/>
        <br/>
        Beware of counterfeit cosmetics that can cause severe skin damage. Always buy from reputable sources. At NomoStores, we stock only verifiable, genuine skincare products. Browse our <a href="/shop/cosmetics" class="text-primary hover:underline font-semibold">Cosmetics aisle</a> to build your perfect routine.
      </p>

      <h2 class="text-2xl font-bold mt-8 mb-4">Why Shop at NomoStores?</h2>
      <p class="leading-relaxed">
        NomoStores isn't just a marketplace; it's a commitment to quality. As a multi-vendor platform, we strictly enforce policies to ensure that every product listed meets our high standards. Vendors are required to provide original descriptions and authentic photos—no blurry or stolen images allowed. This means what you see is exactly what you get.
        <br/><br/>
        Whether you are looking for the latest smartphone, a stylish outfit, effective skincare, or elegant furniture, NomoStores is your one-stop-shop. We pride ourselves on fast delivery, responsive customer service, and a seamless shopping experience. 
        <br/><br/>
        Thank you for reading our guide. Stay tuned to this blog for more tips, reviews, and buying guides to help you make informed purchasing decisions!
      </p>
    </div>
  `
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('All');
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const router = useRouter();

  // Load saved theme preference from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('nomo_blog_theme');
      if (savedTheme === 'light') {
        setIsDarkMode(false);
      } else if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }
    } catch (e) {
      // Ignore in case of private browsing storage restrictions
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nomo_blog_theme', next ? 'dark' : 'light');
      } catch (e) { }
      return next;
    });
  };

  // Scroll listener for dynamic back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLightbox = (url: string, alt: string) => setLightbox({ url, alt });
  const closeLightbox = () => setLightbox(null);

  const handleExit = () => {
    // If there's a history entry to go back to, use it; else fall back to home
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const activePosts = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(post => !isBlogPostExpired(post));

        if (activePosts.length === 0) {
          setPosts([defaultPost]);
        } else {
          setPosts(activePosts as BlogPost[]);
        }
      } catch (error) {
        console.error("Error fetching blogs:", error);
        // Fallback on error
        setPosts([defaultPost]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableTags = Array.from(new Set(posts.map(post => post.tag?.trim()).filter((tag): tag is string => Boolean(tag))));
  const visiblePosts = selectedTag === 'All' ? posts : posts.filter(post => post.tag === selectedTag);

  /* ── Shared button style (matches filter nav exactly) ── */
  const navBtnClass = isDarkMode
    ? 'shrink-0 flex items-center justify-center gap-1 rounded-md sm:rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm text-sky-200/80 hover:bg-sky-900/60 hover:text-white text-center'
    : 'shrink-0 flex items-center justify-center gap-1 rounded-md sm:rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm text-muted-foreground hover:bg-muted hover:text-foreground text-center';

  return (
    <div className={`min-h-screen relative transition-colors duration-300 ${isDarkMode
      ? 'bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200'
      : 'bg-background text-foreground'
      }`}>
      {/* Decorative dark-blue mesh & luminous gradients */}
      {isDarkMode && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-700/15 blur-[120px]" />
          <div className="absolute top-1/3 -right-40 w-[650px] h-[650px] rounded-full bg-indigo-600/15 blur-[140px]" />
          <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] rounded-full bg-sky-600/10 blur-[130px]" />
          {/* Subtle high-tech grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }}
          />
        </div>
      )}

      {/* ── Lightbox overlay ── */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Close image"
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image container — stop click from propagating so only backdrop click closes */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={lightbox.url}
              alt={lightbox.alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Tap hint on mobile */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs select-none pointer-events-none sm:hidden">
            Tap outside to close
          </p>
        </div>
      )}

      {/* ── Top header nav: sticky top-0, spans full edge with separator line (Home / Shop / Exit) ── */}
      <div className={`sticky top-0 z-50 w-full backdrop-blur-md border-b shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900/95 border-sky-900/50' : 'bg-card/95 border-border'
        }`}>
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-center gap-3 sm:gap-6 py-2">
          <Link href="/" className={`${navBtnClass} flex-1 max-w-[140px]`}>
            <Home className={`h-3.5 w-3.5 shrink-0 ${isDarkMode ? 'text-amber-400' : ''}`} />
            <span>Home</span>
          </Link>
          <div className={`h-4 w-px shrink-0 ${isDarkMode ? 'bg-sky-900/60' : 'bg-border'}`} />
          <Link href="/shop" className={`${navBtnClass} flex-1 max-w-[140px]`}>
            <ShoppingBag className={`h-3.5 w-3.5 shrink-0 ${isDarkMode ? 'text-amber-400' : ''}`} />
            <span>Shop</span>
          </Link>
          <div className={`h-4 w-px shrink-0 ${isDarkMode ? 'bg-sky-900/60' : 'bg-border'}`} />
          <button onClick={handleExit} className={`${navBtnClass} flex-1 max-w-[140px]`}>
            <X className={`h-3.5 w-3.5 shrink-0 ${isDarkMode ? 'text-rose-400' : ''}`} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <div className="text-center mb-8 relative">
          {/* Far-right dark/light theme switch */}
          <div className="absolute right-0 top-0 flex items-center z-20">
            <button
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm ${isDarkMode
                ? 'bg-slate-900/80 border-sky-800 text-amber-300 hover:bg-slate-800 hover:border-amber-400'
                : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-sky-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>

          <h1 className={`text-2xl md:text-4xl font-extrabold tracking-tight mb-3 pr-14 sm:pr-0 ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
            Nomo Storez {isDarkMode ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Blog</span>
            ) : (
              <span>Blog</span>
            )}
          </h1>
          <p className={`text-xs md:text-sm max-w-2xl mx-auto leading-relaxed ${isDarkMode ? 'text-sky-200/70' : 'text-muted-foreground'
            }`}>
            Buying guides, tech reviews, lifestyle tips, and everything you need to know about our premium products.
          </p>
        </div>

        {/* ── Filter tags nav (non-sticky, so ONLY the Home/Shop/Exit nav stays sticky) ── */}
        <div className="mx-auto mb-8 max-w-5xl">
          <nav aria-label="Filter blog posts by category">
            <div className={`flex w-full min-w-0 items-center justify-start sm:justify-center gap-1.5 overflow-x-auto overscroll-x-contain rounded border p-1.5 shadow-md backdrop-blur-md sm:gap-2 sm:p-2 transition-colors ${isDarkMode ? 'border-sky-900/60 bg-slate-900/85' : 'border-border bg-card/95'
              }`}>

              {/* Filter tag buttons */}
              {availableTags.length > 0 && ['All', ...availableTags].map(tag => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selectedTag === tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`shrink-0 rounded px-3 py-1.5 text-[0.7rem] font-semibold transition-all sm:px-4 sm:py-2 sm:text-sm ${isDarkMode
                    ? selectedTag === tag
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-sky-200/80 hover:bg-sky-950 hover:text-white border border-transparent hover:border-sky-800/50'
                    : selectedTag === tag
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >{tag}</button>
              ))}
            </div>
          </nav>
        </div>

        <main className="mx-auto max-w-4xl space-y-12">
          {visiblePosts.map((post) => (
            <article
              key={post.id}
              className={`group relative overflow-hidden rounded-sm border p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-300 ${isDarkMode
                ? 'border-sky-900/40 bg-slate-900/70 shadow-xl backdrop-blur-sm hover:border-sky-700/60 hover:shadow-2xl hover:shadow-blue-950/40'
                : 'border-border bg-card hover:shadow-md'
                }`}
            >
              {/* Top accent marker line (dark mode) */}
              {isDarkMode && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
              )}

              {post.imageUrl && (
                <div
                  onClick={() => openLightbox(post.imageUrl, post.title)}
                  className={`relative mb-6 h-56 w-full overflow-hidden rounded-sm bg-white sm:h-72 md:h-[400px] cursor-pointer group/img ${isDarkMode ? 'border border-sky-950 bg-slate-950' : ''
                    }`}
                  title="Click to view full image"
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className={`${post.fullImage ? 'object-contain' : 'object-cover'} transition-transform duration-500 group-hover/img:scale-105`}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center pointer-events-none">
                    <span className={`opacity-0 group-hover/img:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5 font-medium ${isDarkMode
                      ? 'bg-slate-950/80 text-amber-300 border border-amber-500/30'
                      : 'bg-black/60 text-white'
                      }`}>
                      View full image
                    </span>
                  </div>
                </div>
              )}

              <div className={`flex items-center gap-4 text-xs md:text-sm mb-4 pb-3 border-b ${isDarkMode ? 'text-sky-300/70 border-sky-900/40' : 'text-muted-foreground border-border'
                }`}>
                <div className="flex items-center gap-1.5">
                  <User className={`w-3.5 h-3.5 ${isDarkMode ? 'text-amber-400' : ''}`} />
                  <span className={isDarkMode ? 'text-slate-200 font-medium' : ''}>{post.author}</span>
                </div>
                <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-sky-700' : 'bg-muted-foreground'}`} />
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isDarkMode ? 'text-sky-400' : ''}`} />
                  <span>
                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {post.tag && (
                <div className="mb-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider ${isDarkMode
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-primary font-bold'
                    }`}>
                    {post.tag}
                  </span>
                </div>
              )}
              <h2 className={`mb-6 text-xl font-bold leading-tight sm:text-3xl transition-colors ${isDarkMode ? 'text-white group-hover:text-amber-300/90' : 'text-foreground'
                }`}>
                {post.title}
              </h2>

              {/* Render HTML content safely */}
              <div
                className={`mt-6 ${blogContentClasses} ${isDarkMode
                  ? 'text-slate-200 [&_h2]:text-white [&_h3]:text-white [&_strong]:text-amber-200 [&_a]:text-amber-400 [&_a:hover]:text-amber-300 [&_blockquote]:border-amber-400 [&_blockquote]:text-sky-200/90 [&_blockquote]:bg-sky-950/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r'
                  : ''
                  }`}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {post.productLinks && post.productLinks.length > 0 && (
                <div className={`mt-10 p-4 sm:p-6 rounded border ${isDarkMode ? 'bg-slate-950/60 border-sky-900/50' : 'bg-muted/30 border-border'
                  }`}>
                  <h3 className={`font-semibold text-base sm:text-lg mb-3 flex items-center gap-2 ${isDarkMode ? 'text-sky-200' : 'text-foreground'
                    }`}>
                    <ShoppingBag className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-primary'}`} />
                    <span>Featured in this article:</span>
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {post.productLinks.map((link, idx) => (
                      <Link
                        key={idx}
                        href={link.url}
                        className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm ${isDarkMode
                          ? 'bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 hover:border-amber-400'
                          : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                          }`}
                      >
                        {link.name}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </main>

        <div className="mt-12">
          <AdSenseBox adSlot="bottom_blog_banner" />
        </div>
      </div>

      {/* ── Floating scroll-to-top button (bottom-right, dynamic on scroll) ── */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full shadow-2xl transition-all duration-300 active:scale-95 animate-in fade-in zoom-in-75 ${isDarkMode
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-300/40 shadow-amber-500/30'
            : 'bg-primary hover:bg-primary-hover text-white shadow-lg'
            }`}
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
