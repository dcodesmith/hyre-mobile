import * as SecureStore from "expo-secure-store";

const GUEST_BOOKING_SESSION_KEY = "guest-booking-session";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type GuestBookingSession = {
  bookingId: string;
  token: string;
  accessExpiresAt: string;
};

export type GuestBookingSessionResult =
  | { status: "valid"; session: GuestBookingSession }
  | { status: "expired" }
  | { status: "missing" };

let sessionOperationQueue = Promise.resolve();

const enqueueSessionOperation = <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  const result = sessionOperationQueue.then(operation, operation);
  sessionOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const isGuestBookingSession = (
  value: unknown,
): value is GuestBookingSession => {
  if (typeof value !== "object" || value === null) return false;
  const session = value as GuestBookingSession;
  return (
    typeof session.bookingId === "string" &&
    session.bookingId.length > 0 &&
    typeof session.token === "string" &&
    TOKEN_PATTERN.test(session.token) &&
    typeof session.accessExpiresAt === "string" &&
    Number.isFinite(Date.parse(session.accessExpiresAt))
  );
};

const readSession = async () => {
  const raw = await SecureStore.getItemAsync(GUEST_BOOKING_SESSION_KEY);
  if (!raw) return null;

  try {
    const session: unknown = JSON.parse(raw);
    if (isGuestBookingSession(session)) return session;
  } catch {
    // Invalid persisted values are removed below.
  }

  await removeSession();
  return null;
};

const writeSession = async (session: GuestBookingSession) => {
  await SecureStore.setItemAsync(
    GUEST_BOOKING_SESSION_KEY,
    JSON.stringify(session),
  );
};

const removeSession = () =>
  SecureStore.deleteItemAsync(GUEST_BOOKING_SESSION_KEY);

export const saveGuestBookingSession = (session: GuestBookingSession) =>
  enqueueSessionOperation(async () => {
    if (!isGuestBookingSession(session)) {
      throw new Error("Invalid guest booking session.");
    }
    await writeSession(session);
  });

export const getGuestBookingSession = (bookingId: string) =>
  enqueueSessionOperation<GuestBookingSessionResult>(async () => {
    const session = await readSession();
    if (!session || session.bookingId !== bookingId) {
      return { status: "missing" };
    }
    if (Date.parse(session.accessExpiresAt) <= Date.now()) {
      await removeSession();
      return { status: "expired" };
    }
    return { status: "valid", session };
  });

export const deleteGuestBookingSession = (
  bookingId: string,
  expectedToken?: string,
) =>
  enqueueSessionOperation(async () => {
    const session = await readSession();
    if (
      session?.bookingId === bookingId &&
      (!expectedToken || session.token === expectedToken)
    ) {
      await removeSession();
    }
  });

export const clearGuestBookingSession = () =>
  enqueueSessionOperation(removeSession);
