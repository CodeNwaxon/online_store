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
    title: `${siteName} | Premium African Inspired Goods`,
    description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
    manifest: "/manifest.json",
    icons: {
      icon: "/favicon.png",
    },
    openGraph: {
      title: `${siteName} | Premium African Inspired Goods`,
      description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
      url: "https://nomo-store.vercel.app",
      siteName: siteName,
      images: [
        {
          url: "https://res.cloudinary.com/dfwpxohxg/image/upload/v1778079956/environment_zlryzu.jpg",
          width: 800,
          height: 600,
          alt: `${siteName} Logo`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} | Premium African Inspired Goods`,
      description: `Shop the best electronics, furniture, and more with ${siteName}, our vibrant African-inspired online store.`,
      images: ["https://res.cloudinary.com/dfwpxohxg/image/upload/v1778079956/environment_zlryzu.jpg"],
    },
  };
}

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-background text-foreground antialiased font-sans">
        <Toaster position="top-center" reverseOrder={false} />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
