"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logPageView } from "@/lib/analytics";

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url =
        pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      logPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
