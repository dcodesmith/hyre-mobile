import { isExpoNative } from "@/lib/expo-platform";
import * as SecureStore from "expo-secure-store";

const STORE_KEY = "extension-payment-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type ExtensionPaymentSession = {
  userId: string;
  bookingId: string;
  extensionId: string;
  txRef: string;
};

type StoredExtensionPaymentSession = ExtensionPaymentSession & {
  savedAt: number;
};

const getBrowserStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const readRaw = () =>
  isExpoNative
    ? SecureStore.getItemAsync(STORE_KEY)
    : Promise.resolve(getBrowserStorage()?.getItem(STORE_KEY) ?? null);

const writeRaw = (value: string) => {
  if (isExpoNative) return SecureStore.setItemAsync(STORE_KEY, value);
  const storage = getBrowserStorage();
  if (!storage) {
    return Promise.reject(
      new Error("Extension payment storage is unavailable."),
    );
  }
  storage.setItem(STORE_KEY, value);
  return Promise.resolve();
};

const removeRaw = () => {
  if (isExpoNative) return SecureStore.deleteItemAsync(STORE_KEY);
  getBrowserStorage()?.removeItem(STORE_KEY);
  return Promise.resolve();
};

const parseSession = (value: string | null) => {
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<StoredExtensionPaymentSession>;
    if (
      typeof session.userId !== "string" ||
      typeof session.bookingId !== "string" ||
      typeof session.extensionId !== "string" ||
      typeof session.txRef !== "string" ||
      typeof session.savedAt !== "number" ||
      Date.now() - session.savedAt >= SESSION_TTL_MS
    ) {
      return null;
    }
    return session as StoredExtensionPaymentSession;
  } catch {
    return null;
  }
};

let operationQueue = Promise.resolve();

const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

export const saveExtensionPaymentSession = (
  session: ExtensionPaymentSession,
) =>
  enqueue(() =>
    writeRaw(JSON.stringify({ ...session, savedAt: Date.now() })),
  );

export const getExtensionPaymentSession = () =>
  enqueue(async (): Promise<ExtensionPaymentSession | null> => {
    const session = parseSession(await readRaw());
    if (!session) {
      await removeRaw();
      return null;
    }
    const { savedAt: _, ...paymentSession } = session;
    return paymentSession;
  });

export const deleteExtensionPaymentSession = (txRef: string) =>
  enqueue(async () => {
    const session = parseSession(await readRaw());
    if (session?.txRef === txRef) await removeRaw();
  });

export const clearExtensionPaymentSession = () => enqueue(removeRaw);
