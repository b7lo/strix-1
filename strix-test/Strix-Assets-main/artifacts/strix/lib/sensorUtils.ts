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
// ─── حالة عامة ───
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
export type PhoneOrientation = 'flat' | 'portrait' | 'landscape';

function updateGravityEstimate(raw: { x: number; y: number; z: number }): void {
  sensorEngine.gravityEstimate.x = GRAVITY_ALPHA * raw.x + (1 - GRAVITY_ALPHA) * sensorEngine.gravityEstimate.x;
  sensorEngine.gravityEstimate.y = GRAVITY_ALPHA * raw.y + (1 - GRAVITY_ALPHA) * sensorEngine.gravityEstimate.y;
  sensorEngine.gravityEstimate.z = GRAVITY_ALPHA * raw.z + (1 - GRAVITY_ALPHA) * sensorEngine.gravityEstimate.z;
}

export function getPhoneOrientation(): PhoneOrientation {
  const ax = Math.abs(sensorEngine.gravityEstimate.x);
  const ay = Math.abs(sensorEngine.gravityEstimate.y);
  const az = Math.abs(sensorEngine.gravityEstimate.z);

  if (az >= ay && az >= ax) return 'flat';
  if (ay >= ax && ay >= az) return 'portrait';
  return 'landscape';
}

export function getGravityVector(): { x: number; y: number; z: number } {
  return { ...sensorEngine.gravityEstimate };
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

function mapToVehicleFrame(vec: { x: number; y: number; z: number }): { vX: number; vY: number; vZ: number } {
  const orientation = getPhoneOrientation();
  const gx = sensorEngine.gravityEstimate.x;
  const gy = sensorEngine.gravityEstimate.y;
  const gz = sensorEngine.gravityEstimate.z;
  const gMag = Math.sqrt(gx*gx + gy*gy + gz*gz);

  if (gMag < 0.1) {
    // Fallback if gravity is not yet estimated
    if (orientation === 'flat') return { vX: vec.x, vY: vec.y, vZ: vec.z };
    if (orientation === 'portrait') return { vX: vec.x, vY: -vec.z, vZ: vec.y };
    return { vX: gx > 0 ? -vec.y : vec.y, vY: -vec.z, vZ: gx > 0 ? -vec.x : vec.x };
  }

  // Normalize gravity to get true UP vector
  const uX = gx / gMag;
  const uY = gy / gMag;
  const uZ = gz / gMag;

  switch (orientation) {
    case 'flat': {
      // UP is Z. Lateral is X. Forward = UP x Lateral = +Y
      const fMag = Math.sqrt(uZ*uZ + uY*uY);
      const vX = vec.x;
      const vY = fMag > 0.1 ? (vec.y * (uZ / fMag) - vec.z * (uY / fMag)) : vec.y;
      const vZ = vec.x * uX + vec.y * uY + vec.z * uZ; // True UP
      return { vX, vY, vZ };
    }
    case 'portrait': {
      // UP is Y. Lateral is X. Forward = UP x Lateral = -Z
      const fMag = Math.sqrt(uZ*uZ + uY*uY);
      const vX = vec.x;
      const vY = fMag > 0.1 ? (vec.y * (uZ / fMag) - vec.z * (uY / fMag)) : -vec.z;
      const vZ = vec.x * uX + vec.y * uY + vec.z * uZ;
      return { vX, vY, vZ };
    }
    case 'landscape': {
      // UP is X. Lateral is Y. 
      const latY = gx > 0 ? -1 : 1;
      const fMag = Math.sqrt(uZ*uZ + uX*uX);
      const vX = gx > 0 ? -vec.y : vec.y;
      if (fMag < 0.1) return { vX, vY: -vec.z, vZ: vec.x * uX + vec.y * uY + vec.z * uZ };
      
      const fX = -uZ * latY / fMag;
      const fZ = uX * latY / fMag;
      
      const vY = vec.x * fX + vec.z * fZ;
      const vZ = vec.x * uX + vec.y * uY + vec.z * uZ;
      return { vX, vY, vZ };
    }
  }
}


class TimeWindowBuffer<T extends { ts: number }> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  public length = 0;

  constructor(public capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length++;
    } else {
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  dropOlderThan(cutoff: number) {
    while (this.length > 0) {
      if (this.buffer[this.tail].ts < cutoff) {
        this.tail = (this.tail + 1) % this.capacity;
        this.length--;
      } else {
        break;
      }
    }
  }

  // Iterate over elements (from oldest to newest)
  forEach(callback: (item: T) => void) {
    for (let i = 0; i < this.length; i++) {
      callback(this.buffer[(this.tail + i) % this.capacity]);
    }
  }

  // Get last element
  getLast(): T | undefined {
    if (this.length === 0) return undefined;
    return this.buffer[(this.tail + this.length - 1) % this.capacity];
  }
  
  // Get slice from the end
  sliceFromEnd(count: number): T[] {
    const result: T[] = [];
    const elementsToGet = Math.min(count, this.length);
    for (let i = this.length - elementsToGet; i < this.length; i++) {
      result.push(this.buffer[(this.tail + i) % this.capacity]);
    }
    return result;
  }
  
  sliceByTimeRange(from: number, to: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.length; i++) {
      const item = this.buffer[(this.tail + i) % this.capacity];
      if (item.ts > from && item.ts <= to) result.push(item);
      else if (item.ts > to) break; // Buffer مرتّب زمنياً
    }
    return result;
  }
  
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.length; i++) {
      result.push(this.buffer[(this.tail + i) % this.capacity]);
    }
    return result;
  }
}

