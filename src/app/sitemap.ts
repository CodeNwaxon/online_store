import type { MetadataRoute } from "next";

const siteUrl = "https://www.nomostores.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = [
    "",
    "/about",
    "/blog",
    "/contact",
    "/foods",
    "/partnership",
    "/shop",
    "/shop/cosmetics",
    "/shop/furniture",
    "/shop/toilet-kitchen",
    "/shop/uk-used",
    "/shop/wears",
  ];

  return publicPages.map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}
