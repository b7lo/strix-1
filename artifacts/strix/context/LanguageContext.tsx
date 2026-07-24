import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { I18nManager } from "react-native";
import { useTranslation } from "react-i18next";
import i18n, {
  type Locale,
  saveLocale,
  getSavedLocale,
  getDeviceLocale,
} from "@/lib/i18n";
import { getRTLStyles, type RTLStyles } from "@/lib/rtl";
import {
  formatTimestamp,
  formatDateOnly,
  formatNumber,
  formatDecimal,
  formatGForce,
  formatSpeed,
  formatPercentage,
  getNumeralSystem,
  type NumeralSystem,
} from "@/lib/numbers";

export type { Locale };

interface LanguageContextType {
  locale: Locale;
  isRTL: boolean;
  /** i18next t() function */
  t: ReturnType<typeof useTranslation>["t"];
  /** Change and persist language */
  setLocale: (locale: Locale) => Promise<void>;
  /** Short date (e.g. "Jan 12, 3:45 PM") */
  formatDate: (ts: number) => string;
  /** Full date string (e.g. "Mon, Jan 12, 2026") */
  formatDateFull: (ts: number) => string;
  /** Format number with locale-aware numerals */
  formatNumber: (value: number) => string;
  /** Format decimal with locale-aware numerals */
  formatDecimal: (value: number, maxFractionDigits?: number) => string;
  /** Format G-force value */
  formatGForce: (value: number) => string;
  /** Format speed value */
  formatSpeed: (value: number) => string;
  /** Format percentage */
  formatPercentage: (value: number) => string;
  /** Get unified RTL layout styles (flexDirection, textAlign, writingDirection) */
  rtl: RTLStyles;
  /** Current numeral system */
  numeralSystem: NumeralSystem;
  /** Safe get of translation with fallback */
  safeT: (key: string, fallback?: string) => string;
}

const NOOP_T = ((key: string) => key) as ReturnType<typeof useTranslation>["t"];

const LanguageContext = createContext<LanguageContextType>({
  locale: "ar",
  isRTL: true,
  t: NOOP_T,
  setLocale: async () => {},
  formatDate: () => "",
  formatDateFull: () => "",
  formatNumber: (v: number) => String(v),
  formatDecimal: (v: number) => String(v),
  formatGForce: (v: number) => `${v.toFixed(1)}g`,
  formatSpeed: (v: number) => `${v} km/h`,
  formatPercentage: (v: number) => `${v}%`,
  rtl: { flexDirection: "row-reverse", textAlign: "right", writingDirection: "rtl" },
  numeralSystem: "arabic",
  safeT: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();

  const resolveInitialLocale = useCallback((): Locale => {
    const lang = i18nInstance.language as Locale;
    return lang === "ar" || lang === "en" ? lang : "en";
  }, [i18nInstance.language]);

  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);
  const [isRTL, setIsRTL] = useState<boolean>(locale === "ar");

  const rtl = useMemo(() => getRTLStyles(isRTL), [isRTL]);
  const numeralSystem = useMemo(() => getNumeralSystem(locale), [locale]);

  useEffect(() => {
    const handler = (lng: string) => {
      const l = (lng === "ar" || lng === "en" ? lng : "en") as Locale;
      setLocaleState(l);
      setIsRTL(l === "ar");
    };
    i18nInstance.on("languageChanged", handler);
    return () => i18nInstance.off("languageChanged", handler);
  }, [i18nInstance]);

  useEffect(() => {
    (async () => {
      const saved = await getSavedLocale();
      const target = saved ?? getDeviceLocale();
      if (target !== i18nInstance.language) {
        await i18nInstance.changeLanguage(target);
        applyRTL(target === "ar");
      }
    })();
  }, []);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      await i18nInstance.changeLanguage(newLocale);
      await saveLocale(newLocale);
      applyRTL(newLocale === "ar");
      setLocaleState(newLocale);
      setIsRTL(newLocale === "ar");
    },
    [i18nInstance]
  );

  const formatDate = useCallback(
    (ts: number) => formatTimestamp(ts, locale),
    [locale]
  );

  const formatDateFull = useCallback(
    (ts: number) => formatDateOnly(ts, locale),
    [locale]
  );

  const formatNumberCb = useCallback(
    (value: number) => formatNumber(value, numeralSystem),
    [numeralSystem]
  );

  const formatDecimalCb = useCallback(
    (value: number, maxFractionDigits = 1) =>
      formatDecimal(value, numeralSystem, maxFractionDigits),
    [numeralSystem]
  );

  const formatGForceCb = useCallback(
    (value: number) => formatGForce(value, numeralSystem),
    [numeralSystem]
  );

  const formatSpeedCb = useCallback(
    (value: number) => `${formatNumber(value, numeralSystem)} ${t("report.kmh")}`,
    [numeralSystem, t]
  );

  const formatPercentageCb = useCallback(
    (value: number) => formatPercentage(value, numeralSystem),
    [numeralSystem]
  );

  const safeT = useCallback(
    (key: string, fallback?: string) => {
      const result = t(key);
      return result !== key ? result : (fallback ?? key);
    },
    [t]
  );

  const value = useMemo(
    () => ({
      locale,
      isRTL,
      t,
      setLocale,
      formatDate,
      formatDateFull,
      formatNumber: formatNumberCb,
      formatDecimal: formatDecimalCb,
      formatGForce: formatGForceCb,
      formatSpeed: formatSpeedCb,
      formatPercentage: formatPercentageCb,
      rtl,
      numeralSystem,
      safeT,
    }),
    [
      locale,
      isRTL,
      t,
      setLocale,
      formatDate,
      formatDateFull,
      formatNumberCb,
      formatDecimalCb,
      formatGForceCb,
      formatSpeedCb,
      formatPercentageCb,
      rtl,
      numeralSystem,
      safeT,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

function applyRTL(_rtl: boolean) {
  // NOTE: We handle RTL manually via lib/rtl.ts helpers.
  // We still keep allowRTL(false)/forceRTL(false) to enforce an LTR native base
  // on LTR devices. IMPORTANT: on an Arabic *device* these calls CANNOT flip
  // I18nManager.isRTL for the current session (they only take effect after a
  // full relaunch), so the app runs with isRTL === true regardless. Correctness
  // now comes from the native-aware helpers in lib/rtl.ts and the tab layout,
  // which compute effectiveFlip = desiredRTL XOR I18nManager.isRTL so layout is
  // applied exactly once and never double-flips.
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {
    /* ignore on web */
  }
}

export function useRTL() {
  const { isRTL, rtl } = useLanguage();
  return { isRTL, ...rtl };
}
