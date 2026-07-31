import type { CarPromotion } from "./car-types";

/**
 * Matches hyre-worker `PromotionService.applyPromotionDiscount` (percentage off list rate).
 */
export function applyPromotionDiscount(
  originalRate: number,
  discountPercent: number,
): number {
  if (originalRate <= 0 || discountPercent <= 0) {
    return originalRate;
  }
  const discount = (originalRate * discountPercent) / 100;
  return Math.max(1, originalRate - discount);
}

export function promotionBadgeLabel(discountPercent: number): string {
  const n = Number(discountPercent);
  const label = Number.isInteger(n)
    ? String(n)
    : n.toFixed(1).replace(/\.0$/, "");
  return `${label}% OFF`;
}

export function hasActivePromotion(
  promotion: CarPromotion | null | undefined,
): promotion is CarPromotion {
  return (
    promotion != null &&
    typeof promotion.discountValue === "number" &&
    promotion.discountValue > 0
  );
}
