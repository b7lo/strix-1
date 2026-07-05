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
  braking: BrakingAnalysis | null
): ConfidenceDetails {
  let score = 0;
  const factors: string[] = [];

  // الاتجاه
  if (dir !== "unknown") {
    score += 15;
    factors.push(DynamicText.directionKnown());
  } else {
    factors.push(DynamicText.directionUnknown());
  }

  // قوة التأثير (G)
  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) { score += 25; factors.push(DynamicText.highGForce(g)); }
  else if (g >= THRESHOLDS.G_MEDIUM_CONFIDENCE) { score += 15; factors.push(DynamicText.mediumGForce(g)); }
  else { score += 5; factors.push(DynamicText.lowGForce(g)); }

  // السرعة
  if (speed >= THRESHOLDS.SPEED_CONFIDENCE_HIGH) { score += 20; factors.push(DynamicText.speedHigh(speed)); }
  else if (speed >= THRESHOLDS.SPEED_CONFIDENCE_LOW) { score += 10; factors.push(DynamicText.speedLow(speed)); }

  // التسارع المفاجئ (Jerk)
  if (jerk >= THRESHOLDS.JERK_CONFIDENCE_HIGH) { score += 15; factors.push(DynamicText.jerkHigh(jerk)); }
  else if (jerk >= THRESHOLDS.JERK_CONFIDENCE_MEDIUM) { score += 8; }

  // الدوران والانحراف (Gyro)
  if (gyro) {
    if (gyro.spinDetected) {
      score += 20;
      factors.push(DynamicText.spinDetected());
    } else if (gyro.peakRotationRate > THRESHOLDS.SHAKE_ROTATION_RATE) {
      score += 10;
      factors.push(DynamicText.shakeDetected());
    }
  }

  // الفرملة
  if (braking?.brakingDetected) {
    score += 5;
    factors.push(DynamicText.brakingDetected());
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
  braking: BrakingAnalysis | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const fault = 0; // 0% on driver, 100% on the other party (rear-ender)
  
  factors.push(DynamicText.rearBase());
  
  if (braking?.brakingDetected) {
    factors.push(DynamicText.rearBraking());
  }
  
  if (speed < THRESHOLDS.STATIONARY_SPEED) {
    factors.push(DynamicText.rearSpeedLow());
  } else {
    factors.push(DynamicText.rearSpeedHigh(speed));
  }

  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) {
    factors.push(DynamicText.rearGForceHigh());
  }

  return { fault, code: "REAR_IMPACT", title: i18n.t("liability.rearImpactTitle"), factors };
}

