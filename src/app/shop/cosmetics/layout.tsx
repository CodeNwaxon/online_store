import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cosmetics & Beauty | Nomo Storez',
  description: 'Discover our range of premium skincare, makeup, and beauty products on Nomo Storez.',
};

export default function CosmeticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
