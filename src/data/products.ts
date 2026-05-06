export type Category = 'Electronics' | 'Furniture';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: Category;
  subcategory?: string;
  image: string; // Keep this as the primary image
  images: string[]; // Add array for multiple images
  manufacturer: string; // Add manufacturer field
  isPromo?: boolean;
  oldPrice?: number;
}

export const products: Product[] = [
  // Electronics
  {
    id: 'e1',
    name: 'Smart 4K UHD TV - 55"',
    price: 450,
    description: 'Immersive 4K resolution with HDR and smart features for your home entertainment.',
    category: 'Electronics',
    subcategory: 'TV',
    image: 'https://picsum.photos/seed/tv1/800/600',
    images: [
      'https://picsum.photos/seed/tv1/800/600',
      'https://picsum.photos/seed/tv2/800/600',
      'https://picsum.photos/seed/tv3/800/600'
    ],
    manufacturer: 'LG Electronics',
    isPromo: true,
    oldPrice: 550
  },
  {
    id: 'e2',
    name: 'Double Door Refrigerator',
    price: 750,
    description: 'Energy-efficient cooling with a spacious interior and frost-free technology.',
    category: 'Electronics',
    subcategory: 'Fridge',
    image: 'https://picsum.photos/seed/fridge1/800/600',
    images: [
      'https://picsum.photos/seed/fridge1/800/600',
      'https://picsum.photos/seed/fridge2/800/600',
      'https://picsum.photos/seed/fridge3/800/600'
    ],
    manufacturer: 'Samsung',
    isPromo: true,
    oldPrice: 850
  },
  {
    id: 'e3',
    name: 'Front Load Washing Machine',
    price: 580,
    description: 'Quiet and powerful washing with multiple modes for all fabric types.',
    category: 'Electronics',
    subcategory: 'Washing Machines',
    image: 'https://picsum.photos/seed/washing1/800/600',
    images: [
      'https://picsum.photos/seed/washing1/800/600',
      'https://picsum.photos/seed/washing2/800/600',
      'https://picsum.photos/seed/washing3/800/600'
    ],
    manufacturer: 'Haier Thermocool',
    isPromo: true,
    oldPrice: 650
  },
  {
    id: 'e4',
    name: 'High-Speed Standing Fan',
    price: 45,
    description: 'Powerful airflow to keep you cool during the warmest days.',
    category: 'Electronics',
    subcategory: 'Fans',
    image: 'https://picsum.photos/seed/fan1/800/600',
    images: [
      'https://picsum.photos/seed/fan1/800/600',
      'https://picsum.photos/seed/fan2/800/600',
      'https://picsum.photos/seed/fan3/800/600'
    ],
    manufacturer: 'Binatone',
    isPromo: true,
    oldPrice: 60
  },
  {
    id: 'e5',
    name: 'Digital Microwave Oven',
    price: 120,
    description: 'Fast and even heating with pre-programmed cooking modes.',
    category: 'Electronics',
    subcategory: 'Ovens',
    image: 'https://picsum.photos/seed/oven1/800/600',
    images: [
      'https://picsum.photos/seed/oven1/800/600',
      'https://picsum.photos/seed/oven2/800/600',
      'https://picsum.photos/seed/oven3/800/600'
    ],
    manufacturer: 'Panasonic'
  },
  {
    id: 'e6',
    name: 'Portable Gasoline Generator',
    price: 850,
    description: 'Reliable power backup for your home or small business.',
    category: 'Electronics',
    subcategory: 'Generators',
    image: 'https://picsum.photos/seed/generator1/800/600',
    images: [
      'https://picsum.photos/seed/generator1/800/600',
      'https://picsum.photos/seed/generator2/800/600',
      'https://picsum.photos/seed/generator3/800/600'
    ],
    manufacturer: 'Honda',
    isPromo: true,
    oldPrice: 950
  },
  {
    id: 'e7',
    name: 'Inverter Air Conditioner',
    price: 620,
    description: 'Energy-saving cooling with quiet operation and smart temperature control.',
    category: 'Electronics',
    subcategory: 'Inverter Aircons',
    image: 'https://picsum.photos/seed/aircon1/800/600',
    images: [
      'https://picsum.photos/seed/aircon1/800/600',
      'https://picsum.photos/seed/aircon2/800/600',
      'https://picsum.photos/seed/aircon3/800/600'
    ],
    manufacturer: 'Hisense'
  },
  {
    id: 'e8',
    name: 'Solar Power Bank 20000mAh',
    price: 35,
    description: 'Charge your devices on the go with sustainable solar energy.',
    category: 'Electronics',
    subcategory: 'Solar Power Banks',
    image: 'https://picsum.photos/seed/powerbank1/800/600',
    images: [
      'https://picsum.photos/seed/powerbank1/800/600',
      'https://picsum.photos/seed/powerbank2/800/600',
      'https://picsum.photos/seed/powerbank3/800/600'
    ],
    manufacturer: 'Oraimo'
  },
  
  // Furniture
  {
    id: 'f1',
    name: 'Handcrafted Mahogany Dining Set',
    price: 1200,
    description: 'A beautiful 6-seater dining set made from premium mahogany wood with traditional carvings.',
    category: 'Furniture',
    subcategory: 'Dining Sets',
    image: 'https://picsum.photos/seed/dining1/800/600',
    images: [
      'https://picsum.photos/seed/dining1/800/600',
      'https://picsum.photos/seed/dining2/800/600',
      'https://picsum.photos/seed/dining3/800/600'
    ],
    manufacturer: 'Lagos Artisans',
    isPromo: true,
    oldPrice: 1500
  },
  {
    id: 'f2',
    name: 'Modern Velvet Sofa',
    price: 950,
    description: 'Comfortable and stylish 3-seater sofa with vibrant patterns.',
    category: 'Furniture',
    subcategory: 'Sofas',
    image: 'https://picsum.photos/seed/sofa1/800/600',
    images: [
      'https://picsum.photos/seed/sofa1/800/600',
      'https://picsum.photos/seed/sofa2/800/600',
      'https://picsum.photos/seed/sofa3/800/600'
    ],
    manufacturer: 'Premium Living'
  },
  {
    id: 'f3',
    name: 'Solid Oak Coffee Table',
    price: 280,
    description: 'Durable and elegant coffee table with a natural finish.',
    category: 'Furniture',
    subcategory: 'Tables',
    image: 'https://picsum.photos/seed/coffee1/800/600',
    images: [
      'https://picsum.photos/seed/coffee1/800/600',
      'https://picsum.photos/seed/coffee2/800/600',
      'https://picsum.photos/seed/coffee3/800/600'
    ],
    manufacturer: 'WoodMasters',
    isPromo: true,
    oldPrice: 350
  }


];
