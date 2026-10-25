import type { ReactNode } from "react";
import { View } from "react-native";

export function BookingPaymentSection({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <View
      className="mt-8 gap-6 border-t border-gray-200 bg-gray-100 px-4 py-4"
      style={{ boxShadow: "0 8px 50px rgba(0, 0, 0, 0.07)" }}
    >
      {children}
    </View>
  );
}
