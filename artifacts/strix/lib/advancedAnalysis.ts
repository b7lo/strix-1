/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Advanced Analysis Engine — v7.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * المبادئ الخمسة المتقدمة لتحديد المسؤولية:
 *  1. الاستقرار الزاوي (Angular Stability)
 *  2. متجهات القوة المتعددة (Multi-Vector Force)
 *  3. الارتباط المكاني والقانوني (Road Context / Geofencing)
 *  4. البصمة الحركية الدقيقة (Micro-Kinematic Signatures)
 *  5. تتابع الأحداث (Pre-Crash Event Buffering)
 *
 * كل Module يعطي score من -50 إلى +50:
 *   سالب = يقلل مسؤولية المستخدم (لصالحه)
 *   موجب = يزيد مسؤولية المستخدم (ضده)
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  AdvancedAnalysisResult,
  AngularStabilityResult,
  MultiVectorResult,
  RoadContextResult,
  RoadContextType,
  MicroKinematicResult,
  PreCrashEventsResult,
  PostImpactAnalysis,
  GyroscopeSnapshot,
  BrakingAnalysis,
  ImpactDirection,
} from "./types";
import type { RingSample } from "./sensorUtils";
import i18n from "./i18n";

// ─── ثوابت ───
const YAW_SUDDEN_THRESHOLD_DEG_S = 45;   // عتبة الدوران المفاجئ (v7.3: رُفعت من 15 إلى 45 لتجنب الإيجابيات الكاذبة من تغيير الحارة العادي)
const REAR_PUSH_RATIO_THRESHOLD = 0.3;    // نسبة الدفع الخلفي
const ROUNDABOUT_YAW_THRESHOLD = 5;       // Yaw مستمر = دوار (°/s)
const ROUNDABOUT_MIN_DURATION_MS = 3000;  // مدة Yaw مستمر لتأكيد الدوار
const SCRAPE_VARIANCE_THRESHOLD = 0.015;  // عتبة التباين للحكة
const SCRAPE_MIN_DURATION_MS = 250;       // v7.1 FIX: مدة دنيا للحكة (موسّع من 100 إلى 250 لتجنب المطبات)
const HARD_BRAKING_THRESHOLD_G = 0.4;     // عتبة الفرملة العنيفة
const HARD_ACCEL_THRESHOLD_G = 0.3;       // عتبة التسارع المفاجئ
const STEADY_VARIANCE_THRESHOLD = 0.02;   // عتبة القيادة المستقرة
const STEADY_YAW_THRESHOLD = 3;           // °/s

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ═══════════════════════════════════════════
// Module 1: Angular Stability Analyzer
// ═══════════════════════════════════════════

function analyzeAngularStability(
  gyroHistory: readonly { x: number; y: number; z: number; ts: number }[],
  braking: BrakingAnalysis | null,
  crashTimestamp: number,
  speedKmh: number // v7.4: added to prevent false swerve detection at low speeds
): AngularStabilityResult {
  const result: AngularStabilityResult = {
    hadSuddenYaw: false,
    wasEvasive: false,
    maxYawRatePreCrash: 0,
    score: 0,
  };

  // v7.4 FIX: إذا كانت السرعة أقل من 10 كم/س، فهذا يعني أن السيارة شبه متوقفة.
  // أي دوران يتم رصده هنا هو نتيجة للصدمة نفسها أو اهتزاز الجهاز، وليس مناورة حقيقية.
  if (gyroHistory.length < 3 || speedKmh < 10) return result;

  // تحليل الـ 2 ثانية قبل الصدمة
  const windowStart = crashTimestamp - 2000;
  const preCrashGyro = gyroHistory.filter(
    (s) => s.ts >= windowStart && s.ts <= crashTimestamp
  );

  if (preCrashGyro.length < 2) return result;

  // البحث عن أعلى معدل دوران Yaw (المحور Z)
  // v7.3 FIX: نطلب عيّنتين متتاليتين فوق العتبة لتأكيد الدوران الحقيقي
  //           وتجنب قراءات الجيروسكوب العشوائية (single-sample spikes)
  let maxYawRate = 0;
  let consecutiveAboveThreshold = 0;
  let confirmedSuddenYaw = false;
  for (const sample of preCrashGyro) {
    const yawDegS = Math.abs(sample.z) * (180 / Math.PI);
    if (yawDegS > maxYawRate) maxYawRate = yawDegS;
    if (yawDegS > YAW_SUDDEN_THRESHOLD_DEG_S) {
      consecutiveAboveThreshold++;
      if (consecutiveAboveThreshold >= 2) confirmedSuddenYaw = true;
    } else {
      consecutiveAboveThreshold = 0;
    }
  }

  result.maxYawRatePreCrash = Math.round(maxYawRate * 10) / 10;

  if (confirmedSuddenYaw) {
    result.hadSuddenYaw = true;

    // هل الدوران مصحوب بفرملة؟ → محاولة تفادي
    if (braking?.brakingDetected) {
      result.wasEvasive = true;
      // محاولة تفادي = لصالح المستخدم (score سالب)
      result.score = -30;
    } else {
      // دوران بدون فرملة = المستخدم غيّر مساره (ضده)
      result.score = 25;
    }
  } else {
    // لا يوجد دوران = المستخدم كان مستقيماً (لصالحه)
    result.score = -15;
  }

  return result;
}

