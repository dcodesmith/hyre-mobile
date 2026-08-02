import type { BookingSummary } from "@/services/bookings";
import { useEffect, useState } from "react";

const MAX_TIMEOUT_MS = 2_147_483_647;

type BookingActionEligibilityInput = Pick<
	BookingSummary,
	"canEdit" | "canCancel"
> & {
	modificationCutoffAt?: BookingSummary["modificationCutoffAt"];
	isRefreshing: boolean;
};

export function useBookingActionEligibility({
	canEdit: isEditEligible,
	canCancel: isCancelEligible,
	modificationCutoffAt,
	isRefreshing,
}: BookingActionEligibilityInput) {
	const cutoffAt = new Date(modificationCutoffAt ?? "").getTime();
	const [clock, setClock] = useState(Date.now);

	useEffect(() => {
		const remainingMs = cutoffAt - Math.max(clock, Date.now());
		if (!Number.isFinite(cutoffAt) || remainingMs <= 0) return;

		const timeout = setTimeout(
			() => setClock(Date.now()),
			Math.min(remainingMs + 1, MAX_TIMEOUT_MS),
		);
		return () => clearTimeout(timeout);
	}, [clock, cutoffAt]);

	const actionsAreCurrent =
		!isRefreshing &&
		Number.isFinite(cutoffAt) &&
		Date.now() < cutoffAt;

	return {
		canEdit: actionsAreCurrent && isEditEligible,
		canCancel: actionsAreCurrent && isCancelEligible,
	};
}
