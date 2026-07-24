/**
 * محرك تقدير المسؤولية — النسخة 7.0
 *
 * التحسينات عن v4:
 *  1. دمج بيانات الفرملة: إذا فرمل السائق قبل الحادث تُخفَّض مسؤوليته
 *  2. دمج الجيروسكوب: تأكيد الاصطدام وتحسين الثقة
 *  3. تحليل الاصطدامات المتتالية (Multi-Impact)
 *  4. نظام ثقة رقمي (0-100) مع تفاصيل العوامل
 *  5. تعويض baseline G (اهتزازات الطريق)
 *  6. [v7] دمج المبادئ الخمسة المتقدمة (Advanced Analysis):
 *     - الاستقرار الزاوي (Angular Stability)
 *     - متجهات القوة المتعددة (Multi-Vector Force)
 *     - الارتباط المكاني والقانوني (Geofencing)
 *     - البصمة الحركية الدقيقة (Micro-Kinematic)
 *     - تتابع الأحداث (Event Buffering)
 */

import type {
  ImpactDirection,
  ImpactZone,
  Confidence,
  Severity,
  BrakingAnalysis,
  GyroscopeSnapshot,
  ConfidenceDetails,
  AdvancedAnalysisResult,
  OtherPartyAnalysis,
  CrossVerifiedAnalysis,
} from "./types";
import { ZONE_LABELS_AR } from "./types";
import i18n from "./i18n";
import { DynamicText } from "./dynamicTextGenerator";
import { THRESHOLDS } from "./thresholds";

