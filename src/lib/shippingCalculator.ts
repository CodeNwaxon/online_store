import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type ShippingSize = 'extra-large' | 'large' | 'medium' | 'small' | 'extra-small' | 'extra-extra-small';

export interface CartItem {
  id: string;
  name: string;
  size: ShippingSize;
  quantity: number;
  price: number;
}

export interface ShippingItemBreakdown {
  id: string;
  name: string;
  size: ShippingSize;
  quantity: number;
  unitShipping: number;
  totalShipping: number;
}

export interface ShippingBreakdown {
  totalShipping: number;
  itemBreakdown: ShippingItemBreakdown[];
  highestFeeItem: string;
}

const ALL_SIZES: ShippingSize[] = ['extra-extra-small', 'extra-small', 'small', 'medium', 'large', 'extra-large'];

export const normalizeShippingSize = (size: string | undefined): ShippingSize => {
  const normalized = (size || 'medium')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z\-]/g, '');

  if (normalized === 'extralarge') return 'extra-large';
  if (normalized === 'extrasmall') return 'extra-small';
  if (normalized === 'extraextrasmall' || normalized === 'extra-extra-small') return 'extra-extra-small';
  if (ALL_SIZES.includes(normalized as ShippingSize)) {
    return normalized as ShippingSize;
  }

  return 'medium';
};

export const calculateCartShippingForArea = (
  cartItems: CartItem[],
  areaData: { prices?: Record<string, number> }
): ShippingBreakdown => {
  const expandedUnits = cartItems.flatMap((item) => {
    const size = normalizeShippingSize(item.size);
    const unitShipping = areaData.prices?.[size] ?? 0;
    return Array.from({ length: item.quantity }, () => ({
      id: item.id,
      name: item.name,
      size,
      unitShipping,
    }));
  });

  if (expandedUnits.length === 0) {
    return {
      totalShipping: 0,
      itemBreakdown: [],
      highestFeeItem: '',
    };
  }

  const highestUnitShipping = Math.max(...expandedUnits.map((unit) => unit.unitShipping));
  const baseUnitIndex = expandedUnits.findIndex((unit) => unit.unitShipping === highestUnitShipping);

  const chargedUnits = expandedUnits.map((unit, index) => ({
    ...unit,
    charge: index === baseUnitIndex ? unit.unitShipping : Math.round(unit.unitShipping * 0.5),
  }));

  const itemBreakdown = cartItems.map((item) => {
    const size = normalizeShippingSize(item.size);
    const unitShipping = areaData.prices?.[size] ?? 0;
    const unitCharges = chargedUnits.filter((unit) => unit.id === item.id);
    const totalShipping = unitCharges.reduce((sum, unit) => sum + unit.charge, 0);

    return {
      id: item.id,
      name: item.name,
      size,
      quantity: item.quantity,
      unitShipping,
      totalShipping,
    };
  });

  return {
    totalShipping: chargedUnits.reduce((sum, unit) => sum + unit.charge, 0),
    itemBreakdown,
    highestFeeItem: chargedUnits[baseUnitIndex]?.name || itemBreakdown[0]?.name || '',
  };
};

export const calculateCartShipping = async (
  cartItems: CartItem[],
  areaId: string
): Promise<ShippingBreakdown> => {
  if (!areaId) {
    throw new Error('Shipping area ID is required');
  }

  const docRef = doc(db, 'distribution_areas', areaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Shipping area not found');
  }

  const areaData = docSnap.data();

  if (!areaData?.prices) {
    throw new Error('Shipping area prices are unavailable');
  }

  return calculateCartShippingForArea(cartItems, areaData as { prices: Record<string, number> });
};
