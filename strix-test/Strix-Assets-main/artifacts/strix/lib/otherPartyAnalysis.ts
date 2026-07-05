/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Other Party Analysis — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * تحليل الطرف الآخر من بيانات حساسات سيارتك فقط.
 *
 * المبدأ الفيزيائي:
 * ──────────────────
 * عند حدوث اصطدام بين سيارتين (m₁ و m₂):
 *
 *  ─ قانون نيوتن الثالث: F₁₂ = -F₂₁
 *    القوة المسجلة على سيارتك = نفس القوة (بالعكس) على الآخر
 *
 *  ─ حفظ كمية الحركة: m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'
 *    من تغيّر سرعتك (ΔV) نقدر نقدّر سرعة الطرف الآخر
 *
 *  ─ مدة الصدمة (Impulse Duration):
 *    صدمة قصيرة (<50ms) = سيارة خفيفة صغيرة
 *    صدمة متوسطة (50-150ms) = سيارة عادية
 *    صدمة طويلة (>150ms) = شاحنة أو مركبة ثقيلة
 *
 *  ─ اتجاه التسارع (X, Y):
 *    زاوية Vector = arctan2(-X, -Y) → اتجاه قدوم الطرف الآخر
 *    (بالعكس لأن الحساس يسجل ردة الفعل)
 *
 *  ─ Jerk (معدل تغيّر القوة):
 *    Jerk عالي = الطرف الآخر كان مسرعاً (لم يحاول الفرملة)
 *    Jerk منخفض = اقتراب تدريجي (فرمل جزئياً)
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  OtherPartyAnalysis,
  ImpactZone,
  GyroscopeSnapshot,
  BrakingAnalysis,
} from "./types";
import type { RingSample } from "./sensorUtils";
import i18n from "./i18n";

/**
 * تقدير كتلة المركبة بالكيلوجرام حسب النوع
 */
const VEHICLE_MASS: Record<string, number> = {
  light: 1200,    // سيارة صغيرة
  medium: 1800,   // سيدان/SUV
  heavy: 8000,    // شاحنة/باص
};

/**
 * الوظيفة الرئيسية: تحليل الطرف الآخر
 */
export function analyzeOtherParty(params: {
  peakGForce: number;
  jerkPeak: number;
  impactZone: ImpactZone;
  speedKmh: number;
  impulseDurationMs: number;
  peakFiltered: { x: number; y: number; z: number };
  gyroscope: GyroscopeSnapshot | null;
  braking: BrakingAnalysis | null;
  ringBuffer: readonly RingSample[];
}): OtherPartyAnalysis {
  const {
    peakGForce, jerkPeak, impactZone, speedKmh,
    impulseDurationMs, peakFiltered, gyroscope, braking, ringBuffer,
  } = params;

  // ─── 1. زاوية الاقتراب ───
  const approachAngleDeg = calculateApproachAngle(peakFiltered, gyroscope);

  // ─── 2. تقدير نوع المركبة (من مدة الصدمة) ───
  const vehicleType = estimateVehicleType(impulseDurationMs, peakGForce);

  // ─── 3. تقدير سرعة الطرف الآخر ───
  const estimatedSpeedKmh = estimateOtherSpeed(
    peakGForce, speedKmh, vehicleType, impulseDurationMs, ringBuffer, impactZone
  );

  // ─── 4. قوة الصدمة ───
  const impactForce = classifyImpactForce(peakGForce, jerkPeak);

  // ─── 5. هل كان الطرف الآخر مسرعاً أو مبطئاً؟ ───
  const { wasAccelerating, wasBraking: otherWasBraking } = analyzeOtherBehavior(
    jerkPeak, peakGForce, impulseDurationMs, ringBuffer
  );

  // ─── 6. نسبة الثقة ───
  const confidencePercent = calculateConfidence(
    peakGForce, speedKmh, jerkPeak, impulseDurationMs, gyroscope
  );

  // ─── 7. الوصف العربي ───
  const descriptionAr = buildDescription(
    approachAngleDeg, estimatedSpeedKmh, vehicleType,
    impactForce, wasAccelerating, otherWasBraking, confidencePercent
  );

  return {
    approachAngleDeg: Math.round(approachAngleDeg),
    // A-8: تقريب لأقرب 5 كم/س — تقدير فيزيائي تقريبي، نتجنّب الإيحاء بدقة زائفة
    estimatedSpeedKmh: Math.round(estimatedSpeedKmh / 5) * 5,
    impactForce,
    vehicleType,
    wasAccelerating,
    wasBraking: otherWasBraking,
    confidencePercent: Math.round(confidencePercent),
    descriptionAr,
  };
}

// ════════════════════════════════════════════
// الوظائف الداخلية
// ════════════════════════════════════════════

/**
 * حساب زاوية اقتراب الطرف الآخر (0-360°)
 *
 * 0°   = الطرف الآخر جاي من أمامك
 * 90°  = من يمينك
 * 180° = من خلفك
 * 270° = من يسارك
 */
