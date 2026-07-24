/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Vehicle Frame Estimator — v1.0  (دمج الحساسات / Sensor Fusion)
 * ═══════════════════════════════════════════════════════════════════
 *
 * يحلّ المشكلة الجذرية A-3: لا يمكن من التسارع + الجاذبية وحدهما معرفة
 * دوران الجوال حول المحور الرأسي (أين "أمام السيارة"). هذه الدرجة من
 * الحرية (yaw) غير قابلة للرصد بحساس واحد، ولهذا كان اتجاه/منطقة الصدمة
 * تخميناً والمسؤولية القانونية مبنية عليه.
 *
 * الحل (دمج 3 مصادر — وهو النهج الصناعي الراسخ في telematics):
 *  1. GPS (السرعة)     → التسارع الطولي للمركبة a_long = d(speed)/dt
 *                         (مرجع مستقل لاتجاه "الأمام": موجب=تسارع، سالب=فرملة)
 *  2. Accelerometer    → اتجاه التسارع الأفقي المُسوّى (مُزال منه الجاذبية)
 *                         في إطار الجوال المستوي. أثناء حدث طولي حقيقي،
 *                         هذا المتجه يحاذي محور "أمام/خلف" السيارة.
 *  3. Gyroscope        → بوّابة رفض الانعطافات (نعاير فقط أثناء السير المستقيم)
 *  4. Magnetometer     → (اختياري) تأكيد ثانوي لاتجاه الجوال (heading)
 *                         يرفع الثقة عند الاتفاق فقط، ولا يقود التقدير منفرداً
 *                         (المغناطيسية داخل المركبة غير موثوقة: تشويه حديدي).
 *
 * الرياضيات:
 *  أثناء تسارع أمامي بمقدار a، يقرأ المسرّع (بعد نزع الجاذبية وإسقاطه على
 *  المستوى الأفقي) متجهاً = (a·sinθ, a·cosθ) حيث θ = atan2(vX, vY) هو زاوية
 *  "أمام السيارة" في إطار الجوال المستوي. نريد إزاحة الدوران o بحيث يدوّر هذا
 *  المتجه إلى +Y (الأمام). يثبت أن o = θ. (انظر applyYawOffset في sensorUtils.)
 *
 *  نجمع ملاحظات θ من عدّة أحداث في إحصاء دائري مُرجّح (sin/cos)، فيكون:
 *    yawOffset = atan2(Σ w·sinθ, Σ w·cosθ)
 *    التماسك (resultant) R = |المتجه المحصّل| / Σw  ∈ [0,1]  → ثقة هندسية
 *
 * المصداقية:
 *  لا نُعلن المعايرة إلا عند تماسك عالٍ + عدد أحداث كافٍ. وإلا يبقى النظام
 *  "غير معاير" (صادق: يخفض الثقة بدل ادّعاء اتجاه).
 *
 * مراجع: US Patent 9,253,603 B1 (Accelerometer-based calibration of vehicle
 *  and smartphone coordinate systems)، WO2002018873A2، وأدبيات إعادة توجيه
 *  المسرّع للهواتف في تطبيقات ITS.
 * ═══════════════════════════════════════════════════════════════════
 */

import { THRESHOLDS } from "./thresholds";

export interface VehicleFrameEstimate {
  /** إزاحة دوران الجوال حول المحور الرأسي نسبةً للسيارة (راديان) */
  yawOffsetRad: number;
  /** ثقة التقدير (0..100) — تجمع التماسك الدائري وعدد الأحداث */
  confidence: number;
  /** هل التقدير موثوق بما يكفي لتفعيل المعايرة؟ */
  calibrated: boolean;
  /** عدد أحداث المعايرة المتّسقة المُجمّعة */
  eventCount: number;
  /** التماسك الدائري للملاحظات (0..1) */
  resultant: number;
  /** هل أكّدت المغناطيسية التقدير؟ */
  magnetometerAgrees: boolean;
}

function wrapPi(a: number): number {
  // يُرجِع الزاوية ضمن (-π, π]
  let x = a;
  while (x <= -Math.PI) x += 2 * Math.PI;
  while (x > Math.PI) x -= 2 * Math.PI;
  return x;
}

export class VehicleFrameEstimator {
  // EMA لمتجه التسارع الأفقي المُسوّى (يزيل الاهتزاز ويُبقي التسارع الطولي المستمر)
  private emaAx = 0;
  private emaAy = 0;
  private emaInit = false;

