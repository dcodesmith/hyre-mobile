import type { BookingDetail } from "@/services/bookings";
import type { GuestBookingDetailsResponse } from "@/services/guest-booking-access";

export type BookingDetailAccessMode =
  | "loading"
  | "account"
  | "guest"
  | "expired"
  | "unauthenticated";

export function resolveBookingDetailAccess({
  isAuthHydrating,
  isAuthenticated,
  guestSessionStatus,
}: {
  isAuthHydrating: boolean;
  isAuthenticated: boolean;
  guestSessionStatus: "loading" | "valid" | "expired" | "missing";
}): BookingDetailAccessMode {
  if (isAuthHydrating) return "loading";
  if (isAuthenticated) return "account";
  if (guestSessionStatus === "loading") return "loading";
  if (guestSessionStatus === "valid") return "guest";
  if (guestSessionStatus === "expired") return "expired";
  return "unauthenticated";
}

export function guestBookingAsDetail(
  booking: GuestBookingDetailsResponse,
): BookingDetail {
  return {
    id: booking.bookingId,
    bookingReference: booking.bookingReference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    type: booking.bookingType,
    startDate: booking.startDate,
    endDate: booking.endDate,
    pickupLocation: booking.pickupLocation,
    returnLocation: booking.returnLocation,
    totalAmount: booking.totalAmount,
    modificationCutoffAt: booking.startDate,
    canEdit: false,
    canCancel: false,
    netTotal: null,
    platformCustomerServiceFeeAmount: null,
    platformCustomerServiceFeeRatePercent: null,
    vatAmount: null,
    vatRatePercent: null,
    securityDetailCost: null,
    fuelUpgradeCost: null,
    referralDiscountAmount: null,
    referralCreditsUsed: null,
    referralCreditsReserved: null,
    car: {
      ...booking.car,
      images: booking.car.images.map((url) => ({ url })),
    },
    chauffeur: booking.chauffeur,
    flight: null,
    legs: booking.legs.map((leg) => ({
      id: leg.id,
      legDate: leg.legDate,
      legStartTime: leg.legStartTime,
      legEndTime: leg.legEndTime,
      extensions: leg.extensions.map((extension) => ({
        id: extension.id,
        status: extension.status,
        paymentStatus: extension.paymentStatus,
        extendedDurationHours: extension.extendedDurationHours,
        netTotal: null,
      })),
      canExtend: false,
      maxExtendableHours: 0,
    })),
  };
}
