import { ApiError } from "@/lib/api-client";
import { getExtensionPaymentLifecycleState } from "@/lib/extension-payment-status";
import {
  type ExtensionPaymentStatusResponse,
  confirmExtensionPayment,
  fetchExtensionPaymentStatus,
} from "@/services/booking-payment";

export async function verifyExtensionPayment({
  extensionId,
  txRef,
  transactionId,
  shouldConfirm,
  signal,
}: {
  extensionId: string;
  txRef: string;
  transactionId?: string;
  shouldConfirm: boolean;
  signal: AbortSignal;
}) {
  let payment: ExtensionPaymentStatusResponse;

  if (transactionId && shouldConfirm) {
    try {
      payment = await confirmExtensionPayment(
        { extensionId, txRef, transactionId },
        { signal },
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status > 0 &&
        error.status < 500
      ) {
        throw error;
      }
      payment = await fetchExtensionPaymentStatus(txRef, { signal });
    }
  } else {
    payment = await fetchExtensionPaymentStatus(txRef, { signal });
  }

  if (payment.extension.id !== extensionId) {
    throw new Error(
      "Payment verification does not match this booking extension.",
    );
  }

  return {
    ...payment,
    lifecycleState: getExtensionPaymentLifecycleState(payment),
  };
}