// ─── FRONT IMPACT (وسط أمامي مباشر) ───
function analyzeFront(
  g: number, speed: number, _jerk: number,
  braking: BrakingAnalysis | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  // v7.3 FIX: نبدأ بـ 100% — التحليل المتقدم يخفضها بناءً على معطيات صريحة
  let fault = 100;

  factors.push(DynamicText.frontBase());
  factors.push(DynamicText.frontNote());

  if (braking?.brakingDetected) {
    factors.push(DynamicText.frontBraking());
  }

  if (speed < THRESHOLDS.LOW_SPEED_FRONT) {
    factors.push(DynamicText.frontSpeedLow());
  } else {
    factors.push(DynamicText.frontSpeedHigh(speed));
  }

  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) {
    factors.push(DynamicText.frontGForceHigh());
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
  gyro: GyroscopeSnapshot | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = side === "front-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  // نبدأ محايدين — الزاوية الأمامية ما تحدد المسؤولية لوحدها
  let fault = 50;

  factors.push(DynamicText.cornerBase(sideAr));

  // هل كان يسير بثبات (بدون تغيير مسار)؟ (فقط لو كانت السرعة تسمح بتغيير مسار)
  if (speed >= THRESHOLDS.SPEED_FRONT_CORNER_LOW && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE) {
    // فيه دوران Yaw = المستخدم كان يغير مساره
    fault += 20;
    factors.push(DynamicText.cornerYawHigh(gyro.yawRate));
  } else {
    // بدون دوران = المستخدم كان مستقيم
    fault -= 15;
    factors.push(DynamicText.cornerYawLow());
  }

  if (braking?.brakingDetected) {
    factors.push(DynamicText.brakingDetected()); // reusing general braking
  }

  if (jerk > THRESHOLDS.JERK_CORNER_HIGH) {
    fault -= 5;
    factors.push(DynamicText.cornerJerkHigh());
  }

  if (speed < THRESHOLDS.SPEED_FRONT_CORNER_LOW) {
    fault -= 10;
    factors.push(DynamicText.cornerSpeedLow());
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
  _zone: ImpactZone = "unknown"
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = dir === "side-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  const lane = dir === "side-right" ? "Right Lane" : "Left Lane"; // Assuming not directly translated but used in string

  // v4: الجيروسكوب يُؤكد الاصطدام الجانبي إذا كان هناك roll
  if (gyro?.dominantAxis === "roll") {
    factors.push(DynamicText.sideRoll());
  }

  // v7.3: التحقق الفعلي من تغيير المسار باستخدام الجيروسكوب
  // إذا رصدنا دوران قوي حول محور Yaw وكانت السيارة تتحرك بسرعة كافية فهذا يثبت أن السائق يلف المقود
  const isDriverChangingLane = speed >= THRESHOLDS.MIN_SPEED_LANE_CHANGE && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE;

  if (isDriverChangingLane) {
    const fault = 75; // السائق هو المخطئ بنسبة كبيرة
    factors.push(DynamicText.sideLaneChangeConfirmed(gyro.yawRate));
    factors.push(DynamicText.sideLaneChangeFault());
    return { fault, code: `SIDE_LANE_CHANGE_CONFIRMED_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLaneChangeConfirmedTitle", { side: sideAr }), factors };
  }

  if (speed < THRESHOLDS.LOW_SPEED_SIDE) {
    let fault = 35;
    factors.push(DynamicText.sideLowSpeed(sideAr));
    factors.push(DynamicText.sideLowSpeedNote());
    if (jerk > THRESHOLDS.JERK_SIDE_MEDIUM) {
      factors.push(DynamicText.sideJerkHigh());
      fault = fault - 10;
    }
    return { fault, code: `SIDE_LOW_SPEED_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLowSpeedTitle", { side: sideAr }), factors };
  }

  if (jerk > THRESHOLDS.JERK_SIDE_HIGH && speed >= THRESHOLDS.LOW_SPEED_SIDE) {
    const fault = 20;
    factors.push(DynamicText.sideSuddenIntrusion(sideAr));
    factors.push(DynamicText.sideSuddenIntrusionFault(lane));
    return { fault, code: `SIDE_SUDDEN_INTRUSION_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideSuddenIntrusionTitle", { side: sideAr }), factors };
  }

  if (jerk < THRESHOLDS.JERK_SIDE_LOW && speed >= THRESHOLDS.HIGH_SPEED_SIDE) {
    const fault = 68;
    factors.push(DynamicText.sideLaneChangeSelf1());
    factors.push(DynamicText.sideLaneChangeSelf2());
    return { fault, code: `SIDE_LANE_CHANGE_SELF_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideLaneChangeSelfTitle", { side: sideAr }), factors };
  }

  const fault = 48;
  factors.push(DynamicText.sideAmbiguous(sideAr));
  factors.push(DynamicText.sideAmbiguousNote());
  if (g >= THRESHOLDS.G_HIGH_CONFIDENCE) factors.push(DynamicText.sideAmbiguousGHigh());
  return { fault, code: `SIDE_AMBIGUOUS_${dir === "side-right" ? "R" : "L"}`, title: i18n.t("liability.sideAmbiguousTitle", { side: sideAr }), factors };
}

// ─── CORNER REAR IMPACT (زاوية خلفية يسرى/يمنى) ───
// v7.2: الزاوية الخلفية ≠ خلفي مباشر بالضرورة
// ممكن الطرف الآخر كان يحاول التفادي أو السائق رجع بالعكس
function analyzeCornerRear(
  side: "rear-left" | "rear-right",
  g: number, speed: number, jerk: number,
  braking: BrakingAnalysis | null,
  gyro: GyroscopeSnapshot | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = side === "rear-right" ? i18n.t("liability.dirSideRight") : i18n.t("liability.dirSideLeft");
  // الأصل في الخلفي: المسؤولية على الصادم، لكن الزاوية تعطي مرونة
  let fault = 15;

  factors.push(DynamicText.cornerRearBase(sideAr));

  if (speed < THRESHOLDS.STATIONARY_SPEED) {
    // واقف = غالباً الآخر هو السبب
    fault = 5;
    factors.push(DynamicText.cornerRearStationary());
  }

  // هل السائق كان يغير مساره؟ (فقط للسيارات المتحركة)
  if (speed >= THRESHOLDS.SPEED_REAR_CORNER_LANE && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > THRESHOLDS.HIGH_YAW_RATE) {
    fault += 20;
    factors.push(DynamicText.cornerRearLaneChange());
  }

  if (braking?.brakingDetected) {
    factors.push(DynamicText.cornerRearBraking());
  }

  return {
    fault,
    code: `CORNER_REAR_${side === "rear-right" ? "R" : "L"}`,
    title: i18n.t("liability.cornerRearTitle", { side: sideAr }),
    factors,
  };
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
  directionCalibrated = true
): LiabilityResult {
  // تعويض baseline G (اهتزازات الطريق)
  const g = Math.max(0, peakGForce - baselineG);
  const speed = Math.max(0, speedKmh);
  const jerk = Math.max(0, jerkPeak);

  const severity = classifySeverity(g, speed);
  const confidenceDetails = buildConfidenceDetails(direction, g, speed, jerk, gyro, braking);

  // A-6: إذا لم يُعاير اتجاه الجوال نسبةً للسيارة، لا نسمح بثقة "عالية"
  // (الاتجاه/المنطقة تقديري حينها → نكون صادقين بدل ادّعاء القطعية).
  if (!directionCalibrated && confidenceDetails.level === "high") {
    confidenceDetails.level = "medium";
    confidenceDetails.factors.push(i18n.t("sysNotes.directionUncalibrated"));
  }

  let analyzed: { fault: number; code: string; title: string; factors: string[] };

  // v7.2 FIX: التوجيه حسب المنطقة (8 مناطق) أولاً، ثم الاتجاه كـ fallback
  // الزوايا الأمامية والخلفية لها سيناريوهات مختلفة تماماً عن المباشرة
  if (zone === "front-left" || zone === "front-right") {
    analyzed = analyzeCornerFront(zone, g, speed, jerk, braking, gyro);
  } else if (zone === "rear-left" || zone === "rear-right") {
    analyzed = analyzeCornerRear(zone, g, speed, jerk, braking, gyro);
  } else if (direction === "rear" || zone === "rear") {
    analyzed = analyzeRear(g, speed, jerk, braking);
  } else if (direction === "front" || zone === "front") {
    analyzed = analyzeFront(g, speed, jerk, braking);
  } else if (direction === "side-left" || direction === "side-right") {
    analyzed = analyzeSide(direction, g, speed, jerk, gyro, zone);
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

  // v4: اصطدامات متتالية تزيد خطورة الحادث
  if (impactCount > 1) {
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

  // تطبيق التعديل المتقدم على نسبة الخطأ الخام
  const rawFault = clamp(Math.round(analyzed.fault + advancedAdjustment), 0, 100);
  
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
    factorsAr: analyzed.factors,
    confidenceDetails,
    rawFaultPercent: rawFault,
    isConclusive,
    faultRange,
  };
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

  const jerkNote =
    jerk >= 20
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
