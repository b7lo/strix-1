/**
 * i18n.ts — i18next initialization for Strix
 *
 * Priority order:
 *   1. User-saved locale (expo-secure-store key: "app_locale")
 *   2. Device locale (expo-localization)
 *   3. Fallback: "en"
 *
 * Call `initI18n()` once before rendering the app.
 * Use `getLocaleFromStore()` / `saveLocaleToStore()` from LanguageContext
 * to manage persistence.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";

import en from "@/lib/locales/en.json";
import ar from "@/lib/locales/ar.json";

export type Locale = "ar" | "en";
export const LOCALE_STORE_KEY = "app_locale";
export const SUPPORTED_LOCALES: Locale[] = ["ar", "en"];

/** Returns the device's preferred locale if supported, else "en". */
export function getDeviceLocale(): Locale {
  const locales = Localization.getLocales();
  for (const l of locales) {
    const lang = l.languageCode?.toLowerCase() as Locale;
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
  }
  return "en";
}

/** Read persisted user choice from secure store (sync wrapper using a pre-loaded value). */
export async function getSavedLocale(): Promise<Locale | null> {
  try {
    const val = await SecureStore.getItemAsync(LOCALE_STORE_KEY);
    if (val && SUPPORTED_LOCALES.includes(val as Locale)) return val as Locale;
  } catch {
    /* ignore */
  }
  return null;
}

/** Persist user choice to secure store. */
export async function saveLocale(locale: Locale): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCALE_STORE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Initialize i18next. Must be awaited before the app renders. */
export async function initI18n(): Promise<Locale> {
  const saved = await getSavedLocale();
  const initial: Locale = saved ?? getDeviceLocale();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      lng: initial,
      fallbackLng: "en",
      resources: {
        en: { translation: en },
        ar: { translation: ar },
      },
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: "v4",
    });
  }

  return initial;
}

export default i18n;
