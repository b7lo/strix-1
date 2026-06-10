/**
 * نظام مناطق الاصطدام — 8 مناطق (دقة مثالية لحساسات الجوال)
 *
 * ┌─────────────────────────┐
 * │    front-left  front  front-right    │
 * │                                       │
 * │  side-left      🚗      side-right   │
 * │                                       │
 * │    rear-left   rear   rear-right     │
 * └─────────────────────────┘
 */
export type ImpactZone =
  // الأمام
  | "front"              // صدام أمامي (وسط)
  | "front-left"         // زاوية أمامية يسرى
  | "front-right"        // زاوية أمامية يمنى
  // الخلف
  | "rear"               // صدام خلفي (وسط)
  | "rear-left"          // زاوية خلفية يسرى
  | "rear-right"         // زاوية خلفية يمنى
  // الجانب
  | "side-left"          // جانب أيسر
  | "side-right"         // جانب أيمن
  // غير محدد
  | "unknown";

/** للتوافق مع الإصدار القديم */
export type ImpactDirection =
  | "front"
  | "rear"
  | "side-left"
  | "side-right"
  | "unknown";

export type Confidence = "high" | "medium" | "low";
export type FeedbackType = "correct" | "incorrect" | null;
export type Severity = "critical" | "severe" | "moderate" | "minor";

/**
 * بيانات الجيروسكوب وقت الاصطدام
 */
export interface GyroscopeSnapshot {
  peakRotationRate: number;
  spinDetected: boolean;
  dominantAxis: "yaw" | "pitch" | "roll" | "none";
  /** قيمة Yaw (الدوران الأفقي) — تُستخدم لتحديد منطقة الاصطدام */
  yawRate: number;
  /** قيمة Pitch (الميلان أمامي/خلفي) */
  pitchRate: number;
  /** قيمة Roll (الميلان جانبي) */
  rollRate: number;
  /** هل حدث انقلاب للسيارة (Rollover) */
  rolloverDetected: boolean;
}

/**
 * بيانات تحليل الفرملة
 */
export interface BrakingAnalysis {
  brakingDetected: boolean;
  brakingDurationSec: number;
  decelerationG: number;
  speedBeforeBraking: number;
}

/**
 * معلومات الثقة المُوسَّعة
 */
export interface ConfidenceDetails {
  level: Confidence;
  score: number;
  factors: string[];
}

export interface AccidentReport {
  id: string;
  timestamp: number;
  syncStatus?: "synced" | "pending" | "failed";

  // ─── بيانات التسارع الأساسية ───
  peakGForce: number;
  jerkPeak: number;

  // ─── منطقة الاصطدام (v6.1 — 8 مناطق) ───
  impactZone: ImpactZone;
  /** للتوافق مع الشاشات القديمة */
  impactDirection: ImpactDirection;

  // ─── السرعة ───
  speedKmh: number;
  preCrashSpeedKmh: number;
  /** مصفوفة سرعات آخر 10 ثوانٍ للرسم البياني */
  speedHistory?: number[];

  // ─── الموقع ───
  latitude: number | null;
  longitude: number | null;

  // ─── التحليل ───
  severity: Severity;
  liabilityScore: number;
  confidence: Confidence;

  // ─── السيناريو ───
  scenarioCode: string;
  scenarioAr: string;
  descriptionAr: string;
  factorsAr: string[];

  // ─── التقييم ───
  feedback: FeedbackType;

  // ─── بيانات مُوسَّعة (v3) ───
  gyroscope: GyroscopeSnapshot | null;
  braking: BrakingAnalysis | null;
  confidenceDetails: ConfidenceDetails | null;
  impactCount: number;
  baselineG: number;
  sessionDurationAtCrash: number;

  // ─── v6: بيانات الطرف الآخر والكروكي ───
  otherParty: OtherPartyAnalysis | null;
  croquis: CroquisData | null;
  matchedAccidentId: string | null;
  matchConfidence: number | null;

  // ─── v7: التحليل المتقدم (المبادئ الخمسة) ───
  advancedAnalysis: AdvancedAnalysisResult | null;

  // ─── v8: المطابقة الثنائية للحادث ───
  crossVerifiedId?: string;
  crossVerifiedAnalysis?: CrossVerifiedAnalysis | null;

  // ─── v9: التقييم التلقائي للمسؤولية مقارنة بنجم ───
  faultAssessment?: FaultAssessment | null;

  // ─── v10: بلاغ حادث غير صحيح ───
  isFalseAlarm?: boolean;
  falseAlarmReason?: string;
  falseAlarmDetails?: string;
}

/**
 * نتيجة المطابقة الثنائية (التحقق المتبادل) بين سيارتين
 */