// ─── حالة الجيروسكوب ───
// ─── حالة الاصطدامات ───
// ─── حالة Impulse (v6) ───
// ─── حالة Frequency (v6) ───
export class SensorEngine {
  kalmanAccel = new KalmanFilter3D(0.008, 0.1);
  kalmanGyro = new KalmanFilter3D(0.005, 0.08);
  adaptiveBaseline = new AdaptiveBaseline();
  freqSeparator = new FrequencySeparator();

  lastGForceMag = 0;
  lastSampleTs = 0;
  jerkAccumPeak = 0;
  sampleRateHz = 50;
  ringBufferSize = 5 * 50;
  currentSpeedKmh = 0;

  gravityEstimate = { x: 0, y: -1, z: 0 };

  peakRotationRate = 0;
  peakYaw = 0;
  peakPitch = 0;
  peakRoll = 0;
  gyroHistory = new TimeWindowBuffer<{ x: number; y: number; z: number; ts: number }>(400);

  impactTimestamps: number[] = [];

  impulseStartTs = 0;
  impulseActive = false;
  impulsePeakG = 0;
  lastImpulseDurationMs = 0;

  lastFreqImpulsive = false;

  ringBuffer = new TimeWindowBuffer<RingSample>(1000);
}

export const sensorEngine = new SensorEngine();

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

export interface FilteredReading {
  x: number;
  y: number;
  z: number;
}

// ─── تهيئة ───

export function setSampleRate(hz: number): void {
  sensorEngine.sampleRateHz = Math.max(10, Math.min(100, hz));
  sensorEngine.ringBufferSize = BUFFER_DURATION_SEC * sensorEngine.sampleRateHz;
}

export function getSampleRate(): number {
  return sensorEngine.sampleRateHz;
}

export function updateCurrentSpeed(speedKmh: number): void {
  sensorEngine.currentSpeedKmh = Math.max(0, speedKmh);
  sensorEngine.kalmanAccel.adaptToSpeed(sensorEngine.currentSpeedKmh);
}

// ─── فلتر الإشارة (v6: Kalman) ───

