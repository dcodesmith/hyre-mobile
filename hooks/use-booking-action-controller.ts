import { useState } from "react";
import { useBookingActionEligibility } from "@/hooks/use-booking-action-eligibility";
import { useBookingActions } from "@/hooks/use-booking-actions";
import {
	buildBookingUpdatePayload,
	createBookingActionFormValues,
	type BookingActionFormValues,
} from "@/lib/booking-action-form";
import {
	type BookingSummary,
	getBookingActionErrorMessage,
} from "@/services/bookings";

export type BookingActionFeedback = {
	type: "success" | "error";
	message: string;
};

type BookingActionState = {
	isModifyDialogOpen: boolean;
	isCancelDialogOpen: boolean;
	feedback: BookingActionFeedback | null;
	formValues: BookingActionFormValues;
};

export type BookingActionController = ReturnType<
	typeof useBookingActionController
>;

export type BookingActionTarget = Pick<
	BookingSummary,
	| "id"
	| "type"
	| "startDate"
	| "pickupLocation"
	| "returnLocation"
	| "canEdit"
	| "canCancel"
	| "modificationCutoffAt"
	| "paymentStatus"
>;

export function useBookingActionController(
	booking: BookingActionTarget | undefined,
	isRefreshing: boolean,
) {
	const {
		updateBooking,
		cancelBooking,
		isUpdatingBooking,
		isCancellingBooking,
	} = useBookingActions(booking?.id);
	const { canEdit, canCancel } = useBookingActionEligibility({
		canEdit: booking?.canEdit ?? false,
		canCancel: booking?.canCancel ?? false,
		modificationCutoffAt: booking?.modificationCutoffAt,
		isRefreshing,
	});
	const [state, setState] = useState<BookingActionState>(() => ({
		isModifyDialogOpen: false,
		isCancelDialogOpen: false,
		feedback: null,
		formValues: booking
			? createBookingActionFormValues(booking)
			: {
					pickupTime: "",
					pickupAddress: "",
					sameLocation: true,
					dropOffAddress: "",
				},
	}));

	const patchState = (patch: Partial<BookingActionState>) => {
		setState((current) => ({ ...current, ...patch }));
	};

	const setFormValue = <Key extends keyof BookingActionFormValues>(
		key: Key,
		value: BookingActionFormValues[Key],
	) => {
		setState((current) => ({
			...current,
			formValues: { ...current.formValues, [key]: value },
		}));
	};

	const openModifyDialog = () => {
		if (!booking) return;
		patchState({
			formValues: createBookingActionFormValues(booking),
			feedback: null,
			isModifyDialogOpen: true,
		});
	};

	const openCancelDialog = () => {
		if (!booking) return;
		patchState({ feedback: null, isCancelDialogOpen: true });
	};

	const submitBookingUpdate = async () => {
		if (!booking) return;
		const result = buildBookingUpdatePayload(booking.type, state.formValues);
		if ("error" in result) {
			patchState({ feedback: { type: "error", message: result.error } });
			return;
		}

		try {
			await updateBooking(result.payload);
			patchState({
				feedback: {
					type: "success",
					message: "Booking updated successfully.",
				},
				isModifyDialogOpen: false,
			});
		} catch (error) {
			patchState({
				feedback: {
					type: "error",
					message: getBookingActionErrorMessage(
						error,
						"Failed to update booking.",
					),
				},
			});
		}
	};

	const submitBookingCancellation = async () => {
		if (!booking) return;
		try {
			await cancelBooking();
			patchState({
				feedback: {
					type: "success",
					message: "Booking cancelled successfully.",
				},
				isCancelDialogOpen: false,
			});
		} catch (error) {
			patchState({
				feedback: {
					type: "error",
					message: getBookingActionErrorMessage(
						error,
						"Failed to cancel booking.",
					),
				},
			});
		}
	};

	return {
		canEdit,
		canCancel,
		isUpdatingBooking,
		isCancellingBooking,
		feedback: state.feedback,
		formValues: state.formValues,
		isModifyDialogOpen: state.isModifyDialogOpen,
		isCancelDialogOpen: state.isCancelDialogOpen,
		setModifyDialogOpen: (open: boolean) =>
			patchState({ isModifyDialogOpen: open }),
		setCancelDialogOpen: (open: boolean) =>
			patchState({ isCancelDialogOpen: open }),
		setFormValue,
		openModifyDialog,
		openCancelDialog,
		submitBookingUpdate,
		submitBookingCancellation,
	};
}
