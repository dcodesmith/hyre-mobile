import type { BookingDetail } from "@/services/bookings";

const money = (value: number | string | null | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function createBookingPaymentSummary(booking: BookingDetail) {
  const extension = booking.legs
    .flatMap((leg) =>
      leg.extensions.filter(
        (item) => item.status === "ACTIVE" && item.paymentStatus === "PAID",
      ),
    )
    .reduce(
      (summary, item) => ({
        netTotal: summary.netTotal + money(item.netTotal),
        hours: summary.hours + item.extendedDurationHours,
      }),
      { netTotal: 0, hours: 0 },
    );
  const netTotal = money(booking.netTotal);
  const addons = booking.addons ?? [];
  const addonTotal = addons.reduce(
    (total, addon) => total + money(addon.totalPrice),
    0,
  );
  const fuelUpgradeCost = money(booking.fuelUpgradeCost);
  const referralDiscountAmount = money(booking.referralDiscountAmount);
  const referralCreditsUsed = money(booking.referralCreditsUsed);
  const referralCreditsReserved = money(booking.referralCreditsReserved);
  const platformFeeRate = money(
    booking.platformCustomerServiceFeeRatePercent,
  );
  const basePlatformFee = money(booking.platformCustomerServiceFeeAmount);
  const vatRate = money(booking.vatRatePercent);
  const baseVat = money(booking.vatAmount);

  if (extension.hours === 0) {
    return {
      netTotal,
      extensionNetTotal: 0,
      extendedHours: 0,
      addons,
      fuelUpgradeCost,
      referralDiscountAmount,
      referralCreditsUsed,
      referralCreditsReserved,
      platformFee: basePlatformFee,
      platformFeeRate,
      vatAmount: baseVat,
      vatRate,
      totalAmount: money(booking.totalAmount),
    };
  }

  const extensionPlatformFee =
    extension.netTotal * (platformFeeRate / 100);
  const extensionVat =
    (extension.netTotal + extensionPlatformFee) * (vatRate / 100);

  return {
    netTotal,
    extensionNetTotal: extension.netTotal,
    extendedHours: extension.hours,
    addons,
    fuelUpgradeCost,
    referralDiscountAmount,
    referralCreditsUsed,
    referralCreditsReserved,
    platformFee: basePlatformFee + extensionPlatformFee,
    platformFeeRate,
    vatAmount: baseVat + extensionVat,
    vatRate,
    totalAmount:
      netTotal +
      extension.netTotal +
      basePlatformFee +
      extensionPlatformFee +
      baseVat +
      extensionVat +
      addonTotal +
      fuelUpgradeCost -
      referralDiscountAmount -
      referralCreditsUsed,
  };
}