// ═══════════════════════════════════════════
// Module 2: Multi-Vector Force Decomposition
// ═══════════════════════════════════════════

function analyzeMultiVector(
  peakFiltered: { x: number; y: number; z: number },
  direction: ImpactDirection
): MultiVectorResult {
  const lateralG = Math.abs(peakFiltered.x);
  const longitudinalG = Math.abs(peakFiltered.y);
  const totalG = lateralG + longitudinalG;

  let score = 0;

  // v7.2 FIX: rearPushRatio منطقي فقط في الصدمات الجانبية
  // في الأمامية/الخلفية: قوة Y العالية متوقعة ولا تعني "دفع خلفي"
  let rearPushRatio = 0;

  if (direction === "side-left" || direction === "side-right") {
    rearPushRatio = totalG > 0.01 ? longitudinalG / totalG : 0;

    if (rearPushRatio > REAR_PUSH_RATIO_THRESHOLD) {
      // دفع طولي في صدمة جانبية = الآخر مندفع بزاوية
      score = -20 - Math.round(rearPushRatio * 20);
      score = clamp(score, -40, 0);
    } else if (rearPushRatio < 0.1 && lateralG > 0.5) {
      score = 0;
    }
  }

  return {
    lateralG: Math.round(lateralG * 100) / 100,
    longitudinalG: Math.round(longitudinalG * 100) / 100,
    rearPushRatio: Math.round(rearPushRatio * 100) / 100,
    score,
  };
}

// ═══════════════════════════════════════════
// Module 3: Road Context Analyzer (Geofencing)
// ═══════════════════════════════════════════

function analyzeRoadContext(
  gyroHistory: readonly { x: number; y: number; z: number; ts: number }[],
  speedKmh: number,
  direction: ImpactDirection,
  crashTimestamp: number
): RoadContextResult {
  const result: RoadContextResult = {
    roadType: "unknown" as RoadContextType,
    hasPriority: false,
    wasStationary: speedKmh < 3,
    confirmedByGyro: false,
    score: 0,
  };

  // ─── كشف الدوار عبر الجيروسكوب (Sustained Yaw) ───
  // البحث عن Yaw مستمر > 5°/s لمدة > 3 ثوانٍ
  const windowStart = crashTimestamp - 5000;
  const preCrashGyro = gyroHistory.filter(
    (s) => s.ts >= windowStart && s.ts <= crashTimestamp
  );

  if (preCrashGyro.length >= 10) {
    let sustainedYawCount = 0;
    let sustainedYawStartTs = 0;

    for (const sample of preCrashGyro) {
      const yawDegS = Math.abs(sample.z) * (180 / Math.PI);
      if (yawDegS > ROUNDABOUT_YAW_THRESHOLD) {
        if (sustainedYawCount === 0) sustainedYawStartTs = sample.ts;
        sustainedYawCount++;
      } else {
        sustainedYawCount = 0;
      }
    }

    if (sustainedYawCount > 0) {
      const lastSample = preCrashGyro[preCrashGyro.length - 1];
      const sustainedDuration = lastSample.ts - sustainedYawStartTs;

      // Enhance roundabout detection: Must be between 5 km/h and 60 km/h
      // (roundabouts are typically taken at moderate speeds)
      if (sustainedDuration >= ROUNDABOUT_MIN_DURATION_MS && speedKmh > 5 && speedKmh < 60) {
        result.roadType = "roundabout";
        result.confirmedByGyro = true;
        result.hasPriority = true; // المركبة داخل الدوار لها الأولوية

        // v7.2 FIX: الدوار يؤثر على الجانبية + الزوايا الأمامية
        // لأن حادث الدوار ممكن يكون من الأمام بزاوية (front-left/front-right)
        if (direction === "side-left" || direction === "side-right" || direction === "front") {
          // صدمة في دوار = الآخر دخل بدون أولوية
          result.score = -40;
        }
      }
    }
  }

  // ─── كشف التقاطع: المستخدم كان واقفاً ثم تعرض لصدمة ───
  // v7.2 FIX: يشمل الجانبية + الزوايا الأمامية (ممكن أحد دخل عليه من تقاطع)
  if (result.roadType === "unknown" && result.wasStationary) {
    if (direction === "side-left" || direction === "side-right" || direction === "front") {
      result.roadType = "intersection";
      // واقف في تقاطع + صدمة = لصالح المستخدم
      result.score = -45;
    }
  }

  // ─── كشف الطريق السريع (سرعة > 80 كم/س) ───
  if (result.roadType === "unknown" && speedKmh > 80) {
    result.roadType = "highway";
  }

  // ─── المستخدم واقف (أي نوع طريق) ───
  if (result.wasStationary && result.score === 0) {
    result.score = -35; // واقف = براءة
  }

  return result;
}

