import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'access-token';

const isSecureStoreAvailable = () => Platform.OS !== 'web';

const getBrowserStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Unable to access localStorage', error);
    return null;
  }
};

export const saveAuthToken = async (token: string) => {
  if (isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return;
  }

  getBrowserStorage()?.setItem(TOKEN_KEY, token);
};

export const getSavedAuthToken = async () => {
  if (isSecureStoreAvailable()) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  return getBrowserStorage()?.getItem(TOKEN_KEY) ?? null;
};

export const deleteSavedAuthToken = async () => {
  if (isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }

  getBrowserStorage()?.removeItem(TOKEN_KEY);
};