  // آخر معدل دوران (deg/s) لبوّابة رفض الانعطاف
  private lastYawRateDegS = 0;

  // حالة السرعة لحساب التسارع الطولي من GPS
  private prevSpeedKmh: number | null = null;
  private prevSpeedTs = 0;

  // الإحصاء الدائري المُرجّح لزاوية "الأمام في إطار الجوال"
  private sumSin = 0;
  private sumCos = 0;
  private sumWeight = 0;
  private events = 0;

  // تأكيد المغناطيسية (اختياري)
  private magObservations = 0;
  private magAgreements = 0;

  /**
   * تُستدعى لكل عيّنة تسارع (بعد التسوية بالجاذبية، قبل تدوير الـ yaw).
   * @param ax مركبة X الأفقية المُسوّاة (g) في إطار الجوال المستوي
   * @param ay مركبة Y الأفقية المُسوّاة (g)
   * @param _ts الطابع الزمني (ms) — محفوظ للتوسّع المستقبلي
   * @param yawRateDegS معدل الدوران اللحظي (deg/s) لبوّابة الانعطاف
   */
  addAccelSample(ax: number, ay: number, _ts: number, yawRateDegS = 0): void {
    const a = THRESHOLDS.VF_ACCEL_EMA_ALPHA;
    if (!this.emaInit) {
      this.emaAx = ax;
      this.emaAy = ay;
      this.emaInit = true;
    } else {
      this.emaAx = a * ax + (1 - a) * this.emaAx;
      this.emaAy = a * ay + (1 - a) * this.emaAy;
    }
    this.lastYawRateDegS = Math.abs(yawRateDegS);
  }

  /**
   * تُستدعى عند كل تحديث سرعة من GPS. تحسب التسارع الطولي وتسجّل ملاحظة
   * اتجاه إن توفّرت شروط حدث معايرة صالح (سرعة كافية + تسارع طولي حقيقي +
   * سير مستقيم + إشارة تسارع أفقي واضحة).
   * @returns true إذا سُجّلت ملاحظة معايرة جديدة
   */
  addSpeedSample(speedKmh: number, ts: number): boolean {
    const prevSpeed = this.prevSpeedKmh;
    const prevTs = this.prevSpeedTs;
    this.prevSpeedKmh = speedKmh;
    this.prevSpeedTs = ts;

    if (prevSpeed === null) return false;
    const dt = (ts - prevTs) / 1000;
    if (dt <= 0 || dt > 3) return false; // فجوة زمنية كبيرة → تجاهل

    // التسارع الطولي للمركبة من GPS (m/s²)
    const aLong = (speedKmh - prevSpeed) / 3.6 / dt;

    // ── بوّابات الحدث الصالح ──
    if (speedKmh < THRESHOLDS.VF_MIN_SPEED_KMH) return false;        // سرعة كافية
    if (Math.abs(aLong) < THRESHOLDS.VF_MIN_LONG_ACCEL_MS2) return false; // تسارع حقيقي
    if (this.lastYawRateDegS > THRESHOLDS.VF_MAX_YAW_RATE_DEG_S) return false; // سير مستقيم

    const horizMag = Math.hypot(this.emaAx, this.emaAy);
    if (horizMag < THRESHOLDS.VF_MIN_HORIZ_ACCEL_G) return false;     // إشارة واضحة

    // زاوية "أمام السيارة" في إطار الجوال المستوي.
    // إن كان GPS يُظهر تسارعاً (aLong>0) فالمتجه يشير للأمام مباشرةً؛
    // وإن كان فرملة (aLong<0) فالمتجه يشير للخلف → نضيف π لعكسه للأمام.
    const measuredAngle = Math.atan2(this.emaAx, this.emaAy);
    const forwardAngle = aLong > 0 ? measuredAngle : measuredAngle + Math.PI;

    // وزن الحدث = شدة التسارع الطولي (مُقيَّدة بسقف كي لا تهيمن الفرملة العنيفة)
    const w = Math.min(Math.abs(aLong), THRESHOLDS.VF_EVENT_WEIGHT_CAP_MS2);
    this.sumSin += w * Math.sin(forwardAngle);
    this.sumCos += w * Math.cos(forwardAngle);
    this.sumWeight += w;
    this.events++;
    return true;
  }

