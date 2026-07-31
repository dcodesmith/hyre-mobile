import * as SecureStore from "expo-secure-store";

import { expoOs, isExpoNative } from "@/lib/expo-platform";
import {
  PUSH_REGISTRATION_VERSION,
  type PushRegistrationState,
  parsePushRegistrationState,
} from "@/lib/push-notification-lifecycle";

const PUSH_REGISTRATION_KEY = "push-registration";
const LEGACY_PUSH_TOKEN_KEY = "push-token";

const isSecureStoreAvailable = () => isExpoNative;

const getBrowserStorage = () => {
  if (globalThis.window === undefined) {
    return null;
  }

  try {
    return globalThis.window.localStorage;
  } catch (error) {
    console.warn("Unable to access localStorage", error);
    return null;
  }
};

const getStoredValue = async (key: string): Promise<string | null> => {
  if (isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }

  return getBrowserStorage()?.getItem(key) ?? null;
};

const setStoredValue = async (key: string, value: string): Promise<void> => {
  if (isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  getBrowserStorage()?.setItem(key, value);
};

const deleteStoredValue = async (key: string): Promise<void> => {
  if (isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  getBrowserStorage()?.removeItem(key);
};

export const savePushRegistration = async (
  state: PushRegistrationState,
): Promise<void> => {
  await setStoredValue(PUSH_REGISTRATION_KEY, JSON.stringify(state));
};

export const getSavedPushRegistration = async (): Promise<PushRegistrationState | null> => {
  const serialized = await getStoredValue(PUSH_REGISTRATION_KEY);
  if (serialized) {
    try {
      return parsePushRegistrationState(JSON.parse(serialized));
    } catch (error) {
      console.warn("Unable to parse saved push registration", error);
      return null;
    }
  }

  const legacyToken = await getStoredValue(LEGACY_PUSH_TOKEN_KEY);
  const platform =
    expoOs === "ios" || expoOs === "android" ? expoOs : null;
  if (!legacyToken || !platform) {
    return null;
  }

  const migrated: PushRegistrationState = {
    version: PUSH_REGISTRATION_VERSION,
    token: legacyToken,
    platform,
    ownerUserId: null,
    status: "pending-registration",
    staleTokens: [],
  };
  await savePushRegistration(migrated);
  await deleteStoredValue(LEGACY_PUSH_TOKEN_KEY);
  return migrated;
};

export const deleteSavedPushRegistration = async (): Promise<void> => {
  await Promise.all([
    deleteStoredValue(PUSH_REGISTRATION_KEY),
    deleteStoredValue(LEGACY_PUSH_TOKEN_KEY),
  ]);
};
