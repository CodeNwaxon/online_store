"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export default function AdSenseBox({ adSlot, adFormat = "auto", fullWidthResponsive = "true" }: { adSlot: string, adFormat?: string, fullWidthResponsive?: string }) {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!pathname.startsWith('/blog') || !clientId) return;

    const scriptSelector = "script[data-nomo-adsense]";
    if (!document.querySelector(scriptSelector)) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.nomoAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      document.head.appendChild(script);
    }

    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  }, [clientId, pathname]);

  // Put AdSense ONLY on blog to avoid slowing down the marketplace
  if (!pathname.startsWith('/blog')) {
    return null;
  }

  if (!clientId) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden flex justify-center items-center my-4">
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minWidth: "250px" }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      ></ins>
    </div>
  );
}
