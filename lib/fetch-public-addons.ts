import { ApiError, getJson, REQUEST_CANCELLED_CODE } from "@/lib/api-client";
import type { PublicAddon } from "@/lib/booking-addons";
import type { BookingType } from "@/lib/booking-types";

export async function fetchPublicAddons(
  bookingType: BookingType,
  init?: RequestInit,
): Promise<PublicAddon[]> {
  try {
    const response = await getJson<{ addons?: PublicAddon[] }>(
      `/api/addons?bookingType=${encodeURIComponent(bookingType)}`,
      init,
    );
    return Array.isArray(response.addons) ? response.addons : [];
  } catch (error) {
    if (error instanceof ApiError && error.code === REQUEST_CANCELLED_CODE) {
      throw error;
    }
    return [];
  }
}
