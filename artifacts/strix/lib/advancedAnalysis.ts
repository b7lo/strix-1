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
import { getGyroYawRateDegS, mapToVehicleFrame } from "./sensorUtils";
import i18n from "./i18n";

// ─── ثوابت ───
const YAW_SUDDEN_THRESHOLD_DEG_S = 45;   // عتبة الدوران المفاجئ (v7.3: رُفعت من 15 إلى 45 لتجنب الإيجابيات الكاذبة من تغيير الحارة العادي)
const YAW_SUDDEN_MIN_DURATION_MS = 40;
const REAR_PUSH_RATIO_THRESHOLD = 0.3;    // نسبة الدفع الخلفي
const ROUNDABOUT_YAW_THRESHOLD = 5;       // Yaw مستمر = دوار (°/s)
const ROUNDABOUT_MIN_DURATION_MS = 3000;  // مدة Yaw مستمر لتأكيد الدوار
const SCRAPE_VARIANCE_THRESHOLD = 0.015;  // عتبة التباين للحكة
const SCRAPE_MIN_DURATION_MS = 250;       // v7.1 FIX: مدة دنيا للحكة (موسّع من 100 إلى 250 لتجنب المطبات)
const HARD_BRAKING_THRESHOLD_G = 0.4;     // عتبة الفرملة العنيفة
const HARD_BRAKING_MIN_DURATION_MS = 200;
const HARD_ACCEL_THRESHOLD_G = 0.3;       // عتبة التسارع المفاجئ
const HARD_ACCEL_MIN_DURATION_MS = 160;
const STEADY_VARIANCE_THRESHOLD = 0.02;   // عتبة القيادة المستقرة
const STEADY_YAW_THRESHOLD = 3;           // °/s

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function longestQualifiedDurationMs<T extends { ts: number }>(
  samples: readonly T[],
  predicate: (sample: T) => boolean,
): number {
  if (samples.length === 0) return 0;
  let intervalTotal = 0;
  let intervalCount = 0;
  for (let index = 1; index < samples.length; index++) {
    const dt = samples[index].ts - samples[index - 1].ts;
    if (dt > 0 && dt <= 200) {
      intervalTotal += dt;
      intervalCount++;
    }
  }
  const nominalInterval = intervalCount > 0 ? intervalTotal / intervalCount : 20;

  let runStart: number | null = null;
  let runLast: number | null = null;
  let best = 0;
  for (const sample of samples) {
    if (!predicate(sample)) {
      runStart = null;
      runLast = null;
      continue;
    }
    if (runStart === null || (runLast !== null && sample.ts - runLast > Math.max(100, nominalInterval * 3))) {
      runStart = sample.ts;
    }
    runLast = sample.ts;
    best = Math.max(best, runLast - runStart + nominalInterval);
  }
  return best;
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
  if (gyroHistory.length < 2 || speedKmh < 10) return result;

  // تحليل الـ 2 ثانية قبل الصدمة
  const windowStart = crashTimestamp - 2000;
  let maxYawRate = 0;
  let preCrashCount = 0;
  for (const sample of gyroHistory) {
    if (sample.ts < windowStart || sample.ts > crashTimestamp) continue;
    preCrashCount++;
    const yawDegS = getGyroYawRateDegS(sample);
    if (yawDegS > maxYawRate) maxYawRate = yawDegS;
  }
  if (preCrashCount < 2) return result;
  const suddenYawDurationMs = longestQualifiedDurationMs(
    gyroHistory,
    (sample) => sample.ts >= windowStart && sample.ts <= crashTimestamp
      && getGyroYawRateDegS(sample) > YAW_SUDDEN_THRESHOLD_DEG_S,
  );
  const confirmedSuddenYaw = suddenYawDurationMs >= YAW_SUDDEN_MIN_DURATION_MS;

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
  const vehicle = mapToVehicleFrame(peakFiltered);
  const lateralG = Math.abs(vehicle.vX);
  const longitudinalG = Math.abs(vehicle.vY);
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
  let preCrashCount = 0;
  for (const sample of gyroHistory) {
    if (sample.ts >= windowStart && sample.ts <= crashTimestamp) preCrashCount++;
  }

  if (preCrashCount >= 10) {
    let sustainedYawCount = 0;
    let sustainedYawStartTs = 0;
    let sustainedYawLastTs = 0;

    for (const sample of gyroHistory) {
      if (sample.ts < windowStart || sample.ts > crashTimestamp) continue;
      const yawDegS = getGyroYawRateDegS(sample);
      if (yawDegS > ROUNDABOUT_YAW_THRESHOLD) {
        if (sustainedYawCount === 0) sustainedYawStartTs = sample.ts;
        sustainedYawCount++;
        sustainedYawLastTs = sample.ts;
      } else {
        sustainedYawCount = 0;
      }
    }

    if (sustainedYawCount > 0) {
      const sustainedDuration = sustainedYawLastTs - sustainedYawStartTs;

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
  crashTimestamp: number,
  _sampleRateHz: number,
): MicroKinematicResult {
  const result: MicroKinematicResult = {
    scrapeDetected: false,
    highFreqVariance: 0,
    jerkGyroSync: false,
    vibrationDurationMs: 0,
    score: 0,
  };

  if (preCrashBuffer.length < 2) return result;
  const signalDurationMs = preCrashBuffer.at(-1)!.ts - preCrashBuffer[0].ts;
  if (signalDurationMs < 100) return result;

  // ─── 1. حساب التباين (Variance) في نوافذ 100ms ───
  const windowStart = preCrashBuffer[0].ts;
  const buckets = new Map<number, { count: number; sum: number; sumSquares: number }>();
  for (const sample of preCrashBuffer) {
    const bucket = Math.floor((sample.ts - windowStart) / 100);
    const aggregate = buckets.get(bucket) ?? { count: 0, sum: 0, sumSquares: 0 };
    aggregate.count++;
    aggregate.sum += sample.gForce;
    aggregate.sumSquares += sample.gForce * sample.gForce;
    buckets.set(bucket, aggregate);
  }
  let maxVariance = 0;
  let highVarStreak = 0;
  let maxStreak = 0;
  for (const aggregate of buckets.values()) {
    if (aggregate.count < 2) continue;
    const mean = aggregate.sum / aggregate.count;
    const variance = Math.max(0, aggregate.sumSquares / aggregate.count - mean * mean);
    if (variance > maxVariance) maxVariance = variance;
    if (variance > SCRAPE_VARIANCE_THRESHOLD) {
      highVarStreak++;
      if (highVarStreak > maxStreak) maxStreak = highVarStreak;
    } else {
      highVarStreak = 0;
    }
  }
  result.highFreqVariance = Math.round(maxVariance * 10000) / 10000;
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
    let maxYawNear = 0;
    for (const gyro of gyroHistory) {
      if (Math.abs(gyro.ts - jerkSpikeTs) >= syncWindow) continue;
      const yaw = getGyroYawRateDegS(gyro);
      if (yaw > maxYawNear) maxYawNear = yaw;
    }
    if (maxYawNear > 3 && maxJerkInWindow > 5) {
      result.jerkGyroSync = true;
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
  if (preCrashBuffer.length < 2 || speedKmh < 10) return result;

  // ─── 1. البحث عن فرملة عنيفة ───
  // نستخدم المركبة الطولية ذات الإشارة في إطار السيارة. مقدار gForce وحده
  // لا يميّز الفرملة من التسارع، وتناقصه يعني غالباً انتهاء اهتزاز لا فرملة.
  let peakDecel = 0;
  for (const sample of preCrashBuffer) {
    const longitudinalG = mapToVehicleFrame(sample.filtered).vY;
    const decelG = -longitudinalG;
    if (decelG > HARD_BRAKING_THRESHOLD_G) {
      if (decelG > peakDecel) peakDecel = decelG;
    }
  }
  const brakingDurationMs = longestQualifiedDurationMs(
    preCrashBuffer,
    (sample) => -mapToVehicleFrame(sample.filtered).vY > HARD_BRAKING_THRESHOLD_G,
  );
  if (brakingDurationMs >= HARD_BRAKING_MIN_DURATION_MS || braking?.brakingDetected) {
    result.hardBraking = true;
  }

  // ─── 2. البحث عن تسارع مفاجئ ───
  // تسارع أمامي موجب في إطار السيارة.
  const accelerationDurationMs = longestQualifiedDurationMs(
    preCrashBuffer,
    (sample) => mapToVehicleFrame(sample.filtered).vY > HARD_ACCEL_THRESHOLD_G,
  );
  if (accelerationDurationMs >= HARD_ACCEL_MIN_DURATION_MS) {
    result.hardAcceleration = true;
  }

  // ─── 3. البحث عن قيادة مستقرة (variance منخفض + yaw منخفض) ───
  let gTotal = 0;
  let gSquaresTotal = 0;
  for (const sample of preCrashBuffer) {
    gTotal += sample.gForce;
    gSquaresTotal += sample.gForce * sample.gForce;
  }
  const meanG = gTotal / preCrashBuffer.length;
  const varianceG = Math.max(0, gSquaresTotal / preCrashBuffer.length - meanG * meanG);

  const windowStart = crashTimestamp - 5000;
  let yawTotal = 0;
  let yawCount = 0;
  let maxYawPreCrash = 0;
  for (const sample of gyroHistory) {
    if (sample.ts < windowStart || sample.ts > crashTimestamp) continue;
    const yaw = getGyroYawRateDegS(sample);
    yawTotal += yaw;
    yawCount++;
    if (yaw > maxYawPreCrash) maxYawPreCrash = yaw;
  }
  const avgYaw = yawCount > 0 ? yawTotal / yawCount : 0;

  if (varianceG < STEADY_VARIANCE_THRESHOLD && avgYaw < STEADY_YAW_THRESHOLD) {
    result.steadyDriving = true;
  }

  // ─── 4. مناورة التفادي (فرملة + انحراف في نفس الوقت) ───
  if (result.hardBraking) {
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

  if (postCrashBuffer.length < 2) return result;

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
    const vehicle = mapToVehicleFrame(s.filtered);
    avgX += vehicle.vX;
    avgY += vehicle.vY;
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
    const yaw = getGyroYawRateDegS(g);
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
  /** معدل العينات الفعلي لضبط النوافذ الزمنية بدل افتراض 50Hz */
  sampleRateHz?: number;
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
    input.preCrashBuffer,
    input.gyroHistory,
    input.peakGForce,
    crashTs,
    input.sampleRateHz ?? 50,
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
