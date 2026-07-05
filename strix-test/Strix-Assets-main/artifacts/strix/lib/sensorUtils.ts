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
// A-1: عدد العيّنات الدنيا للإحماء قبل تفعيل الكشف (تقارب الجاذبية)
const WARMUP_SAMPLES = 60;
// A-9: إغلاق الـ impulse — حد أقصى للمدة + إغلاق عند الهبوط النسبي عن القمة
const IMPULSE_START_G = 1.5;
const IMPULSE_END_G = 0.8;
const IMPULSE_MAX_DURATION_MS = 400;
const IMPULSE_CLOSE_FRACTION = 0.4; // أغلق إذا هبط دون 40% من القمة
// A-5: أدنى دوران (deg/s) لاعتبار وجود محور مهيمن (≈ 0.5 rad/s، نفس عتبة النسخة السابقة)
const DOMINANT_AXIS_MIN_DEG_S = 28.6;
// A-2: عدد العيّنات المتتالية فوق العتبة لتأكيد الحادث (رفض السبايك المفرد الكاذب)
const CRASH_CONFIRM_SAMPLES = 2;
// عيّنة واحدة تتجاوز (العتبة × هذا المعامل) تُفعّل الكشف فورًا بلا انتظار عيّنتين.
// = 1.0 يعني أي عيّنة فوق العتبة تُفعّل من أول ضربة (النبضات القصيرة قد لا تكمل
// عيّنتين متتاليتين). الإنذارات الكاذبة يعالجها المستخدم عبر خانة "بلاغ كاذب"،
// كما يبقى validateCrashWithGyro كفلتر يرفض الاهتزاز المستمر غير اللحظي.
const CRASH_INSTANT_MULTIPLIER = 1.0;

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

/**
 * getLeveledFrame: التسوية بالجاذبية فقط (إطار الجوال المستوي) **قبل** تدوير
 * الـ yaw نسبةً للسيارة. تُرجِع (vX, vY) في المستوى الأفقي و vZ على المحور
 * الرأسي الحقيقي. هذا هو الإطار الذي يعمل فيه VehicleFrameEstimator (A-3).
 *
 * فُصِلت عن mapToVehicleFrame كي:
 *  1) يستهلكها مُقدِّر الإطار (يحتاج المتجه قبل تدوير الـ yaw)، و
 *  2) يبقى mapToVehicleFrame = getLeveledFrame ثم applyYawOffset (سلوك مطابق).
 */
export function getLeveledFrame(vec: { x: number; y: number; z: number }): { vX: number; vY: number; vZ: number } {
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
      if (fMag < 0.1) {
        return { vX, vY: -vec.z, vZ: vec.x * uX + vec.y * uY + vec.z * uZ };
      }

      const fX = -uZ * latY / fMag;
      const fZ = uX * latY / fMag;

      const vY = vec.x * fX + vec.z * fZ;
      const vZ = vec.x * uX + vec.y * uY + vec.z * uZ;
      return { vX, vY, vZ };
    }
    default:
      return { vX: vec.x, vY: vec.y, vZ: vec.z };
  }
}

/**
 * تحويل التسارع من إطار الجهاز إلى إطار المركبة الكامل:
 *   = getLeveledFrame (تسوية بالجاذبية) ثم applyYawOffset (تدوير yaw نسبةً للسيارة).
 * عند phoneYawOffset=0 (غير معاير) فإن applyYawOffset = هوية → سلوك مطابق للسابق.
 */
function mapToVehicleFrame(vec: { x: number; y: number; z: number }): { vX: number; vY: number; vZ: number } {
  const lf = getLeveledFrame(vec);
  const r = applyYawOffset(lf.vX, lf.vY); // A-3
  return { vX: r.vX, vY: r.vY, vZ: lf.vZ };
}

/**
 * A-3: تدوير المركّبتين الأفقيتين (يمين/أمام) بإزاحة دوران الجوال نسبةً للسيارة.
 * عند phoneYawOffset=0 (غير معاير) تُعيد القيم كما هي → لا تغيير في السلوك.
 */
function applyYawOffset(vX: number, vY: number): { vX: number; vY: number } {
  const o = sensorEngine.phoneYawOffset;
  if (!o) return { vX, vY };
  const c = Math.cos(o);
  const s = Math.sin(o);
  return { vX: vX * c - vY * s, vY: vX * s + vY * c };
}

