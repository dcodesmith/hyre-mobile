export type PaymentCallback = {
  txRef: string;
  status: string | null;
  transactionId: string | null;
};

export function parsePaymentCallback(url: string): PaymentCallback | null {
  const parsed = new URL(url);
  const txRef = parsed.searchParams.get("tx_ref");

  if (!txRef) return null;

  return {
    txRef,
    status: parsed.searchParams.get("status"),
    transactionId: parsed.searchParams.get("transaction_id"),
  };
}
