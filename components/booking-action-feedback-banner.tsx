import type { BookingActionFeedback } from "@/hooks/use-booking-action-controller";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";

export function BookingActionFeedbackBanner({
	feedback,
}: Readonly<{ feedback: BookingActionFeedback | null }>) {
	if (!feedback) return null;

	const isSuccess = feedback.type === "success";
	return (
		<View
			accessibilityLiveRegion="polite"
			className={cn(
				"mb-3 rounded-lg border px-3 py-2.5",
				isSuccess
					? "border-green-200 bg-green-50"
					: "border-red-200 bg-red-50",
			)}
		>
			<Text
				className={
					isSuccess ? "text-sm text-green-800" : "text-sm text-red-800"
				}
			>
				{feedback.message}
			</Text>
		</View>
	);
}