export interface CrossVerifiedAnalysis {
  id: string;
  accident_a_id: string;
  accident_b_id: string;
  verified_impact_zone_a: ImpactZone;
  verified_impact_zone_b: ImpactZone;
  verified_speed_a_kmh: number;
  verified_speed_b_kmh: number;
  first_contact_party: "A" | "B" | "UNKNOWN";
  consistency_status: "VERIFIED" | "INCONSISTENT" | "PARTIAL";
  consistency_flags: string[];
  liability_a_percent: number;
  liability_b_percent: number;
  created_at: number;
}

/**
 * تقييم نسبة المسؤولية ومقارنتها بتقرير نجم
 */
export interface FaultAssessment {
  appLiability: number; // 100, 75, 50, 25
  najmLiability: number; // 100, 75, 50, 25
  liabilityDifference: number;
  userDescription?: string;
  createdAt: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * نتيجة التحليل المتقدم — المبادئ الخمسة
 * ═══════════════════════════════════════════════════════════════════
 *
 * كل Module يعطي score من -50 إلى +50:
 *   سالب = يقلل مسؤولية المستخدم (لصالحه)
 *   موجب = يزيد مسؤولية المستخدم (ضده)
 */
export interface AdvancedAnalysisResult {
  /** المبدأ 1: الاستقرار الزاوي */
  angularStability: AngularStabilityResult;
  /** المبدأ 2: متجهات القوة المتعددة */
  multiVector: MultiVectorResult;
  /** المبدأ 3: الارتباط المكاني والقانوني */
  roadContext: RoadContextResult;
  /** المبدأ 4: البصمة الحركية الدقيقة (بديل الصوت) */
  microKinematic: MicroKinematicResult;
  /** المبدأ 5: تتابع الأحداث */
  preCrashEvents: PreCrashEventsResult;
  /** المبدأ 6: تحليل ما بعد الصدمة */
  postImpact: PostImpactAnalysis;
  /** التعديل النهائي على نسبة المسؤولية (-50 إلى +50) */
  totalAdjustment: number;
  /** العوامل المكتشفة بالعربي */
  discoveredFactorsAr: string[];
}

export interface AngularStabilityResult {
  /** هل رُصد دوران مفاجئ (Yaw) قبل الصدمة */
  hadSuddenYaw: boolean;
  /** هل الدوران كان محاولة تفادي (مع فرملة) */
  wasEvasive: boolean;
  /** أعلى معدل دوران Yaw قبل الصدمة (°/s) */
  maxYawRatePreCrash: number;
  /** Score: سالب = لصالح المستخدم */
  score: number;
}

export interface MultiVectorResult {
  /** المركبة الجانبية للقوة (G) */
  lateralG: number;
  /** المركبة الطولية للقوة (G) */
  longitudinalG: number;
  /** نسبة الدفع الخلفي (0-1): > 0.3 = الآخر مندفع من الخلف */
  rearPushRatio: number;
  /** Score: سالب = لصالح المستخدم */
  score: number;
}

/** نوع الطريق المستنتج */
export type RoadContextType =
  | "roundabout"    // دوار
  | "intersection"  // تقاطع
  | "highway"       // طريق سريع
  | "urban"         // طريق حضري
  | "unknown";

export interface RoadContextResult {
  /** نوع الطريق المستنتج */
  roadType: RoadContextType;
  /** هل المستخدم يملك الأولوية في هذا الموقع */
  hasPriority: boolean;
  /** هل كان المستخدم متوقفاً قبل الصدمة */
  wasStationary: boolean;
  /** هل تم تأكيد نوع الطريق عبر الجيروسكوب (fallback) */
  confirmedByGyro: boolean;
  /** Score: سالب = لصالح المستخدم */
  score: number;
}

export interface MicroKinematicResult {
  /** هل تم كشف "حكة" جانبية */
  scrapeDetected: boolean;
  /** التباين العالي التردد (Variance) */
  highFreqVariance: number;
  /** هل تزامن Jerk مع Gyro Yaw Shift */
  jerkGyroSync: boolean;
  /** مدة الاهتزاز المستمر (ms) — الحكة > 250ms */
  vibrationDurationMs: number;
  /** Score: سالب = لصالح المستخدم */
  score: number;
}

export interface PreCrashEventsResult {
  /** هل فرمل المستخدم بقوة قبل الصدمة */
  hardBraking: boolean;
  /** هل تسارع المستخدم بشكل مفاجئ قبل الصدمة */
  hardAcceleration: boolean;
  /** هل كان المستخدم يسير بشكل ثابت ومستقيم */
  steadyDriving: boolean;
  /** هل قام بمناورة تفادي (فرملة + انحراف) */
  evasiveManeuver: boolean;
  /** Score: سالب = لصالح المستخدم */
  score: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * المبدأ 6: تحليل ما بعد الصدمة (Post-Impact Analysis)
 * ═══════════════════════════════════════════════════════════════════
 *
 * يحلل بيانات الحساسات في الـ 2-3 ثوانٍ بعد لحظة الصدمة لتأكيد:
 *  - اتجاه الانحراف (يؤكد أو ينفي اتجاه القوة الأصلي)
 *  - شدة الصدمة الفعلية (من وقت الاستقرار)
 *  - وجود صدمات ثانوية (ارتداد أو اصطدام بجسم ثانٍ)
 *  - حالة المركبة بعد الصدمة (دوران، توقف فوري)
 */
export interface PostImpactAnalysis {
  /** اتجاه انحراف المركبة بعد الصدمة */
  driftDirection: "forward" | "backward" | "left" | "right" | "none";
  /** زاوية الانحراف بالدرجات (0 = لا انحراف) */
  driftAngleDeg: number;
  /** شدة الانحراف بوحدة G */
  driftMagnitudeG: number;
  /** الوقت بالمللي ثانية حتى استقرار المركبة بعد الصدمة */
  stabilizationTimeMs: number;
  /** عدد الصدمات الثانوية بعد الصدمة الرئيسية */
  secondaryImpacts: number;
  /** هل دارت المركبة بعد الصدمة (Yaw > 30°/s) */
  postImpactRotation: boolean;
  /** زاوية الدوران بعد الصدمة (°/s) */
  postImpactYawRate: number;
  /** هل توقفت المركبة فوراً بعد الصدمة (كانت واقفة أصلاً) */
  vehicleStoppedImmediately: boolean;
  /** معدل التباطؤ بعد الصدمة (G) */
  postCrashDecelG: number;
  /** هل تأكد اتجاه الصدمة الأصلي بواسطة بيانات ما بعد الصدمة */
  directionConfirmed: boolean;
  /** Score: سالب = لصالح المستخدم (-50 إلى +50) */
  score: number;
  /** العوامل المكتشفة بالعربي */
  factorsAr: string[];
}

/**
 * تحليل الطرف الآخر — مُستنتج من بيانات الحساسات
 */
export interface OtherPartyAnalysis {
  /** زاوية اقتراب الطرف الآخر (0-360°، 0=الشمال، 90=الشرق) */
  approachAngleDeg: number;
  /** سرعة تقديرية للطرف الآخر لحظة الاصطدام (كم/س) */
  estimatedSpeedKmh: number;
  /** قوة الصدمة من الطرف الآخر */
  impactForce: "light" | "moderate" | "heavy" | "severe";
  /** تقدير نوع المركبة الأخرى */
  vehicleType: "light" | "medium" | "heavy";
  /** هل كان الطرف الآخر مسرعاً قبل الصدم */
  wasAccelerating: boolean;
  /** هل كان الطرف الآخر مبطئاً قبل الصدم */
  wasBraking: boolean;
  /** نسبة الثقة في تحليل الطرف الآخر (0-100) */
  confidencePercent: number;
  /** وصف عربي لتحليل الطرف الآخر */
  descriptionAr: string;
}

/**
 * بيانات الكروكي — رسم SVG للحادث
 */
export interface CroquisData {
  /** SVG كامل كنص */
  svgString: string;
  /** SVG مشفر بـ Base64 للتضمين في PDF */
  svgBase64: string;
  /** عرض الـ SVG بالبكسل */
  width: number;
  /** ارتفاع الـ SVG بالبكسل */
  height: number;
}

/**
 * سجل حادث للمزامنة مع Supabase
 */
export interface AccidentSyncRecord {
  id?: string;
  deviceId: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  peakGForce: number;
  impactZone: ImpactZone;
  impactDirection: ImpactDirection;
  speedKmh: number;
  jerkPeak: number;
  approachAngle: number;
  severity: Severity;
  reportJson: AccidentReport;
  matchedAccidentId: string | null;
  matchConfidence: number | null;
  is_false_alarm?: boolean;
  false_alarm_reason?: string;
  false_alarm_details?: string;
}

export interface AppSettings {
  crashThresholdG: number;
  autoAlertEnabled: boolean;
  sampleRateHz: number;
  gyroscopeEnabled: boolean;
  gyroscopeThreshold: number;
}

// ─── أدوات المناطق ───

/** تحويل منطقة دقيقة إلى اتجاه عام (للتوافق) */
export function zoneToDirection(zone: ImpactZone): ImpactDirection {
  if (zone === "front" || zone === "front-left" || zone === "front-right") return "front";
  if (zone === "rear" || zone === "rear-left" || zone === "rear-right") return "rear";
  if (zone === "side-left") return "side-left";
  if (zone === "side-right") return "side-right";
  return "unknown";
}

/** أسماء المناطق بالعربية */
export const ZONE_LABELS_AR: Record<ImpactZone, string> = {
  "front":        "صدام أمامي",
  "front-left":   "زاوية أمامية يسرى",
  "front-right":  "زاوية أمامية يمنى",
  "rear":         "صدام خلفي",
  "rear-left":    "زاوية خلفية يسرى",
  "rear-right":   "زاوية خلفية يمنى",
  "side-left":    "جانب أيسر",
  "side-right":   "جانب أيمن",
  "unknown":      "غير محدد",
};

