import { BookingActionDialogs } from "@/components/booking-action-dialogs";
import { BookingActionFeedbackBanner } from "@/components/booking-action-feedback-banner";
import { BookingChauffeurCard } from "@/components/booking-chauffeur-card";
import { BookingDetailActions } from "@/components/booking-detail-actions";
import { BookingDetailHeader } from "@/components/booking-detail-header";
import { BookingFlightCard } from "@/components/booking-flight-card";
import { BookingLocationCard } from "@/components/booking-location-card";
import { BookingPaymentSummaryCard } from "@/components/booking-payment-summary-card";
import { BookingTimelineCard } from "@/components/booking-timeline-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActionController } from "@/hooks/use-booking-action-controller";
import { useBookingDetailAccess } from "@/hooks/use-booking-detail-access";
import { ApiError } from "@/lib/api-client";
import { bookingTypeDescription } from "@/lib/booking-detail-display";
import { shareBookingReceipt } from "@/lib/booking-receipt-file";
import { buildBookingSignInRedirectPath } from "@/lib/sign-in-redirect";
import { reportHandledException } from "@/lib/telemetry";
import {
	fetchBookingReceipt,
	getBookingReceiptErrorMessage,
} from "@/services/booking-receipt";
import { deleteGuestBookingSession } from "@/storage/guest-booking-session";
import { useMutation } from "@tanstack/react-query";
import {
	type Href,
	Redirect,
	useLocalSearchParams,
	useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RECEIPT_PAYMENT_STATUSES: readonly string[] = [
	"PAID",
	"PARTIALLY_REFUNDED",
	"REFUNDED",
];

export default function BookingDetailScreen() {
	const { isAuthenticated, isHydrating, openLoginModal } = useAuth();
	const router = useRouter();
	const params = useLocalSearchParams<{ id: string }>();
	const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;

	const bookingQuery = useBookingDetailAccess({
		bookingId,
		isAuthenticated,
		isAuthHydrating: isHydrating,
	});
	const isGuest = bookingQuery.accessMode === "guest";
	const receiptRequest = useRef<AbortController | null>(null);
	useEffect(
		() => () => {
			receiptRequest.current?.abort();
		},
		[],
	);
	const receiptDownload = useMutation({
		mutationFn: async () => {
			const booking = bookingQuery.data;
			const guestToken = bookingQuery.guestToken;
			const access =
				bookingQuery.accessMode === "guest" && guestToken
					? { mode: "guest" as const, token: guestToken }
					: { mode: "account" as const };

			if (!booking) {
				throw new Error("Booking details are unavailable.");
			}

			const controller = new AbortController();
			receiptRequest.current = controller;
			try {
				const receipt = await fetchBookingReceipt(
					booking.id,
					access,
					controller.signal,
				);
				if (!controller.signal.aborted) {
					await shareBookingReceipt(receipt);
				}
			} catch (error) {
				if (
					access.mode === "guest" &&
					error instanceof ApiError &&
					error.status === 404
				) {
					await deleteGuestBookingSession(booking.id, access.token).catch(
						(cleanupError) => {
							reportHandledException(cleanupError, {
								area: "guest_booking",
								operation: "delete_session",
							});
						},
					);
					router.replace("/bookings/lookup?status=invalid-link");
				}
				throw error;
			} finally {
				if (receiptRequest.current === controller) {
					receiptRequest.current = null;
				}
			}
		},
	});
	const {
		canEdit,
		canCancel,
		isUpdatingBooking,
		isCancellingBooking,
		feedback,
		openModifyDialog,
		openCancelDialog,
		...controller
	} = useBookingActionController(
		isGuest ? undefined : bookingQuery.data,
		bookingQuery.isFetching,
	);

	if (bookingQuery.guestLinkInvalid) {
		return <Redirect href={"/bookings/lookup?status=invalid-link" as Href} />;
	}

	if (bookingQuery.accessMode === "unauthenticated") {
		return (
			<SafeAreaView
				className="flex-1 bg-white"
				edges={["top", "left", "right", "bottom"]}
			>
				<StatusBar style="dark" />
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-lg font-semibold text-neutral-950">
						Sign in to continue
					</Text>
					<Text className="mt-2 text-center text-sm text-neutral-500">
						Booking details are only available for authenticated users.
					</Text>
					<Button
						className="mt-5 w-full max-w-[220px]"
						onPress={openLoginModal}
					>
						<Text className="text-sm font-semibold text-white">Sign In</Text>
					</Button>
				</View>
			</SafeAreaView>
		);
	}

	if (bookingQuery.isLoading) {
		return (
			<SafeAreaView
				className="flex-1 bg-white"
				edges={["top", "left", "right", "bottom"]}
			>
				<StatusBar style="dark" />
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#6B7280" />
					<Text className="mt-2 text-sm text-neutral-500">
						Loading booking details...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (bookingQuery.error || !bookingQuery.data) {
		return (
			<SafeAreaView
				className="flex-1 bg-white"
				edges={["top", "left", "right", "bottom"]}
			>
				<StatusBar style="dark" />
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-lg font-semibold text-red-700">
						Booking not found
					</Text>
					<Text className="mt-2 text-center text-sm text-red-600">
						We couldn&apos;t fetch this booking. Please try again.
					</Text>
					<Button
						className="mt-5 w-full max-w-[220px]"
						onPress={() => bookingQuery.refetch()}
					>
						<Text className="text-sm font-semibold text-white">Retry</Text>
					</Button>
				</View>
			</SafeAreaView>
		);
	}

	const booking = bookingQuery.data;
	const canDownloadReceipt =
		booking.status === "COMPLETED" &&
		RECEIPT_PAYMENT_STATUSES.includes(booking.paymentStatus);

	return (
		<SafeAreaView
			className="flex-1 bg-white"
			edges={["top", "left", "right", "bottom"]}
		>
			<StatusBar style="dark" />
			<ScrollView className="flex-1" contentInsetAdjustmentBehavior="never">
				<View className="gap-4 px-4 py-4">
					<BookingDetailHeader
						booking={booking}
						isGuest={isGuest}
						actions={
							!isGuest && (canEdit || canCancel) ? (
								<BookingDetailActions
									canEdit={canEdit}
									canCancel={canCancel}
									disabled={isUpdatingBooking || isCancellingBooking}
									onEdit={openModifyDialog}
									onCancel={openCancelDialog}
								/>
							) : null
						}
					/>

					{isGuest ? null : <BookingActionFeedbackBanner feedback={feedback} />}

					{isGuest ? (
						<View className="rounded border border-blue-200 bg-blue-50 p-4">
							<Text className="text-sm text-blue-900">
								Guest access is read-only.{" "}
								<Text
									accessibilityRole="link"
									className="text-sm font-medium text-blue-900 underline"
									onPress={() =>
										router.push(buildBookingSignInRedirectPath(booking.id))
									}
								>
									Sign in with the booking email
								</Text>{" "}
								to manage this booking.
							</Text>
						</View>
					) : null}

					<View className="rounded border border-blue-200 bg-blue-50 p-4">
						<Text selectable className="text-sm text-blue-800">
							{bookingTypeDescription(booking.type)}
						</Text>
					</View>

					<View className="gap-6">
						<View className="gap-4">
							<BookingTimelineCard
								booking={booking}
								onExtend={
									!isGuest && booking.legs.some((leg) => leg.canExtend)
										? () =>
												router.push(
													`/bookings/${encodeURIComponent(booking.id)}/extend`,
												)
										: undefined
								}
							/>
							<BookingLocationCard booking={booking} />
						</View>
						<View className="gap-4">
							<BookingChauffeurCard booking={booking} />
							{booking.type === "AIRPORT_PICKUP" && booking.flight ? (
								<BookingFlightCard flight={booking.flight} />
							) : null}
							<BookingPaymentSummaryCard
								booking={booking}
								isDownloadingReceipt={receiptDownload.isPending}
								onDownloadReceipt={
									canDownloadReceipt ? () => receiptDownload.mutate() : undefined
								}
								receiptError={
									receiptDownload.error
										? getBookingReceiptErrorMessage(receiptDownload.error)
										: null
								}
							/>
						</View>
					</View>
				</View>
			</ScrollView>

			{isGuest ? null : (
				<BookingActionDialogs
					booking={booking}
					controller={{
						canEdit,
						canCancel,
						isUpdatingBooking,
						isCancellingBooking,
						feedback,
						openModifyDialog,
						openCancelDialog,
						...controller,
					}}
				/>
			)}
		</SafeAreaView>
	);
}
