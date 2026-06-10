import React, { createContext, useContext, useCallback } from "react";
import ar, { type TranslationKeys } from "@/lib/i18n/ar";

export type Locale = "ar";

interface LanguageContextType {
  locale: Locale;
  isRTL: boolean;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
  formatDate: (ts: number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "ar",
  isRTL: true,
  t: ar,
  setLocale: () => {},
  formatDate: () => "",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale: Locale = "ar";
  const isRTL = true;
  const t = ar;

  const setLocale = useCallback(() => {}, []);

  const formatDate = useCallback(
    (ts: number) => {
      return new Date(ts).toLocaleString("ar-SA", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    []
  );

  return (
    <LanguageContext.Provider
      value={{ locale, isRTL, t, setLocale, formatDate }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