// ═══════════════════════════════════════════
// Module 4: Micro-Kinematic Signature Detector
// بديل الميكروفون — يعتمد على Variance + Jerk + Gyro Sync
// ═══════════════════════════════════════════

function analyzeMicroKinematic(
  preCrashBuffer: readonly RingSample[],
  gyroHistory: readonly { x: number; y: number; z: number; ts: number }[],
  peakGForce: number,
  crashTimestamp: number
): MicroKinematicResult {
  const result: MicroKinematicResult = {
    scrapeDetected: false,
    highFreqVariance: 0,
    jerkGyroSync: false,
    vibrationDurationMs: 0,
    score: 0,
  };

  if (preCrashBuffer.length < 10) return result;

  // ─── 1. حساب التباين (Variance) في نوافذ 100ms ───
  const windowSize = 5; // ~100ms عند 50Hz
  const windows: number[] = [];

  for (let i = 0; i <= preCrashBuffer.length - windowSize; i += windowSize) {
    const slice = preCrashBuffer.slice(i, i + windowSize);
    const mean = slice.reduce((a, s) => a + s.gForce, 0) / slice.length;
    const variance = slice.reduce((a, s) => a + (s.gForce - mean) ** 2, 0) / slice.length;
    windows.push(variance);
  }

  // أعلى تباين مسجّل
  const maxVariance = windows.length > 0 ? Math.max(...windows) : 0;
  result.highFreqVariance = Math.round(maxVariance * 10000) / 10000;

  // ─── 2. كشف اهتزاز مستمر (نمط "الخشونة") ───
  let highVarStreak = 0;
  let maxStreak = 0;
  for (const v of windows) {
    if (v > SCRAPE_VARIANCE_THRESHOLD) {
      highVarStreak++;
      if (highVarStreak > maxStreak) maxStreak = highVarStreak;
    } else {
      highVarStreak = 0;
    }
  }
  // كل نافذة = ~100ms
  result.vibrationDurationMs = maxStreak * 100;

  // ─── 3. كشف Jerk Spike ───
  let maxJerkInWindow = 0;
  let jerkSpikeTs = 0;
  for (let i = 1; i < preCrashBuffer.length; i++) {
    const dt = (preCrashBuffer[i].ts - preCrashBuffer[i - 1].ts) / 1000;
    if (dt > 0 && dt < 1.0) {
      const jerk = Math.abs(preCrashBuffer[i].gForce - preCrashBuffer[i - 1].gForce) / dt;
      if (jerk > maxJerkInWindow) {
        maxJerkInWindow = jerk;
        jerkSpikeTs = preCrashBuffer[i].ts;
      }
    }
  }

  // ─── 4. التزامن الحركي (Kinetic-Kinetic Sync) ───
  // بدلاً من صوت + حركة، نطابق Jerk Peak مع Gyro Yaw Shift
  if (jerkSpikeTs > 0 && gyroHistory.length > 0) {
    const syncWindow = 200; // 200ms tolerance
    const nearGyro = gyroHistory.filter(
      (g) => Math.abs(g.ts - jerkSpikeTs) < syncWindow
    );

    if (nearGyro.length > 0) {
      const maxYawNear = Math.max(
        ...nearGyro.map((g) => Math.abs(g.z) * (180 / Math.PI))
      );
      // Jerk spike + Yaw shift في نفس اللحظة = تأكيد
      if (maxYawNear > 3 && maxJerkInWindow > 5) {
        result.jerkGyroSync = true;
      }
    }
  }

  // ─── 5. الحكم النهائي: هل هذه "حكة"؟ ───
  if (
    result.vibrationDurationMs >= SCRAPE_MIN_DURATION_MS &&
    maxVariance > SCRAPE_VARIANCE_THRESHOLD &&
    peakGForce < 2.0 // الحكة لا تولد G عالي
  ) {
    result.scrapeDetected = true;

    // تأكيد إضافي بالتزامن
    if (result.jerkGyroSync) {
      result.score = -25; // حكة مؤكدة بالتزامن = الآخر احتك بالمستخدم
    } else {
      result.score = -10; // حكة محتملة
    }
  } else if (result.jerkGyroSync && peakGForce < 1.5) {
    // تزامن بدون variance عالي = نتشة خفيفة
    result.scrapeDetected = true;
    result.score = -5;
  }

  return result;
}