export interface LiabilityResult {
  userFaultPercent: number;
  otherFaultPercent: number;
  confidence: Confidence;
  severity: Severity;
  scenarioAr: string;
  scenarioCode: string;
  descriptionAr: string;
  /** خلاصة بلغة بسيطة للمستخدم العادي (من هو المخطئ ولماذا باختصار) */
  plainSummaryAr: string;
  factorsAr: string[];
  confidenceDetails: ConfidenceDetails;
  /** A-6: نسبة الخطأ الخام قبل التقريب للسلّم القانوني (شفافية داخلية) */
  rawFaultPercent: number;
  /** A-6: هل النتيجة قاطعة؟ (ثقة عالية + اتجاه معروف ومعاير) */
  isConclusive: boolean;
  /** A-6: نطاق المسؤولية عند عدم القطعية [أدنى, أعلى] */
  faultRange: [number, number];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * اشتقاق `seed` حتمي من مدخلات المحرك لاختيار عبارات `DynamicText` بلا عشوائية.
 *
 * التجزئة على `direction|zone|round(g)|round(speed)` تضمن ثبات النص لنفس المدخلات
 * (Req 14.1, 14.2) مع بقاء التنوّع اللغوي بين الحالات المختلفة. الدالة نقية وتُعيد
 * عدداً صحيحاً غير سالب.
 */
function makeSeed(
  direction: ImpactDirection,
  zone: ImpactZone,
  g: number,
  speed: number
): number {
  const key = `${direction}|${zone}|${Math.round(g)}|${Math.round(speed)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function classifySeverity(g: number, speed: number): Severity {
  if (g >= THRESHOLDS.G_CRITICAL || (g >= THRESHOLDS.G_SEVERE && speed >= THRESHOLDS.SPEED_CRITICAL)) return "critical";
  if (g >= THRESHOLDS.G_SEVERE || (g >= THRESHOLDS.G_MODERATE && speed >= THRESHOLDS.SPEED_SEVERE)) return "severe";
  if (g >= THRESHOLDS.G_MODERATE || speed >= THRESHOLDS.SPEED_MODERATE) return "moderate";
  return "minor";
}

function buildConfidenceDetails(
  dir: ImpactDirection,
  g: number,
  speed: number,
  jerk: number,
  gyro: GyroscopeSnapshot | null,
  braking: BrakingAnalysis | null,
  seed: number
): ConfidenceDetails {
  let score = 0;
  const factors: string[] = [];

  // الاتجاه
  if (dir !== "unknown") {
    score += 15;
    factors.push(DynamicText.directionKnown(seed));
  } else {
    factors.push(DynamicText.directionUnknown(seed));
  }

  // قوة التأثير (G)
  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) { score += 25; factors.push(DynamicText.highGForce(seed, g)); }
  else if (g >= THRESHOLDS.G_MEDIUM_CONFIDENCE) { score += 15; factors.push(DynamicText.mediumGForce(seed, g)); }
  else { score += 5; factors.push(DynamicText.lowGForce(seed, g)); }

  // السرعة
  if (speed >= THRESHOLDS.SPEED_CONFIDENCE_HIGH) { score += 20; factors.push(DynamicText.speedHigh(seed, speed)); }
  else if (speed >= THRESHOLDS.SPEED_CONFIDENCE_LOW) { score += 10; factors.push(DynamicText.speedLow(seed, speed)); }

  // التسارع المفاجئ (Jerk)
  if (jerk >= THRESHOLDS.JERK_CONFIDENCE_HIGH) { score += 15; factors.push(DynamicText.jerkHigh(seed, jerk)); }
  else if (jerk >= THRESHOLDS.JERK_CONFIDENCE_MEDIUM) { score += 8; }

  // الدوران والانحراف (Gyro)
  if (gyro) {
    if (gyro.spinDetected) {
      score += 20;
      factors.push(DynamicText.spinDetected(seed));
    } else if (gyro.peakRotationRate > THRESHOLDS.SHAKE_ROTATION_RATE) {
      score += 10;
      factors.push(DynamicText.shakeDetected(seed));
    }
  }

  // الفرملة
  if (braking?.brakingDetected) {
    score += 5;
    factors.push(DynamicText.brakingDetected(seed));
  }

  score = clamp(score, 0, 100);

  // v7.3: إذا الاتجاه مجهول، الثقة لا تتجاوز "medium"
  if (dir === "unknown") {
    score = Math.min(score, THRESHOLDS.CONFIDENCE_HIGH_THRESHOLD - 1);
  }

  const level: Confidence = score >= THRESHOLDS.CONFIDENCE_HIGH_THRESHOLD ? "high" : score >= THRESHOLDS.CONFIDENCE_MEDIUM_THRESHOLD ? "medium" : "low";

  return { level, score, factors };
}

// ─── REAR IMPACT ───
function analyzeRear(
  g: number, speed: number, _jerk: number,
  braking: BrakingAnalysis | null,
  seed: number
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const fault = 0; // 0% on driver, 100% on the other party (rear-ender)
  
  factors.push(DynamicText.rearBase(seed));
  
  if (braking?.brakingDetected) {
    factors.push(DynamicText.rearBraking(seed));
  }
  
  if (speed < THRESHOLDS.STATIONARY_SPEED) {
    factors.push(DynamicText.rearSpeedLow(seed));
  } else {
    factors.push(DynamicText.rearSpeedHigh(seed, speed));
  }

  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) {
    factors.push(DynamicText.rearGForceHigh(seed));
  }

  return { fault, code: "REAR_IMPACT", title: i18n.t("liability.rearImpactTitle"), factors };
}

// ─── FRONT IMPACT (وسط أمامي مباشر) ───
function analyzeFront(
  g: number, speed: number, _jerk: number,
  braking: BrakingAnalysis | null,
  seed: number
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  // v7.3 FIX: نبدأ بـ 100% — التحليل المتقدم يخفضها بناءً على معطيات صريحة
  let fault = 100;

  factors.push(DynamicText.frontBase(seed));
  factors.push(DynamicText.frontNote(seed));

  if (braking?.brakingDetected) {
    factors.push(DynamicText.frontBraking(seed));
  }

  if (speed < THRESHOLDS.LOW_SPEED_FRONT) {
    factors.push(DynamicText.frontSpeedLow(seed));
  } else {
    factors.push(DynamicText.frontSpeedHigh(seed, speed));
  }

  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) {
    factors.push(DynamicText.frontGForceHigh(seed));
  }

  return { fault, code: "FRONT_IMPACT", title: i18n.t("liability.frontImpactTitle"), factors };
}

// ─── CORNER FRONT IMPACT (زاوية أمامية يسرى/يمنى) ───
// v7.2: هذه حالات مختلفة تماماً عن الأمامي المباشر
// الزاوية الأمامية = حادث تقاطع / تغيير مسار / دوار
function analyzeCornerFront(
  side: "front-left" | "front-right",
  g: number, speed: number, jerk: number,
  braking: BrakingAnalysis | null,
  gyro: GyroscopeSnapshot | null,
  seed: number
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = side === "front-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  // نبدأ محايدين — الزاوية الأمامية ما تحدد المسؤولية لوحدها
  let fault = 50;

  factors.push(DynamicText.cornerBase(seed, sideAr));

  // هل كان يسير بثبات (بدون تغيير مسار)؟ (فقط لو كانت السرعة تسمح بتغيير مسار)
  if (speed >= THRESHOLDS.SPEED_FRONT_CORNER_LOW && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE) {
    // فيه دوران Yaw = المستخدم كان يغير مساره
    fault += 20;
    factors.push(DynamicText.cornerYawHigh(seed, gyro.yawRate));
  } else {
    // بدون دوران = المستخدم كان مستقيم
    fault -= 15;
    factors.push(DynamicText.cornerYawLow(seed));
  }

  if (braking?.brakingDetected) {
    factors.push(DynamicText.brakingDetected(seed)); // reusing general braking
  }

  if (jerk > THRESHOLDS.JERK_CORNER_HIGH) {
    fault -= 5;
    factors.push(DynamicText.cornerJerkHigh(seed));
  }

  if (speed < THRESHOLDS.SPEED_FRONT_CORNER_LOW) {
    fault -= 10;
    factors.push(DynamicText.cornerSpeedLow(seed));
  }

  return {
    fault,
    code: `CORNER_FRONT_${side === "front-right" ? "R" : "L"}`,
    title: i18n.t("liability.cornerFrontTitle", { side: sideAr }),
    factors,
  };
}

// ─── SIDE IMPACT ───
function analyzeSide(
  dir: "side-left" | "side-right",
  g: number, speed: number, jerk: number,
  gyro: GyroscopeSnapshot | null,
  _zone: ImpactZone = "unknown",
  seed = 0
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = dir === "side-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  const lane = dir === "side-right" ? "Right Lane" : "Left Lane"; // Assuming not directly translated but used in string

  // v4: الجيروسكوب يُؤكد الاصطدام الجانبي إذا كان هناك roll
  if (gyro?.dominantAxis === "roll") {
    factors.push(DynamicText.sideRoll(seed));
  }

  // v7.3: التحقق الفعلي من تغيير المسار باستخدام الجيروسكوب
  // إذا رصدنا دوران قوي حول محور Yaw وكانت السيارة تتحرك بسرعة كافية فهذا يثبت أن السائق يلف المقود
  const isDriverChangingLane = speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE;

  if (isDriverChangingLane) {
    const fault = 75; // السائق هو المخطئ بنسبة كبيرة
    factors.push(DynamicText.sideLaneChangeConfirmed(seed, gyro.yawRate));
    factors.push(DynamicText.sideLaneChangeFault(seed));
    return { fault, code: `SIDE_LANE_CHANGE_CONFIRMED_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLaneChangeConfirmedTitle", { side: sideAr }), factors };
  }

