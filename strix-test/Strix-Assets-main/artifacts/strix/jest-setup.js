import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./lib/locales/ar.json";
import en from "./lib/locales/en.json";

i18n.use(initReactI18next).init({
  lng: "ar",
  fallbackLng: "en",
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
});