/**
 * A-5: معدّل الدوران حول المحور الرأسي (yaw) بوحدة rad/s.
 * يُحسب كإسقاط متجه السرعة الزاوية على متجه الجاذبية المُطبّع (الأعلى الحقيقي).
 * هذا صحيح رياضياً بغضّ النظر عن وضعية الجوال (بخلاف mapToVehicleFrame المخصّص للتسارع).
 */
function gyroYawRateRad(g: { x: number; y: number; z: number }): number {
  const grav = sensorEngine.gravityEstimate;
  const m = Math.sqrt(grav.x * grav.x + grav.y * grav.y + grav.z * grav.z) || 1;
  return (g.x * grav.x + g.y * grav.y + g.z * grav.z) / m;
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
  // ملاحظة: أُزيل kalmanAccel — كان يُنشأ ويُكيَّف (adaptToSpeed/adaptToRoadType)
  // لكن .update() لم يُستدعَ عليه قط، فلم يكن يؤثّر على أي قيمة كشف (شيفرة ميتة
  // + هدر حوسبة ~50/ث). الكشف يعتمد على الخام منزوع الجاذبية (انظر A-2).
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
  // A-4: السعة تكفي 6 ثوانٍ عند 100Hz (600 عيّنة) مع هامش
  gyroHistory = new TimeWindowBuffer<{ x: number; y: number; z: number; ts: number }>(700);

  impactTimestamps: number[] = [];

  impulseStartTs = 0;
  impulseActive = false;
  impulsePeakG = 0;
  lastImpulseDurationMs = 0;

  lastFreqImpulsive = false;

  // A-2: عدّاد العيّنات المتتالية فوق العتبة (debounce لرفض السبايك المفرد)
  crashCandidateStreak = 0;

  // A-3: إزاحة دوران الجوال حول المحور الرأسي نسبةً للسيارة (راديان).
  // 0 = لا معايرة (السلوك الافتراضي). تُضبط عبر setPhoneYawOffset عند توفّر مصدر اتجاه.
  phoneYawOffset = 0;
  phoneYawCalibrated = false;

  // A-4: السعة تكفي 5 ثوانٍ عند 100Hz مع هامش واسع
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
  // A-4: أعد بناء المحركات المعتمدة على المعدل بالمعدل الحقيقي
  // (FrequencySeparator: قطع التردد/alpha، AdaptiveBaseline: عتبة الاستقرار)
  sensorEngine.freqSeparator = new FrequencySeparator(sensorEngine.sampleRateHz);
  sensorEngine.adaptiveBaseline = new AdaptiveBaseline(5, sensorEngine.sampleRateHz);
}

export function getSampleRate(): number {
  return sensorEngine.sampleRateHz;
}

export function updateCurrentSpeed(speedKmh: number): void {
  sensorEngine.currentSpeedKmh = Math.max(0, speedKmh);
}

// ─── فلتر الإشارة (A-2 مُصحّح: قمة صادقة بلا تنعيم) ───

/**
 * A-2 (مُصحّح): التسارع الصافي = الخام - الجاذبية، **بلا أي تنعيم**.
 *
 * لماذا أزلنا median-of-3؟
 *  الصدمة الحقيقية على الجوال تتذبذب (ترتد)، فتكون القمة أحياناً عيّنة معزولة
 *  محاطة بقيم أقل مثل [1, 9, 1]. الـ median يختار الوسط (1) فيقتل القمة الحقيقية
 *  → كانت قوة الـ G تنهار إلى 0.1–0.5 رغم أن الصدمة قوية.
 *
 *  الحل: نُبقي القمة صادقة تماماً (بلا تنعيم)، ونرفض السبايك المفرد الكاذب
 *  عبر اشتراط عيّنتين متتاليتين فوق العتبة في التفعيل (registerThresholdCrossing).
 *
 * ملاحظة الوحدات: Accelerometer بوحدة g ويشمل الجاذبية، لذا نطرح gravityEstimate
 * (المُقدّر بفلتر EMA بطيء) للحصول على قوة الصدمة الصافية.
 */
export function applyHighPassFilter(raw: {
  x: number; y: number; z: number;
}): FilteredReading {
  // تحديث تقدير الجاذبية (EMA بطيء alpha=0.05) — لا يتأثر بالصدمات المفاجئة
  updateGravityEstimate(raw);

  return {
    x: raw.x - sensorEngine.gravityEstimate.x,
    y: raw.y - sensorEngine.gravityEstimate.y,
    z: raw.z - sensorEngine.gravityEstimate.z,
  };
}

/**
 * A-2: رفض الضوضاء على مستوى التفعيل بدل تشويه القمة.
 * يتطلب CRASH_CONFIRM_SAMPLES عيّنات متتالية فوق العتبة لتأكيد الحادث.
 * @returns true عند تأكيد التجاوز المتتالي (جاهز للتحليل)
 */