// ═══════════════════════════════════════════
// Module 5: Pre-Crash Event Analyzer
// تحليل الـ 5 ثوانٍ قبل الصدمة
// ═══════════════════════════════════════════

function analyzePreCrashEvents(
  preCrashBuffer: readonly RingSample[],
  gyroHistory: readonly { x: number; y: number; z: number; ts: number }[],
  braking: BrakingAnalysis | null,
  crashTimestamp: number,
  speedKmh: number
): PreCrashEventsResult {
  const result: PreCrashEventsResult = {
    hardBraking: false,
    hardAcceleration: false,
    steadyDriving: false,
    evasiveManeuver: false,
    score: 0,
  };

  // v7.5 FIX: إذا كانت السرعة أقل من 10 كم/س، المركبة شبه متوقفة، ولا يمكن أن تقوم بمناورة تفادي أو فرملة.
  if (preCrashBuffer.length < 20 || speedKmh < 10) return result;

  // ─── 1. البحث عن فرملة عنيفة ───
  // v7.1 FIX: استخدام gForce delta بدل filtered.y مباشرة
  // لأن filtered.y في إطار الجهاز (يعتمد على وضعية الجوال)
  // بينما gForce delta هو frame-independent
  let brakingSamples = 0;
  let peakDecel = 0;
  for (let i = 1; i < preCrashBuffer.length; i++) {
    const dt = (preCrashBuffer[i].ts - preCrashBuffer[i - 1].ts) / 1000;
    if (dt > 0 && dt < 0.5) {
      // تباطؤ = gForce ينخفض بشكل مفاجئ (الصدمة تبطئ المركبة)
      const decelRate = (preCrashBuffer[i - 1].gForce - preCrashBuffer[i].gForce) / dt;
      if (decelRate > HARD_BRAKING_THRESHOLD_G * 10) { // معدل التباطؤ بال g/s
        brakingSamples++;
        if (decelRate > peakDecel) peakDecel = decelRate;
      }
    }
  }
  if (brakingSamples >= 10 || braking?.brakingDetected) {
    result.hardBraking = true;
  }

  // ─── 2. البحث عن تسارع مفاجئ ───
  // v7.1 FIX: frame-independent — نستخدم ارتفاع gForce بدل filtered.y
  let accelSamples = 0;
  for (let i = 1; i < preCrashBuffer.length; i++) {
    const dt = (preCrashBuffer[i].ts - preCrashBuffer[i - 1].ts) / 1000;
    if (dt > 0 && dt < 0.5) {
      const accelRate = (preCrashBuffer[i].gForce - preCrashBuffer[i - 1].gForce) / dt;
      if (accelRate > HARD_ACCEL_THRESHOLD_G * 10) {
        accelSamples++;
      }
    }
  }
  if (accelSamples >= 8) {
    result.hardAcceleration = true;
  }

  // ─── 3. البحث عن قيادة مستقرة (variance منخفض + yaw منخفض) ───
  const gValues = preCrashBuffer.map((s) => s.gForce);
  const meanG = gValues.reduce((a, b) => a + b, 0) / gValues.length;
  const varianceG = gValues.reduce((a, v) => a + (v - meanG) ** 2, 0) / gValues.length;

  const windowStart = crashTimestamp - 5000;
  const preCrashYaw = gyroHistory.filter(
    (s) => s.ts >= windowStart && s.ts <= crashTimestamp
  );
  const avgYaw = preCrashYaw.length > 0
    ? preCrashYaw.reduce((a, s) => a + Math.abs(s.z) * (180 / Math.PI), 0) / preCrashYaw.length
    : 0;

  if (varianceG < STEADY_VARIANCE_THRESHOLD && avgYaw < STEADY_YAW_THRESHOLD) {
    result.steadyDriving = true;
  }

  // ─── 4. مناورة التفادي (فرملة + انحراف في نفس الوقت) ───
  if (result.hardBraking) {
    // هل يوجد انحراف Yaw أيضاً؟
    const maxYawPreCrash = preCrashYaw.length > 0
      ? Math.max(...preCrashYaw.map((s) => Math.abs(s.z) * (180 / Math.PI)))
      : 0;
    if (maxYawPreCrash > YAW_SUDDEN_THRESHOLD_DEG_S) {
      result.evasiveManeuver = true;
    }
  }

  // ─── حساب Score ───
  if (result.evasiveManeuver) {
    result.score = -40; // مناورة تفادي = دليل براءة قوي
  } else if (result.hardBraking) {
    result.score = -25; // فرملة = حسن نية
  } else if (result.steadyDriving) {
    result.score = -15; // سير مستقيم = لم يغير مساره
  } else if (result.hardAcceleration) {
    result.score = 20;  // تسارع مفاجئ = نية سيئة محتملة
  }

  return result;
}

