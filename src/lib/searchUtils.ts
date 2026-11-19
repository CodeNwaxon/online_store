import Fuse from 'fuse.js';

export interface RamRomSpec {
  ram: number;
  rom: number;
}

/**
 * Extracts RAM/ROM and any remaining text from a query or string.
 * Supports:
 * - "A6c(4+64)", "A6c (4+64)", "Oppo A6c 4/64"
 * - "4/64", "4+64", "4gb 64gb", "4gig 64", "4ram 64rom", "4/64gb", "4gb/64gb"
 * - "4 gig ram 64 gig rom", "8gb 128gb", "16/512", etc.
 */
export function extractRamRomAndText(query: string): { text: string; ramRom: RamRomSpec | null } {
  if (!query) return { text: '', ramRom: null };
  const q = query.trim();

  const patterns = [
    // (4+64), 4/64, 4+64, 4/64gb, 4gb/64gb, 4gb+64gb, 4+64GB, etc.
    /\(?\b(\d{1,2})\s*(?:gb|gig|g)?\s*[\/\+]\s*(\d{2,4})\s*(?:gb|gig|g)?\s*\)?/i,
    // 4gb ram and 64gb rom, 4 gig ram 64 gig rom, 4 ram 64 rom
    /\b(\d{1,2})\s*(?:gb|gig|g)?\s*ram\s*(?:and|,|&|\/|\+)?\s*(\d{2,4})\s*(?:gb|gig|g)?\s*rom\b/i,
    // 4ram 64rom
    /\b(\d{1,2})\s*ram\s*(\d{2,4})\s*rom\b/i,
    // 4gb 64gb, 4gig 64, 8gb 128gb
    /\b(\d{1,2})\s*(?:gb|gig)\s+(?:and|,|&)?\s*(\d{2,4})\s*(?:gb|gig|rom)?\b/i,
    // 4 ram 64
    /\b(\d{1,2})\s*ram\s+(?:and|,|&)?\s*(\d{2,4})\b/i
  ];

  let foundMatch: RamRomSpec | null = null;
  let matchedSubstr = '';

  for (const pat of patterns) {
    const m = q.match(pat);
    if (m) {
      const ram = parseInt(m[1], 10);
      const rom = parseInt(m[2], 10);
      // Valid RAM (1 to 64) and ROM (8 to 2048)
      if (ram >= 1 && ram <= 64 && rom >= 8 && rom <= 2048) {
        foundMatch = { ram, rom };
        matchedSubstr = m[0];
        break;
      }
    }
  }

  if (foundMatch) {
    const remainingText = q
      .replace(matchedSubstr, ' ')
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: remainingText, ramRom: foundMatch };
  }

  return { text: q, ramRom: null };
}

/**
 * Retrieves the RAM & ROM of a product if available from ramRom, ram, rom, name, or description.
 */
export function getProductRamRom(product: any): RamRomSpec | null {
  if (!product) return null;

  // 1. Direct ram & rom fields
  if (product.ram && product.rom) {
    const r = parseInt(String(product.ram).replace(/\D/g, ''), 10);
    const m = parseInt(String(product.rom).replace(/\D/g, ''), 10);
    if (r && m) return { ram: r, rom: m };
  }

  // 2. ramRom field (e.g. "4+64", "4/64", "8GB/256GB")
  if (product.ramRom && typeof product.ramRom === 'string') {
    const parsed = extractRamRomAndText(product.ramRom);
    if (parsed.ramRom) return parsed.ramRom;
  }

  // 3. Name or Description fallback
  if (product.name && typeof product.name === 'string') {
    const parsed = extractRamRomAndText(product.name);
    if (parsed.ramRom) return parsed.ramRom;
  }
  if (product.description && typeof product.description === 'string') {
    const parsed = extractRamRomAndText(product.description);
    if (parsed.ramRom) return parsed.ramRom;
  }

  return null;
}

/**
 * Searches and filters a list of products using RAM/ROM awareness and text matching.
 */
export function searchProductsWithRamRom<T extends Record<string, any>>(
  products: T[],
  query: string,
  extraKeys: string[] = ['name', 'manufacturer', 'category', 'group', 'productCode', 'description']
): T[] {
  if (!query || !query.trim()) return products;

  const { text, ramRom } = extractRamRomAndText(query);
  const qText = text.toLowerCase().trim();

  // If query specifies RAM/ROM:
  if (ramRom) {
    // 1. Filter products that match this RAM and ROM
    const matchingRamRomProds = products.filter((p) => {
      const pSpec = getProductRamRom(p);
      if (!pSpec) return false;
      return pSpec.ram === ramRom.ram && pSpec.rom === ramRom.rom;
    });

    // If no text part was provided (e.g. user just searched "4/64" or "4gb 64gb"), return all matching
    if (!qText) {
      return matchingRamRomProds;
    }

    // If text was also provided (e.g. "A6c" in "A6c(4+64)" or "Oppo A6c 4/64"):
    // First try simple substring matching
    const substringMatches = matchingRamRomProds.filter((p) => {
      return extraKeys.some((k) => {
        const val = p[k];
        return typeof val === 'string' && val.toLowerCase().includes(qText);
      });
    });

    if (substringMatches.length > 0) return substringMatches;

    // Fallback to fuzzy search on the RAM/ROM matching subset
    const fuse = new Fuse(matchingRamRomProds, {
      keys: extraKeys,
      threshold: 0.4,
      ignoreLocation: true,
    });
    return fuse.search(qText).map((r) => r.item);
  }

  // Standard search when no RAM/ROM is in the query:
  const rawQ = query.toLowerCase().trim();
  const simpleMatches = products.filter((p) => {
    return (
      extraKeys.some((k) => {
        const val = p[k];
        return typeof val === 'string' && val.toLowerCase().includes(rawQ);
      }) ||
      (typeof p.ramRom === 'string' && p.ramRom.toLowerCase().includes(rawQ))
    );
  });

  if (simpleMatches.length > 0) return simpleMatches;

  const fuse = new Fuse(products, {
    keys: [...extraKeys, 'ramRom'],
    threshold: 0.35,
    ignoreLocation: true,
  });

  return fuse.search(query.trim()).map((r) => r.item);
}