function calculateApproachAngle(
  peakFiltered: { x: number; y: number; z: number },
  gyroscope: GyroscopeSnapshot | null
): number {
  // Vector التسارع المعكوس (مصدر الصدمة)
  const sourceX = -peakFiltered.x;
  const sourceY = -peakFiltered.y;

  // arctan2 يعطي الزاوية بالراديان
  let angleDeg = Math.atan2(sourceX, sourceY) * (180 / Math.PI);

  // تحويل من (-180, 180) إلى (0, 360)
  if (angleDeg < 0) angleDeg += 360;

  // تعديل بسيط بناءً على Yaw (إذا كان فيه دوران ملحوظ)
  if (gyroscope && gyroscope.yawRate > 30) {
    // الدوران يعني أن الصدمة كانت غير مركزية
    // نعدّل الزاوية بنسبة بسيطة نحو الجانب المهيمن
    const yawAdjust = Math.min(15, gyroscope.yawRate * 0.1);
    if (gyroscope.dominantAxis === "yaw") {
      // الدوران حول المحور العمودي → اقتراب زاوي
      angleDeg += peakFiltered.x > 0 ? yawAdjust : -yawAdjust;
    }
  }

  // تقييد الزاوية
  return ((angleDeg % 360) + 360) % 360;
}

/**
 * تقدير نوع المركبة من مدة الصدمة
 *
 * الأساس الفيزيائي:
 * - المركبات الخفيفة: صدمة حادة وقصيرة (مرونة عالية)
 * - المركبات الثقيلة: صدمة ممتدة وطويلة (كتلة كبيرة)
 */
function estimateVehicleType(
  impulseDurationMs: number,
  peakGForce: number
): "light" | "medium" | "heavy" {
  if (impulseDurationMs <= 0) {
    // لا توجد بيانات مدة → نعتمد على قوة G فقط
    if (peakGForce > 5) return "heavy";
    if (peakGForce > 3) return "medium";
    return "light";
  }

  if (impulseDurationMs < 60) return "light";
  if (impulseDurationMs < 180) return "medium";
  return "heavy";
}

/**
 * تقدير سرعة الطرف الآخر لحظة الاصطدام
 *
 * v7.2 FIX: المعادلة تراعي اتجاه الاصطدام:
 *   خلفي:  v₂ = (m₁·ΔV)/m₂ + v₁    ← نفس الاتجاه (يجمع)
 *   أمامي: v₂ = (m₁·ΔV)/m₂ - v₁    ← اتجاه معاكس (يطرح)
 *   جانبي: v₂ = (m₁·ΔV)/m₂          ← عمودي (السرعة الطولية غير مرتبطة)
 */
function estimateOtherSpeed(
  peakGForce: number,
  mySpeedKmh: number,
  vehicleType: "light" | "medium" | "heavy",
  impulseDurationMs: number,
  ringBuffer: readonly RingSample[],
  impactZone: ImpactZone = "unknown"
): number {
  const myMass = 1500; // كجم (افتراضي)
  const otherMass = VEHICLE_MASS[vehicleType];

  // v7.1: حساب ΔV بالتكامل الرقمي من Ring Buffer
  let deltaV = 0; // m/s

  // A-8 FIX: قصر التكامل على عيّنات الصدمة ضمن آخر 500ms فقط.
  // (سابقاً كان يفلتر كامل الـ buffer ≈ حتى 20s فيجمع عيّنات impulsive كثيرة
  //  غير مرتبطة بالصدمة → مبالغة كبيرة في تقدير ΔV وسرعة الطرف الآخر.)
  const IMPACT_INTEGRATION_WINDOW_MS = 500;
  const lastTs = ringBuffer.length > 0 ? ringBuffer[ringBuffer.length - 1].ts : 0;
  const impulseSamples = ringBuffer.filter(
    (s) => s.isImpulsive && lastTs - s.ts <= IMPACT_INTEGRATION_WINDOW_MS
  );

  if (impulseSamples.length >= 2) {
    // تكامل رقمي: ΔV = Σ (gForce[i] × 9.81 × dt)
    for (let i = 1; i < impulseSamples.length; i++) {
      const dt = (impulseSamples[i].ts - impulseSamples[i - 1].ts) / 1000; // ثوانٍ
      if (dt > 0 && dt < 0.5) {
        const avgG = (impulseSamples[i].gForce + impulseSamples[i - 1].gForce) / 2;
        deltaV += avgG * 9.81 * dt; // Trapezoidal integration
      }
    }
  } else {
    // Fallback: المعادلة المبسّطة (إذا لم تتوفر بيانات كافية)
    const duration = Math.max(impulseDurationMs, 50) / 1000;
    deltaV = peakGForce * 9.81 * duration;
  }

  const deltaVKmh = deltaV * 3.6;
  const momentumTransfer = (myMass * deltaVKmh) / otherMass;

  // v7.2 FIX: تعديل المعادلة حسب اتجاه الاصطدام
  let otherSpeed: number;
  const isRear = impactZone === "rear" || impactZone === "rear-left" || impactZone === "rear-right";
  const isFront = impactZone === "front" || impactZone === "front-left" || impactZone === "front-right";
  const isSide = impactZone === "side-left" || impactZone === "side-right";

  if (isRear) {
    // خلفي: الطرفان بنفس الاتجاه → نجمع
    otherSpeed = momentumTransfer + mySpeedKmh;
  } else if (isFront) {
    // أمامي: الطرفان متقابلان → نطرح (ونأخذ القيمة المطلقة)
    otherSpeed = Math.abs(momentumTransfer - mySpeedKmh);
  } else if (isSide) {
    // جانبي: عمودي → السرعة الطولية غير مرتبطة
    otherSpeed = momentumTransfer;
  } else {
    // غير محدد → نقدّر بالمتوسط
    otherSpeed = momentumTransfer + mySpeedKmh * 0.5;
  }

  // تقييد القيمة لتكون معقولة
  return Math.max(0, Math.min(250, otherSpeed));
}

