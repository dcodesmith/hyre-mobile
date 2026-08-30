import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	type Option,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useBookingDetail } from "@/hooks/use-booking-detail";
import { useBookingExtensionCheckout } from "@/hooks/use-booking-extension-checkout";
import type { BookingDetail, BookingLeg } from "@/services/bookings";
import { format, toZonedTime } from "date-fns-tz";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock3, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAGOS_TIMEZONE = "Africa/Lagos";

const eligibleLegs = (booking: BookingDetail) =>
	booking.legs.filter((leg) => leg.canExtend && leg.maxExtendableHours > 0);

const formatLegDay = (value: string) =>
	format(toZonedTime(new Date(value), LAGOS_TIMEZONE), "EEE, MMM do, yyyy");

const formatLegTime = (value: string) =>
	format(toZonedTime(new Date(value), LAGOS_TIMEZONE), "h:mm a");

const legLabel = (leg: BookingLeg) =>
	`${formatLegDay(leg.legDate)} · ends ${formatLegTime(leg.legEndTime)}`;

function ExtensionForm({
	booking,
	initialLeg,
	userId,
	refreshBooking,
}: Readonly<{
	booking: BookingDetail;
	initialLeg: BookingLeg;
	userId: string;
	refreshBooking: () => Promise<unknown>;
}>) {
	const legs = eligibleLegs(booking);
	const [bookingLegId, setBookingLegId] = useState(initialLeg.id);
	const [hours, setHours] = useState(1);
	const selectedLeg = legs.find((leg) => leg.id === bookingLegId) ?? initialLeg;
	const selectedHours = Math.min(hours, selectedLeg.maxExtendableHours);
	const checkout = useBookingExtensionCheckout({
		booking,
		selectedLeg,
		selectedHours,
		userId,
		refreshBooking,
	});
	const selectedLegOption: Option = {
		value: selectedLeg.id,
		label: legLabel(selectedLeg),
	};
	const selectedHoursOption: Option = {
		value: String(selectedHours),
		label: `${selectedHours} ${selectedHours === 1 ? "hour" : "hours"}`,
	};

	return (
		<View className="gap-6">
			{legs.length > 1 ? (
				<View className="gap-1.5">
					<Text className="text-sm font-medium text-slate-900">
						Booking day
					</Text>
					<Select
						value={selectedLegOption}
						onValueChange={(option) => {
							if (!option) return;
							setBookingLegId(option.value);
							setHours(1);
						}}
					>
						<SelectTrigger className="w-full" accessibilityLabel="Booking day">
							<SelectValue placeholder="Choose a booking day" />
						</SelectTrigger>
						<SelectContent>
							{legs.map((leg) => (
								<SelectItem key={leg.id} value={leg.id} label={legLabel(leg)} />
							))}
						</SelectContent>
					</Select>
				</View>
			) : null}

			<View className="flex-row gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
				<View className="flex-1 gap-1">
					<Text className="text-sm text-neutral-500">Current drop-off</Text>
					<Text selectable className="font-medium text-neutral-950">
						{formatLegTime(selectedLeg.legEndTime)}
					</Text>
					<Text selectable className="text-sm text-neutral-500">
						{formatLegDay(selectedLeg.legDate)}
					</Text>
				</View>
				<View className="flex-1 gap-1">
					<Text className="text-sm text-neutral-500">Available extension</Text>
					<Text selectable className="font-medium text-neutral-950">
						Up to {selectedLeg.maxExtendableHours}{" "}
						{selectedLeg.maxExtendableHours === 1 ? "hour" : "hours"}
					</Text>
					<Text className="text-sm text-neutral-500">
						Availability is held during payment.
					</Text>
				</View>
			</View>

			<View className="gap-1.5">
				<Text className="text-sm font-medium text-slate-900">
					Extension length
				</Text>
				<Select
					value={selectedHoursOption}
					onValueChange={(option) => {
						if (option) setHours(Number(option.value));
					}}
				>
					<SelectTrigger
						className="w-full"
						accessibilityLabel="Extension length"
					>
						<SelectValue placeholder="Choose extension length" />
					</SelectTrigger>
					<SelectContent>
						{Array.from(
							{ length: selectedLeg.maxExtendableHours },
							(_, index) => index + 1,
						).map((hour) => (
							<SelectItem
								key={hour}
								value={String(hour)}
								label={`${hour} ${hour === 1 ? "hour" : "hours"}`}
							/>
						))}
					</SelectContent>
				</Select>
				<Text className="text-sm text-neutral-500">
					Availability is checked again before reserving the extension.
				</Text>
			</View>

			{checkout.errorMessage ? (
				<View
					accessibilityLiveRegion="polite"
					className="rounded-lg border border-red-200 bg-red-50 p-3"
				>
					<Text className="font-medium text-red-800">
						Unable to extend this trip
					</Text>
					<Text selectable className="mt-1 text-sm text-red-700">
						{checkout.errorMessage}
					</Text>
				</View>
			) : null}

			<View className="h-px bg-neutral-200" />

			<View className="gap-3">
				<View className="flex-row items-start gap-2">
					<ShieldCheck size={16} color="#737373" />
					<Text className="flex-1 text-sm text-neutral-500">
						The final amount will be shown on the secure payment page before you
						pay.
					</Text>
				</View>
				<Button
					className="w-full"
					onPress={() => void checkout.submit()}
					disabled={checkout.isSubmitting}
				>
					{checkout.isSubmitting ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : null}
					<Text className="text-sm font-semibold text-white">
						{checkout.isSubmitting
							? "Reserving extension…"
							: "Continue to payment"}
					</Text>
				</Button>
			</View>
		</View>
	);
}

