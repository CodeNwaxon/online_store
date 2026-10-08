"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdSenseBox({ adSlot, adFormat = "auto", fullWidthResponsive = "true" }: { adSlot: string, adFormat?: string, fullWidthResponsive?: string }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !pathname.startsWith('/blog')) return;

    try {
      if (typeof window !== "undefined") {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [isClient, pathname]);

  // Put AdSense ONLY on blog to avoid slowing down the marketplace
  if (!pathname.startsWith('/blog')) {
    return null;
  }

  // Prevent hydration errors by only rendering the ad block after the client has loaded
  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden flex justify-center items-center my-4">
      {/* Replace data-ad-client with your actual Google AdSense client ID */}
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minWidth: "250px" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      ></ins>
    </div>
  );
}
