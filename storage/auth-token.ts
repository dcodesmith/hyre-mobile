import { isExpoNative } from "@/lib/expo-platform";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "access-token";

const isSecureStoreAvailable = () => isExpoNative;

const getBrowserStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("Unable to access localStorage", error);
    return null;
  }
};

// Keep compare-and-delete atomic relative to login token writes.
let tokenOperationQueue = Promise.resolve();

const enqueueTokenOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = tokenOperationQueue.then(operation, operation);
  tokenOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const writeAuthToken = async (token: string) => {
  if (isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }

  getBrowserStorage()?.setItem(TOKEN_KEY, token);
};

const readAuthToken = async () => {
  if (isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  return getBrowserStorage()?.getItem(TOKEN_KEY) ?? null;
};

const removeAuthToken = async () => {
  if (isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }

  getBrowserStorage()?.removeItem(TOKEN_KEY);
};

export const saveAuthToken = (token: string) =>
  enqueueTokenOperation(() => writeAuthToken(token));

export const getSavedAuthToken = () => enqueueTokenOperation(readAuthToken);

export const deleteSavedAuthToken = () =>
  enqueueTokenOperation(removeAuthToken);

export const deleteSavedAuthTokenIfMatches = (expectedToken: string) =>
  enqueueTokenOperation(async () => {
    if ((await readAuthToken()) !== expectedToken) {
      return false;
    }

    await removeAuthToken();
    return true;
  });
