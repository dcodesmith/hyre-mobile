import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPromotionDiscount,
  hasActivePromotion,
  promotionBadgeLabel,
} from "./promotion-utils.ts";

test("applyPromotionDiscount matches worker percentage-off contract", () => {
  assert.equal(applyPromotionDiscount(10000, 10), 9000);
  assert.equal(applyPromotionDiscount(100, 100), 1);
  assert.equal(applyPromotionDiscount(0, 10), 0);
  assert.equal(applyPromotionDiscount(5000, 0), 5000);
});

test("promotion helpers ignore inactive discounts", () => {
  assert.equal(hasActivePromotion(null), false);
  assert.equal(hasActivePromotion({ discountValue: 0 }), false);
  assert.equal(hasActivePromotion({ discountValue: 15 }), true);
  assert.equal(promotionBadgeLabel(15), "15% OFF");
  assert.equal(promotionBadgeLabel(12.5), "12.5% OFF");
});
