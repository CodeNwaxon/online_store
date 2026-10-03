"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import AdSenseBox from "@/components/AdSenseBox";
import { Clock, ChevronRight, User } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  excerpt: string;
  imageUrl: string;
  author: string;
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

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setPosts([defaultPost]);
        } else {
          const fetchedPosts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as BlogPost[];
          setPosts(fetchedPosts);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdSenseBox adSlot="top_blog_banner" />
      
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">NomoStores Blog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Buying guides, tech reviews, lifestyle tips, and everything you need to know about our premium products.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-12">
          {posts.map((post) => (
            <article key={post.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden p-6 md:p-8">
              {post.imageUrl && (
                <div className="relative w-full h-64 md:h-[400px] mb-6 rounded-xl overflow-hidden">
                  <Image 
                    src={post.imageUrl} 
                    alt={post.title} 
                    fill 
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-6">{post.title}</h2>
              
              {/* Render HTML content safely */}
              <div 
                className="mt-6"
                dangerouslySetInnerHTML={{ __html: post.content }} 
              />
              
              {post.productLinks && post.productLinks.length > 0 && (
                <div className="mt-10 p-6 bg-muted/30 rounded-xl border border-border">
                  <h3 className="font-semibold text-lg mb-4">Featured in this article:</h3>
                  <div className="flex flex-wrap gap-3">
                    {post.productLinks.map((link, idx) => (
                      <Link 
                        key={idx} 
                        href={link.url}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors"
                      >
                        {link.name}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sticky top-24">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">About Our Blog</h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              We share insights, detailed buying guides, and the latest trends in tech, fashion, and lifestyle. Discover the true value of premium African-inspired goods.
            </p>
            
            <AdSenseBox adSlot="sidebar_square" adFormat="rectangle" />
            
            <h3 className="text-xl font-bold mt-8 mb-4 border-b pb-2">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/shop/electronics" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between">
                  Electronics & Gadgets
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </li>
              <li>
                <Link href="/shop/furniture" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between">
                  Home Furniture
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </li>
              <li>
                <Link href="/shop/wears" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between">
                  Men's Fashion
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <AdSenseBox adSlot="bottom_blog_banner" />
      </div>
    </div>
  );
}
