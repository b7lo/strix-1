/**
 * ثوابت معايرة محرك Strix — يمكن تعديلها مركزياً
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

  // ─── SVG / Croquis ───
  SVG_WIDTH: 500,
  SVG_HEIGHT: 500,
  LEGEND_BOX_HEIGHT: 85,       // بدل 60
} as const;
