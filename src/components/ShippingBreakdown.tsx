'use client';

interface ShippingItemBreakdown {
  id: string;
  name: string;
  size: string;
  quantity: number;
  unitShipping: number;
  totalShipping: number;
}

interface ShippingBreakdownProps {
  breakdown: {
    totalShipping: number;
    itemBreakdown: ShippingItemBreakdown[];
    highestFeeItem: string;
  };
  isLoading: boolean;
  error?: string;
}

export default function ShippingBreakdown({ breakdown, isLoading, error }: ShippingBreakdownProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Calculating shipping breakdown...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!breakdown.itemBreakdown.length) {
    return null;
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-background p-4 space-y-4 shadow-sm">
      <div className="text-sm text-muted-foreground">Shipping fee is calculated as one full fee for the highest-cost item, and 50% for every other item.</div>
      <div className="grid gap-3">
        {breakdown.itemBreakdown.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-lg border border-border bg-muted/50 p-3">
            <div className="flex justify-between items-center gap-4">
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.size.replace('-', ' ')} &times; {item.quantity}</div>
              </div>
              <div className="text-sm font-semibold">₦{item.totalShipping.toLocaleString()}</div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Base fee: ₦{item.unitShipping.toLocaleString()} per unit
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-border text-sm font-bold">
        <span>Grand shipping total</span>
        <span>₦{breakdown.totalShipping.toLocaleString()}</span>
      </div>
      {breakdown.highestFeeItem && (
        <div className="text-xs text-muted-foreground">
          Highest fee item: <span className="font-semibold text-foreground">{breakdown.highestFeeItem}</span>
        </div>
      )}
    </div>
  );
}
