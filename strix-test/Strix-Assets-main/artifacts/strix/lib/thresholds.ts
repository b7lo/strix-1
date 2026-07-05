/**
 * ثوابت معايرة محرك Strix — يمكن تعديلها مركزياً.
 *
 * القيم أدناه هي الافتراضيات المحلية (تعمل دائمًا بلا إنترنت). يمكن تجاوزها
 * وقت التشغيل عبر Remote Config (lib/remoteConfig.ts) الذي يعدّل هذه القيم في
 * مكانها — لذا الكائن قابل للتعديل (ليس `as const`). لا تُغيّر الأنواع لأرقام
 * أخرى؛ كلها أرقام معايرة.
 */
export const THRESHOLDS = {
  // ─── السرعة (كم/س) ───
  MIN_SPEED_LANE_CHANGE: 10,   // الحد الأدنى لاعتبار تغيير المسار
  LOW_SPEED_SIDE: 25,          // عتبة السرعة المنخفضة للجانبي
  HIGH_SPEED_SIDE: 40,         // عتبة السرعة العالية للجانبي
  LOW_SPEED_FRONT: 10,         // عتبة السرعة المنخفضة للأمامي
  STATIONARY_SPEED: 5,         // عتبة اعتبار السيارة واقفة
  SPEED_CONFIDENCE_HIGH: 20,   // عتبة السرعة لمستوى ثقة عالي
  SPEED_CONFIDENCE_LOW: 5,     // عتبة السرعة لمستوى ثقة منخفض
  SPEED_FRONT_CORNER_LOW: 10,  // عتبة السرعة المنخفضة لزوايا الاصطدام الأمامي
  SPEED_REAR_CORNER_LANE: 10,  // عتبة السرعة لتغيير المسار في الزوايا الخلفية

  // ─── الجيروسكوب (°/s) ───
  HIGH_YAW_RATE: 45,           // عتبة Yaw لتأكيد تغيير المسار
  SHAKE_ROTATION_RATE: 30,     // عتبة اهتزاز الجيروسكوب

  // ─── قوة G ───
  G_CRITICAL: 5.0,
  G_SEVERE: 3.5,
  G_MODERATE: 2.0,
  G_HIGH_CONFIDENCE: 3.0,
  G_MEDIUM_CONFIDENCE: 2.0,
  SPEED_CRITICAL: 80,
  SPEED_SEVERE: 60,
  SPEED_MODERATE: 30,

  // ─── Jerk (g/s) ───
  JERK_HIGH: 15,
  JERK_SIDE_HIGH: 22,
  JERK_SIDE_MEDIUM: 18,
  JERK_SIDE_LOW: 10,
  JERK_CORNER_HIGH: 18,
  JERK_CONFIDENCE_HIGH: 15,
  JERK_CONFIDENCE_MEDIUM: 8,

  // ─── الثقة (Confidence) ───
  CONFIDENCE_HIGH_THRESHOLD: 65,
  CONFIDENCE_MEDIUM_THRESHOLD: 35,

  // ─── crossVerification ───
  GPS_MAX_DISTANCE_M: 200,
  TIME_TOLERANCE_MS: 60000,     // 60 ثانية بدل 10
  // A-7: لا نثق بترتيب "من اصطدم أولاً" من ساعة الجهاز إلا إذا تجاوز الفرق هذا الهامش
  // (ساعات الهواتف غير متزامنة — انجراف بضع ثوانٍ شائع)
  CLOCK_DRIFT_MARGIN_MS: 5000,

  // ─── SVG / Croquis ───
  SVG_WIDTH: 500,
  SVG_HEIGHT: 500,
  LEGEND_BOX_HEIGHT: 85,       // بدل 60

  // ═══════════════════════════════════════════════════════════════
  // A-3 (دمج الحساسات): معايرة اتجاه الجوال نسبةً للسيارة
  // VehicleFrameEstimator — تقدير yaw offset عبر GPS course + التسارع الطولي
  // ═══════════════════════════════════════════════════════════════
  /** أدنى سرعة (كم/س) لاعتبار حركة المركبة موثوقة لمعايرة الاتجاه */
  VF_MIN_SPEED_KMH: 18,
  /** أدنى تسارع/تباطؤ طولي (m/s²) من GPS لاعتبار الحدث صالحاً للمعايرة (~0.07g) */
  VF_MIN_LONG_ACCEL_MS2: 0.7,
  /** أقصى سرعة دوران (deg/s) لاعتبار القيادة "مستقيمة" (نرفض الانعطافات) */
  VF_MAX_YAW_RATE_DEG_S: 12,
  /** أدنى مقدار للتسارع الأفقي المُسوّى (g) لاعتباره إشارة لا ضوضاء */
  VF_MIN_HORIZ_ACCEL_G: 0.03,
  /** معامل EMA لتنعيم متجه التسارع الأفقي قبل أخذ اتجاهه */
  VF_ACCEL_EMA_ALPHA: 0.25,
  /** أدنى عدد أحداث معايرة متّسقة قبل إصدار تقدير */
  VF_MIN_EVENTS: 8,
  /** أدنى طول للمتجه المحصّل (تماسك دائري 0..1) لقبول التقدير */
  VF_MIN_RESULTANT: 0.6,
  /** أدنى ثقة (0..100) لاعتبار الاتجاه "معايَراً" وتفعيل setPhoneYawOffset */
  VF_CALIB_CONFIDENCE: 70,
  /** سقف الوزن لكل حدث (m/s²) كي لا تهيمن الفرملة العنيفة على التقدير */
  VF_EVENT_WEIGHT_CAP_MS2: 4.0,
  /** أقصى فارق زاوي (راديان) بين تقدير المغناطيسية والتسارع لاعتبارهما متّفقين (~25°) */
  VF_MAG_AGREEMENT_RAD: 0.45,

  // ═══════════════════════════════════════════════════════════════
  // طبقة جودة البيانات (DataQuality) — درجة جودة/ثقة مستقلة عن المسؤولية
  // ═══════════════════════════════════════════════════════════════
  /** أدنى معدل عيّنات (Hz) يُعدّ كافياً لالتقاط قمة الصدمة بثقة */
  DQ_GOOD_SAMPLE_RATE_HZ: 50,
  /** معدل عيّنات منخفض يُخفّض الجودة (قد يفوّت القمة) */
  DQ_LOW_SAMPLE_RATE_HZ: 25,
  /** عتبة قوة G التي تقترب من حدود تشبّع مسرّعات الهواتف (±16g نموذجياً) */
  DQ_ACCEL_SATURATION_G: 15,
  /** عتبات تصنيف درجة الجودة الإجمالية */
  DQ_HIGH_THRESHOLD: 70,
  DQ_MEDIUM_THRESHOLD: 45,
};

export type ThresholdKey = keyof typeof THRESHOLDS;
