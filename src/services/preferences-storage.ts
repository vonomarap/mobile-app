import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const APP_THEME_MODE_KEY = "windowDoorStore.themeMode";
export const APP_LANGUAGE_KEY = "windowDoorStore.language";

type PreferenceKey = typeof APP_THEME_MODE_KEY | typeof APP_LANGUAGE_KEY;

function getWebStorage(): Storage | null {
  if (Platform.OS !== "web") return null;
  const win = (globalThis as any).window as { localStorage?: Storage } | undefined;
  return win?.localStorage ?? null;
}

export async function getPreference(key: PreferenceKey): Promise<string | null> {
  try {
    const webStorage = getWebStorage();
    if (webStorage) return webStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`Preference read failed (${key})`, error);
    return null;
  }
}

export async function setPreference(key: PreferenceKey, value: string): Promise<void> {
  try {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Preference write failed (${key})`, error);
  }
}
