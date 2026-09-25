/**
 * Utility to normalize expired promo products.
 * When a promo has expired (promoEndDate is in the past),
 * the old price becomes the normal price and the promo indicators are removed.
 * This runs at the rendering layer as a safety net since Firestore updates
 * may fail for non-admin users.
 */

export function getPromoEndTime(val: any): number {
  if (!val) return 0;
  if (typeof val === 'object' && val !== null) {
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    if ('seconds' in val) return val.seconds * 1000;
    if (typeof val.toMillis === 'function') return val.toMillis();
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Returns a normalized product with expired promo data cleaned up.
 * If the promo is expired:
 *   - isPromo becomes false
 *   - oldPrice becomes the normal price
 *   - promoEndDate is cleared
 *   - only one price is shown
 */
export function normalizeExpiredPromo<T extends Record<string, any>>(product: T): T {
  const promoEndNum = getPromoEndTime(product.promoEndDate);
  const isExpired = product.isPromo && promoEndNum > 0 && promoEndNum < Date.now();
  
  // Also handle products where isPromo is already false but oldPrice still lingers.
  // Since oldPrice is ONLY used for promos, if oldPrice exists but isPromo is false,
  // it means the promo was partially cleaned up (e.g. by a failed Firestore update
  // or a manual edit) and the price wasn't restored.
  const hasStaleOldPrice = !product.isPromo && product.oldPrice && product.oldPrice > 0;
  
  if (isExpired) {
    return {
      ...product,
      isPromo: false,
      promoEndDate: null,
      price: product.oldPrice || product.price,
      oldPrice: null,
    };
  }
  
  if (hasStaleOldPrice) {
    // If isPromo is false but oldPrice still exists,
    // the promo already expired but cleanup didn't fully happen.
    // Show oldPrice as the normal price.
    return {
      ...product,
      price: product.oldPrice,
      oldPrice: null,
      promoEndDate: null,
    };
  }
  
  return product;
}

/**
 * Normalizes an array of products, cleaning up all expired promos.
 */
export function normalizeExpiredPromos<T extends Record<string, any>>(products: T[]): T[] {
  return products.map(normalizeExpiredPromo);
}