// ═══════════════════════════════════════════
// Module 6: Post-Impact Analysis
// تحليل الـ 2.5 ثانية بعد الصدمة
// ═══════════════════════════════════════════

function analyzePostImpact(
  postCrashBuffer: readonly RingSample[],
  postCrashGyro: readonly { x: number; y: number; z: number; ts: number }[],
  peakGForce: number,
  direction: ImpactDirection,
  wasStationary: boolean
): PostImpactAnalysis {
  const result: PostImpactAnalysis = {
    driftDirection: "none",
    driftAngleDeg: 0,
    driftMagnitudeG: 0,
    stabilizationTimeMs: 0,
    secondaryImpacts: 0,
    postImpactRotation: false,
    postImpactYawRate: 0,
    vehicleStoppedImmediately: false,
    postCrashDecelG: 0,
    directionConfirmed: false,
    score: 0,
    factorsAr: [],
  };

  if (postCrashBuffer.length < 5) return result;

  // ─── 1. تحليل الاستقرار والصدمات الثانوية ───
  let stabilizedTs = 0;
  let maxDecel = 0;
  let inSecondaryImpact = false;
  let lastG = postCrashBuffer[0].gForce;

  for (let i = 1; i < postCrashBuffer.length; i++) {
    const s = postCrashBuffer[i];
    const prev = postCrashBuffer[i - 1];
    const dt = (s.ts - prev.ts) / 1000;

    // بحث عن توقف/استقرار (< 0.3g)
    if (s.gForce < 0.3 && stabilizedTs === 0) {
      stabilizedTs = s.ts;
    } else if (s.gForce >= 0.3) {
      stabilizedTs = 0; // لم تستقر بعد
    }

    // حساب التباطؤ
    if (dt > 0 && dt < 0.5) {
      const decel = (prev.gForce - s.gForce) / dt;
      if (decel > maxDecel) maxDecel = decel;
    }

    // بحث عن صدمات ثانوية (ارتفاع مفاجئ في G بعد انخفاضه)
    if (s.gForce > 1.5 && s.gForce > lastG + 0.5) {
      if (!inSecondaryImpact) {
        result.secondaryImpacts++;
        inSecondaryImpact = true;
      }
    } else if (s.gForce < 1.0) {
      inSecondaryImpact = false;
    }
    lastG = s.gForce;
  }

  result.postCrashDecelG = Math.round(maxDecel * 100) / 100;
  
  if (stabilizedTs > 0) {
    result.stabilizationTimeMs = stabilizedTs - postCrashBuffer[0].ts;
  } else {
    result.stabilizationTimeMs = postCrashBuffer[postCrashBuffer.length - 1].ts - postCrashBuffer[0].ts;
  }

  if (wasStationary && result.stabilizationTimeMs < 500 && result.secondaryImpacts === 0) {
    result.vehicleStoppedImmediately = true;
  }

  // ─── 2. اتجاه الانحراف (Drift Direction) ───
  // أخذ متوسط القوى في إطار المركبة بعد الصدمة
  let avgX = 0;
  let avgY = 0;
  for (const s of postCrashBuffer) {
    avgX += s.filtered.x;
    avgY += s.filtered.y;
  }
  avgX /= postCrashBuffer.length;
  avgY /= postCrashBuffer.length;
  
  result.driftMagnitudeG = Math.round(Math.sqrt(avgX * avgX + avgY * avgY) * 100) / 100;

  if (result.driftMagnitudeG > 0.2) {
    if (Math.abs(avgY) > Math.abs(avgX)) {
      result.driftDirection = avgY > 0 ? "forward" : "backward";
    } else {
      result.driftDirection = avgX > 0 ? "right" : "left";
    }
  }

  // ─── 3. الدوران بعد الصدمة (Post-Impact Rotation) ───
  let maxYawRate = 0;
  for (const g of postCrashGyro) {
    const yaw = Math.abs(g.z) * (180 / Math.PI);
    if (yaw > maxYawRate) maxYawRate = yaw;
  }
  result.postImpactYawRate = Math.round(maxYawRate);
  if (maxYawRate > 30) {
    result.postImpactRotation = true;
  }

  // ─── 4. تأكيد الاتجاه الأصلي ───
  // مثال: صدمة من الخلف (اتجاه rear) يجب أن تدفع المركبة للأمام
  if (direction === "rear" && result.driftDirection === "forward") result.directionConfirmed = true;
  else if (direction === "front" && result.driftDirection === "backward") result.directionConfirmed = true;
  else if (direction === "side-left" && result.driftDirection === "right") result.directionConfirmed = true;
  else if (direction === "side-right" && result.driftDirection === "left") result.directionConfirmed = true;

  // ─── 5. حساب Score والعوامل ───
  if (result.directionConfirmed) {
    result.score = 5; // يعزز الثقة قليلاً ولكنه يحايد المسؤولية 
  }

  if (result.vehicleStoppedImmediately) {
    result.score = -20; // التوقف الفوري لمركبة كانت متوقفة دليل براءة
    result.factorsAr.push(i18n.t("advancedAnalysisFactors.postStopped"));
  } else if (result.driftDirection !== "none") {
    const dirAr: Record<string, string> = { 
      "forward": i18n.t("liability.dirFront"), 
      "backward": i18n.t("liability.dirRear"), 
      "left": i18n.t("liability.dirSideLeft"), 
      "right": i18n.t("liability.dirSideRight") 
    };
    result.factorsAr.push(i18n.t("advancedAnalysisFactors.postDrift", { dir: dirAr[result.driftDirection], g: result.driftMagnitudeG }));
  }

  if (result.postImpactRotation) {
    result.factorsAr.push(i18n.t("advancedAnalysisFactors.postRotation", { rate: result.postImpactYawRate }));
  }

  if (result.secondaryImpacts > 0) {
    result.factorsAr.push(i18n.t("advancedAnalysisFactors.postSecondary", { count: result.secondaryImpacts }));
  }

  return result;
}

