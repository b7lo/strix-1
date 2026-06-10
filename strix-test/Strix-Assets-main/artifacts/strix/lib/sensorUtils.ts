/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Sensor Processing Engine — v7.1
 * ═══════════════════════════════════════════════════════════════════
 *
 * المحرك الرئيسي لمعالجة بيانات الحساسات وتحليل الاصطدامات.
 * يعمل مع SessionContext.tsx عبر Expo Sensors API.
 *
 * الترقيات عن v5.0:
 *  1. Kalman Filter ثلاثي المحاور (بدل High-Pass البسيط)
 *  2. Adaptive Baseline يتكيف مع نوع الطريق والسرعة
 *  3. Frequency Separator لفصل الاهتزاز عن الصدمة الحقيقية
 *  4. Ring Buffer موسّع (5 ثوانٍ) مع بيانات مفصّلة
 *  5. تحليل Impulse Duration (مدة الصدمة) لتقدير نوع المركبة
 *  6. نظام ثقة مُحسّن يدمج كل مصادر البيانات
 *
 * القدرات الموروثة من v5:
 *  ─ نظام 8 مناطق اصطدام
 *  ─ عكس محاور نيوتن الثالث
 *  ─ نافذة Yaw زمنية (500ms)
 *  ─ تحليل الفرملة + Multi-impact
 *  ─ كشف الانقلاب والدوران
 * ═══════════════════════════════════════════════════════════════════
 */

import type { ImpactZone, ImpactDirection, GyroscopeSnapshot, BrakingAnalysis } from "./types";
import { zoneToDirection } from "./types";
import { KalmanFilter3D, AdaptiveBaseline, FrequencySeparator } from "./kalmanFilter";

// ─── ثوابت ───
const BUFFER_DURATION_SEC = 5;       // موسّع من 3 إلى 5
const BRAKING_DECEL_THRESHOLD = -0.3;
const BRAKING_MIN_SAMPLES = 5;
const MULTI_IMPACT_WINDOW_MS = 3000;
const GYRO_SPIN_THRESHOLD = 150;

// ─── محركات الفلترة الذكية (v6) ───
const kalmanAccel = new KalmanFilter3D(0.008, 0.1);
const kalmanGyro = new KalmanFilter3D(0.005, 0.08);
const adaptiveBaseline = new AdaptiveBaseline();
const freqSeparator = new FrequencySeparator();

// ─── حالة عامة ───
let lastGForceMag = 0;
let lastSampleTs = 0;
let jerkAccumPeak = 0;
let sampleRateHz = 50;
let ringBufferSize = BUFFER_DURATION_SEC * sampleRateHz;
let currentSpeedKmh = 0;

// ═══════════════════════════════════════════
// كشف وضعية الجوال تلقائياً (Gravity Tracking)
// ═══════════════════════════════════════════
//
// نستخدم فلتر Low-Pass على القراءات الخام لعزل اتجاه الجاذبية.
// من اتجاه الجاذبية نعرف كيف الجوال مرتبط:
//   - مسطح (Flat): الجاذبية على Z
//   - عمودي (Portrait): الجاذبية على Y
//   - أفقي (Landscape): الجاذبية على X
//
// ثم نعيد تعيين المحاور بحيث:
//   vehicleX = يمين/يسار المركبة
//   vehicleY = أمام/خلف المركبة
// بغض النظر عن وضعية الجوال.
//

const GRAVITY_ALPHA = 0.05; // فلتر بطيء جداً لتقدير ثابت للجاذبية
let gravityEstimate = { x: 0, y: -1, z: 0 }; // Default: portrait

export type PhoneOrientation = 'flat' | 'portrait' | 'landscape';

function updateGravityEstimate(raw: { x: number; y: number; z: number }): void {
  gravityEstimate.x = GRAVITY_ALPHA * raw.x + (1 - GRAVITY_ALPHA) * gravityEstimate.x;
  gravityEstimate.y = GRAVITY_ALPHA * raw.y + (1 - GRAVITY_ALPHA) * gravityEstimate.y;
  gravityEstimate.z = GRAVITY_ALPHA * raw.z + (1 - GRAVITY_ALPHA) * gravityEstimate.z;
}

