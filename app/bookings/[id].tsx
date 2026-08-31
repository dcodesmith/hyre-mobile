import { BookingActionDialogs } from "@/components/booking-action-dialogs";
import { BookingActionFeedbackBanner } from "@/components/booking-action-feedback-banner";
import { BookingDetailSectionTitle } from "@/components/booking-detail-section-title";
import { BookingExtendCard } from "@/components/booking-extend-card";
import { BookingPaymentSummaryCard } from "@/components/booking-payment-summary-card";
import { BookingTimelineCard } from "@/components/booking-timeline-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useBookingActionController } from "@/hooks/use-booking-action-controller";
import { useBookingDetail } from "@/hooks/use-booking-detail";
import {
	bookingTypeDescription,
	formatBookingDate as formatDateOnly,
	formatBookingTime as formatTimeOnly,
	paymentStatusPillClass as paymentPillClass,
	bookingStatusPillClass as statusPillClass,
} from "@/lib/booking-detail-display";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
	ChevronLeft,
	CreditCard,
	MapPin,
	Plane,
	User,
} from "lucide-react-native";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookingDetailScreen() {
	const router = useRouter();
	const { isAuthenticated, openLoginModal } = useAuth();
	const params = useLocalSearchParams<{ id: string }>();
	const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;

	const bookingQuery = useBookingDetail(bookingId, isAuthenticated);
	const {
		canEdit,
		canCancel,
		isUpdatingBooking,
		isCancellingBooking,
		feedback,
		openModifyDialog,
		openCancelDialog,
		...controller
	} = useBookingActionController(bookingQuery.data, bookingQuery.isFetching);

	if (!isAuthenticated) {
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

	return (
		<SafeAreaView
			className="flex-1 bg-white"
			edges={["top", "left", "right", "bottom"]}
		>
			<StatusBar style="dark" />
			<ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
				<View className="px-4 py-4">
					<Pressable
						onPress={() => router.replace("/bookings")}
						className="mb-3 flex-row items-center gap-1"
					>
						<View className="h-4 w-4 items-center justify-center">
							<ChevronLeft size={16} color="#111827" />
						</View>
						<Text className="text-sm font-medium leading-5 text-neutral-900">
							Back to Bookings
						</Text>
					</Pressable>

					<BookingActionFeedbackBanner feedback={feedback} />

					<View className="flex-row gap-3">
						<Image
							source={booking.car.images[0]?.url}
							contentFit="cover"
							className="h-12 w-12 rounded-full bg-neutral-100"
						/>
						<View className="flex-1">
							<Text className="text-base font-semibold text-neutral-950">
								{booking.car.make} {booking.car.model} ({booking.car.year})
							</Text>
							<View className="mt-1 flex-row flex-wrap items-center gap-2">
								<Text className="text-sm text-neutral-600">
									{booking.bookingReference}
								</Text>
								<View
									className={`rounded border px-2 py-0.5 ${statusPillClass(booking.status)}`}
								>
									<Text className="text-[11px] font-medium capitalize">
										{booking.status.toLowerCase()}
									</Text>
								</View>
								<View
									className={`rounded border px-2 py-0.5 ${paymentPillClass(String(booking.paymentStatus))}`}
								>
									<Text className="text-[11px] font-medium capitalize">
										{String(booking.paymentStatus)
											.toLowerCase()
											.replaceAll("_", " ")}
									</Text>
								</View>
							</View>
						</View>
					</View>

					<View className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
						<Text className="text-sm text-blue-800">
							{bookingTypeDescription(booking.type)}
						</Text>
					</View>

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

						<BookingPaymentSummaryCard booking={booking} />

						{booking.legs.some((leg) => leg.canExtend) ? (
							<BookingExtendCard bookingId={booking.id} />
						) : null}

						{canEdit || canCancel ? (
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
		</SafeAreaView>
	);
}
