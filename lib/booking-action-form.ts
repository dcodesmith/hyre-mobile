import { format, toZonedTime } from "date-fns-tz";
import { DAY_BOOKING_TYPE, type BookingType } from "./booking-types";
import type { UpdateBookingPayload } from "../services/bookings";

const LAGOS_TIMEZONE = "Africa/Lagos";
const INVALID_BOOKING_DATE_LABEL = "Date unavailable";

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

function formatLagosDate(
	value: string,
	pattern: string,
	fallback: string,
): string {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return fallback;
	return format(toZonedTime(date, LAGOS_TIMEZONE), pattern);
}

export function formatBookingDateTime(value: string): string {
	return formatLagosDate(value, "PPPp", INVALID_BOOKING_DATE_LABEL);
}

const bookingListPartsFormat = new Intl.DateTimeFormat("en-US", {
	timeZone: LAGOS_TIMEZONE,
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
	hour12: true,
});

function bookingListParts(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	const parts = Object.fromEntries(
		bookingListPartsFormat
			.formatToParts(date)
			.map((part) => [part.type, part.value]),
	);
	const dayPeriod = (parts.dayPeriod ?? "").replace(/\u202f|\u00a0/g, " ");

	return {
		month: parts.month ?? "",
		day: parts.day ?? "",
		year: parts.year ?? "",
		time: `${parts.hour}:${parts.minute} ${dayPeriod}`.replace(
			/\u202f|\u00a0/g,
			" ",
		),
	};
}

/** Short Lagos date range, such as "Oct 9 - 10". */
export function formatBookingListDateRange(
	startValue: string,
	endValue: string,
) {
	const start = bookingListParts(startValue);
	const end = bookingListParts(endValue);
	if (!start || !end) return startValue;

	if (
		start.year === end.year &&
		start.month === end.month &&
		start.day === end.day
	) {
		return `${start.month} ${start.day}`;
	}
	if (start.year === end.year && start.month === end.month) {
		return `${start.month} ${start.day} - ${end.day}`;
	}
	if (start.year === end.year) {
		return `${start.month} ${start.day} - ${end.month} ${end.day}`;
	}
	return `${start.month} ${start.day}, ${start.year} - ${end.month} ${end.day}, ${end.year}`;
}

/** Pickup clock time in Lagos, such as "11:00 AM". */
export function formatBookingListTime(value: string) {
	return bookingListParts(value)?.time ?? value;
}

export function createBookingActionFormValues(
	booking: EditableBooking,
): BookingActionFormValues {
	const sameLocation = booking.pickupLocation === booking.returnLocation;
	return {
		pickupTime: formatLagosDate(booking.startDate, "h:mm a", ""),
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
