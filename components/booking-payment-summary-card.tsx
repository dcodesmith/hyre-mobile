import { BookingDetailSectionTitle } from "@/components/booking-detail-section-title";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createBookingPaymentSummary } from "@/lib/booking-payment-summary";
import { formatCurrency } from "@/lib/currency";
import type { BookingDetail } from "@/services/bookings";
import { CreditCard } from "lucide-react-native";
import { Text, View } from "react-native";

export function BookingPaymentSummaryCard({
  booking,
  showBreakdown = true,
}: Readonly<{ booking: BookingDetail; showBreakdown?: boolean }>) {
  const {
    netTotal,
    extensionNetTotal,
    extendedHours,
    securityDetailCost,
    fuelUpgradeCost,
    referralDiscountAmount,
    referralCreditsUsed,
    referralCreditsReserved,
    platformFee,
    platformFeeRate,
    vatAmount,
    vatRate,
    totalAmount: summaryTotalAmount,
  } = createBookingPaymentSummary(booking);

  return (
    <Card className="rounded-xl py-4">
      <CardHeader className="px-4">
        <BookingDetailSectionTitle
          icon={<CreditCard size={18} color="#2563EB" />}
          title="Payment Summary"
        />
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <View className="gap-2.5">
          {showBreakdown ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-600">
                  Net Total ({booking.legs.length}{" "}
                  {booking.legs.length === 1 ? "day" : "days"})
                </Text>
                <Text className="text-sm font-medium text-slate-950">
                  {formatCurrency(netTotal)}
                </Text>
              </View>

              {extensionNetTotal > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">
                    Extension ({extendedHours}{" "}
                    {extendedHours === 1 ? "hour" : "hours"})
                  </Text>
                  <Text className="text-sm font-medium text-slate-950">
                    {formatCurrency(extensionNetTotal)}
                  </Text>
                </View>
              ) : null}

              {securityDetailCost > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">Security Detail</Text>
                  <Text className="text-sm font-medium text-slate-950">
                    {formatCurrency(securityDetailCost)}
                  </Text>
                </View>
              ) : null}

              {fuelUpgradeCost > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">Fuel Upgrade</Text>
                  <Text className="text-sm font-medium text-slate-950">
                    {formatCurrency(fuelUpgradeCost)}
                  </Text>
                </View>
              ) : null}

              {referralDiscountAmount > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-green-600">
                    Referral Discount
                  </Text>
                  <Text className="text-sm font-medium text-green-600">
                    -{formatCurrency(referralDiscountAmount)}
                  </Text>
                </View>
              ) : null}

              {referralCreditsUsed > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-green-600">
                    Referral Credits Used
                  </Text>
                  <Text className="text-sm font-medium text-green-600">
                    -{formatCurrency(referralCreditsUsed)}
                  </Text>
                </View>
              ) : null}

              {referralCreditsReserved > 0 &&
              booking.paymentStatus !== "PAID" ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-orange-600">
                    Referral Credits (Pending Payment)
                  </Text>
                  <Text className="text-sm font-medium text-orange-600">
                    -{formatCurrency(referralCreditsReserved)}
                  </Text>
                </View>
              ) : null}

              {platformFee > 0 ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">
                    Platform Fee ({platformFeeRate}%)
                  </Text>
                  <Text className="text-sm font-medium text-slate-950">
                    {formatCurrency(platformFee)}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-600">VAT ({vatRate}%)</Text>
                <Text className="text-sm font-medium text-slate-950">
                  {formatCurrency(vatAmount)}
                </Text>
              </View>

              <View className="my-1 h-px bg-neutral-200" />
            </>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-neutral-950">
              Total Amount
            </Text>
            <Text className="text-base font-bold text-neutral-950">
              {formatCurrency(
                showBreakdown ? summaryTotalAmount : booking.totalAmount,
              )}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
