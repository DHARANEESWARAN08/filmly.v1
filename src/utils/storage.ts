import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore: Record<string, string> = {};

function hasLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && hasLocalStorage()) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (hasLocalStorage()) {
        return window.localStorage.getItem(key);
      }
      return memoryStore[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore[key] = value;
      if (Platform.OS === 'web' && hasLocalStorage()) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (hasLocalStorage()) {
        window.localStorage.setItem(key, value);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      delete memoryStore[key];
      if (Platform.OS === 'web' && hasLocalStorage()) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
      }
    }
  },
};
