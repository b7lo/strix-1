import type { Severity } from "./types";

/**
 * U-1: مصدر موحّد لألوان الشدّة عبر كل الشاشات.
 * يعتمد على الـ tokens في constants/colors.ts (نفس القيم الحالية) لتفادي التضارب.
 */
export interface SeverityColorTokens {
  severityCritical: string;
  severitySevere: string;
  severityModerate: string;
  severityMinor: string;
}

export function severityColor(c: SeverityColorTokens, sev: Severity): string {
  switch (sev) {
    case "critical": return c.severityCritical;
    case "severe": return c.severitySevere;
    case "moderate": return c.severityModerate;
    case "minor": return c.severityMinor;
    default: return c.severityModerate;
  }
}

/** خلفية شفّافة للشدّة (نفس النمط المستخدم سابقاً: لون + شفافية 15) */
export function severityBg(c: SeverityColorTokens, sev: Severity): string {
  return severityColor(c, sev) + "15";
}
