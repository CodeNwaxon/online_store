'use client';

import { useParams } from 'next/navigation';
import CategoryDetailPage from '@/components/CategoryDetailPage';

export default function ToiletKitchenDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <CategoryDetailPage
      id={id}
      collectionName="toilet_kitchen"
      themeConfig={{
        accent: 'text-teal-600',
        btn: 'bg-teal-600 hover:bg-teal-700',
        lightBg: 'bg-teal-50',
        lightBorder: 'border-teal-100'
      }}
      backPath="/shop/toilet-kitchen"
      categoryName="Toilet & Kitchen"
    />
  );
}
