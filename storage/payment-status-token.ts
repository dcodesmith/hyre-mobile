import * as SecureStore from "expo-secure-store";
import { isExpoNative } from "@/lib/expo-platform";

const TOKEN_STORE_KEY = "payment-status-tokens";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type PaymentStatusTokenEntry = { token: string; savedAt: number };
type PaymentStatusTokens = Record<string, PaymentStatusTokenEntry>;

const getBrowserStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

let tokenOperationQueue = Promise.resolve();

const enqueueTokenOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = tokenOperationQueue.then(operation, operation);
  tokenOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const isTokenEntry = (value: unknown): value is PaymentStatusTokenEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PaymentStatusTokenEntry).token === "string" &&
  typeof (value as PaymentStatusTokenEntry).savedAt === "number";

const parseTokens = (value: string | null): PaymentStatusTokens => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, PaymentStatusTokenEntry] =>
          isTokenEntry(entry[1]) && now - entry[1].savedAt < TOKEN_TTL_MS,
      ),
    );
  } catch {
    return {};
  }
};

const readTokens = async (): Promise<PaymentStatusTokens> => {
  const raw = isExpoNative
    ? await SecureStore.getItemAsync(TOKEN_STORE_KEY)
    : (getBrowserStorage()?.getItem(TOKEN_STORE_KEY) ?? null);
  const tokens = parseTokens(raw);
  if (raw && JSON.stringify(tokens) !== raw) {
    if (Object.keys(tokens).length === 0) {
      await removeTokens();
    } else {
      await writeTokens(tokens);
    }
  }
  return tokens;
};

const writeTokens = async (tokens: PaymentStatusTokens): Promise<void> => {
  const value = JSON.stringify(tokens);
  if (isExpoNative) {
    await SecureStore.setItemAsync(TOKEN_STORE_KEY, value);
    return;
  }
  const storage = getBrowserStorage();
  if (!storage) {
    throw new Error("Payment status storage is unavailable.");
  }
  storage.setItem(TOKEN_STORE_KEY, value);
};

const removeTokens = async (): Promise<void> => {
  if (isExpoNative) {
    await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
    return;
  }
  getBrowserStorage()?.removeItem(TOKEN_STORE_KEY);
};

export const savePaymentStatusToken = (bookingId: string, token: string) =>
  enqueueTokenOperation(async () => {
    const tokens = await readTokens();
    tokens[bookingId] = { token, savedAt: Date.now() };
    await writeTokens(tokens);
  });

export const getPaymentStatusToken = (bookingId: string) =>
  enqueueTokenOperation(
    async () => (await readTokens())[bookingId]?.token ?? null,
  );

export const deletePaymentStatusToken = (bookingId: string) =>
  enqueueTokenOperation(async () => {
    const tokens = await readTokens();
    if (!(bookingId in tokens)) return;
    delete tokens[bookingId];
    if (Object.keys(tokens).length === 0) {
      await removeTokens();
      return;
    }
    await writeTokens(tokens);
  });

export const deleteAllPaymentStatusTokens = () =>
  enqueueTokenOperation(removeTokens);