/**
 * v7.2: Kalman Filter + إزالة الجاذبية
 * ─ Kalman يزيل الضوضاء العشوائية مع الحفاظ على الإشارة الحقيقية
 * ─ طرح sensorEngine.gravityEstimate يعطي تسارع المستخدم الصافي (بدون جاذبية)
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
  const smoothed = sensorEngine.kalmanAccel.update(raw);

  // v7.2 FIX: إزالة الجاذبية للحصول على التسارع الصافي
  // بدون هذا الطرح: الجوال الثابت يقرأ ~1g (جاذبية الأرض)
  // مع الطرح: الجوال الثابت يقرأ ~0g (لا حركة = لا قوة)
  // هذا يصلح:
  //   1. اتجاه الصدمة — بدون تشويش الجاذبية على المحاور
  //   2. قوة الصدمة — تمثل القوة الحقيقية للاصطدام فقط
  //   3. تحليل الفرملة — يقيس التباطؤ الفعلي بدون انحياز
  return {
    x: smoothed.x - sensorEngine.gravityEstimate.x,
    y: smoothed.y - sensorEngine.gravityEstimate.y,
    z: smoothed.z - sensorEngine.gravityEstimate.z,
  };
}

// ─── فلتر الإشارة الحقيقي (v6) ───


export function resetFilter(): void {
  sensorEngine.kalmanAccel.reset();
  sensorEngine.kalmanGyro.reset();
  sensorEngine.adaptiveBaseline.reset();
  sensorEngine.freqSeparator.reset();
  sensorEngine.lastGForceMag = 0;
  sensorEngine.lastSampleTs = 0;
  sensorEngine.jerkAccumPeak = 0;
  sensorEngine.ringBuffer.length = 0;
  sensorEngine.peakRotationRate = 0;
  sensorEngine.peakYaw = 0;
  sensorEngine.peakPitch = 0;
  sensorEngine.peakRoll = 0;
  sensorEngine.gyroHistory = new TimeWindowBuffer<{ x: number; y: number; z: number; ts: number }>(400);
  sensorEngine.impactTimestamps = [];
  sensorEngine.impulseStartTs = 0;
  sensorEngine.impulseActive = false;
  sensorEngine.impulsePeakG = 0;
  sensorEngine.lastImpulseDurationMs = 0;
  sensorEngine.lastFreqImpulsive = false;
  sensorEngine.currentSpeedKmh = 0;
  sensorEngine.gravityEstimate = { x: 0, y: -1, z: 0 };
}

export function resetGyroPeaks(): void {
  sensorEngine.peakRotationRate = 0;
  sensorEngine.peakYaw = 0;
  sensorEngine.peakPitch = 0;
  sensorEngine.peakRoll = 0;
  sensorEngine.jerkAccumPeak = 0;
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
  const dt = sensorEngine.lastSampleTs > 0 ? (now - sensorEngine.lastSampleTs) / 1000 : 1 / sensorEngine.sampleRateHz;

  // Jerk calculation
  if (sensorEngine.lastSampleTs > 0 && dt > 0 && dt < 1.0) {
    const jerk = Math.abs(gForce - sensorEngine.lastGForceMag) / dt;
    if (jerk > sensorEngine.jerkAccumPeak) sensorEngine.jerkAccumPeak = jerk;
  }

  // v6: Adaptive Baseline
  sensorEngine.adaptiveBaseline.addSample(gForce);
  
  // v8 (I-1): التكيف التلقائي لضوضاء العملية بناءً على نوع الطريق
  const roadType = sensorEngine.adaptiveBaseline.getRoadType();
  sensorEngine.kalmanAccel.adaptToRoadType(roadType);

  // v6: Frequency Analysis
  const freq = sensorEngine.freqSeparator.analyze(gForce);
  sensorEngine.lastFreqImpulsive = freq.isImpulsive;

  // v6: Impulse Duration Tracking
  if (gForce > 1.5 && !sensorEngine.impulseActive) {
    sensorEngine.impulseActive = true;
    sensorEngine.impulseStartTs = now;
    sensorEngine.impulsePeakG = gForce;
  } else if (sensorEngine.impulseActive) {
    if (gForce > sensorEngine.impulsePeakG) sensorEngine.impulsePeakG = gForce;
    if (gForce < 0.8) {
      // الصدمة انتهت
      sensorEngine.lastImpulseDurationMs = now - sensorEngine.impulseStartTs;
      sensorEngine.impulseActive = false;
    }
  }

  sensorEngine.lastGForceMag = gForce;
  sensorEngine.lastSampleTs = now;

  sensorEngine.ringBuffer.push({
    gForce,
    filtered,
    raw,
    ts: now,
    isImpulsive: freq.isImpulsive,
    highFreqMag: Math.abs(freq.highFrequency),
  });

}

// ─── الجيروسكوب (v6: Kalman filtered) ───

export function recordGyroscopeSample(gyro: { x: number; y: number; z: number }): void {
  const now = Date.now();

  // v6: تنعيم الجيروسكوب بـ Kalman
  const smoothed = sensorEngine.kalmanGyro.update(gyro);

  const rate = Math.sqrt(smoothed.x * smoothed.x + smoothed.y * smoothed.y + smoothed.z * smoothed.z);
  const rateDegS = rate * (180 / Math.PI);
  if (rateDegS > sensorEngine.peakRotationRate) sensorEngine.peakRotationRate = rateDegS;

  const yawDeg = Math.abs(smoothed.z) * (180 / Math.PI);
  const pitchDeg = Math.abs(smoothed.x) * (180 / Math.PI);
  const rollDeg = Math.abs(smoothed.y) * (180 / Math.PI);
  if (yawDeg > sensorEngine.peakYaw) sensorEngine.peakYaw = yawDeg;
  if (pitchDeg > sensorEngine.peakPitch) sensorEngine.peakPitch = pitchDeg;
  if (rollDeg > sensorEngine.peakRoll) sensorEngine.peakRoll = rollDeg;

  sensorEngine.gyroHistory.push({ ...smoothed, ts: now });
  // v7.1 FIX: موسّع من 3 إلى 6 ثوانٍ لدعم Module 3 (كشف الدوار يحتاج 5 ثوانٍ)
  const cutoff = now - 6000;
  sensorEngine.gyroHistory.dropOlderThan(cutoff);
}

export function getGyroscopeSnapshot(): GyroscopeSnapshot {
  const spinDetected = sensorEngine.peakRotationRate > GYRO_SPIN_THRESHOLD;

  let maxX = 0, maxY = 0, maxZ = 0;
  let highRollCount = 0;
  let highPitchCount = 0;

  sensorEngine.gyroHistory.forEach(s => {
    // Project gyro into true vehicle axes
    const veh = mapToVehicleFrame(s);
    
    // vX: Pitch Rate, vY: Roll Rate, vZ: Yaw Rate
    maxX = Math.max(maxX, Math.abs(veh.vX));
    maxY = Math.max(maxY, Math.abs(veh.vY));
    maxZ = Math.max(maxZ, Math.abs(veh.vZ));
    
    // Use 2.0 rad/s (~115 deg/s) as realistic vehicle rollover threshold
    if (Math.abs(veh.vY) > 2.0) highRollCount++;
    if (Math.abs(veh.vX) > 2.0) highPitchCount++;
  });

  let dominantAxis: GyroscopeSnapshot["dominantAxis"] = "none";
  const maxAll = Math.max(maxX, maxY, maxZ);
  if (maxAll > 0.5) {
    if (maxZ === maxAll) dominantAxis = "yaw";
    else if (maxX === maxAll) dominantAxis = "pitch";
    else dominantAxis = "roll";
  }

  // Require sustained roll over multiple samples
  const rolloverDetected = highRollCount > 4 || highPitchCount > 4;

    return {
    peakRotationRate: sensorEngine.peakRotationRate,
    spinDetected,
    dominantAxis,
    rolloverDetected,
    pitchRate: maxX,
    rollRate: maxY,
    yawRate: maxZ,
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
  const baseline = sensorEngine.adaptiveBaseline.getBaseline();
  const adjustedG = Math.max(0, gForce - baseline);
  const roadType = sensorEngine.adaptiveBaseline.getRoadType();

  // صدمة قوية جداً — مؤكدة بدون أي شروط إضافية
  if (adjustedG >= baseCrashThreshold * 2.0) return { isValid: true, confidence: 98 };

  // فحص Frequency — هل الإشارة لحظية (صدمة) أم مستمرة (اهتزاز)؟
  // v7.2: خُفّض من 2.0× إلى 1.5× لاحترام العتبة المنخفضة
  if (!sensorEngine.lastFreqImpulsive && adjustedG < baseCrashThreshold * 1.5) {
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

export function getJerkPeak(): number { return sensorEngine.jerkAccumPeak; }
export function getBaselineG(): number { return sensorEngine.adaptiveBaseline.getBaseline(); }
export function getRingBuffer(): readonly RingSample[] { return sensorEngine.ringBuffer.toArray(); }
export function getRoadType(): "smooth" | "normal" | "rough" { return sensorEngine.adaptiveBaseline.getRoadType(); }
export function getImpulseDurationMs(): number { return sensorEngine.lastImpulseDurationMs; }

/**
 * v7: تصدير تاريخ الجيروسكوب للتحليل المتقدم
 * يُستخدم في Module 1 (Angular Stability) و Module 3 (Road Context)
 */
