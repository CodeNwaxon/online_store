import type { Metadata, Viewport } from "next";
import "./globals.css";


export const viewport: Viewport = {
  themeColor: "#D48806",
};

export async function generateMetadata(): Promise<Metadata> {
  let siteName = '';
  let installmentBg = '';
  const backupImage = "https://res.cloudinary.com/dfwpxohxg/image/upload/v1794582043/lxluvvo7dbpc19fjedye.jpg";

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
      installmentBg = data.fields?.installmentBg?.stringValue || '';
    }
  } catch (error) {
    // Silent fallback to avoid console noise during build
  }

  const metaImage = installmentBg && installmentBg.trim() !== '' ? installmentBg.trim() : backupImage;

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
          url: metaImage,
          width: 1200,
          height: 630,
          alt: `${siteName || 'Store'} Preview`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | Premium African Inspired Goods`,
      description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
      images: [metaImage],
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
import MaintenanceGuard from "@/components/MaintenanceGuard";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* AdSense Script — plain <script> avoids Next.js injecting data-nscript which AdSense rejects */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning className="flex flex-col min-h-screen bg-background text-foreground antialiased font-sans">
        <ToasterProvider />
        <Suspense><VisitorTracker /></Suspense>
        <Suspense><BadgeManager /></Suspense>
        <Suspense><AnalyticsProvider /></Suspense>
        <InstallPrompt />
        <MaintenanceGuard>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </MaintenanceGuard>
        <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