export function getPhoneOrientation(): PhoneOrientation {
  const ax = Math.abs(gravityEstimate.x);
  const ay = Math.abs(gravityEstimate.y);
  const az = Math.abs(gravityEstimate.z);

  if (az >= ay && az >= ax) return 'flat';
  if (ay >= ax && ay >= az) return 'portrait';
  return 'landscape';
}

export function getGravityVector(): { x: number; y: number; z: number } {
  return { ...gravityEstimate };
}

/**
 * تحويل التسارع المُفلتر من إطار الجهاز إلى إطار المركبة.
 *
 * إطار المركبة:
 *   vehicleX: موجب = يمين المركبة
 *   vehicleY: موجب = أمام المركبة
 *
 * الافتراضات:
 *   - Flat (الجاذبية على Z): الشاشة للسقف، الجوال على المقعد/حامل الأكواب
 *     → X=يمين/يسار، Y=أمام/خلف
 *   - Portrait (الجاذبية على Y): الجوال عمودي في حامل الطبلون
 *     → X=يمين/يسار، Z=أمام/خلف (مع عكس الإشارة لأن +Z نحو السائق)
 *   - Landscape (الجاذبية على X): الجوال أفقي في حامل
 *     → Y=يمين/يسار (حسب الاتجاه)، Z=أمام/خلف
 */
function toVehicleFrame(filtered: FilteredReading): { vX: number; vY: number } {
  const orientation = getPhoneOrientation();

  switch (orientation) {
    case 'flat':
      // X → lateral, Y → longitudinal
      return { vX: filtered.x, vY: filtered.y };

    case 'portrait':
      // X → lateral, -Z → longitudinal
      // (لأن +Z يشير نحو السائق = خلف المركبة)
      return { vX: filtered.x, vY: -filtered.z };

    case 'landscape':
      // حسب اتجاه الميلان
      if (gravityEstimate.x > 0) {
        // landscape right: -Y → lateral, -Z → longitudinal
        return { vX: -filtered.y, vY: -filtered.z };
      } else {
        // landscape left: Y → lateral, -Z → longitudinal
        return { vX: filtered.y, vY: -filtered.z };
      }
  }
}

// ─── حالة الجيروسكوب ───
let peakRotationRate = 0;
let peakYaw = 0;
let peakPitch = 0;
let peakRoll = 0;
let gyroHistory: Array<{ x: number; y: number; z: number; ts: number }> = [];

// ─── حالة الاصطدامات ───
let impactTimestamps: number[] = [];

// ─── حالة Impulse (v6) ───
let impulseStartTs = 0;
let impulseActive = false;
let impulsePeakG = 0;
let lastImpulseDurationMs = 0;

// ─── حالة Frequency (v6) ───
let lastFreqImpulsive = false;

export interface RingSample {
  gForce: number;
  filtered: { x: number; y: number; z: number };
  raw: { x: number; y: number; z: number };
  ts: number;
  /** v6: هل هذه العينة صدمة لحظية أم اهتزاز */
  isImpulsive: boolean;
  /** v6: مركبة الصدمة عالية التردد */
  highFreqMag: number;
}

const ringBuffer: RingSample[] = [];

export interface FilteredReading {
  x: number;
  y: number;
  z: number;
}

// ─── تهيئة ───

export function setSampleRate(hz: number): void {
  sampleRateHz = Math.max(10, Math.min(100, hz));
  ringBufferSize = BUFFER_DURATION_SEC * sampleRateHz;
}

export function getSampleRate(): number {
  return sampleRateHz;
}

export function updateCurrentSpeed(speedKmh: number): void {
  currentSpeedKmh = Math.max(0, speedKmh);
  kalmanAccel.adaptToSpeed(currentSpeedKmh);
}

// ─── فلتر الإشارة (v6: Kalman) ───