export function getGyroHistory(): readonly { x: number; y: number; z: number; ts: number }[] {
  return sensorEngine.gyroHistory.toArray();
}

/**
 * v7: استخراج بيانات ما قبل الحادث من Ring Buffer
 * يُستخدم في Module 4 (Micro-Kinematic) و Module 5 (Pre-Crash Events)
 * @param seconds عدد الثواني المطلوبة (حد أقصى BUFFER_DURATION_SEC)
 */
export function getPreCrashBuffer(seconds: number = 5): readonly RingSample[] {
  const requestedSamples = Math.min(
    Math.ceil(seconds * sensorEngine.sampleRateHz),
    sensorEngine.ringBuffer.length
  );
  return sensorEngine.ringBuffer.sliceFromEnd(requestedSamples);
}

/**
 * v8: استخراج بيانات ما بعد الصدمة من Ring Buffer
 * تُستخدم في Module 6 (Post-Impact Analysis)
 * @param crashTimestamp لحظة الصدمة الفعلية
 * @param durationMs مدة النافذة بعد الصدمة (افتراضي 2500ms)
 */
export function getPostCrashBuffer(crashTimestamp: number, durationMs: number = 2500): readonly RingSample[] {
  const endTs = crashTimestamp + durationMs;
  return sensorEngine.ringBuffer.sliceByTimeRange(crashTimestamp, endTs);
}