/**
 * تصنيف قوة الصدمة
 */
function classifyImpactForce(
  peakGForce: number,
  jerkPeak: number
): "light" | "moderate" | "heavy" | "severe" {
  const combined = peakGForce + jerkPeak * 0.05;
  if (combined >= 6) return "severe";
  if (combined >= 4) return "heavy";
  if (combined >= 2.5) return "moderate";
  return "light";
}

/**
 * تحليل سلوك الطرف الآخر قبل الاصطدام
 */
function analyzeOtherBehavior(
  jerkPeak: number,
  peakGForce: number,
  impulseDurationMs: number,
  ringBuffer: readonly RingSample[]
): { wasAccelerating: boolean; wasBraking: boolean } {
  // Jerk عالي + صدمة قصيرة = الطرف الآخر كان مسرعاً
  const wasAccelerating = jerkPeak > 20 && impulseDurationMs < 100;

  // صدمة طويلة + G متوسط = الطرف الآخر كان مبطئاً (فرمل جزئياً)
  const wasBraking = impulseDurationMs > 120 && peakGForce < 3.5 && jerkPeak < 12;

  return { wasAccelerating, wasBraking };
}

/**
 * حساب نسبة الثقة في تحليل الطرف الآخر
 */
function calculateConfidence(
  peakGForce: number,
  speedKmh: number,
  jerkPeak: number,
  impulseDurationMs: number,
  gyroscope: GyroscopeSnapshot | null
): number {
  let score = 30; // base

  // قوة G عالية = بيانات أوضح
  if (peakGForce >= 3) score += 15;
  else if (peakGForce >= 2) score += 8;

  // سرعة معروفة
  if (speedKmh > 10) score += 10;

  // Jerk واضح
  if (jerkPeak > 10) score += 10;

  // مدة صدمة معروفة
  if (impulseDurationMs > 0) score += 15;

  // بيانات جيروسكوب
  if (gyroscope && gyroscope.peakRotationRate > 20) score += 10;

  // دوران واضح يعطي معلومات إضافية عن الزاوية
  if (gyroscope && gyroscope.spinDetected) score += 10;

  return Math.min(95, score);
}

/**
 * بناء الوصف (يتبع اللغة الحالية عبر i18n)
 */
function buildDescription(
  angle: number,
  speed: number,
  vehicleType: "light" | "medium" | "heavy",
  force: "light" | "moderate" | "heavy" | "severe",
  wasAccelerating: boolean,
  wasBraking: boolean,
  confidence: number
): string {
  const vehicleKey: Record<string, string> = {
    light: "otherParty.vehicleLight",
    medium: "otherParty.vehicleMedium",
    heavy: "otherParty.vehicleHeavy",
  };
  const forceKey: Record<string, string> = {
    light: "otherParty.forceLight",
    moderate: "otherParty.forceModerate",
    heavy: "otherParty.forceHeavy",
    severe: "otherParty.forceSevere",
  };

  // تحويل الزاوية لمفتاح اتجاه
  let dirKey = "otherParty.dirUnknown";
  if (angle >= 337.5 || angle < 22.5) dirKey = "otherParty.dirFrontDirect";
  else if (angle < 67.5) dirKey = "otherParty.dirFrontRight";
  else if (angle < 112.5) dirKey = "otherParty.dirRight";
  else if (angle < 157.5) dirKey = "otherParty.dirRearRight";
  else if (angle < 202.5) dirKey = "otherParty.dirRearDirect";
  else if (angle < 247.5) dirKey = "otherParty.dirRearLeft";
  else if (angle < 292.5) dirKey = "otherParty.dirLeft";
  else dirKey = "otherParty.dirFrontLeft";

  let desc = i18n.t("otherParty.desc", {
    vehicle: i18n.t(vehicleKey[vehicleType]),
    dir: i18n.t(dirKey),
    speed,
    force: i18n.t(forceKey[force]),
  });

  if (wasAccelerating) {
    desc += i18n.t("otherParty.wasAccelerating");
  } else if (wasBraking) {
    desc += i18n.t("otherParty.wasBraking");
  }

  desc += i18n.t("otherParty.confidenceSuffix", { confidence });

  return desc;
}
