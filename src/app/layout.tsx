import type { Metadata, Viewport } from "next";
import "./globals.css";


export const viewport: Viewport = {
  themeColor: "#D48806",
};

export const metadata: Metadata = {
  title: "Quick Choice | Premium African Inspired Goods",
  description: "Shop the best electronics, furniture, and more with Quick Choice, our vibrant African-inspired online store.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Quick Choice | Premium African Inspired Goods",
    description: "Shop the best electronics, furniture, and more with Quick Choice, our vibrant African-inspired online store.",
    url: "https://quick-choice",
    siteName: "Quick Choice",
    images: [
      {
        url: "https://res.cloudinary.com/dfwpxohxg/image/upload/v1778079956/environment_zlryzu.jpg",
        width: 800,
        height: 600,
        alt: "Quick Choice Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quick Choice | Premium African Inspired Goods",
    description: "Shop the best electronics, furniture, and more with Quick Choice, our vibrant African-inspired online store.",
    images: ["https://res.cloudinary.com/dfwpxohxg/image/upload/v1778079956/environment_zlryzu.jpg"],
  },
};

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
