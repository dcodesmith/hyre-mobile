import * as SecureStore from "expo-secure-store";
import { isExpoNative } from "@/lib/expo-platform";

const TOKEN_STORE_KEY = "payment-status-tokens";
type PaymentStatusTokens = Record<string, string>;

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

const parseTokens = (value: string | null): PaymentStatusTokens => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
};

const readTokens = async (): Promise<PaymentStatusTokens> => {
  if (isExpoNative) {
    return parseTokens(await SecureStore.getItemAsync(TOKEN_STORE_KEY));
  }
  return parseTokens(getBrowserStorage()?.getItem(TOKEN_STORE_KEY) ?? null);
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
    tokens[bookingId] = token;
    await writeTokens(tokens);
  });

export const getPaymentStatusToken = (bookingId: string) =>
  enqueueTokenOperation(async () => (await readTokens())[bookingId] ?? null);

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
