import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import { Button } from "@/components/ui/button";
import type { BookingAddonSnapshot } from "@/lib/booking-addons";
import { createBookingPaymentSummary } from "@/lib/booking-payment-summary";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { BookingDetail } from "@/services/bookings";
import { CreditCard, Download } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";

function PaymentAddonRows({
	addons,
}: {
	readonly addons: readonly BookingAddonSnapshot[];
}) {
	return addons.map((addon) => (
		<PaymentRow
			key={addon.code}
			label={addon.quantity > 1 ? `${addon.name} (${addon.quantity})` : addon.name}
			value={formatCurrency(addon.totalPrice)}
		/>
	));
}

function PaymentRow({
	label,
	value,
	discount = false,
}: {
	readonly label: string;
	readonly value: string;
	readonly discount?: boolean;
}) {
	return (
		<View className="flex-row items-center justify-between gap-3">
			<Text
				className={cn(
					"min-w-0 flex-1 text-sm font-medium leading-5",
					discount ? "text-green-600" : "text-gray-500",
				)}
			>
				{label}
			</Text>
			<Text
				selectable
				className={cn(
					"shrink-0 text-sm font-medium leading-6",
					discount ? "text-green-600" : "text-gray-900",
				)}
				style={{ fontVariant: ["tabular-nums"] }}
			>
				{value}
			</Text>
		</View>
	);
}

export function BookingPaymentSummaryCard({
	booking,
	isDownloadingReceipt = false,
	onDownloadReceipt,
	receiptError,
	showBreakdown = true,
}: Readonly<{
	booking: BookingDetail;
	isDownloadingReceipt?: boolean;
	onDownloadReceipt?: () => void;
	receiptError?: string | null;
	showBreakdown?: boolean;
}>) {
	const {
		netTotal,
		extensionNetTotal,
		extendedHours,
		addons,
		fuelUpgradeCost,
		referralDiscountAmount,
		referralCreditsUsed,
		platformFee,
		platformFeeRate,
		vatAmount,
		vatRate,
		totalAmount: summaryTotalAmount,
		breakdownAvailable,
	} = createBookingPaymentSummary(booking);
	const showLines = showBreakdown && breakdownAvailable;

	const dayCount = booking.legs.length;

	return (
		<DetailCard>
			<DetailCardHeader>
				<DetailCardIcon>
					<CreditCard size={24} color="#111827" />
				</DetailCardIcon>
				<DetailCardTitle>Payment Summary</DetailCardTitle>
			</DetailCardHeader>
			<DetailCardBody>
				<View className="gap-3">
					{showLines ? (
						<>
							<PaymentRow
								label={`Net Total (${dayCount} ${dayCount === 1 ? "day" : "days"})`}
								value={formatCurrency(netTotal)}
							/>
							{extensionNetTotal > 0 ? (
								<PaymentRow
									label={`Extension (${extendedHours} hours)`}
									value={formatCurrency(extensionNetTotal)}
								/>
							) : null}
						</>
					) : null}
					<PaymentAddonRows addons={addons} />
					{showLines ? (
						<>
							{fuelUpgradeCost > 0 ? (
								<PaymentRow label="Fuel Upgrade" value={formatCurrency(fuelUpgradeCost)} />
							) : null}
							{referralDiscountAmount > 0 ? (
								<PaymentRow
									label="Referral Discount"
									value={`-${formatCurrency(referralDiscountAmount)}`}
									discount
								/>
							) : null}
							{referralCreditsUsed > 0 ? (
								<PaymentRow
									label="Referral Credits Used"
									value={`-${formatCurrency(referralCreditsUsed)}`}
									discount
								/>
							) : null}
							{platformFee > 0 ? (
								<PaymentRow
									label={`Platform Fee (${platformFeeRate}%)`}
									value={formatCurrency(platformFee)}
								/>
							) : null}
							<PaymentRow
								label={`VAT (${vatRate}%)`}
								value={formatCurrency(vatAmount)}
							/>
						</>
					) : null}
					<View className="flex-row items-center justify-between gap-3 border-t border-gray-200 pt-4">
						<Text className="text-sm font-semibold leading-5 text-gray-900">
							Total Amount
						</Text>
						<Text
							selectable
							className="text-sm font-medium leading-6 text-gray-900"
							style={{ fontVariant: ["tabular-nums"] }}
						>
							{formatCurrency(showLines ? summaryTotalAmount : booking.totalAmount)}
						</Text>
					</View>
					{onDownloadReceipt ? (
						<Button
							className="w-full"
							variant="outline"
							disabled={isDownloadingReceipt}
							onPress={onDownloadReceipt}
						>
							{isDownloadingReceipt ? (
								<ActivityIndicator size="small" color="#171717" />
							) : (
								<Download size={16} color="#171717" />
							)}
							<Text className="text-sm font-medium text-gray-900">Download Receipt</Text>
						</Button>
					) : null}
					{receiptError ? (
						<Text selectable className="text-sm text-red-600">
							{receiptError}
						</Text>
					) : null}
				</View>
			</DetailCardBody>
		</DetailCard>
	);
}