  if (speed < THRESHOLDS.LOW_SPEED_SIDE) {
    let fault = 35;
    factors.push(DynamicText.sideLowSpeed(seed, sideAr));
    factors.push(DynamicText.sideLowSpeedNote(seed));
    if (jerk > THRESHOLDS.JERK_SIDE_MEDIUM) {
      factors.push(DynamicText.sideJerkHigh(seed));
      fault = fault - 10;
    }
    return { fault, code: `SIDE_LOW_SPEED_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLowSpeedTitle", { side: sideAr }), factors };
  }

  if (jerk > THRESHOLDS.JERK_SIDE_HIGH && speed >= THRESHOLDS.LOW_SPEED_SIDE) {
    const fault = 20;
    factors.push(DynamicText.sideSuddenIntrusion(seed, sideAr));
    factors.push(DynamicText.sideSuddenIntrusionFault(seed, lane));
    return { fault, code: `SIDE_SUDDEN_INTRUSION_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideSuddenIntrusionTitle", { side: sideAr }), factors };
  }

  if (jerk < THRESHOLDS.JERK_SIDE_LOW && speed >= THRESHOLDS.HIGH_SPEED_SIDE) {
    const fault = 68;
    factors.push(DynamicText.sideLaneChangeSelf1(seed));
    factors.push(DynamicText.sideLaneChangeSelf2(seed));
    return { fault, code: `SIDE_LANE_CHANGE_SELF_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLaneChangeSelfTitle", { side: sideAr }), factors };
  }

  const fault = 48;
  factors.push(DynamicText.sideAmbiguous(seed, sideAr));
  factors.push(DynamicText.sideAmbiguousNote(seed));
  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) factors.push(DynamicText.sideAmbiguousGHigh(seed));
  return { fault, code: `SIDE_AMBIGUOUS_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideAmbiguousTitle", { side: sideAr }), factors };
}

// ─── CORNER REAR IMPACT (زاوية خلفية يسرى/يمنى) ───
// v7.2: الزاوية الخلفية ≠ خلفي مباشر بالضرورة
// ممكن الطرف الآخر كان يحاول التفادي أو السائق رجع بالعكس
function analyzeCornerRear(
  side: "rear-left" | "rear-right",
  g: number, speed: number, jerk: number,
  braking: BrakingAnalysis | null,
  gyro: GyroscopeSnapshot | null,
  seed: number
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = side === "rear-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  // الأصل في الخلفي: المسؤولية على الصادم، لكن الزاوية تعطي مرونة
  let fault = 15;

  factors.push(DynamicText.cornerRearBase(seed, sideAr));

  if (speed < THRESHOLDS.STATIONARY_SPEED) {
    // واقف = غالباً الآخر هو السبب
    fault = 5;
    factors.push(DynamicText.cornerRearStationary(seed));
  }

  // هل السائق كان يغير مساره؟ (فقط للسيارات المتحركة)
  if (speed >= THRESHOLDS.SPEED_REAR_CORNER_LANE && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE) {
    fault += 20;
    factors.push(DynamicText.cornerRearLaneChange(seed));
  }

  if (braking?.brakingDetected) {
    factors.push(DynamicText.cornerRearBraking(seed));
  }

  return {
    fault,
    code: `CORNER_REAR_${side === "rear-right" ? "R" : "L"}`,
    title: i18n.t("liability.cornerRearTitle", { side: sideAr }),
    factors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Axis 3 — تصنيف السيناريوهات الجديدة (New Scenario Classifier)
// ═══════════════════════════════════════════════════════════════════
// يُقيَّم قبل المحلّلات القديمة (الأكثر تحديداً أولاً). عند عدم التطابق يُعيد
// null فيسقط التصنيف للمحلّلات القائمة (rear/front/corner/side/unknown) دون
// تغيير سلوكها المُغطّى باختبارات. كل النصوص عبر DynamicField الحتمية (seed).
//
// قرارات نطاق آمنة (تحافظ على ثوابت الأمان والاختبارات القائمة):
//  - PARKING/DOOR لا تُطبَّق على اصطدام خلفي (تبقى مسؤولية الطرف الآخر مهيمنة).
//  - PARKING = زحف بطيء فعلي [STATIONARY_SPEED, SPEED_MANEUVER) — لا مركبة واقفة
//    تماماً (< STATIONARY_SPEED)، كي لا تُنتزع حالة "صُدمت وأنت واقف".
//  - كل السيناريوهات الجانبية تشترط اصطداماً جانبياً صريحاً.
function classifyNewScenario(
  direction: ImpactDirection,
  zone: ImpactZone,
  g: number,
  speed: number,
  gyro: GyroscopeSnapshot | null,
  advancedAnalysis: AdvancedAnalysisResult | null,
  seed: number
): { fault: number; code: string; title: string; factors: string[] } | null {
  const road = advancedAnalysis?.roadContext ?? null;
  const isSide =
    direction === "side-left" || direction === "side-right" ||
    zone === "side-left" || zone === "side-right";
  const isRear = direction === "rear" || zone.startsWith("rear");
  const isFrontDirect = direction === "front" || zone === "front";
  const sideKey: "R" | "L" =
    direction === "side-right" || zone === "side-right" ? "R" : "L";

  const laneChangeConfirmed =
    speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE &&
    !!gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE;

  // 1) DOOR_OPENING — الأكثر تحديداً: صدمة جانبية خفيفة جداً، شبه واقف، بلا تغيير مسار
  if (
    isSide &&
    g <= THRESHOLDS.DOOR_OPENING_MAX_G &&
    speed <= THRESHOLDS.STATIONARY_SPEED &&
    !laneChangeConfirmed
  ) {
    return {
      fault: 20,
      code: `DOOR_OPENING_${sideKey}`,
      title: i18n.t("liability.doorOpeningTitle"),
      factors: [DynamicText.doorOpening(seed)],
    };
  }

  // 2) INTERSECTION_ROW — تقاطع + اصطدام جانبي (الأولوية تحدد الاتجاه)
  if (isSide && road?.roadType === "intersection") {
    if (road.hasPriority) {
      return {
        fault: 25,
        code: "INTERSECTION_ROW_PRIORITY",
        title: i18n.t("liability.intersectionRowTitle"),
        factors: [DynamicText.intersectionPriority(seed)],
      };
    }
    return {
      fault: 75,
      code: "INTERSECTION_ROW_NO_PRIORITY",
      title: i18n.t("liability.intersectionRowTitle"),
      factors: [DynamicText.intersectionNoPriority(seed)],
    };
  }

  // 3) U_TURN — دوران Yaw مرتفع مستدام (فوق عتبة تغيير المسار العادية)
  if (
    !!gyro && gyro.dominantAxis === "yaw" &&
    gyro.yawRate >= THRESHOLDS.U_TURN_YAW_RATE &&
    speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE
  ) {
    return {
      fault: 65,
      code: "U_TURN",
      title: i18n.t("liability.uTurnTitle"),
      factors: [DynamicText.uTurnSelf(seed)],
    };
  }

  // 4) LANE_MERGE — اصطدام جانبي مع تأكيد تغيير مسار من المستخدم (دون عتبة U-turn)
  if (isSide && laneChangeConfirmed) {
    return {
      fault: 60,
      code: `LANE_MERGE_${sideKey}`,
      title: i18n.t("liability.laneMergeTitle"),
      factors: [DynamicText.laneMergeSelf(seed)],
    };
  }

  // 5) PARKING_MANEUVER — زحف بطيء فعلي (ليس أمامي/خلفي مباشر، ولا واقف تماماً)
  if (
    !isRear && !isFrontDirect &&
    speed >= THRESHOLDS.STATIONARY_SPEED &&
    speed < THRESHOLDS.SPEED_MANEUVER
  ) {
    return {
      fault: 50,
      code: "PARKING_MANEUVER",
      title: i18n.t("liability.parkingManeuverTitle"),
      factors: [DynamicText.parkingManeuver(seed)],
    };
  }

  return null;
}

// ─── MAIN ───
export function calculateLiability(
  direction: ImpactDirection,
  peakGForce: number,
  speedKmh: number,
  jerkPeak = 0,
  braking: BrakingAnalysis | null = null,
  gyro: GyroscopeSnapshot | null = null,
  impactCount = 1,
  baselineG = 0,
  zone: ImpactZone = "unknown",
  advancedAnalysis: AdvancedAnalysisResult | null = null,
  directionCalibrated = true,
  // ── إضافات Axis 2 (اختيارية، تحافظ على التوافق الخلفي) ──
  otherParty: OtherPartyAnalysis | null = null,
  crossVerified: CrossVerifiedAnalysis | null = null
): LiabilityResult {
  // تعويض baseline G (اهتزازات الطريق) — مع حارس التناهي (sanitize) لضمان P2/P12
  const sanitize = (n: number) => (Number.isFinite(n) ? n : 0);
  const g = Math.max(0, sanitize(peakGForce) - sanitize(baselineG));
  const speed = Math.max(0, sanitize(speedKmh));
  const jerk = Math.max(0, sanitize(jerkPeak));

  // بذرة حتمية لاختيار عبارات DynamicText بلا عشوائية (Req 14.1, 14.2)
  const seed = makeSeed(direction, zone, g, speed);

  const severity = classifySeverity(g, speed);
  const confidenceDetails = buildConfidenceDetails(direction, g, speed, jerk, gyro, braking, seed);

  // A-6: إذا لم يُعاير اتجاه الجوال نسبةً للسيارة، لا نسمح بثقة "عالية"
  // (الاتجاه/المنطقة تقديري حينها → نكون صادقين بدل ادّعاء القطعية).
  if (!directionCalibrated && confidenceDetails.level === "high") {
    confidenceDetails.level = "medium";
    confidenceDetails.factors.push(i18n.t("sysNotes.directionUncalibrated"));
  }

  let analyzed: { fault: number; code: string; title: string; factors: string[] };

  // Axis 3: السيناريوهات الجديدة تُقيَّم أولاً (الأكثر تحديداً). عند عدم التطابق
  // نسقط للمحلّلات القائمة دون تغيير سلوكها.
  const newScenario = classifyNewScenario(direction, zone, g, speed, gyro, advancedAnalysis, seed);
  if (newScenario) {
    analyzed = newScenario;
  } else if (zone === "front-left" || zone === "front-right") {
    analyzed = analyzeCornerFront(zone, g, speed, jerk, braking, gyro, seed);
  } else if (zone === "rear-left" || zone === "rear-right") {
    analyzed = analyzeCornerRear(zone, g, speed, jerk, braking, gyro, seed);
  } else if (direction === "rear" || zone === "rear") {
    analyzed = analyzeRear(g, speed, jerk, braking, seed);
  } else if (direction === "front" || zone === "front") {
    analyzed = analyzeFront(g, speed, jerk, braking, seed);
  } else if (direction === "side-left" || direction === "side-right") {
    analyzed = analyzeSide(direction, g, speed, jerk, gyro, zone, seed);
  } else {
    analyzed = {
      fault: 50,
      code: "UNKNOWN",
      title: i18n.t("liability.unknownTitle"),
      factors: [
        i18n.t("liability.unknownFactor1"),
        i18n.t("liability.unknownFactor2"),
      ],
    };
  }

  // Axis 3: الاصطدام المتسلسل (Chain Collision) — Req 11.
  // override يعيد الوسم مع عدد الصدمات ويُبقي أساس الاتجاه للنسبة. لو أول تماس
  // خلفي وأنت واقف تبقى مسؤولية الطرف الآخر مهيمنة (Req 11.3).
  if (impactCount >= THRESHOLDS.CHAIN_MIN_IMPACTS) {
    analyzed.code = "CHAIN_COLLISION";
    analyzed.title = i18n.t("liability.chainCollisionTitle");
    analyzed.factors.unshift(i18n.t("liability.chainCollisionFactor", { count: impactCount }));
    if ((direction === "rear" || zone.startsWith("rear")) && speed < THRESHOLDS.STATIONARY_SPEED) {
      analyzed.factors.push(DynamicText.chainRearStationary(seed));
    }
  } else if (impactCount > 1) {
    analyzed.factors.push(i18n.t("liability.impactCount", { count: impactCount }));
  }

  // v5: إضافة وصف المنطقة الدقيقة
  if (zone !== "unknown") {
    const zoneLabel = i18n.t(`zone.${zone}`);
    analyzed.factors.unshift(i18n.t("liability.impactZoneLabel", { zone: zoneLabel }));

    if (zone === "front-left" || zone === "front-right") {
      analyzed.factors.push(i18n.t("liability.impactZoneFrontCorner", { side: zone === "front-left" ? i18n.t("liability.dirSideLeft") : i18n.t("liability.dirSideRight") }));
    }
    if (zone === "rear-left" || zone === "rear-right") {
      analyzed.factors.push(i18n.t("liability.impactZoneRearCorner", { side: zone === "rear-left" ? i18n.t("liability.dirSideLeft") : i18n.t("liability.dirSideRight") }));
    }
  }

  // v5: كشف الانقلاب
  if (gyro?.rolloverDetected) {
    analyzed.title = i18n.t("liability.rolloverTitle");
    analyzed.code = "ROLLOVER";
    analyzed.factors.unshift(i18n.t("liability.rolloverFactor"));
  }

  // ═══════════════════════════════════════════
  // v7: تطبيق المبادئ الخمسة المتقدمة
  // ═══════════════════════════════════════════
  let advancedAdjustment = 0;
  if (advancedAnalysis) {
    advancedAdjustment = advancedAnalysis.totalAdjustment;

    // إضافة العوامل المكتشفة بالعربي في بداية القائمة
    if (advancedAnalysis.discoveredFactorsAr.length > 0) {
      analyzed.factors.unshift(
        i18n.t("liability.advancedAnalysisHeader"),
        ...advancedAnalysis.discoveredFactorsAr
      );
    }

    // v7: تحسين كود السيناريو بناءً على السياق
    if (advancedAnalysis.roadContext.roadType === "roundabout" &&
        (direction === "side-left" || direction === "side-right")) {
      analyzed.code = `ROUNDABOUT_PRIORITY_${direction === "side-right" ? "R" : "L"}`;
      analyzed.title = i18n.t("liability.roundaboutPriorityTitle");
    }

    if (advancedAnalysis.microKinematic.scrapeDetected) {
      analyzed.code = `SCRAPE_${direction === "side-right" ? "R" : direction === "side-left" ? "L" : "U"}`;
      analyzed.title = i18n.t("liability.scrapeTitle");
    }
  }

  // Axis 2: تعديل محدود لسلوك الطرف الآخر (Req 6.3). الطرف الآخر مسرّع → يميل
  // الخطأ نحوه (يقلّل خطأ المستخدم). سياق المرور مدموج أصلاً ضمن
  // advancedAnalysis.totalAdjustment، فلا نكرّره هنا (تفادي عدّ مزدوج).
  // otherParty يُعامَل للقراءة فقط (Req 6.5).
  let evidenceAdjustment = 0;
  if (otherParty?.wasAccelerating) {
    evidenceAdjustment += THRESHOLDS.OTHER_PARTY_ACCEL_DELTA;
    analyzed.factors.push(DynamicText.otherPartyAccelerating(seed));
  }

  // تطبيق التعديل المتقدم + تعديل الأدلّة على نسبة الخطأ الخام
  let rawFault = clamp(Math.round(analyzed.fault + advancedAdjustment + evidenceAdjustment), 0, 100);

  // Axis 2: دمج التحقق المتبادل (Req 6.1/6.2) — قبل سقوف الأمان.
  // VERIFIED → مزج نحو المسؤولية المتحقّقة بوزن λ. INCONSISTENT → استبعاد + ملاحظة.
  // crossVerified يُعامَل للقراءة فقط (Req 6.5).
  if (crossVerified) {
    if (crossVerified.consistency_status === "VERIFIED") {
      const lambda = THRESHOLDS.CROSS_VERIFIED_BLEND_WEIGHT;
      rawFault = clamp(
        Math.round((1 - lambda) * rawFault + lambda * sanitize(crossVerified.liability_a_percent)),
        0,
        100
      );
    } else if (crossVerified.consistency_status === "INCONSISTENT") {
      analyzed.factors.push(i18n.t("sysNotes.crossVerifiedInconsistent"));
    }
  }

  // ═══════════════════════════════════════════
  // سقوف الأمان (Safety Caps) — Req 10.3 / 15.1
  // ═══════════════════════════════════════════
  // مركبة واقفة عند الاصطدام لا يُعقل أن تتحمّل خطأً كاملاً. كانت هذه السقوف
  // مُعرَّفة في thresholds لكنها غير موصولة، فسائق واقف يُصدَم أمامياً كان
  // يحصل على 100٪. نطبّقها هنا قبل التقريب للسلّم القانوني.
  const isStationaryAtImpact = speed < THRESHOLDS.STATIONARY_SPEED;
  if (isStationaryAtImpact) {
    const isRearHit = direction === "rear" || zone.startsWith("rear");
    const cap = isRearHit
      ? THRESHOLDS.REAR_STATIONARY_FAULT_CAP // صُدم من الخلف وهو واقف → ≤ 25٪
      : THRESHOLDS.STATIONARY_FAULT_CAP; // واقف عموماً → ≤ 50٪
    if (rawFault > cap) {
      rawFault = cap;
      analyzed.factors.push(i18n.t("liability.stationaryFaultCapped"));
    }
  }
  
  /**
   * تقريب المسؤولية (Liability Approximation)
   * 
   * في نظام المرور (مثل نجم)، تُحدد نسب المسؤولية في الحوادث المرورية عادةً
   * وفقاً لمقاييس ثابتة تمثل سيناريوهات الحوادث الواضحة، وهي: 0%, 25%, 50%, 75%, 100%.
   * 
   * لذلك، يقوم المحرك بجمع كافة النقاط من التحليل الأولي والتحليل المتقدم (rawFault)
   * ثم يقرب النتيجة إلى أقرب نسبة معتمدة قانونياً، لضمان أن تكون النتيجة النهائية
   * متوافقة مع الأنظمة المرورية المتبعة ولا تصدر نسباً غريبة (مثل 37% أو 63%).
   */
  const allowedValues = [0, 25, 50, 75, 100];
  const userFault = allowedValues.reduce((prev, curr) => 
    Math.abs(curr - rawFault) < Math.abs(prev - rawFault) ? curr : prev
  );

  const otherFault = 100 - userFault;

  // A-6: ربط القطعية بالثقة — لا نُصدر رقماً حاسماً عند ثقة غير عالية أو اتجاه مجهول
  const isConclusive =
    confidenceDetails.level === "high" && direction !== "unknown" && directionCalibrated;

  let faultRange: [number, number] = [userFault, userFault];
  if (!isConclusive) {
    const idx = allowedValues.indexOf(userFault);
    const lo = allowedValues[Math.max(0, idx - 1)];
    const hi = allowedValues[Math.min(allowedValues.length - 1, idx + 1)];
    faultRange = [lo, hi];
  }

  return {
    userFaultPercent: userFault,
    otherFaultPercent: otherFault,
    confidence: confidenceDetails.level,
    severity,
    scenarioCode: analyzed.code,
    scenarioAr: analyzed.title,
    descriptionAr: buildDescription(direction, userFault, g, speed, jerk, severity, braking),
    plainSummaryAr: buildPlainSummary(direction, zone, userFault, isConclusive),
    factorsAr: analyzed.factors,
    confidenceDetails,
    rawFaultPercent: rawFault,
    isConclusive,
    faultRange,
  };
}

/**
 * يحوّل منطقة الاصطدام الدقيقة إلى اتجاه عام (للاستخدام في صياغة الوصف).
 * مصدر واحد لتفادي تضارب "خلفي/جانبي" بين الجمل.
 */
export function zoneToImpactDirection(zone: ImpactZone): ImpactDirection {
  if (zone.startsWith("front")) return "front";
  if (zone.startsWith("rear")) return "rear";
  if (zone === "side-left") return "side-left";
  if (zone === "side-right") return "side-right";
  return "unknown";
}

/**
 * مولّد النص المرجعي (خلاصة + وصف) من نسبة خطأ ومنطقة مُعطاة.
 *
 * يُستخدم لإعادة توليد النص بعد التحقق المتقاطع، بحيث تُشتق الخلاصة والوصف
 * من نفس النسبة المعروضة في البطاقات (مصدر واحد للحقيقة، لا تناقض 75٪/0٪).
 */
export function buildLiabilityNarrative(params: {
  direction: ImpactDirection;
  zone: ImpactZone;
  fault: number;
  g: number;
  speed: number;
  jerk: number;
  severity: Severity;
  braking: BrakingAnalysis | null;
  isConclusive: boolean;
}): { plainSummaryAr: string; descriptionAr: string } {
  return {
    plainSummaryAr: buildPlainSummary(
      params.direction,
      params.zone,
      params.fault,
      params.isConclusive,
    ),
    descriptionAr: buildDescription(
      params.direction,
      params.fault,
      params.g,
      params.speed,
      params.jerk,
      params.severity,
      params.braking,
    ),
  };
}

/**
 * خلاصة بلغة بسيطة للمستخدم — تشرح باختصار مكان الاصطدام ومن يتحمل الخطأ.
 * لا تمس أرقام المسؤولية؛ تُشتق منها فقط لتقديمها بلغة مفهومة.
 */
function buildPlainSummary(
  dir: ImpactDirection,
  zone: ImpactZone,
  fault: number,
  isConclusive: boolean
): string {
  // عبارة "مكان الاصطدام" بلغة بسيطة (من المنطقة الدقيقة أو الاتجاه)
  const whereKey =
    zone && zone !== "unknown" ? `zone.${zone}` : `liability.dir${
      dir === "front" ? "Front" : dir === "rear" ? "Rear" : dir === "side-left" ? "SideLeft" : dir === "side-right" ? "SideRight" : "Unknown"
    }`;
  const where = i18n.t(whereKey, { defaultValue: i18n.t("liability.dirUnknown") });

  // عبارة "من المخطئ" حسب النسبة النهائية
  const whoKey =
    fault === 0 ? "liability.summaryWhoOther"
    : fault === 25 ? "liability.summaryWhoMostlyOther"
    : fault === 50 ? "liability.summaryWhoShared"
    : fault === 75 ? "liability.summaryWhoMostlyYou"
    : "liability.summaryWhoYou";
  const who = i18n.t(whoKey);

  const base = i18n.t("liability.plainSummary", { where, who });
  return isConclusive ? base : `${base} ${i18n.t("liability.summaryApprox")}`;
}

function buildDescription(
  dir: ImpactDirection,
  fault: number,
  g: number,
  speed: number,
  jerk: number,
  severity: Severity,
  braking: BrakingAnalysis | null
): string {
  const sevAr: Record<Severity, string> = {
    critical: i18n.t("liability.severityCritical"),
    severe: i18n.t("liability.severitySevere"),
    moderate: i18n.t("liability.severityModerate"),
    minor: i18n.t("liability.severityMinor"),
  };
  const dirAr: Record<ImpactDirection, string> = {
    front: i18n.t("liability.dirFront"),
    rear: i18n.t("liability.dirRear"),
    "side-left": i18n.t("liability.dirSideLeft"),
    "side-right": i18n.t("liability.dirSideRight"),
    unknown: i18n.t("liability.dirUnknown"),
  };

  let faultVerdict = "";
  if (fault === 0) {
    faultVerdict = i18n.t("liability.faultVerdict0");
  } else if (fault === 25) {
    faultVerdict = i18n.t("liability.faultVerdict25");
  } else if (fault === 50) {
    faultVerdict = i18n.t("liability.faultVerdict50");
  } else if (fault === 75) {
    faultVerdict = i18n.t("liability.faultVerdict75");
  } else {
    faultVerdict = i18n.t("liability.faultVerdict100");
  }

  // نستخدم العتبة المعايَرة بدل رقم سحري (كان 20 بينما JERK_HIGH=15) لتفادي الانحراف.
  const jerkNote =
    jerk >= THRESHOLDS.JERK_HIGH
      ? i18n.t("liability.jerkNote", { jerk: jerk.toFixed(0) })
      : "";

  const brakingNote = braking?.brakingDetected
    ? i18n.t("liability.brakingNote", { duration: braking.brakingDurationSec })
    : "";

  return i18n.t("liability.descriptionFormat", {
    dir: dirAr[dir],
    g: g.toFixed(1),
    speed: speed.toFixed(0),
    severity: sevAr[severity],
    jerkNote,
    brakingNote,
    faultVerdict,
    fault
  });
}
