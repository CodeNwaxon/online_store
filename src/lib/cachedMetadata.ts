import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Cached server-side reads used ONLY by generateMetadata (SEO / social previews).
 * Crawlers hitting thousands of product URLs previously triggered one Firestore
 * Admin read per request. These results are cached for 1 hour across requests.
 *
 * NOTE: The product lists / details that real users see are fetched client-side
 * and are NOT affected by this cache, so users still see fresh products.
 */
const REVALIDATE_SECONDS = 3600;

const fetchDocFields = unstable_cache(
  async (collection: string, id: string) => {
    const snap = await adminDb.collection(collection).doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    // Only keep the JSON-safe fields metadata needs
    return {
      name: d.name ?? null,
      description: d.description ?? null,
      images: Array.isArray(d.images) ? d.images : null,
      image: d.image ?? null,
    };
  },
  ['metadata-doc'],
  { revalidate: REVALIDATE_SECONDS }
);

/** Drop-in replacement for `adminDb.collection(c).doc(id).get()` in generateMetadata. */
export async function getCachedDocSnap(collection: string, id: string) {
  const data = await fetchDocFields(collection, id);
  return { exists: !!data, data: () => (data ?? undefined) as any };
}

const fetchStoreBySlug = unstable_cache(
  async (slug: string) => {
    const snap = await adminDb
      .collection('admins')
      .where('specialStore.slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const store = snap.docs[0].data().specialStore || {};
    return {
      name: store.name ?? null,
      slogan: store.slogan ?? null,
      banner: store.banner ?? null,
      slug: store.slug ?? null,
    };
  },
  ['metadata-store'],
  { revalidate: REVALIDATE_SECONDS }
);

/** Drop-in replacement for the `admins` specialStore slug query in generateMetadata. */
export async function getCachedStoreSnap(slug: string) {
  const store = await fetchStoreBySlug(slug);
  return {
    empty: !store,
    docs: store ? [{ data: () => ({ specialStore: store }) as any }] : [],
  };
}
