import type { Metadata, Viewport } from "next";
import "./globals.css";


export const viewport: Viewport = {
  themeColor: "#D48806",
};

export async function generateMetadata(): Promise<Metadata> {
  let siteName = '';

  try {
    // Using fetch REST API to avoid GRPC errors in server-side metadata generation
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/general`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (response.ok) {
      const data = await response.json();
      siteName = data.fields?.siteName?.stringValue || '';
    }
  } catch (error) {
    // Silent fallback to avoid console noise during build
  }

  return {
    metadataBase: new URL("https://nomostores.com"),
    title: `${siteName} | Premium African Inspired Goods`,
    description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.png",
    },
    openGraph: {
      title: `${siteName} | Premium African Inspired Goods`,
      description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
      url: "https://nomostores.com",
      siteName: siteName,
      images: [
        {
          url: "https://res.cloudinary.com/dfwpxohxg/image/upload/v1785519623/euo3jpon7aqikkox8dxh.jpg",
          width: 800,
          height: 600,
          alt: `${siteName} Logo`,
        },
        {
          url: "https://nomostores.com/nomoStore_building.jpeg",
          width: 800,
          height: 600,
          alt: `${siteName} Store Building`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | Premium African Inspired Goods`,
      description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
      images: [
        "https://res.cloudinary.com/dfwpxohxg/image/upload/v1785519623/euo3jpon7aqikkox8dxh.jpg",
        "https://nomostores.com/nomoStore_building.jpeg"
      ],
    },
  };
}

import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VisitorTracker from "@/components/VisitorTracker";
import BadgeManager from "@/components/BadgeManager";
import ToasterProvider from "@/components/ToasterProvider";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import InstallPrompt from "@/components/InstallPrompt";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="flex flex-col min-h-screen bg-background text-foreground antialiased font-sans">
        <ToasterProvider />
        <Suspense><VisitorTracker /></Suspense>
        <Suspense><BadgeManager /></Suspense>
        <Suspense><AnalyticsProvider /></Suspense>
        <InstallPrompt />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
