export const getAvailableVariantQuantity = (
  product: any,
  selectedSize?: string,
  selectedColor?: string,
  selectedMeasurement?: string
): number => {
  // If product doesn't exist, return 0
  if (!product) return 0;

  let maxQty = Number(product.quantity) || 0;

  // Rule 0: uniqueImageVariants (Cosmetics)
  if (product.hasUniqueImageVariants && product.uniqueImageVariants && selectedColor && selectedColor !== 'Any Color') {
    const qty = product.uniqueImageVariants[selectedColor];
    if (qty !== undefined) {
      return Number(qty) || 0;
    }
  }

  // Rule 1: sizeColorQuantities (Wears)
  if (product.sizeColorQuantities && selectedSize && selectedColor && selectedColor !== 'Any Color') {
    const qty = product.sizeColorQuantities[selectedSize]?.[selectedColor];
    if (qty !== undefined) {
      return Number(qty) || 0;
    }
  }
  
  // Rule 1b: If "Any Color" is selected for a size in Wears, return the size's total quantity
  if (product.sizeQuantities && selectedSize) {
    const qty = product.sizeQuantities[selectedSize];
    if (qty !== undefined) {
      return Number(qty) || 0;
    }
  }

  // Rule 1c: measurementQuantities (Food / Eggs)
  if (product.measurementQuantities && selectedMeasurement) {
    let mq = product.measurementQuantities;
    if (typeof mq === 'string') {
      try {
        mq = JSON.parse(mq);
      } catch {}
    }
    if (typeof mq === 'object' && mq !== null && mq[selectedMeasurement] !== undefined) {
      return Number(mq[selectedMeasurement]) || 0;
    }
  }

  // Rule 2: variants (Products)
  if (product.variants && product.variants.length > 0 && selectedColor && selectedColor !== 'Any Color') {
    const v = product.variants.find((v: any) => v.color === selectedColor);
    if (v) {
      return Number(v.quantity) || 0;
    }
  }

  // Fallback to global quantity
  return maxQty;
};
