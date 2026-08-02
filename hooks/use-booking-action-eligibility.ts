import type { BookingSummary } from "@/services/bookings";
import { useEffect, useState } from "react";

const MAX_TIMEOUT_MS = 2_147_483_647;

const isBeforeCutoff = (cutoffAt: number) =>
	Number.isFinite(cutoffAt) && Date.now() < cutoffAt;

type BookingActionEligibilityInput = Pick<
	BookingSummary,
	"canEdit" | "canCancel"
> & {
	modificationCutoffAt: BookingSummary["modificationCutoffAt"] | undefined;
	isRefreshing: boolean;
};

export function useBookingActionEligibility({
	canEdit: isEditEligible,
	canCancel: isCancelEligible,
	modificationCutoffAt,
	isRefreshing,
}: BookingActionEligibilityInput) {
	const cutoffAt = modificationCutoffAt
		? new Date(modificationCutoffAt).getTime()
		: Number.NaN;
	const [isOpen, setIsOpen] = useState(() => isBeforeCutoff(cutoffAt));

	useEffect(() => {
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const updateWindowState = () => {
			const remainingMs = cutoffAt - Date.now();
			const nextIsOpen = Number.isFinite(cutoffAt) && remainingMs > 0;
			setIsOpen(nextIsOpen);

			if (nextIsOpen) {
				timeout = setTimeout(
					updateWindowState,
					Math.min(remainingMs + 1, MAX_TIMEOUT_MS),
				);
			}
		};

		updateWindowState();

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	}, [cutoffAt]);

	const actionsAreCurrent = !isRefreshing && isOpen;

	return {
		canEdit: actionsAreCurrent && isEditEligible,
		canCancel: actionsAreCurrent && isCancelEligible,
	};
}
