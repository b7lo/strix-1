// Arabic translations
const ar = {
  // General
  appName: "ستركس",
  tagline: "حوّل سيارتك إلى منقذ",

  // Home
  startMonitoring: "ابدأ المراقبة",
  startMonitoringSub: "اضغط لبدء رصد الحوادث",
  monitoringActive: "المراقبة نشطة",
  monitoringPeak: (g: string) => `الذروة: ${g}g — اضغط لعرض الجلسة`,
  crashDetected: "رُصد حادث — اضغط لعرض التقرير",
  accidentLog: "سجل الحوادث",
  noAccidents: "لا توجد حوادث مسجّلة",
  noAccidentsSub: "ابدأ جلسة مراقبة للكشف عن الحوادث وتسجيلها",
  deleteAll: "حذف جميع السجلات",
  deleteAllConfirm: "هل أنت متأكد أنك تريد حذف جميع تقارير الحوادث؟ لا يمكن التراجع عن هذا الإجراء.",
  cancel: "إلغاء",
  delete: "حذف",

  // Report
  accidentReport: "تقرير الحادث",
  reportNotFound: "التقرير غير موجود",
  deleteReport: "حذف التقرير",
  deleteReportConfirm: "سيتم حذف هذا السجل نهائياً.",
  impactForce: "قوة الاصطدام",
  speedAtImpact: "السرعة عند الاصطدام",
  preImpactSpeed: "قبل الاصطدام",
  suddenAcceleration: "تسارع مفاجئ",
  accidentTime: "وقت الحادث",
  secondsAgo: (n: number) => `قبل ${n} ثوان`,
  rolloverDetected: "تم رصد انقلاب",
  collisionDiagram: "مخطط الاصطدام",
  yourCar: "سيارتك",
  impactPoint: "نقطة الاصطدام",
  front: "أمام",
  back: "خلف",

  // Liability
  liabilityEstimate: "تقدير المسؤولية",
  otherParty: "الطرف الآخر",
  yourFault: "خطأك",
  otherPartyResponsible: "الطرف الآخر هو المسؤول الرئيسي عن الحادث",
  driverResponsible: "المسؤولية تقع بشكل رئيسي على السائق",
  keyFactors: "أبرز عوامل التحليل",
  disclaimer: "للأغراض الاستعلامية فقط — ليس حكماً قانونياً",
  highConfidence: "ثقة عالية",
  mediumConfidence: "ثقة متوسطة",
  lowConfidence: "ثقة منخفضة",

  // Scenario
  estimatedScenario: "السيناريو المُقدَّر",
  analysisFactors: "عوامل التحليل",

  // Feedback
  rateFeedback: "قيّم دقة التحليل",
  rateFeedbackSub: "هل كان تقدير المسؤولية عادلاً ودقيقاً؟",
  accurate: "دقيق",
  inaccurate: "غير دقيق",
  accurateThanks: "دقيق — شكراً لتقييمك",
  inaccurateNote: "غير دقيق — سيُستخدم لتحسين المحرك",
  legalNote: "هذا التقدير استعلامي ولا يُعدّ حكماً قانونياً — يُنصح بالرجوع للجهات الرسمية.",

  // Severity
  critical: "حرج",
  severe: "شديد",
  moderate: "متوسط",
  minor: "خفيف",

  // Directions
  dirFront: "أمامي",
  dirRear: "خلفي",
  dirSideLeft: "جانبي أيسر",
  dirSideRight: "جانبي أيمن",
  dirUnknown: "غير محدد",

  // Speed
  kmh: "كم/س",

  // Settings
  settings: "الإعدادات",
  language: "اللغة",
  arabic: "العربية",
  english: "English",
  about: "حول التطبيق",
  version: "الإصدار",

  // Session
  sessionTitle: "جلسة المراقبة",
  monitoring: "مراقبة نشطة",
  stopSession: "إيقاف الجلسة",
  sessionSpeed: "السرعة",
  sessionGForce: "القوة",
  sessionDuration: "المدة",
} as const;

export type TranslationKeys = typeof ar;
export default ar;