  /**
   * (اختياري) ملاحظة من المغناطيسية: مقارنة اتجاه الجوال (heading) باتجاه
   * حركة المركبة من GPS (course) أثناء السير المستقيم. تُستخدم كتأكيد ثانوي
   * يرفع الثقة عند الاتفاق فقط — لا يقود التقدير منفرداً (تشويه مغناطيسي داخل
   * المركبة). إن كانت الإشارة خاطئة فستظهر كـ"عدم اتفاق" وتُهمَل بلا ضرر.
   * @param phoneHeadingRad اتجاه الجوال المطلق (راديان، tilt-compensated)
   * @param vehicleCourseRad اتجاه حركة المركبة من GPS (راديان)
   */
  addMagneticObservation(phoneHeadingRad: number, vehicleCourseRad: number): void {
    if (this.events < 1) return; // لا معنى للتأكيد قبل وجود تقدير أساسي
    this.magObservations++;
    // إزاحة yaw المتوقّعة من المغناطيسية = فرق الاتجاهين
    const magYaw = wrapPi(vehicleCourseRad - phoneHeadingRad);
    const accelYaw = this.rawYawOffset();
    if (Math.abs(wrapPi(magYaw - accelYaw)) <= THRESHOLDS.VF_MAG_AGREEMENT_RAD) {
      this.magAgreements++;
    }
  }

  private rawYawOffset(): number {
    return Math.atan2(this.sumSin, this.sumCos);
  }

  private resultant(): number {
    if (this.sumWeight <= 0) return 0;
    return Math.hypot(this.sumSin, this.sumCos) / this.sumWeight;
  }

  /** التقدير الحالي لإطار السيارة */
  getEstimate(): VehicleFrameEstimate {
    const eventCount = this.events;
    const resultant = this.resultant();
    const yawOffsetRad = wrapPi(this.rawYawOffset());

    // الثقة: تماسك دائري × نضوج العيّنات (عدد الأحداث)، 0..100
    const maturity = Math.min(1, eventCount / THRESHOLDS.VF_MIN_EVENTS);
    let confidence = Math.round(100 * resultant * maturity);

    // تأكيد المغناطيسية يرفع الثقة قليلاً (سقف +10) عند اتفاق غالبية الملاحظات
    const magnetometerAgrees =
      this.magObservations >= 3 && this.magAgreements >= this.magObservations * 0.6;
    if (magnetometerAgrees) confidence = Math.min(100, confidence + 10);

    const calibrated =
      eventCount >= THRESHOLDS.VF_MIN_EVENTS &&
      resultant >= THRESHOLDS.VF_MIN_RESULTANT &&
      confidence >= THRESHOLDS.VF_CALIB_CONFIDENCE;

    return {
      yawOffsetRad,
      confidence,
      calibrated,
      eventCount,
      resultant: Math.round(resultant * 100) / 100,
      magnetometerAgrees,
    };
  }

  reset(): void {
    this.emaAx = 0;
    this.emaAy = 0;
    this.emaInit = false;
    this.lastYawRateDegS = 0;
    this.prevSpeedKmh = null;
    this.prevSpeedTs = 0;
    this.sumSin = 0;
    this.sumCos = 0;
    this.sumWeight = 0;
    this.events = 0;
    this.magObservations = 0;
    this.magAgreements = 0;
  }
}

/**
 * حساب اتجاه الجوال المطلق (heading) من المغناطيسية مع تعويض الميل
 * (tilt compensation) باستخدام متجه الجاذبية المُقدَّر. دالة نقية قابلة
 * للاختبار. تُرجِع الزاوية بالراديان في المستوى الأفقي.
 *
 * @param mag متجه المجال المغناطيسي الخام {x,y,z}
 * @param gravity متجه الجاذبية المُقدَّر {x,y,z} (أي وحدة — يُطبَّع داخلياً)
 */
export function tiltCompensatedHeadingRad(
  mag: { x: number; y: number; z: number },
  gravity: { x: number; y: number; z: number }
): number {
  const gMag = Math.hypot(gravity.x, gravity.y, gravity.z) || 1;
  const ux = gravity.x / gMag;
  const uy = gravity.y / gMag;
  const uz = gravity.z / gMag;

  // إسقاط المغناطيسية على المستوى الأفقي (إزالة المركبة الموازية للجاذبية)
  const dot = mag.x * ux + mag.y * uy + mag.z * uz;
  const hx = mag.x - dot * ux;
  const hy = mag.y - dot * uy;

  // الاتجاه في مستوى XY للجوال (تقريبي — يكفي كتأكيد ثانوي)
  return Math.atan2(hx, hy);
}