function ExtensionCard({
	booking,
	userId,
	refreshBooking,
}: Readonly<{
	booking: BookingDetail;
	userId: string;
	refreshBooking: () => Promise<unknown>;
}>) {
	const router = useRouter();
	const legs = eligibleLegs(booking);

	return (
		<Card className="rounded-xl">
			<CardHeader>
				<View className="flex-row items-start gap-3">
					<View className="rounded-lg bg-blue-50 p-2">
						<Clock3 size={20} color="#2563EB" />
					</View>
					<View className="min-w-0 flex-1">
						<Text className="text-xl font-medium leading-7 text-neutral-950">
							Extend Trip
						</Text>
						<Text className="mt-1 text-sm text-neutral-500">
							{booking.car.make} {booking.car.model} ({booking.car.year}) ·{" "}
							{booking.bookingReference}
						</Text>
					</View>
				</View>
			</CardHeader>
			<CardContent>
				{legs.length > 0 ? (
					<ExtensionForm
						booking={booking}
						initialLeg={legs[0]}
						userId={userId}
						refreshBooking={refreshBooking}
					/>
				) : (
					<View className="items-center gap-4 py-4">
						<View className="items-center gap-1">
							<Text className="font-semibold text-neutral-950">
								No extension is available
							</Text>
							<Text className="text-center text-sm text-neutral-500">
								This trip has no booking day that can be extended right now.
							</Text>
						</View>
						<Button
							variant="outline"
							onPress={() => router.replace(`/bookings/${booking.id}` as never)}
						>
							<Text className="text-sm font-medium">View booking</Text>
						</Button>
					</View>
				)}
			</CardContent>
		</Card>
	);
}

export default function ExtendBookingScreen() {
	const router = useRouter();
	const { isAuthenticated, isHydrating, openLoginModal, user } = useAuth();
	const params = useLocalSearchParams<{ id: string }>();
	const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;
	const bookingQuery = useBookingDetail(
		bookingId,
		isAuthenticated && !isHydrating,
	);

	if (isHydrating || bookingQuery.isLoading) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator size="large" color="#6B7280" />
				<Text className="mt-2 text-sm text-neutral-500">
					Loading extension details...
				</Text>
			</SafeAreaView>
		);
	}

	if (!isAuthenticated || !user) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
				<Text className="text-lg font-semibold text-neutral-950">
					Sign in to continue
				</Text>
				<Text className="mt-2 text-center text-sm text-neutral-500">
					Booking extensions are only available to authenticated users.
				</Text>
				<Button className="mt-5 w-full max-w-[220px]" onPress={openLoginModal}>
					<Text className="text-sm font-semibold text-white">Sign In</Text>
				</Button>
			</SafeAreaView>
		);
	}

	if (bookingQuery.error || !bookingQuery.data) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
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
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-white">
			<ScrollView
				className="flex-1"
				contentInsetAdjustmentBehavior="automatic"
				contentContainerClassName="gap-4 px-4 py-6"
			>
				<Pressable
					onPress={() =>
						router.replace(`/bookings/${bookingQuery.data.id}` as never)
					}
					className="flex-row items-center gap-2"
					accessibilityRole="button"
					accessibilityLabel="Back to booking"
				>
					<ArrowLeft size={16} color="#737373" />
					<Text className="text-sm text-neutral-500">Back to booking</Text>
				</Pressable>

				<ExtensionCard
					booking={bookingQuery.data}
					userId={user.id}
					refreshBooking={bookingQuery.refetch}
				/>
			</ScrollView>
		</SafeAreaView>
	);
}