/**
 * v7.2: Kalman Filter + إزالة الجاذبية
 * ─ Kalman يزيل الضوضاء العشوائية مع الحفاظ على الإشارة الحقيقية
 * ─ طرح gravityEstimate يعطي تسارع المستخدم الصافي (بدون جاذبية)
 *
 * ملاحظة: الكود يستخدم Accelerometer (يشمل الجاذبية بوحدة g)
 * وليس DeviceMotion.acceleration (بدون جاذبية بوحدة m/s²).
 * لذلك لازم نطرح الجاذبية يدوياً للحصول على قوة الصدمة الصافية.
 */
export function applyHighPassFilter(raw: {
  x: number; y: number; z: number;
}): FilteredReading {
  // تحديث تقدير الجاذبية (فلتر بطيء جداً alpha=0.05)
  // يتتبع اتجاه الجاذبية بثبات بدون ما يتأثر بالصدمات المفاجئة
  updateGravityEstimate(raw);

  // Kalman: تنظيف الضوضاء العشوائية
  const smoothed = kalmanAccel.update(raw);

  // v7.2 FIX: إزالة الجاذبية للحصول على التسارع الصافي
  // بدون هذا الطرح: الجوال الثابت يقرأ ~1g (جاذبية الأرض)
  // مع الطرح: الجوال الثابت يقرأ ~0g (لا حركة = لا قوة)
  // هذا يصلح:
  //   1. اتجاه الصدمة — بدون تشويش الجاذبية على المحاور
  //   2. قوة الصدمة — تمثل القوة الحقيقية للاصطدام فقط
  //   3. تحليل الفرملة — يقيس التباطؤ الفعلي بدون انحياز
  return {
    x: smoothed.x - gravityEstimate.x,
    y: smoothed.y - gravityEstimate.y,
    z: smoothed.z - gravityEstimate.z,
  };
}

// ─── فلتر الإشارة الحقيقي (v6) ───


export function resetFilter(): void {
  kalmanAccel.reset();
  kalmanGyro.reset();
  adaptiveBaseline.reset();
  freqSeparator.reset();
  lastGForceMag = 0;
  lastSampleTs = 0;
  jerkAccumPeak = 0;
  ringBuffer.length = 0;
  peakRotationRate = 0;
  peakYaw = 0;
  peakPitch = 0;
  peakRoll = 0;
  gyroHistory = [];
  impactTimestamps = [];
  impulseStartTs = 0;
  impulseActive = false;
  impulsePeakG = 0;
  lastImpulseDurationMs = 0;
  lastFreqImpulsive = false;
  currentSpeedKmh = 0;
  gravityEstimate = { x: 0, y: -1, z: 0 };
}

export function resetGyroPeaks(): void {
  peakRotationRate = 0;
  peakYaw = 0;
  peakPitch = 0;
  peakRoll = 0;
  jerkAccumPeak = 0;
}

// ─── حساب القوى ───

