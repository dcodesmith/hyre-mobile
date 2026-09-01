import { BookingActionDialogs } from "@/components/booking-action-dialogs";
import { BookingDetailHeader } from "@/components/booking-detail-header";
import { BookingDetailSectionTitle } from "@/components/booking-detail-section-title";
import { BookingExtendCard } from "@/components/booking-extend-card";
import { BookingPaymentSummaryCard } from "@/components/booking-payment-summary-card";
import { BookingTimelineCard } from "@/components/booking-timeline-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActionController } from "@/hooks/use-booking-action-controller";
import { useBookingDetailAccess } from "@/hooks/use-booking-detail-access";
import {
	formatBookingDate as formatDateOnly,
	formatBookingTime as formatTimeOnly,
} from "@/lib/booking-detail-display";
import { shareBookingReceipt } from "@/lib/booking-receipt-file";
import { ApiError } from "@/lib/api-client";
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
import { CreditCard, MapPin, Plane, User } from "lucide-react-native";
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
			<ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
				<View className="px-4 py-4">
					<BookingDetailHeader
						booking={booking}
						isGuest={isGuest}
						feedback={feedback}
					/>

					<View className="mt-4 gap-4">
						<BookingTimelineCard booking={booking} />

						<Card className="rounded-xl py-4">
							<CardHeader className="px-4">
								<BookingDetailSectionTitle
									icon={<MapPin size={18} color="#2563EB" />}
									title="Location Details"
								/>
							</CardHeader>
							<CardContent className="px-4 pt-0">
								<View className="gap-3">
									<View className="flex-row items-start gap-3">
										<View className="mt-2 h-2 w-2 rounded-full bg-green-500" />
										<View className="flex-1">
											<Text className="text-sm font-medium text-slate-600">
												Pickup Location
											</Text>
											<Text className="text-sm font-semibold text-slate-900">
												{booking.pickupLocation}
											</Text>
										</View>
									</View>
									<View className="h-px bg-neutral-200" />
									<View className="flex-row items-start gap-3">
										<View className="mt-2 h-2 w-2 rounded-full bg-red-500" />
										<View className="flex-1">
											<Text className="text-sm font-medium text-slate-600">
												Return Location
											</Text>
											<Text className="text-sm font-semibold text-slate-900">
												{booking.returnLocation}
											</Text>
										</View>
									</View>
								</View>
							</CardContent>
						</Card>

						<Card className="rounded-xl py-4">
							<CardHeader className="px-4">
								<BookingDetailSectionTitle
									icon={<User size={18} color="#2563EB" />}
									title="Your Chauffeur"
								/>
							</CardHeader>
							<CardContent className="px-4 pt-0">
								<View className="flex-row items-center gap-3">
									<View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
										<Text className="text-sm font-semibold text-slate-700">
											{booking.chauffeur?.name?.charAt(0).toUpperCase() ?? "N"}
										</Text>
									</View>
									<View>
										<Text className="text-sm font-semibold text-slate-900">
											{booking.chauffeur?.name ?? "Not Assigned"}
										</Text>
										<Text className="text-sm text-slate-600">
											Professional Chauffeur
										</Text>
									</View>
								</View>
							</CardContent>
						</Card>

						{booking.flight ? (
							<Card className="rounded-xl py-4">
								<CardHeader className="px-4">
									<BookingDetailSectionTitle
										icon={<Plane size={18} color="#2563EB" />}
										title="Flight Information"
									/>
								</CardHeader>
								<CardContent className="px-4 pt-0">
									<View className="gap-3">
										<View className="flex-row items-center justify-between">
											<View>
												<Text className="text-lg font-bold text-slate-900">
													{booking.flight.flightNumber ?? "Flight"}
												</Text>
												<Text className="text-sm text-slate-600">
													{formatDateOnly(booking.flight.scheduledArrival)}
												</Text>
											</View>
											<View className="rounded border border-blue-200 bg-blue-100 px-2 py-1">
												<Text className="text-xs font-medium capitalize text-blue-800">
													{booking.flight.status
														?.toLowerCase()
														.replaceAll("_", " ") ?? "scheduled"}
												</Text>
											</View>
										</View>
										<View className="h-px bg-neutral-200" />
										<View className="gap-1">
											<Text className="text-xs font-medium uppercase text-slate-500">
												From
											</Text>
											<Text className="text-sm font-semibold text-slate-900">
												{booking.flight.originName ??
													booking.flight.originCode ??
													"N/A"}
											</Text>
										</View>
										<View className="gap-1">
											<Text className="text-xs font-medium uppercase text-slate-500">
												To
											</Text>
											<Text className="text-sm font-semibold text-slate-900">
												{booking.flight.destinationName ??
													booking.flight.destinationCode ??
													"N/A"}
											</Text>
										</View>
										<View className="h-px bg-neutral-200" />
										<View className="flex-row items-center justify-between">
											<View>
												<Text className="text-xs font-medium uppercase text-slate-500">
													Scheduled Arrival
												</Text>
												<Text className="text-sm font-semibold text-slate-900">
													{formatTimeOnly(booking.flight.scheduledArrival)}
												</Text>
											</View>
											{booking.flight.estimatedArrival ? (
												<View>
													<Text className="text-xs font-medium uppercase text-slate-500">
														Estimated Arrival
													</Text>
													<Text className="text-sm font-semibold text-slate-900">
														{formatTimeOnly(booking.flight.estimatedArrival)}
													</Text>
												</View>
											) : null}
										</View>
									</View>
								</CardContent>
							</Card>
						) : null}

						<BookingPaymentSummaryCard
							booking={booking}
							isDownloadingReceipt={receiptDownload.isPending}
							onDownloadReceipt={
								canDownloadReceipt
									? () => receiptDownload.mutate()
									: undefined
							}
							receiptError={
								receiptDownload.error
									? getBookingReceiptErrorMessage(receiptDownload.error)
									: null
							}
							showBreakdown={!isGuest}
						/>

						{!isGuest && booking.legs.some((leg) => leg.canExtend) ? (
							<BookingExtendCard bookingId={booking.id} />
						) : null}

						{!isGuest && (canEdit || canCancel) ? (
							<Card className="rounded-xl py-4">
								<CardHeader className="px-4">
									<BookingDetailSectionTitle
										icon={<CreditCard size={18} color="#2563EB" />}
										title="Booking Actions"
									/>
								</CardHeader>
								<CardContent className="px-4 pt-0">
									<View className="gap-2">
										{canEdit ? (
											<Button
												variant="outline"
												onPress={openModifyDialog}
												disabled={isUpdatingBooking || isCancellingBooking}
											>
												<Text className="text-sm font-medium">
													Modify Booking
												</Text>
											</Button>
										) : null}
										{canCancel ? (
											<Button
												variant="outline"
												onPress={openCancelDialog}
												disabled={isUpdatingBooking || isCancellingBooking}
											>
												<Text className="text-sm font-medium text-red-600">
													{isCancellingBooking
														? "Cancelling..."
														: "Cancel Booking"}
												</Text>
											</Button>
										) : null}
									</View>
								</CardContent>
							</Card>
						) : null}
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