// ═══════════════════════════════════════════
// Master: Combined Analysis
// ═══════════════════════════════════════════

export interface AdvancedAnalysisInput {
  peakFiltered: { x: number; y: number; z: number };
  peakGForce: number;
  speedKmh: number;
  direction: ImpactDirection;
  braking: BrakingAnalysis | null;
  gyroscope: GyroscopeSnapshot | null;
  gyroHistory: readonly { x: number; y: number; z: number; ts: number }[];
  preCrashBuffer: readonly RingSample[];
  postCrashBuffer: readonly RingSample[];
  postCrashGyro: readonly { x: number; y: number; z: number; ts: number }[];
  /** v7.1: لحظة الصدمة الفعلية (ليس Date.now()) */
  crashTimestamp?: number;
}

/**
 * الوظيفة الرئيسية — تشغيل المبادئ الخمسة وحساب التعديل النهائي
 */
export function runAdvancedAnalysis(input: AdvancedAnalysisInput): AdvancedAnalysisResult {
  // v7.1 FIX: استخدام الوقت المُمرّر بدلاً من Date.now() لتجنب إزاحة 250ms
  const crashTs = input.crashTimestamp ?? Date.now();

  // ─── تشغيل كل Module ───
  const angularStability = analyzeAngularStability(
    input.gyroHistory, input.braking, crashTs, input.speedKmh
  );

  const multiVector = analyzeMultiVector(
    input.peakFiltered, input.direction
  );

  const roadContext = analyzeRoadContext(
    input.gyroHistory, input.speedKmh, input.direction, crashTs
  );

  const microKinematic = analyzeMicroKinematic(
    input.preCrashBuffer, input.gyroHistory, input.peakGForce, crashTs
  );

  const preCrashEvents = analyzePreCrashEvents(
    input.preCrashBuffer, input.gyroHistory, input.braking, crashTs, input.speedKmh
  );

  const postImpact = analyzePostImpact(
    input.postCrashBuffer, input.postCrashGyro, input.peakGForce, input.direction, roadContext.wasStationary
  );

  // ─── حساب التعديل النهائي بأوزان ───
  // الأوزان الجديدة: Road Context (25%) > Pre-Crash (20%) > Angular (15%) > Post-Impact (15%) > Vector (15%) > Kinematic (10%)
  const weightedTotal =
    angularStability.score * 0.15 +
    multiVector.score * 0.15 +
    roadContext.score * 0.25 +
    microKinematic.score * 0.10 +
    preCrashEvents.score * 0.20 +
    postImpact.score * 0.15;

  const totalAdjustment = clamp(Math.round(weightedTotal), -50, 50);

  // ─── بناء العوامل المكتشفة بالعربي ───
  const discoveredFactorsAr: string[] = [];

  // Module 1
  if (angularStability.wasEvasive) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.evasive", { yawRate: angularStability.maxYawRatePreCrash }));
  } else if (angularStability.hadSuddenYaw) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.suddenYaw", { yawRate: angularStability.maxYawRatePreCrash }));
  } else if (angularStability.score < 0) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.straight"));
  }

  // Module 2 — يُعرض فقط للصدمات الجانبية (في الأمامية/الخلفية قوة Y العالية طبيعية)
  if (
    multiVector.rearPushRatio > REAR_PUSH_RATIO_THRESHOLD &&
    (input.direction === "side-left" || input.direction === "side-right")
  ) {
    discoveredFactorsAr.push(
      i18n.t("advancedAnalysisFactors.rearPush", { ratio: Math.round(multiVector.rearPushRatio * 100) })
    );
  }

  // Module 3
  if (roadContext.roadType === "roundabout") {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.roundabout"));
  }
  if (roadContext.wasStationary) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.stationary"));
  }

  // Module 4
  if (microKinematic.scrapeDetected) {
    if (microKinematic.jerkGyroSync) {
      discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.scrapeSync", { duration: microKinematic.vibrationDurationMs }));
    } else {
      discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.scrapeNoSync", { duration: microKinematic.vibrationDurationMs }));
    }
  }

  // Module 5
  if (preCrashEvents.evasiveManeuver) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.preCrashEvasive"));
  } else if (preCrashEvents.hardBraking) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.preCrashBraking"));
  } else if (preCrashEvents.hardAcceleration) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.preCrashAccel"));
  } else if (preCrashEvents.steadyDriving) {
    discoveredFactorsAr.push(i18n.t("advancedAnalysisFactors.preCrashSteady"));
  }

  // Module 6
  if (postImpact.factorsAr.length > 0) {
    discoveredFactorsAr.push(...postImpact.factorsAr);
  }

  return {
    angularStability,
    multiVector,
    roadContext,
    microKinematic,
    preCrashEvents,
    postImpact,
    totalAdjustment,
    discoveredFactorsAr,
  };
}