export function calculateGForce(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// ─── تسجيل العينات (v6: محسّن) ───

export function recordSample(
  gForce: number,
  filtered: FilteredReading,
  raw: { x: number; y: number; z: number }
): void {
  const now = Date.now();
  const dt = lastSampleTs > 0 ? (now - lastSampleTs) / 1000 : 1 / sampleRateHz;

  // Jerk calculation
  if (lastSampleTs > 0 && dt > 0 && dt < 1.0) {
    const jerk = Math.abs(gForce - lastGForceMag) / dt;
    if (jerk > jerkAccumPeak) jerkAccumPeak = jerk;
  }

  // v6: Adaptive Baseline
  adaptiveBaseline.addSample(gForce);

  // v6: Frequency Analysis
  const freq = freqSeparator.analyze(gForce);
  lastFreqImpulsive = freq.isImpulsive;

  // v6: Impulse Duration Tracking
  if (gForce > 1.5 && !impulseActive) {
    impulseActive = true;
    impulseStartTs = now;
    impulsePeakG = gForce;
  } else if (impulseActive) {
    if (gForce > impulsePeakG) impulsePeakG = gForce;
    if (gForce < 0.8) {
      // الصدمة انتهت
      lastImpulseDurationMs = now - impulseStartTs;
      impulseActive = false;
    }
  }

  lastGForceMag = gForce;
  lastSampleTs = now;

  ringBuffer.push({
    gForce,
    filtered,
    raw,
    ts: now,
    isImpulsive: freq.isImpulsive,
    highFreqMag: Math.abs(freq.highFrequency),
  });
  while (ringBuffer.length > ringBufferSize) ringBuffer.shift();
}

// ─── الجيروسكوب (v6: Kalman filtered) ───

export function recordGyroscopeSample(gyro: { x: number; y: number; z: number }): void {
  const now = Date.now();

  // v6: تنعيم الجيروسكوب بـ Kalman
  const smoothed = kalmanGyro.update(gyro);

  const rate = Math.sqrt(smoothed.x * smoothed.x + smoothed.y * smoothed.y + smoothed.z * smoothed.z);
  const rateDegS = rate * (180 / Math.PI);
  if (rateDegS > peakRotationRate) peakRotationRate = rateDegS;

  const yawDeg = Math.abs(smoothed.z) * (180 / Math.PI);
  const pitchDeg = Math.abs(smoothed.x) * (180 / Math.PI);
  const rollDeg = Math.abs(smoothed.y) * (180 / Math.PI);
  if (yawDeg > peakYaw) peakYaw = yawDeg;
  if (pitchDeg > peakPitch) peakPitch = pitchDeg;
  if (rollDeg > peakRoll) peakRoll = rollDeg;

  gyroHistory.push({ ...smoothed, ts: now });
  // v7.1 FIX: موسّع من 3 إلى 6 ثوانٍ لدعم Module 3 (كشف الدوار يحتاج 5 ثوانٍ)
  const cutoff = now - 6000;
  while (gyroHistory.length > 0 && gyroHistory[0].ts < cutoff) {
    gyroHistory.shift();
  }
}

export function getGyroscopeSnapshot(): GyroscopeSnapshot {
  const spinDetected = peakRotationRate > GYRO_SPIN_THRESHOLD;

  let maxX = 0, maxY = 0, maxZ = 0;
  for (const s of gyroHistory) {
    maxX = Math.max(maxX, Math.abs(s.x));
    maxY = Math.max(maxY, Math.abs(s.y));
    maxZ = Math.max(maxZ, Math.abs(s.z));
  }

  let dominantAxis: GyroscopeSnapshot["dominantAxis"] = "none";
  const maxAll = Math.max(maxX, maxY, maxZ);
  if (maxAll > 0.5) {
    if (maxZ === maxAll) dominantAxis = "yaw";
    else if (maxX === maxAll) dominantAxis = "pitch";
    else dominantAxis = "roll";
  }

  let highRollCount = 0;
  let highPitchCount = 0;
  for (const s of gyroHistory) {
    if (Math.abs(s.y) > 2.5) highRollCount++;
    if (Math.abs(s.x) > 2.5) highPitchCount++;
  }

  const rolloverDetected = highRollCount > 4 || highPitchCount > 4;

  return {
    peakRotationRate,
    spinDetected,
    dominantAxis,
    yawRate: peakYaw,
    pitchRate: peakPitch,
    rollRate: peakRoll,
    rolloverDetected,
  };
}

/**
 * v7.2: التحقق من الصدمة — معدّل ليحترم العتبة المختارة
 *
 * المضاعفات السابقة (v6) كانت مصممة لعتبة 2.0g:
 *   - Freq filter: 2.0× (= 4.0g) — مقبول
 *   - Speed filter: 1.2× (= 2.4g) — مقبول
 * لكن مع عتبة 1.5g كانت تصير:
 *   - Freq filter: 2.0× (= 3.0g) — يرفض حوادث حقيقية!
 *   - Speed filter: 1.2× (= 1.8g) — يرفض حوادث واقفة!
 *
 * v7.2: خفّفنا المضاعفات لأن المستخدم اختار العتبة بوعي.
 */
export function validateCrashWithGyro(
  gForce: number,
  speedKmh: number,
  gyroThreshold: number,
  baseCrashThreshold: number
): { isValid: boolean; confidence: number } {
  const gyro = getGyroscopeSnapshot();
  const baseline = adaptiveBaseline.getBaseline();
  const adjustedG = Math.max(0, gForce - baseline);
  const roadType = adaptiveBaseline.getRoadType();

  // صدمة قوية جداً — مؤكدة بدون أي شروط إضافية
  if (adjustedG >= baseCrashThreshold * 2.0) return { isValid: true, confidence: 98 };

  // فحص Frequency — هل الإشارة لحظية (صدمة) أم مستمرة (اهتزاز)؟
  // v7.2: خُفّض من 2.0× إلى 1.5× لاحترام العتبة المنخفضة
  if (!lastFreqImpulsive && adjustedG < baseCrashThreshold * 1.5) {
    return { isValid: false, confidence: 10 };
  }

  // طريق خشن + سرعة منخفضة + بدون دوران
  // v7.2: خُفّض من 1.5× إلى 1.3×
  if (roadType === "rough" && speedKmh < 20 && gyro.peakRotationRate < 30 && adjustedG < baseCrashThreshold * 1.3) {
    return { isValid: false, confidence: 15 };
  }

  if (gyro.peakRotationRate > gyroThreshold) {
    return { isValid: true, confidence: 85 + Math.min(10, gyro.peakRotationRate / 50) };
  }
  
  if (speedKmh > 15) return { isValid: true, confidence: 60 };
  
  // سرعة شبه معدومة — نتسامح أكثر مع العتبة المختارة
  // v7.2: خُفّض من 1.2× إلى 1.1×
  if (speedKmh < 5 && adjustedG < baseCrashThreshold * 1.1) return { isValid: false, confidence: 20 };
  
  return { isValid: true, confidence: 45 };
}

// ─── الاستخراجات ───

export function getJerkPeak(): number { return jerkAccumPeak; }
export function getBaselineG(): number { return adaptiveBaseline.getBaseline(); }
export function getRingBuffer(): readonly RingSample[] { return ringBuffer; }
export function getRoadType(): "smooth" | "normal" | "rough" { return adaptiveBaseline.getRoadType(); }
export function getImpulseDurationMs(): number { return lastImpulseDurationMs; }

/**
 * v7: تصدير تاريخ الجيروسكوب للتحليل المتقدم
 * يُستخدم في Module 1 (Angular Stability) و Module 3 (Road Context)
 */
export function getGyroHistory(): readonly { x: number; y: number; z: number; ts: number }[] {
  return gyroHistory;
}

/**
 * v7: استخراج بيانات ما قبل الحادث من Ring Buffer
 * يُستخدم في Module 4 (Micro-Kinematic) و Module 5 (Pre-Crash Events)
 * @param seconds عدد الثواني المطلوبة (حد أقصى BUFFER_DURATION_SEC)
 */
export function getPreCrashBuffer(seconds: number = 5): readonly RingSample[] {
  const requestedSamples = Math.min(
    Math.ceil(seconds * sampleRateHz),
    ringBuffer.length
  );
  return ringBuffer.slice(-requestedSamples);
}

/**
 * v8: استخراج بيانات ما بعد الصدمة من Ring Buffer
 * تُستخدم في Module 6 (Post-Impact Analysis)
 * @param crashTimestamp لحظة الصدمة الفعلية
 * @param durationMs مدة النافذة بعد الصدمة (افتراضي 2500ms)
 */
export function getPostCrashBuffer(crashTimestamp: number, durationMs: number = 2500): readonly RingSample[] {
  const endTs = crashTimestamp + durationMs;
  return ringBuffer.filter(s => s.ts > crashTimestamp && s.ts <= endTs);
}

/**
 * v8: استخراج بيانات الجيروسكوب بعد الصدمة
 * @param crashTimestamp لحظة الصدمة الفعلية
 * @param durationMs مدة النافذة بعد الصدمة (افتراضي 2500ms)
 */
export function getPostCrashGyro(crashTimestamp: number, durationMs: number = 2500): readonly { x: number; y: number; z: number; ts: number }[] {
  const endTs = crashTimestamp + durationMs;
  return gyroHistory.filter(s => s.ts > crashTimestamp && s.ts <= endTs);
}

/**
 * v6: الحد المعدّل حسب نوع الطريق
 */
export function getAdjustedThreshold(baseThreshold: number): number {
  return adaptiveBaseline.getAdjustedThreshold(baseThreshold);
}

// ─── كشف الفرملة ───

export function analyzeBraking(speedKmh: number): BrakingAnalysis {
  if (ringBuffer.length < BRAKING_MIN_SAMPLES * 2) {
    return { brakingDetected: false, brakingDurationSec: 0, decelerationG: 0, speedBeforeBraking: speedKmh };
  }

  const searchWindow = Math.min(ringBuffer.length - 1, sampleRateHz * 2);
  const samples = ringBuffer.slice(-searchWindow - 1, -1);

  let consecutiveDecel = 0;
  let peakDecel = 0;

  for (let i = 0; i < samples.length; i++) {
    const vehicle = toVehicleFrame(samples[i].filtered);
    const yDecel = -vehicle.vY;
    if (yDecel > Math.abs(BRAKING_DECEL_THRESHOLD)) {
      consecutiveDecel++;
      if (yDecel > peakDecel) peakDecel = yDecel;
    } else {
      consecutiveDecel = 0;
      peakDecel = 0;
    }
  }

  if (consecutiveDecel >= BRAKING_MIN_SAMPLES) {
    const durationSec = consecutiveDecel / sampleRateHz;
    const speedBeforeBraking = speedKmh + (peakDecel * 9.81 * durationSec * 3.6);
    return {
      brakingDetected: true,
      brakingDurationSec: Math.round(durationSec * 100) / 100,
      decelerationG: Math.round(peakDecel * 100) / 100,
      speedBeforeBraking: Math.round(speedBeforeBraking),
    };
  }

  return { brakingDetected: false, brakingDurationSec: 0, decelerationG: 0, speedBeforeBraking: speedKmh };
}

// ═══════════════════════════════════════════
// كشف منطقة الاصطدام الدقيقة — 8 مناطق
// ═══════════════════════════════════════════

export function findPeakZone(): { zone: ImpactZone; peakG: number; peakFiltered: FilteredReading } {
  const windowSize = Math.min(ringBuffer.length, Math.ceil(sampleRateHz * 0.3));
  const window = ringBuffer.slice(-windowSize);

  if (window.length === 0) {
    return { zone: "unknown", peakG: 0, peakFiltered: { x: 0, y: 0, z: 0 } };
  }

  let peakSample = window[0];
  for (const s of window) {
    if (s.gForce > peakSample.gForce) peakSample = s;
  }

  const zone = detectImpactZone(peakSample.filtered);
  return { zone, peakG: peakSample.gForce, peakFiltered: peakSample.filtered };
}

function getWindowedYaw(): { yawDeg: number; hasData: boolean } {
  if (gyroHistory.length < 3) return { yawDeg: 0, hasData: false };

  const now = gyroHistory[gyroHistory.length - 1].ts;
  const windowStart = now - 500;
  let maxYaw = 0;

  for (let i = gyroHistory.length - 1; i >= 0; i--) {
    if (gyroHistory[i].ts < windowStart) break;
    const yaw = Math.abs(gyroHistory[i].z) * (180 / Math.PI);
    if (yaw > maxYaw) maxYaw = yaw;
  }

  return { yawDeg: maxYaw, hasData: true };
}

export function detectImpactZone(filtered: FilteredReading): ImpactZone {
  // ═══════════════════════════════════════════
  // v6.1: تحويل من إطار الجهاز إلى إطار المركبة
  // يعمل مع كل وضعيات الجوال (مسطح، عمودي، أفقي)
  // ═══════════════════════════════════════════
  const vehicle = toVehicleFrame(filtered);

  const absX = Math.abs(vehicle.vX);
  const absY = Math.abs(vehicle.vY);
  const totalXY = absX + absY;

  if (totalXY < 0.05) return "unknown";

  // المعدل المرجّح من آخر 8 عينات قوية (في إطار المركبة)
  const recentHigh = ringBuffer
    .slice(-8)
    .filter((s) => s.gForce > 0.5);

  let avgX = vehicle.vX;
  let avgY = vehicle.vY;

  if (recentHigh.length >= 3) {
    let wX = 0, wY = 0, totalW = 0;
    for (const s of recentHigh) {
      const sv = toVehicleFrame(s.filtered);
      wX += sv.vX * s.gForce;
      wY += sv.vY * s.gForce;
      totalW += s.gForce;
    }
    if (totalW > 0) {
      avgX = wX / totalW;
      avgY = wY / totalW;
    }
  }

  // عكس المحاور (قانون نيوتن الثالث)
  // الحساس يقيس التسارع الناتج (عكس مصدر القوة)
  // فنعكسها لنحصل على اتجاه المصدر
  avgX = -avgX;
  avgY = -avgY;

  const aX = Math.abs(avgX);
  const aY = Math.abs(avgY);
  const sumXY = aX + aY;
  if (sumXY < 0.03) return "unknown";

  const yDom = aY / sumXY;
  const xDom = aX / sumXY;
  const { yawDeg, hasData: hasGyro } = getWindowedYaw();

  // ─── اصطدام أمامي أو خلفي (Y مهيمن) ───
  //
  // بعد العكس + التحويل لإطار المركبة:
  //   avgY > 0 → المصدر من الأمام
  //   avgY < 0 → المصدر من الخلف
  //   avgX > 0 → المصدر من اليمين
  //   avgX < 0 → المصدر من اليسار
  //
  if (yDom >= 0.55) {
    const isFront = avgY > 0;
    const cornerRatio = aX / aY;

    if (cornerRatio < 0.35 && (!hasGyro || yawDeg < 80)) {
      return isFront ? "front" : "rear";
    }

    if (avgX > 0) {
      return isFront ? "front-right" : "rear-right";
    } else {
      return isFront ? "front-left" : "rear-left";
    }
  }

  // ─── اصطدام جانبي (X مهيمن) ───
  if (xDom >= 0.55) {
    const isRight = avgX > 0;
    return isRight ? "side-right" : "side-left";
  }

  // ─── منطقة زاوية بينية ───
  if (avgY > 0) {
    return avgX > 0 ? "front-right" : "front-left";
  } else {
    return avgX > 0 ? "rear-right" : "rear-left";
  }
}

export function detectDirection(filtered: FilteredReading): ImpactDirection {
  const zone = detectImpactZone(filtered);
  return zoneToDirection(zone);
}

// ─── كشف الاصطدامات المتتالية ───

export function recordImpact(): number {
  const now = Date.now();
  impactTimestamps.push(now);
  const cutoff = now - MULTI_IMPACT_WINDOW_MS;
  impactTimestamps = impactTimestamps.filter((t) => t >= cutoff);
  return impactTimestamps.length;
}

export function getImpactCount(): number {
  const now = Date.now();
  const cutoff = now - MULTI_IMPACT_WINDOW_MS;
  return impactTimestamps.filter((t) => t >= cutoff).length;
}

// ─── تشخيص (v6: موسّع) ───

export interface SensorDiagnostics {
  sampleRate: number;
  bufferSize: number;
  currentBufferLength: number;
  baselineG: number;
  baselineSettled: boolean;
  jerkPeak: number;
  peakGyroRate: number;
  impactCount: number;
  /** v6 */
  roadType: "smooth" | "normal" | "rough";
  lastImpulseDurationMs: number;
  currentSpeed: number;
}

export function getDiagnostics(): SensorDiagnostics {
  return {
    sampleRate: sampleRateHz,
    bufferSize: ringBufferSize,
    currentBufferLength: ringBuffer.length,
    baselineG: adaptiveBaseline.getBaseline(),
    baselineSettled: adaptiveBaseline.isSettled(),
    jerkPeak: jerkAccumPeak,
    peakGyroRate: peakRotationRate,
    impactCount: getImpactCount(),
    roadType: adaptiveBaseline.getRoadType(),
    lastImpulseDurationMs: lastImpulseDurationMs,
    currentSpeed: currentSpeedKmh,
  };
}
