import { TimePicker } from "@/components/booking-search/TimePicker";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import type {
	BookingActionController,
	BookingActionTarget,
} from "@/hooks/use-booking-action-controller";
import { DAY_BOOKING_TYPE } from "@/lib/booking-types";
import { View } from "react-native";

export function BookingActionDialogs({
	booking,
	controller,
}: Readonly<{
	booking: BookingActionTarget;
	controller: BookingActionController;
}>) {
	const {
		formValues,
		isModifyDialogOpen,
		isCancelDialogOpen,
		isUpdatingBooking,
		isCancellingBooking,
		setModifyDialogOpen,
		setCancelDialogOpen,
		setFormValue,
		submitBookingUpdate,
		submitBookingCancellation,
	} = controller;
	const isDayBooking = booking.type === DAY_BOOKING_TYPE;

	return (
		<>
			<Dialog
				open={isModifyDialogOpen}
				onOpenChange={(open) => {
					if (!isUpdatingBooking) setModifyDialogOpen(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modify Booking</DialogTitle>
						<DialogDescription>
							{isDayBooking
								? "Edit pickup time and location details for this booking."
								: "Edit pickup and drop-off location details for this booking."}
						</DialogDescription>
					</DialogHeader>

					<View className="gap-3">
						{isDayBooking ? (
							<View className="gap-1.5">
								<Text className="text-sm font-medium text-slate-900">
									Pickup Time
								</Text>
								<TimePicker
									date={new Date(booking.startDate)}
									value={formValues.pickupTime}
									onValueChange={(value) => setFormValue("pickupTime", value)}
									bookingType={booking.type}
									variant="form"
									placeholder="Select pickup time"
								/>
							</View>
						) : null}

						<View className="gap-1.5">
							<Text className="text-sm font-medium text-slate-900">
								Pickup Address
							</Text>
							<AddressAutocompleteInput
								value={formValues.pickupAddress}
								onChangeText={(value) => setFormValue("pickupAddress", value)}
								placeholder="Enter pickup address"
							/>
						</View>

						<View className="flex-row items-center gap-2">
							<Checkbox
								checked={formValues.sameLocation}
								onCheckedChange={(checked) => {
									const sameLocation = checked === true;
									setFormValue("sameLocation", sameLocation);
									if (sameLocation) setFormValue("dropOffAddress", "");
								}}
							/>
							<Text className="text-sm text-slate-700">
								Drop-off location same as pickup
							</Text>
						</View>

						{formValues.sameLocation ? null : (
							<View className="gap-1.5">
								<Text className="text-sm font-medium text-slate-900">
									Drop-off Address
								</Text>
								<AddressAutocompleteInput
									value={formValues.dropOffAddress}
									onChangeText={(value) =>
										setFormValue("dropOffAddress", value)
									}
									placeholder="Enter drop-off address"
								/>
							</View>
						)}
					</View>

					<DialogFooter>
						<Button
							variant="outline"
							onPress={() => setModifyDialogOpen(false)}
							disabled={isUpdatingBooking}
						>
							<Text className="text-sm font-medium">Close</Text>
						</Button>
						<Button
							onPress={() => void submitBookingUpdate()}
							disabled={isUpdatingBooking}
						>
							<Text className="text-sm font-semibold text-white">
								{isUpdatingBooking ? "Saving..." : "Save Changes"}
							</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isCancelDialogOpen}
				onOpenChange={(open) => {
					if (!isCancellingBooking) setCancelDialogOpen(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Booking</DialogTitle>
						<DialogDescription>
							Are you sure you want to cancel this booking? This action cannot
							be undone.
						</DialogDescription>
					</DialogHeader>

					{booking.paymentStatus === "PAID" ? (
						<View className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
							<Text className="text-sm text-amber-800">
								A refund will be processed automatically.
							</Text>
						</View>
					) : null}

					<DialogFooter>
						<Button
							variant="outline"
							onPress={() => setCancelDialogOpen(false)}
							disabled={isCancellingBooking}
						>
							<Text className="text-sm font-medium">Keep Booking</Text>
						</Button>
						<Button
							variant="destructive"
							onPress={() => void submitBookingCancellation()}
							disabled={isCancellingBooking}
						>
							<Text className="text-sm font-semibold text-white">
								{isCancellingBooking ? "Cancelling..." : "Yes, Cancel Booking"}
							</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
