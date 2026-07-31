import { postJson, postJsonWithAuth } from "@/lib/api-client";
import type {
  BookingPricingPreviewRequest,
  BookingPricingPreviewResponse,
} from "@/lib/booking-pricing-preview-types";

const PRICING_PREVIEW_ENDPOINT = "/api/bookings/pricing-preview";

export async function fetchBookingPricingPreview(
  payload: BookingPricingPreviewRequest,
  init?: RequestInit,
  authenticated = false,
): Promise<BookingPricingPreviewResponse> {
  if (authenticated) {
    return postJsonWithAuth<
      BookingPricingPreviewResponse,
      BookingPricingPreviewRequest
    >(PRICING_PREVIEW_ENDPOINT, payload, init);
  }

  return postJson<BookingPricingPreviewResponse, BookingPricingPreviewRequest>(
    PRICING_PREVIEW_ENDPOINT,
    payload,
    init,
  );
}
