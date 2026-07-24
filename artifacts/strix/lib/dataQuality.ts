/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Data Quality Layer — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * طبقة مستقلة تقيّم "جودة الأدلة" التي بُني عليها كشف الحادث — منفصلة عن
 * تقدير المسؤولية. الهدف: الصدق. النظام لا يُصدر نتيجة جريئة إلا إذا كانت
 * البيانات تستحق ذلك.
 *
 * تجمع هذه الطبقة عوامل جودة موضوعية:
 *  ─ جاهزية المحرك (هل استقر تقدير الجاذبية والـ baseline؟)
 *  ─ معدل العيّنات (هل يكفي لالتقاط قمة الصدمة القصيرة؟)
 *  ─ توفّر/جودة GPS (السرعة عامل حاسم في الشدة والمسؤولية)
 *  ─ معايرة اتجاه الجوال نسبةً للسيارة (A-3) — أهم عامل للاتجاه
 *  ─ توفّر الجيروسكوب (تأكيد الدوران/الانقلاب)
 *  ─ نوع الطريق (الطريق الوعِر يرفع الضوضاء)
 *  ─ تشبّع المسرّع (هل تجاوزت القمة حدود عتاد الهاتف فصارت قيمة القوة غير صادقة؟)
 *
 * تُرجِع درجة 0..100 + مستوى + عوامل تفسيرية + قيود صريحة، وتُربط لاحقاً
 * بسقف الثقة المعروضة للمستخدم.
 *
 * ملاحظة علمية (تشبّع المسرّع): مسرّعات الهواتف عبر expo-sensors تتشبّع
 * عادةً عند ±2g..±16g. الحوادث الحقيقية قد تتجاوز 30–100g، لذا القمة قد
 * تُقَص (clipping). عند الاقتراب من حد التشبّع نُعلن أن "قيمة القوة حدّ أدنى".
 * (للمقارنة: نظام Apple يستخدم مسرّعاً مخصّصاً حتى 256g.)
 * ═══════════════════════════════════════════════════════════════════
 */

import { THRESHOLDS } from "./thresholds";

export type DataQualityLevel = "high" | "medium" | "low";

export interface DataQualityInput {
  /** هل استقر المحرك (الجاذبية + baseline) قبل الكشف؟ */
  engineReady: boolean;
  /** معدل العيّنات الفعلي (Hz) */
  sampleRateHz: number;
  /** هل الجيروسكوب مُفعّل ويُغذّي البيانات؟ */
  gyroscopeEnabled: boolean;
  /** هل تتوفّر بيانات موقع/سرعة من GPS؟ */
  hasGps: boolean;
  /** هل عُويِر اتجاه الجوال نسبةً للسيارة؟ (A-3) */
  directionCalibrated: boolean;
  /** ثقة معايرة الاتجاه (0..100) إن توفّرت */
  directionConfidence?: number;
  /** نوع الطريق المُقدَّر */
  roadType: "smooth" | "normal" | "rough";
  /** قمة قوة G المسجّلة (لكشف تشبّع العتاد) */
  peakGForce: number;
}

export interface DataQualityResult {
  /** الدرجة الإجمالية 0..100 */
  score: number;
  /** المستوى المشتق */
  level: DataQualityLevel;
  /** عوامل إيجابية/معلوماتية (مفاتيح i18n أو رموز) */
  factors: string[];
  /** قيود صريحة تُضعف الثقة (يجب عرضها للمستخدم) */
  limitations: string[];
  /** هل القمة قد تكون مقصوصة بسبب تشبّع عتاد المسرّع؟ */
  accelLikelySaturated: boolean;
}

/**
 * تقييم جودة بيانات الحادث. نقّية وقابلة للاختبار (لا تعتمد على حالة عامة).
 */
export function assessDataQuality(input: DataQualityInput): DataQualityResult {
  const factors: string[] = [];
  const limitations: string[] = [];
  let score = 0;

  // ─── جاهزية المحرك (20) ───
  if (input.engineReady) {
    score += 20;
    factors.push("dq.engineReady");
  } else {
    limitations.push("dq.engineNotReady");
  }

  // ─── معدل العيّنات (15) ───
  if (input.sampleRateHz >= THRESHOLDS.DQ_GOOD_SAMPLE_RATE_HZ) {
    score += 15;
    factors.push("dq.sampleRateGood");
  } else if (input.sampleRateHz >= THRESHOLDS.DQ_LOW_SAMPLE_RATE_HZ) {
    score += 8;
  } else {
    limitations.push("dq.sampleRateLow");
  }

  // ─── GPS / السرعة (20) ───
  if (input.hasGps) {
    score += 20;
    factors.push("dq.gpsAvailable");
  } else {
    limitations.push("dq.gpsMissing");
  }

  // ─── معايرة الاتجاه نسبةً للسيارة (25) — أهم عامل للاتجاه/المنطقة ───
  if (input.directionCalibrated) {
    score += 25;
    factors.push("dq.directionCalibrated");
  } else {
    limitations.push("dq.directionUncalibrated");
  }

  // ─── الجيروسكوب (10) ───
  if (input.gyroscopeEnabled) {
    score += 10;
    factors.push("dq.gyroAvailable");
  } else {
    limitations.push("dq.gyroDisabled");
  }

  // ─── نوع الطريق (10) ───
  if (input.roadType === "smooth") {
    score += 10;
    factors.push("dq.roadSmooth");
  } else if (input.roadType === "normal") {
    score += 7;
  } else {
    score += 2;
    limitations.push("dq.roadRough");
  }

  // ─── تشبّع المسرّع (قيد علمي صريح) ───
  const accelLikelySaturated = input.peakGForce >= THRESHOLDS.DQ_ACCEL_SATURATION_G;
  if (accelLikelySaturated) {
    limitations.push("dq.accelSaturated");
  }

  score = Math.max(0, Math.min(100, score));

  // ─── ربط القيود بالسقف: الاتجاه غير المعاير يحدّ الجودة عند "medium" ───
  let level: DataQualityLevel =
    score >= THRESHOLDS.DQ_HIGH_THRESHOLD
      ? "high"
      : score >= THRESHOLDS.DQ_MEDIUM_THRESHOLD
        ? "medium"
        : "low";

  // قاعدة صدق: بدون معايرة اتجاه لا نسمح بجودة "high" (الاتجاه تقديري)
  if (!input.directionCalibrated && level === "high") {
    level = "medium";
  }

  return { score, level, factors, limitations, accelLikelySaturated };
}
