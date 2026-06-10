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
import { DynamicText } from "./dynamicTextGenerator";

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
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function classifySeverity(g: number, speed: number): Severity {
  if (g >= 5.0 || (g >= 3.5 && speed >= 80)) return "critical";
  if (g >= 3.5 || (g >= 2.5 && speed >= 60)) return "severe";
  if (g >= 2.0 || speed >= 30) return "moderate";
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
  if (g >= 3.0) { score += 25; factors.push(DynamicText.highGForce(g)); }
  else if (g >= 2.0) { score += 15; factors.push(DynamicText.mediumGForce(g)); }
  else { score += 5; factors.push(DynamicText.lowGForce(g)); }

  // السرعة
  if (speed >= 20) { score += 20; factors.push(DynamicText.speedHigh(speed)); }
  else if (speed >= 5) { score += 10; factors.push(DynamicText.speedLow(speed)); }

  // التسارع المفاجئ (Jerk)
  if (jerk >= 15) { score += 15; factors.push(DynamicText.jerkHigh(jerk)); }
  else if (jerk >= 8) { score += 8; }

  // الدوران والانحراف (Gyro)
  if (gyro) {
    if (gyro.spinDetected) {
      score += 20;
      factors.push(DynamicText.spinDetected());
    } else if (gyro.peakRotationRate > 30) {
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
  const level: Confidence = score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  return { level, score, factors };
}

// ─── REAR IMPACT ───
function analyzeRear(
  g: number, speed: number, jerk: number,
  braking: BrakingAnalysis | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const fault = 0; // 0% on driver, 100% on the other party (rear-ender)
  
  factors.push(DynamicText.rearBase());
  
  if (braking?.brakingDetected) {
    factors.push(DynamicText.rearBraking());
  }
  
  if (speed < 5) {
    factors.push(DynamicText.rearSpeedLow());
  } else {
    factors.push(DynamicText.rearSpeedHigh(speed));
  }

  if (g >= 3.0) {
    factors.push(DynamicText.rearGForceHigh());
  }

  return { fault, code: "REAR_IMPACT", title: "اصطدام خلفي — مسؤولية كاملة على الطرف الآخر", factors };
}

// ─── FRONT IMPACT (وسط أمامي مباشر) ───
function analyzeFront(
  g: number, speed: number, jerk: number,
  braking: BrakingAnalysis | null
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  // v7.2 FIX: نبدأ بـ 85% بدل 100% — التحليل المتقدم ممكن يخفضها
  // لأن الاصطدام الأمامي المركزي قد يكون بسبب توقف مفاجئ للآخر أو جسم على الطريق
  let fault = 85;

  factors.push(DynamicText.frontBase());
  factors.push(DynamicText.frontNote());

  if (braking?.brakingDetected) {
    factors.push(DynamicText.frontBraking());
  }

  if (speed < 10) {
    factors.push(DynamicText.frontSpeedLow());
  } else {
    factors.push(DynamicText.frontSpeedHigh(speed));
  }

  if (g >= 3.0) {
    factors.push(DynamicText.frontGForceHigh());
  }

  fault = clamp(fault, 0, 100);
  return { fault, code: "FRONT_IMPACT", title: "اصطدام أمامي — مسؤولية مبدئية على السائق", factors };
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
  const sideAr = side === "front-right" ? "اليمنى" : "اليسرى";
  // نبدأ محايدين — الزاوية الأمامية ما تحدد المسؤولية لوحدها
  let fault = 50;

  factors.push(DynamicText.cornerBase(sideAr));

  // هل كان يسير بثبات (بدون تغيير مسار)؟ (فقط لو كانت السرعة تسمح بتغيير مسار)
  if (speed >= 10 && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > 45) {
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

  if (jerk > 18) {
    fault -= 5;
    factors.push(DynamicText.cornerJerkHigh());
  }

  if (speed < 10) {
    fault -= 10;
    factors.push(DynamicText.cornerSpeedLow());
  }

  fault = clamp(fault, 0, 100);
  return {
    fault,
    code: `CORNER_FRONT_${side === "front-right" ? "R" : "L"}`,
    title: `اصطدام بالزاوية الأمامية ${sideAr} — حادث تقاطع أو تداخل مسارات`,
    factors,
  };
}

// ─── SIDE IMPACT ───
function analyzeSide(
  dir: "side-left" | "side-right",
  g: number, speed: number, jerk: number,
  gyro: GyroscopeSnapshot | null,
  zone: ImpactZone = "unknown"
): { fault: number; code: string; title: string; factors: string[] } {
  const factors: string[] = [];
  const sideAr = dir === "side-right" ? "الأيمن" : "الأيسر";
  const lane = dir === "side-right" ? "المسار الأيمن" : "المسار الأيسر";

  // v4: الجيروسكوب يُؤكد الاصطدام الجانبي إذا كان هناك roll
  if (gyro?.dominantAxis === "roll") {
    factors.push(DynamicText.sideRoll());
  }

  // v7.3: التحقق الفعلي من تغيير المسار باستخدام الجيروسكوب
  // إذا رصدنا دوران قوي حول محور Yaw وكانت السيارة تتحرك بسرعة كافية فهذا يثبت أن السائق يلف المقود
  const isDriverChangingLane = speed >= 10 && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > 45;

  if (isDriverChangingLane) {
    const fault = 75; // السائق هو المخطئ بنسبة كبيرة
    factors.push(DynamicText.sideLaneChangeConfirmed(gyro.yawRate));
    factors.push(DynamicText.sideLaneChangeFault());
    return { fault, code: `SIDE_LANE_CHANGE_CONFIRMED_${dir === "side-right" ? "R" : "L"}`, title: `اصطدام جانبي ${sideAr} — تغيير مسار مؤكد`, factors };
  }

  if (speed < 25) {
    let fault = 35;
    factors.push(DynamicText.sideLowSpeed(sideAr));
    factors.push(DynamicText.sideLowSpeedNote());
    if (jerk > 18) {
      factors.push(DynamicText.sideJerkHigh());
      fault = clamp(fault - 10, 0, 100);
    }
    return { fault, code: `SIDE_LOW_SPEED_${dir === "side-right" ? "R" : "L"}`, title: `اصطدام جانبي ${sideAr} — سرعة منخفضة`, factors };
  }

  if (jerk > 22 && speed >= 25) {
    const fault = 20;
    factors.push(`التغير الحاد والمفاجئ في الحركة يثبت أن الاصطدام جاء بشكل مباغت من الجانب ${sideAr}`);
    factors.push(`المركبة التي تداخلت مع ${lane} بشكل مفاجئ تتحمل المسؤولية الأكبر`);
    return { fault, code: `SIDE_SUDDEN_INTRUSION_${dir === "side-right" ? "R" : "L"}`, title: `اصطدام جانبي ${sideAr} — تداخل مسارات مباغت`, factors };
  }

  if (jerk < 10 && speed >= 40) {
    const fault = 68;
    factors.push("التقارب التدريجي وضعف قوة الصدمة المباغتة يشير إلى احتكاك أثناء السير");
    factors.push("هذا النمط يُرجح احتكاك سطحي أو اقتراب خطير بسبب عدم ترك مسافة جانبية كافية");
    return { fault, code: `SIDE_LANE_CHANGE_SELF_${dir === "side-right" ? "R" : "L"}`, title: `اصطدام جانبي ${sideAr} — احتكاك أو اقتراب خطير`, factors };
  }

  const fault = 48;
  factors.push(`اصطدام جانبي ${sideAr} أثناء السير — مسؤولية مشتركة محتملة`);
  factors.push("يتعذر تحديد المركبة المتسببة بالاحتكاك أو الانحراف بدقة من خلال المستشعرات فقط، ويُنصح بالرجوع للكاميرات");
  if (g >= 3.0) factors.push("قوة الاصطدام العالية تشير إلى سرعة مفرطة من أحد الطرفين أثناء الاحتكاك الجانبي");
  return { fault, code: `SIDE_AMBIGUOUS_${dir === "side-right" ? "R" : "L"}`, title: `اصطدام جانبي ${sideAr} — مسؤولية غير محددة`, factors };
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
  const sideAr = side === "rear-right" ? "اليمنى" : "اليسرى";
  // الأصل في الخلفي: المسؤولية على الصادم، لكن الزاوية تعطي مرونة
  let fault = 15;

  factors.push(`الاصطدام بالزاوية الخلفية ${sideAr} — يُرجّح أن الطرف الآخر كان يحاول التجاوز أو التفادي.`);

  if (speed < 5) {
    // واقف = غالباً الآخر هو السبب
    fault = 5;
    factors.push("المركبة كانت متوقفة — المسؤولية على الطرف الصادم.");
  }

  // هل السائق كان يغير مساره؟ (فقط للسيارات المتحركة)
  if (speed >= 10 && gyro && gyro.dominantAxis === "yaw" && gyro.yawRate > 45) {
    fault += 20;
    factors.push("رُصد تغيير مسار من السائق — قد يكون ساهم في الاصطدام بانحرافه أمام الطرف الآخر.");
  }

  if (braking?.brakingDetected) {
    factors.push("رُصدت فرملة مفاجئة — الطرف الخلفي فشل في الحفاظ على مسافة أمان.");
  }

  fault = clamp(fault, 0, 100);
  return {
    fault,
    code: `CORNER_REAR_${side === "rear-right" ? "R" : "L"}`,
    title: `اصطدام بالزاوية الخلفية ${sideAr} — الطرف الآخر يتحمل الجزء الأكبر`,
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
  advancedAnalysis: AdvancedAnalysisResult | null = null
): LiabilityResult {
  // تعويض baseline G (اهتزازات الطريق)
  const g = Math.max(0, peakGForce - baselineG);
  const speed = Math.max(0, speedKmh);
  const jerk = Math.max(0, jerkPeak);

  const severity = classifySeverity(g, speed);
  const confidenceDetails = buildConfidenceDetails(direction, g, speed, jerk, gyro, braking);

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
      title: "اتجاه الاصطدام غير محدد",
      factors: [
        "اتجاه الاصطدام لم يُحدَّد بدقة من الحساسات — قد يكون الهاتف غير مثبّت بشكل صحيح",
        "يُنصح بإعادة معايرة موضع الهاتف في الوضع الأفقي داخل مبيت خاص بالمركبة",
      ],
    };
  }

  // v4: اصطدامات متتالية تزيد خطورة الحادث
  if (impactCount > 1) {
    analyzed.factors.push(`رُصدت ${impactCount} صدمات متتالية — يُشير إلى حادث متعدد المراحل أو انقلاب`);
  }

  // v5: إضافة وصف المنطقة الدقيقة
  if (zone !== "unknown") {
    const zoneLabel = ZONE_LABELS_AR[zone];
    analyzed.factors.unshift(`منطقة الاصطدام: ${zoneLabel}`);

    if (zone === "front-left" || zone === "front-right") {
      analyzed.factors.push(`الاصطدام بالزاوية الأمامية ${zone === "front-left" ? "اليسرى" : "اليمنى"} يُرجّح تداخل مسارات أو تقاطع`);
    }
    if (zone === "rear-left" || zone === "rear-right") {
      analyzed.factors.push(`الاصطدام بالزاوية الخلفية ${zone === "rear-left" ? "اليسرى" : "اليمنى"} يُرجّح أن الطرف الصادم كان يحاول التفادي`);
    }
  }

  // v5: كشف الانقلاب
  if (gyro?.rolloverDetected) {
    analyzed.title = "انقلاب المركبة (Rollover)";
    analyzed.code = "ROLLOVER";
    analyzed.factors.unshift("رُصد دوران عنيف للمركبة يُشير إلى انقلابها");
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
        "── تحليل متقدم (المبادئ الخمسة) ──",
        ...advancedAnalysis.discoveredFactorsAr
      );
    }

    // v7: تحسين كود السيناريو بناءً على السياق
    if (advancedAnalysis.roadContext.roadType === "roundabout" &&
        (direction === "side-left" || direction === "side-right")) {
      analyzed.code = `ROUNDABOUT_PRIORITY_${direction === "side-right" ? "R" : "L"}`;
      analyzed.title = `اصطدام جانبي في دوار — الأولوية للمركبة الدائرة`;
    }

    if (advancedAnalysis.microKinematic.scrapeDetected) {
      analyzed.code = `SCRAPE_${direction === "side-right" ? "R" : direction === "side-left" ? "L" : "U"}`;
      analyzed.title = "احتكاك/حكة جانبية — اصطدام سطحي";
    }
  }

  // تطبيق التعديل المتقدم على نسبة الخطأ الخام
  const rawFault = clamp(Math.round(analyzed.fault + advancedAdjustment), 0, 100);
  
  // نظام المرور يعتمد نسب محددة لتحديد المسؤولية: 0, 25, 50, 75, 100
  const allowedValues = [0, 25, 50, 75, 100];
  const userFault = allowedValues.reduce((prev, curr) => 
    Math.abs(curr - rawFault) < Math.abs(prev - rawFault) ? curr : prev
  );

  const otherFault = 100 - userFault;

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
    critical: "بالغة الخطورة",
    severe: "خطيرة",
    moderate: "متوسطة",
    minor: "خفيفة",
  };
  const dirAr: Record<ImpactDirection, string> = {
    front: "أمامي",
    rear: "خلفي",
    "side-left": "جانبي أيسر",
    "side-right": "جانبي أيمن",
    unknown: "غير محدد",
  };

  let faultVerdict = "";
  if (fault === 0) {
    faultVerdict = "الطرف الآخر يتحمل المسؤولية الكاملة";
  } else if (fault === 25) {
    faultVerdict = "الطرف الآخر يتحمل الجزء الأكبر من المسؤولية";
  } else if (fault === 50) {
    faultVerdict = "المسؤولية مشتركة بالتساوي بين الطرفين";
  } else if (fault === 75) {
    faultVerdict = "السائق يتحمل الجزء الأكبر من المسؤولية";
  } else {
    faultVerdict = "المسؤولية الكاملة تقع على السائق";
  }

  const jerkNote =
    jerk >= 20
      ? ` التسارع المفاجئ ${jerk.toFixed(0)} g/s يُشير إلى قوة خارجية مباغتة.`
      : "";

  const brakingNote = braking?.brakingDetected
    ? ` رُصدت محاولة فرملة (${braking.brakingDurationSec}ث) قبل الاصطدام.`
    : "";

  return (
    `اصطدام ${dirAr[dir]} بقوة ${g.toFixed(1)}g عند سرعة ${speed.toFixed(0)} كم/س.` +
    ` شدة الحادث ${sevAr[severity]}.` +
    jerkNote +
    brakingNote +
    ` ${faultVerdict} (${fault}٪ على السائق).` +
    " هذا التقدير استعلامي ولا يُعدّ حكماً قانونياً — يُنصح بالرجوع للجهات الرسمية."
  );
}
