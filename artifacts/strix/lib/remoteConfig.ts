/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Remote Config — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * يسمح بمعايرة عتبات المحرك (lib/thresholds.ts) من الخادم دون تحديث المتجر.
 *
 * قواعد المصداقية والأمان:
 *  1. القيم الافتراضية المحلية في THRESHOLDS تعمل دائمًا (بلا إنترنت / بلا URL).
 *  2. لا نطبّق إلا المفاتيح المعروفة والقيم الرقمية الصالحة (نتجاهل أي شيء آخر).
 *  3. نطبّق النسخة المخزّنة (كاش) أولًا للأوفلاين، ثم نحدّثها من الشبكة (best-effort).
 *  4. أي فشل شبكي/تحليل لا يكسر التطبيق — نبقى على الافتراضيات/الكاش.
 *
 * المصدر: EXPO_PUBLIC_REMOTE_CONFIG_URL (JSON بسيط: { "G_MODERATE": 2.2, ... }).
 * إن لم يُضبط، تبقى الافتراضيات المحلية فقط.
 * ═══════════════════════════════════════════════════════════════════
 */

import { THRESHOLDS, type ThresholdKey } from "./thresholds";

const CACHE_KEY = "@strix_remote_config_v1";
const REMOTE_URL = process.env.EXPO_PUBLIC_REMOTE_CONFIG_URL || "";

/**
 * دالة نقية: تُرشِّح كائنًا خامًا إلى تجاوزات صالحة فقط.
 * تقبل فقط المفاتيح الموجودة في THRESHOLDS وبقيمة رقمية منتهية (finite).
 */
export function sanitizeRemoteConfig(
  raw: unknown
): Partial<Record<ThresholdKey, number>> {
  const out: Partial<Record<ThresholdKey, number>> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const source = raw as Record<string, unknown>;
  for (const key of Object.keys(THRESHOLDS) as ThresholdKey[]) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  return out;
}

/**
 * يطبّق التجاوزات على THRESHOLDS في مكانها (بالمرجع، فتنتشر لكل المستوردين).
 * @returns عدد المفاتيح التي طُبّقت
 */
export function applyRemoteConfig(raw: unknown): number {
  const overrides = sanitizeRemoteConfig(raw);
  let count = 0;
  for (const [key, value] of Object.entries(overrides)) {
    (THRESHOLDS as Record<string, number>)[key] = value as number;
    count++;
  }
  return count;
}

/**
 * تهيئة Remote Config عند بدء التطبيق (best-effort، غير حاجزة).
 * 1) طبّق الكاش المحلي (للأوفلاين). 2) اجلب الأحدث من الشبكة وحدّث الكاش.
 */
export async function initRemoteConfig(): Promise<void> {
  // تحميل كسول لـ AsyncStorage (يتفادى الوصول للموديول الأصلي وقت الاستيراد/الاختبار)
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;

  // 1) الكاش أولًا (يعمل بلا إنترنت)
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) applyRemoteConfig(JSON.parse(cached));
  } catch {
    /* تجاهل — نبقى على الافتراضيات */
  }

  // 2) تحديث من الشبكة (إن وُجد URL)
  if (!REMOTE_URL) return;
  try {
    const res = await fetch(REMOTE_URL);
    if (!res.ok) return;
    const json = (await res.json()) as unknown;
    const applied = applyRemoteConfig(json);
    if (applied > 0) {
      // خزّن فقط التجاوزات الصالحة (مو الـ JSON الخام) لتفادي تلوث الكاش
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify(sanitizeRemoteConfig(json))
      );
    }
  } catch {
    /* تجاهل — الكاش/الافتراضيات كافية */
  }
}