/**
 * v8: استخراج بيانات الجيروسكوب بعد الصدمة
 * @param crashTimestamp لحظة الصدمة الفعلية
 * @param durationMs مدة النافذة بعد الصدمة (افتراضي 2500ms)
 */
export function getPostCrashGyro(crashTimestamp: number, durationMs: number = 2500): readonly { x: number; y: number; z: number; ts: number }[] {
  const endTs = crashTimestamp + durationMs;
  return sensorEngine.gyroHistory.sliceByTimeRange(crashTimestamp, endTs);
}

/**
 * v6: الحد المعدّل حسب نوع الطريق
 */
export function getAdjustedThreshold(baseThreshold: number): number {
  return sensorEngine.adaptiveBaseline.getAdjustedThreshold(baseThreshold);
}

// ─── كشف الفرملة ───

export function analyzeBraking(speedKmh: number): BrakingAnalysis {
  if (sensorEngine.ringBuffer.length < BRAKING_MIN_SAMPLES * 2) {
    return { brakingDetected: false, brakingDurationSec: 0, decelerationG: 0, speedBeforeBraking: speedKmh };
  }

  const searchWindow = Math.min(sensorEngine.ringBuffer.length - 1, sensorEngine.sampleRateHz * 2);
  const samples = sensorEngine.ringBuffer.sliceFromEnd(searchWindow);

  let consecutiveDecel = 0;
  let peakDecel = 0;
  let totalDecel = 0;

  for (let i = 0; i < samples.length; i++) {
    const vehicle = mapToVehicleFrame(samples[i].filtered);
    const yDecel = -vehicle.vY;
    if (yDecel > Math.abs(BRAKING_DECEL_THRESHOLD)) {
      consecutiveDecel++;
      totalDecel += yDecel;
      if (yDecel > peakDecel) peakDecel = yDecel;
    } else {
      consecutiveDecel = 0;
      totalDecel = 0;
      peakDecel = 0;
    }
  }

  if (consecutiveDecel >= BRAKING_MIN_SAMPLES) {
    const durationSec = consecutiveDecel / sensorEngine.sampleRateHz;
    const avgDecel = totalDecel / consecutiveDecel;
    const speedBeforeBraking = speedKmh + (avgDecel * 9.81 * durationSec * 3.6);
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
  const windowSize = Math.min(sensorEngine.ringBuffer.length, Math.ceil(sensorEngine.sampleRateHz * 0.3));
  const window = sensorEngine.ringBuffer.sliceFromEnd(windowSize);

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
  if (sensorEngine.gyroHistory.length < 3) return { yawDeg: 0, hasData: false };

  const last = sensorEngine.gyroHistory.getLast();
  if (!last) return { yawDeg: 0, hasData: false };
  const now = last.ts;
  const windowStart = now - 500;
  let maxYaw = 0;

  sensorEngine.gyroHistory.forEach(s => {
    if (s.ts >= windowStart) {
      // Map to vehicle frame to get true yaw
      const veh = mapToVehicleFrame(s);
      const yaw = Math.abs(veh.vZ) * (180 / Math.PI);
      if (yaw > maxYaw) maxYaw = yaw;
    }
  });

  return { yawDeg: maxYaw, hasData: true };
}

export function detectImpactZone(filtered: FilteredReading): ImpactZone {
  // ═══════════════════════════════════════════
  // v6.1: تحويل من إطار الجهاز إلى إطار المركبة
  // يعمل مع كل وضعيات الجوال (مسطح، عمودي، أفقي)
  // ═══════════════════════════════════════════
  const vehicle = mapToVehicleFrame(filtered);

  const absX = Math.abs(vehicle.vX);
  const absY = Math.abs(vehicle.vY);
  const totalXY = absX + absY;

  if (totalXY < 0.05) return "unknown";

  // المعدل المرجّح من آخر 8 عينات قوية (في إطار المركبة)
  const recentHigh = sensorEngine.ringBuffer.sliceFromEnd(8).filter(s => s.gForce > 0.5);

  let avgX = vehicle.vX;
  let avgY = vehicle.vY;

  if (recentHigh.length >= 3) {
    let wX = 0, wY = 0, totalW = 0;
    for (const s of recentHigh) {
      const sv = mapToVehicleFrame(s.filtered);
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
  sensorEngine.impactTimestamps.push(now);
  const cutoff = now - MULTI_IMPACT_WINDOW_MS;
  sensorEngine.impactTimestamps = sensorEngine.impactTimestamps.filter((t) => t >= cutoff);
  return sensorEngine.impactTimestamps.length;
}

export function getImpactCount(): number {
  const now = Date.now();
  const cutoff = now - MULTI_IMPACT_WINDOW_MS;
  return sensorEngine.impactTimestamps.filter((t) => t >= cutoff).length;
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
    sampleRate: sensorEngine.sampleRateHz,
    bufferSize: sensorEngine.ringBufferSize,
    currentBufferLength: sensorEngine.ringBuffer.length,
    baselineG: sensorEngine.adaptiveBaseline.getBaseline(),
    baselineSettled: sensorEngine.adaptiveBaseline.isSettled(),
    jerkPeak: sensorEngine.jerkAccumPeak,
    peakGyroRate: sensorEngine.peakRotationRate,
    impactCount: getImpactCount(),
    roadType: sensorEngine.adaptiveBaseline.getRoadType(),
    lastImpulseDurationMs: sensorEngine.lastImpulseDurationMs,
    currentSpeed: sensorEngine.currentSpeedKmh,
  };
}
