'use client';

import { useParams } from 'next/navigation';
import CategoryDetailPage from '@/components/CategoryDetailPage';

export default function CosmeticsDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="cosmetics"
      themeConfig={{
        accent: 'text-pink-600',
        btn: 'bg-pink-600 hover:bg-pink-700',
        lightBg: 'bg-pink-50',
        lightBorder: 'border-pink-100'
      }}
      backPath="/shop/cosmetics"
      categoryName="Cosmetics"
    />
  );
}
