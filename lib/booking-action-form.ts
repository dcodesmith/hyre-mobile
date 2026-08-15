import { format, toZonedTime } from "date-fns-tz";
import { DAY_BOOKING_TYPE, type BookingType } from "./booking-types";
import type { UpdateBookingPayload } from "../services/bookings";

const LAGOS_TIMEZONE = "Africa/Lagos";

export type BookingActionFormValues = {
	pickupTime: string;
	pickupAddress: string;
	sameLocation: boolean;
	dropOffAddress: string;
};

type EditableBooking = {
	type: BookingType;
	startDate: string;
	pickupLocation: string;
	returnLocation: string;
};

export function createBookingActionFormValues(
	booking: EditableBooking,
): BookingActionFormValues {
	const sameLocation = booking.pickupLocation === booking.returnLocation;
	return {
		pickupTime: format(
			toZonedTime(new Date(booking.startDate), LAGOS_TIMEZONE),
			"h:mm a",
		),
		pickupAddress: booking.pickupLocation,
		sameLocation,
		dropOffAddress: sameLocation ? "" : booking.returnLocation,
	};
}

export function buildBookingUpdatePayload(
	bookingType: BookingType,
	values: BookingActionFormValues,
): { payload: UpdateBookingPayload } | { error: string } {
	const pickupAddress = values.pickupAddress.trim();
	const dropOffAddress = values.dropOffAddress.trim();

	if (!pickupAddress) {
		return { error: "Pickup address is required." };
	}
	if (!values.sameLocation && !dropOffAddress) {
		return {
			error: "Drop-off address is required when locations differ.",
		};
	}

	return {
		payload: {
			...(bookingType === DAY_BOOKING_TYPE && values.pickupTime
				? { pickupTime: values.pickupTime }
				: {}),
			pickupAddress,
			sameLocation: values.sameLocation,
			...(values.sameLocation ? {} : { dropOffAddress }),
		},
	};
}
