import CategoryDetailPage from '@/components/CategoryDetailPage';
import { adminDb } from '@/lib/firebaseAdmin';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const docSnap = await adminDb.collection('wears').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const title = data?.name || 'Wears Product';
      const description = data?.description ? (data.description.length > 150 ? data.description.substring(0, 147) + '...' : data.description) : 'Check out this amazing wears product on Nomo Storez!';
      
      // Determine best image
      let imageUrl = '/images/placeholder.png';
      if (data?.images && data.images.length > 0) {
        imageUrl = data.images[0];
      } else if (data?.image) {
        imageUrl = data.image;
      }
      
      const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://nomo-store.vercel.app${imageUrl}`;
      
      return {
        title: `${title} | Nomo Storez`,
        description,
        openGraph: {
          title: `${title} | Nomo Storez`,
          description,
          images: [
            {
              url: absoluteImageUrl,
              width: 1200,
              height: 630,
              alt: title,
            }
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title: `${title} | Nomo Storez`,
          description,
          images: [absoluteImageUrl],
        }
      };
    }
  } catch (error) {
    console.error("Error generating metadata", error);
  }
  
  return {
    title: 'Wears | Nomo Storez',
  }
}

export default async function WearsDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="wears"
      themeConfig={{
        accent: 'text-purple-600',
        btn: 'bg-purple-600 hover:bg-purple-700',
        lightBg: 'bg-purple-50',
        lightBorder: 'border-purple-100'
      }}
      backPath="/shop/wears"
      categoryName="Wears"
    />
  );
}
