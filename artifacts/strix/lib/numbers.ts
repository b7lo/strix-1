const ARABIC_NUMERALS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const WESTERN_NUMERALS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const ARABIC_TO_WESTERN: Record<string, string> = {};
const WESTERN_TO_ARABIC: Record<string, string> = {};

for (let i = 0; i < 10; i++) {
  ARABIC_TO_WESTERN[ARABIC_NUMERALS[i]] = WESTERN_NUMERALS[i];
  WESTERN_TO_ARABIC[WESTERN_NUMERALS[i]] = ARABIC_NUMERALS[i];
}

export type NumeralSystem = "arabic" | "western";

export function toArabicNumerals(value: string | number): string {
  const str = String(value);
  return str.replace(/[0-9]/g, (digit) => WESTERN_TO_ARABIC[digit] || digit);
}

export function toWesternNumerals(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => ARABIC_TO_WESTERN[digit] || digit);
}

export function formatNumber(
  value: number,
  locale: NumeralSystem = "western",
  options?: Intl.NumberFormatOptions
): string {
  if (locale === "arabic") {
    const formatted = new Intl.NumberFormat("ar-SA", options).format(value);
    return toArabicNumerals(formatted);
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatDecimal(
  value: number,
  locale: NumeralSystem = "western",
  maximumFractionDigits = 1
): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatGForce(value: number, locale: NumeralSystem = "western"): string {
  return `${formatDecimal(value, locale, 1)}g`;
}

export function formatSpeed(value: number, locale: NumeralSystem = "western"): string {
  return `${formatNumber(value, locale)} كم/س`;
}

export function formatPercentage(value: number, locale: NumeralSystem = "western"): string {
  return `${formatNumber(value, locale)}%`;
}

export function formatCount(value: number, locale: NumeralSystem = "western"): string {
  return formatNumber(value, locale);
}

export function formatTimestamp(
  timestamp: number,
  locale: "ar" | "en" = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  // التقويم الميلادي دائماً (مع أسماء الأشهر بالعربية في الواجهة العربية)
  const localeTag = locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US";
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };
  return toWesternNumerals(new Date(timestamp).toLocaleString(localeTag, defaultOptions));
}

export function formatDateOnly(
  timestamp: number,
  locale: "ar" | "en" = "en"
): string {
  const localeTag = locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US";
  return toWesternNumerals(new Date(timestamp).toLocaleDateString(localeTag, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }));
}

export function formatTimeOnly(
  timestamp: number,
  locale: "ar" | "en" = "en"
): string {
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";
  return toWesternNumerals(new Date(timestamp).toLocaleTimeString(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
  }));
}

export function getNumeralSystem(locale: "ar" | "en"): NumeralSystem {
  // التطبيق يعرض الأرقام بالصيغة الإنجليزية (الغربية) دائماً في كل الشاشات،
  // بما في ذلك واجهة اللغة العربية.
  return "western";
}