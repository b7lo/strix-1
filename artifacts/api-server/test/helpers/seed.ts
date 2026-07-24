// أدوات بذر (Seeding) لقاعدة بيانات الاختبار.
//
// توفّر دوالّ لإدراج حوادث في جدول `accidents`، وربط مجموعة فرعية منها بصفوف في
// `false_alarms` عبر `false_alarms.accident_id = accidents.id` — وهو بالضبط ما
// يحدّد "شرط الخلل" (isBugCondition). كما توفّر أدوات لبذر التقييمات (assessments)
// والعملاء (leads) والحوادث المشتركة (cross-verified) لاختبارات الحفاظ على السلوك.
import {
  accidentsTable,
  faultAssessmentsTable,
  falseAlarmsTable,
  leadsTable,
  crossVerifiedAnalysesTable,
  type Accident,
  type InsertAccident,
} from "@workspace/db/schema";
import type { TestDatabase } from "./testDb";

let deviceCounter = 0;

type Severity = "critical" | "severe" | "moderate" | "minor";
type ImpactZone =
  | "front"
  | "front-left"
  | "front-right"
  | "rear"
  | "rear-left"
  | "rear-right"
  | "side-left"
  | "side-right"
  | "unknown";
type ImpactDirection = "front" | "rear" | "side-left" | "side-right" | "unknown";

export interface AccidentOverrides {
  deviceId?: string;
  timestamp?: Date;
  latitude?: number | null;
  longitude?: number | null;
  peakGForce?: number;
  impactZone?: ImpactZone;
  impactDirection?: ImpactDirection;
  speedKmh?: number;
  jerkPeak?: number;
  approachAngle?: number;
  severity?: Severity;
  reportJson?: Record<string, unknown>;
  matchedAccidentId?: string | null;
  matchConfidence?: number | null;
}

/** إدراج حادث واحد بقيم افتراضية معقولة مع إمكانية تجاوزها. يُعيد الصف المُدرَج. */
export async function seedAccident(
  db: TestDatabase,
  overrides: AccidentOverrides = {},
): Promise<Accident> {
  deviceCounter += 1;
  const values: InsertAccident = {
    deviceId: overrides.deviceId ?? `device-${deviceCounter}`,
    timestamp: overrides.timestamp ?? new Date(),
    latitude: overrides.latitude ?? 24.7136,
    longitude: overrides.longitude ?? 46.6753,
    peakGForce: overrides.peakGForce ?? 5,
    impactZone: overrides.impactZone ?? "front",
    impactDirection: overrides.impactDirection ?? "front",
    speedKmh: overrides.speedKmh ?? 60,
    jerkPeak: overrides.jerkPeak ?? 10,
    approachAngle: overrides.approachAngle ?? 0,
    severity: overrides.severity ?? "moderate",
    reportJson: overrides.reportJson ?? {},
    matchedAccidentId:
      overrides.matchedAccidentId === undefined
        ? null
        : overrides.matchedAccidentId,
    matchConfidence:
      overrides.matchConfidence === undefined ? null : overrides.matchConfidence,
  };
  const [row] = await db.insert(accidentsTable).values(values).returning();
  return row;
}

export interface FalseAlarmOverrides {
  reason?: string;
  details?: string | null;
  createdAt?: Date;
}

/**
 * تعليم حادث موجود كبلاغ كاذب بإدراج صف في `false_alarms` مرتبط به.
 * هذا هو ما يُحقّق شرط الخلل لهذا الحادث.
 */
export async function markFalseAlarm(
  db: TestDatabase,
  accidentId: string,
  overrides: FalseAlarmOverrides = {},
) {
  const [row] = await db
    .insert(falseAlarmsTable)
    .values({
      accidentId,
      reason: overrides.reason ?? "false-trigger",
      details: overrides.details ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning();
  return row;
}

/** اختصار: بذر حادث ثم تعليمه فورًا كبلاغ كاذب. يُعيد الحادث المُدرَج. */
export async function seedFalseAlarmAccident(
  db: TestDatabase,
  overrides: AccidentOverrides = {},
  falseAlarm: FalseAlarmOverrides = {},
): Promise<Accident> {
  const accident = await seedAccident(db, overrides);
  await markFalseAlarm(db, accident.id, falseAlarm);
  return accident;
}

export interface AssessmentOverrides {
  appLiabilityUser?: number;
  appLiabilityOther?: number;
  najmLiabilityUser?: number | null;
  najmLiabilityOther?: number | null;
  liabilityDifference?: number | null;
  userDescription?: string | null;
}

/** بذر تقييم مسؤولية (fault assessment) لحادث موجود. */
export async function seedAssessment(
  db: TestDatabase,
  accidentId: string,
  overrides: AssessmentOverrides = {},
) {
  const [row] = await db
    .insert(faultAssessmentsTable)
    .values({
      accidentId,
      appLiabilityUser: overrides.appLiabilityUser ?? 50,
      appLiabilityOther: overrides.appLiabilityOther ?? 50,
      najmLiabilityUser:
        overrides.najmLiabilityUser === undefined ? null : overrides.najmLiabilityUser,
      najmLiabilityOther:
        overrides.najmLiabilityOther === undefined ? null : overrides.najmLiabilityOther,
      liabilityDifference:
        overrides.liabilityDifference === undefined ? null : overrides.liabilityDifference,
      userDescription:
        overrides.userDescription === undefined ? null : overrides.userDescription,
    })
    .returning();
  return row;
}

/** بذر عميل (lead) من صفحة الهبوط. */
export async function seedLead(
  db: TestDatabase,
  overrides: { fullName?: string; mobile?: string; email?: string | null } = {},
) {
  const [row] = await db
    .insert(leadsTable)
    .values({
      fullName: overrides.fullName ?? "Test Lead",
      mobile: overrides.mobile ?? "0500000000",
      email: overrides.email === undefined ? null : overrides.email,
    })
    .returning();
  return row;
}

/** بذر تحليل حادث مشترك (cross-verified) يربط حادثين. */
export async function seedCrossVerified(
  db: TestDatabase,
  accidentAId: string,
  accidentBId: string,
) {
  const [row] = await db
    .insert(crossVerifiedAnalysesTable)
    .values({ accidentAId, accidentBId })
    .returning();
  return row;
}
