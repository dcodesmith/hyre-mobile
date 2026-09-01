import {
  ApiError,
  getBinary,
  getBinaryWithAuth,
} from "@/lib/api-client";

const DEFAULT_RECEIPT_FILENAME = "Tripdly-receipt.pdf";

export type BookingReceiptAccess =
  | { mode: "account" }
  | { mode: "guest"; token: string };

export type BookingReceipt = {
  bytes: Uint8Array;
  fileName: string;
};

const getAttachmentFilename = (contentDisposition: string | null) => {
  if (!contentDisposition || !/^attachment(?:;|$)/i.test(contentDisposition)) {
    return DEFAULT_RECEIPT_FILENAME;
  }

  const match = contentDisposition.match(
    /;\s*filename=(?:"([^"]+)"|([^;]+))/i,
  );
  const fileName = (match?.[1] ?? match?.[2])?.trim();

  return fileName &&
    fileName !== "." &&
    fileName !== ".." &&
    !fileName.includes("/") &&
    !fileName.includes("\\")
    ? fileName
    : DEFAULT_RECEIPT_FILENAME;
};

export async function fetchBookingReceipt(
  bookingId: string,
  access: BookingReceiptAccess,
  signal?: AbortSignal,
): Promise<BookingReceipt> {
  const path = `/api/bookings/${encodeURIComponent(bookingId)}/receipt`;
  const response =
    access.mode === "guest"
      ? await getBinary(path, {
          credentials: "omit",
          headers: { "X-Guest-Booking-Token": access.token },
          signal,
        })
      : await getBinaryWithAuth(path, { signal });
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (contentType !== "application/pdf") {
    throw new ApiError(
      "The receipt could not be downloaded. Please try again.",
      { status: 502 },
    );
  }

  return {
    bytes: new Uint8Array(response.body),
    fileName: getAttachmentFilename(
      response.headers.get("content-disposition"),
    ),
  };
}

export function getBookingReceiptErrorMessage(error: unknown): string {
  if (error instanceof Error && !(error instanceof ApiError)) {
    return error.message;
  }
  if (!(error instanceof ApiError)) {
    return "The receipt could not be downloaded. Please try again.";
  }
  if (error.status === 429) {
    return error.retryAfter
      ? `Too many receipt requests. Try again in ${error.retryAfter} seconds.`
      : "Too many receipt requests. Please wait before trying again.";
  }
  if (error.status >= 500) {
    return "The receipt could not be downloaded. Please try again.";
  }
  return error.message;
}