export function registerThresholdCrossing(aboveThreshold: boolean): boolean {
  if (aboveThreshold) {
    sensorEngine.crashCandidateStreak++;
  } else {
    sensorEngine.crashCandidateStreak = 0;
  }
  return sensorEngine.crashCandidateStreak >= CRASH_CONFIRM_SAMPLES;
}

/** A-2: إعادة ضبط عدّاد تأكيد الصدمة (بعد تحليل حادث أو إلغاء) */
export function resetCrashStreak(): void {
  sensorEngine.crashCandidateStreak = 0;
}

/**
 * صدمة قوية فورية: هل تتجاوز العيّنة الواحدة (العتبة × CRASH_INSTANT_MULTIPLIER)؟
 * تُستخدم لتفعيل الكشف من أول ضربة قوية جدًا دون انتظار عيّنتين متتاليتين،
 * مع إبقاء الـ debounce للتجاوزات الحدّية (رفض الضوضاء والنقرات الخفيفة).
 */
export function isInstantStrongCrash(gForce: number, adaptiveThreshold: number): boolean {
  return gForce >= adaptiveThreshold * CRASH_INSTANT_MULTIPLIER;
}

// ─── فلتر الإشارة الحقيقي (v6) ───


export function resetFilter(): void {
  sensorEngine.kalmanGyro.reset();
  sensorEngine.adaptiveBaseline.reset();
  sensorEngine.freqSeparator.reset();
  sensorEngine.lastGForceMag = 0;
  sensorEngine.lastSampleTs = 0;
  sensorEngine.jerkAccumPeak = 0;
  sensorEngine.ringBuffer.length = 0;
  sensorEngine.crashCandidateStreak = 0;
  sensorEngine.peakRotationRate = 0;
  sensorEngine.peakYaw = 0;
  sensorEngine.peakPitch = 0;
  sensorEngine.peakRoll = 0;
  sensorEngine.gyroHistory = new TimeWindowBuffer<{ x: number; y: number; z: number; ts: number }>(700);
  sensorEngine.impactTimestamps = [];
  sensorEngine.impulseStartTs = 0;
  sensorEngine.impulseActive = false;
  sensorEngine.impulsePeakG = 0;
  sensorEngine.lastImpulseDurationMs = 0;
  sensorEngine.lastFreqImpulsive = false;
  sensorEngine.currentSpeedKmh = 0;
  sensorEngine.gravityEstimate = { x: 0, y: -1, z: 0 };
  // ملاحظة: لا نعيد ضبط phoneYawOffset هنا — المعايرة تبقى عبر الجلسات إن وُجدت
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

  // v6: Frequency Analysis
  const freq = sensorEngine.freqSeparator.analyze(gForce);
  sensorEngine.lastFreqImpulsive = freq.isImpulsive;

  // v6: Impulse Duration Tracking (A-9: إغلاق محسّن)
  if (gForce > IMPULSE_START_G && !sensorEngine.impulseActive) {
    sensorEngine.impulseActive = true;
    sensorEngine.impulseStartTs = now;
    sensorEngine.impulsePeakG = gForce;
  } else if (sensorEngine.impulseActive) {
    if (gForce > sensorEngine.impulsePeakG) sensorEngine.impulsePeakG = gForce;
    const elapsed = now - sensorEngine.impulseStartTs;
    const droppedBelowAbsolute = gForce < IMPULSE_END_G;
    const droppedRelativeToPeak = gForce < sensorEngine.impulsePeakG * IMPULSE_CLOSE_FRACTION;
    const exceededMaxDuration = elapsed >= IMPULSE_MAX_DURATION_MS;
    // أغلق الصدمة عند أي شرط: هبوط مطلق، أو هبوط نسبي عن القمة، أو تجاوز المدة القصوى
    // (يمنع المناورات المستمرة من تضخيم lastImpulseDurationMs وإفساد تصنيف نوع المركبة)
    if (droppedBelowAbsolute || droppedRelativeToPeak || exceededMaxDuration) {
      sensorEngine.lastImpulseDurationMs = Math.min(elapsed, IMPULSE_MAX_DURATION_MS);
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

  // A-5: نحسب الدوران الرأسي (yaw) كإسقاط على متجه الجاذبية،
  // والدوران الأفقي كالمقدار المتعامد معه. كل القيم تُخرَج بـ deg/s
  // (يصحّح خطأ وحدات سابق: كان يُخرج rad/s بينما محرك المسؤولية يتوقّع deg/s).
  let maxYawDeg = 0;     // الدوران حول المحور الرأسي
  let maxHorizDeg = 0;   // الدوران الأفقي (pitch+roll مجتمعين — لا يمكن فصلهما بثقة)
  let highHorizCount = 0;

  sensorEngine.gyroHistory.forEach(s => {
    const yawRad = gyroYawRateRad(s);
    const total = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    const horizRad = Math.sqrt(Math.max(0, total * total - yawRad * yawRad));
    const yawDeg = Math.abs(yawRad) * (180 / Math.PI);
    const horizDeg = horizRad * (180 / Math.PI);
    if (yawDeg > maxYawDeg) maxYawDeg = yawDeg;
    if (horizDeg > maxHorizDeg) maxHorizDeg = horizDeg;
    // ~2.0 rad/s (~115°/s) دوران أفقي مستدام = مؤشّر انقلاب واقعي
    if (horizRad > 2.0) highHorizCount++;
  });

  // dominantAxis: نميّز فقط بين الرأسي (yaw) والأفقي (نمثّله كـ "roll").
  // فصل pitch عن roll غير موثوق بدون معرفة اتجاه الجوال نسبةً للسيارة.
  let dominantAxis: GyroscopeSnapshot["dominantAxis"] = "none";
  const maxAll = Math.max(maxYawDeg, maxHorizDeg);
  if (maxAll > DOMINANT_AXIS_MIN_DEG_S) {
    dominantAxis = maxYawDeg >= maxHorizDeg ? "yaw" : "roll";
  }

  // يتطلب دوراناً أفقياً مستداماً عبر عدة عيّنات لتأكيد الانقلاب
  const rolloverDetected = highHorizCount > 4;

  return {
    peakRotationRate: sensorEngine.peakRotationRate,
    spinDetected,
    dominantAxis,
    rolloverDetected,
    pitchRate: 0,            // لا يمكن فصله بثقة — نتركه 0 بدل قيمة مضلّلة
    rollRate: maxHorizDeg,   // الدوران الأفقي الكلي (deg/s)
    yawRate: maxYawDeg,      // deg/s
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
 * A-1: هل المحرك جاهز للكشف؟
 * يمنع الإيجابيات الكاذبة في أول ثوانٍ قبل تقارب تقدير الجاذبية واستقرار الـ baseline.
 */
export function isEngineReady(): boolean {
  return sensorEngine.adaptiveBaseline.isSettled()
    && sensorEngine.ringBuffer.length >= WARMUP_SAMPLES;
}

/**
 * A-3: ضبط إزاحة دوران الجوال حول المحور الرأسي نسبةً للسيارة (راديان).
 * يُستدعى من طبقة مصدر الاتجاه (GPS course / Magnetometer) عند توفّرها.
 * بدون استدعائها، تبقى الإزاحة 0 (= السلوك الافتراضي بلا تدوير).
 */
export function setPhoneYawOffset(offsetRad: number): void {
  if (!Number.isFinite(offsetRad)) return;
  sensorEngine.phoneYawOffset = offsetRad;
  sensorEngine.phoneYawCalibrated = true;
}

export function getPhoneYawOffset(): number { return sensorEngine.phoneYawOffset; }

/** A-3: هل تمت معايرة اتجاه الجوال نسبةً للسيارة؟ (تُستخدم لتقييد الثقة بصدق) */
export function isDirectionCalibrated(): boolean { return sensorEngine.phoneYawCalibrated; }

/**
 * v7: تصدير تاريخ الجيروسكوب للتحليل المتقدم
 * يُستخدم في Module 1 (Angular Stability) و Module 3 (Road Context)
 */
export function getGyroHistory(): readonly { x: number; y: number; z: number; ts: number }[] {
  return sensorEngine.gyroHistory.toArray();
}

/**
 * A-3 (دمج الحساسات): معدل الدوران الرأسي (yaw) اللحظي لآخر عيّنة جيروسكوب
 * بوحدة deg/s. يُستخدم كبوّابة في VehicleFrameEstimator لرفض المعايرة أثناء
 * الانعطاف (نعاير فقط أثناء السير المستقيم).
 */
export function getLatestGyroYawRateDegS(): number {
  const last = sensorEngine.gyroHistory.getLast();
  if (!last) return 0;
  return Math.abs(gyroYawRateRad(last)) * (180 / Math.PI);
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
      // A-5: yaw الحقيقي = إسقاط على الجاذبية (deg/s)
      const yaw = Math.abs(gyroYawRateRad(s)) * (180 / Math.PI);
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
