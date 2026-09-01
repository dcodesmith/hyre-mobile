import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { BookingReceipt } from "@/services/booking-receipt";

export async function shareBookingReceipt(
  receipt: BookingReceipt,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const file = new File(Paths.cache, receipt.fileName);
  try {
    file.create({ overwrite: true });
    file.write(receipt.bytes);
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Download Receipt",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  } finally {
    if (file.exists) {
      try {
        file.delete();
      } catch {
        // Cache cleanup must not turn a completed share into a failure.
      }
    }
  }
}
