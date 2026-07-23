'use client';

import { FaStar } from 'react-icons/fa';
import { useStarThresholds } from '@/hooks/useStarThresholds';

interface StoreRatingStarsProps {
  salesCount: number;
  textColor?: string;
  size?: number;
  showSalesText?: boolean;
  className?: string;
}

export default function StoreRatingStars({
  salesCount,
  textColor = 'text-amber-400',
  size = 16,
  showSalesText = true,
  className = '',
}: StoreRatingStarsProps) {
  const starThresholds = useStarThresholds();
  // Fallback defaults if thresholds not loaded yet
  const thresholds = starThresholds ?? { 1: 20, 2: 50, 3: 100, 4: 250, 5: 500 };

  const getStarRating = (sales: number): number => {
    if (sales >= (thresholds[5] ?? 500)) return 5;
    if (sales >= (thresholds[4] ?? 250)) return 4;
    if (sales >= (thresholds[3] ?? 100)) return 3;
    if (sales >= (thresholds[2] ?? 50)) return 2;
    if (sales >= (thresholds[1] ?? 20)) return 1;
    return 0;
  };

  const yellowStars = getStarRating(salesCount);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <FaStar
            key={starIndex}
            size={size}
            className={
              starIndex <= yellowStars
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-zinc-600'
            }
          />
        ))}
      </div>
      {showSalesText && (
        <span className={`text-xs md:text-sm font-semibold opacity-90 ${textColor}`}>
          Sales: {salesCount}
        </span>
      )}
    </div>
  );
}
