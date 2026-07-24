// اختبار شرط الخلل الاستكشافي (Bug Condition Exploration Test) — المهمة 1.
//
// Property 1: Bug Condition — استبعاد البلاغات الكاذبة من إحصائيات الحوادث.
//
// **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
//
// شرط الخلل:
//   isBugCondition(X) = EXISTS(SELECT 1 FROM false_alarms fa WHERE fa.accident_id = X.id)
//
// يُرمِّز هذا الاختبار السلوك المتوقّع بعد الإصلاح (F'):
//   لكل حادث يحقّق شرط الخلل (له صف مقابل في false_alarms) يجب:
//     - ألّا يُحتسب في totalAccidents ولا totalMatchedAccidents
//     - ألّا تدخل قيمته في averageGForce ولا accidentsBySeverity/ByImpactZone/ByDay
//     - أن يُحتسب فقط في totalFalseAlarms (لا احتساب مزدوج)
//
// **حرِج:** هذا الاختبار مُصمَّم ليفشل على الكود غير المُصلَح — الفشل يؤكّد وجود
// خلل الاحتساب المزدوج. لا تُصلِح الكود هنا؛ هذه مرحلة استكشاف فقط.
//
// **نهج PBT المُوجَّه (Scoped PBT):** الخلل حتمي (استعلامات قاعدة بيانات)، لذا
// توجّه المولّدات الخاصيّة نحو حالات فشل ملموسة عبر بذر حوادث كلّها بلاغات كاذبة.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createTestDb } from "./helpers/testDb";
import { getDashboardStats } from "./helpers/stats";
import { seedAccident, markFalseAlarm } from "./helpers/seed";

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

const severityArb: fc.Arbitrary<Severity> = fc.constantFrom(
  "critical",
  "severe",
  "moderate",
  "minor",
);

const impactZoneArb: fc.Arbitrary<ImpactZone> = fc.constantFrom(
  "front",
  "front-left",
  "front-right",
  "rear",
  "rear-left",
  "rear-right",
  "side-left",
  "side-right",
  "unknown",
);

// وصف حادث كاذب واحد: قيمة قوة G وشدّة ومنطقة اصطدام معلومة، مع خيار أن يكون
// له matched_accident_id (لتغطية totalMatchedAccidents).
interface FalseAlarmSpec {
  peakGForce: number;
  severity: Severity;
  impactZone: ImpactZone;
  matched: boolean;
}

const falseAlarmSpecArb: fc.Arbitrary<FalseAlarmSpec> = fc.record({
  // قوة G ضمن نطاق واقعي، مقرّبة لتجنّب مشاكل الفاصلة العائمة في المقارنات.
  peakGForce: fc
    .integer({ min: 1, max: 300 })
    .map((n) => n / 10), // 0.1 .. 30.0
  severity: severityArb,
  impactZone: impactZoneArb,
  matched: fc.boolean(),
});

// بذر مجموعة حوادث كلّها بلاغات كاذبة (كل حادث له صف مقابل في false_alarms).
async function seedAllFalseAlarms(
  db: Parameters<typeof seedAccident>[0],
  specs: FalseAlarmSpec[],
): Promise<void> {
  for (const spec of specs) {
    const accident = await seedAccident(db, {
      peakGForce: spec.peakGForce,
      severity: spec.severity,
      impactZone: spec.impactZone,
      timestamp: new Date(), // ضمن آخر 30 يومًا حتى يشمله accidentsByDay
      // matched_accident_id لا يملك قيد FK في المخطّط؛ نستخدم uuid وهمي عند الحاجة.
      matchedAccidentId: spec.matched
        ? "00000000-0000-0000-0000-000000000001"
        : null,
    });
    await markFalseAlarm(db, accident.id, { reason: "exploration-false-alarm" });
  }
}

describe("Property 1: Bug Condition — false alarms excluded from accident-derived stats", () => {
  // مثال ملموس مباشر من التصميم: حادث كاذب واحد.
  it("a single false-alarm accident yields totalAccidents=0 and totalFalseAlarms=1 (no double count)", async () => {
    const handle = await createTestDb();
    try {
      const accident = await seedAccident(handle.db, {
        peakGForce: 9,
        severity: "severe",
      });
      await markFalseAlarm(handle.db, accident.id, { reason: "sensor-noise" });

      const stats = await getDashboardStats(handle.db);

      // شرط الخلل محقَّق: للحادث صف في false_alarms.
      // السلوك المتوقّع (F'):
      expect(stats.totalAccidents).toBe(0);
      expect(stats.totalFalseAlarms).toBe(1);
    } finally {
      await handle.close();
    }
  });

  // خاصية شاملة: لأي مجموعة (غير فارغة) من الحوادث الكاذبة.
  it("for any set of false-alarm accidents, none are counted in accident-derived stats", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(falseAlarmSpecArb, { minLength: 1, maxLength: 6 }),
        async (specs) => {
          const handle = await createTestDb();
          try {
            await seedAllFalseAlarms(handle.db, specs);

            const stats = await getDashboardStats(handle.db);
            const n = specs.length;

            // 2.1 — لا يُحتسب أي بلاغ كاذب في totalAccidents.
            expect(stats.totalAccidents).toBe(0);

            // 2.2 — لا يُحتسب أي بلاغ كاذب في totalMatchedAccidents
            // (حتى لو كان له matched_accident_id).
            expect(stats.totalMatchedAccidents).toBe(0);

            // 2.3 — لا تدخل قيم البلاغات الكاذبة في المتوسط ولا في التجميعات.
            // averageGForce يُعاد 0 عند غياب صفوف حوادث حقيقية.
            expect(Number(stats.averageGForce)).toBe(0);
            expect(stats.accidentsBySeverity).toEqual([]);
            expect(stats.accidentsByImpactZone).toEqual([]);
            expect(stats.accidentsByDay).toEqual([]);

            // 2.4 — تُحتسب البلاغات الكاذبة فقط في totalFalseAlarms.
            expect(stats.totalFalseAlarms).toBe(n);
          } finally {
            await handle.close();
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  // تغطية صريحة لحالة totalMatchedAccidents: بلاغ كاذب له matched_accident_id.
  it("a false alarm with a matched_accident_id is not counted in totalMatchedAccidents", async () => {
    const handle = await createTestDb();
    try {
      const accident = await seedAccident(handle.db, {
        peakGForce: 7,
        severity: "severe",
        matchedAccidentId: "00000000-0000-0000-0000-000000000002",
      });
      await markFalseAlarm(handle.db, accident.id, { reason: "matched-false-alarm" });

      const stats = await getDashboardStats(handle.db);

      expect(stats.totalMatchedAccidents).toBe(0);
      expect(stats.totalAccidents).toBe(0);
      expect(stats.totalFalseAlarms).toBe(1);
    } finally {
      await handle.close();
    }
  });

  // تغطية صريحة للتجميعات/المتوسط: بلاغ كاذب بشدّة و peak_g_force معلومين.
  it("a false alarm with known severity and peak_g_force is excluded from averageGForce and aggregations", async () => {
    const handle = await createTestDb();
    try {
      const accident = await seedAccident(handle.db, {
        peakGForce: 12,
        severity: "critical",
        impactZone: "rear",
      });
      await markFalseAlarm(handle.db, accident.id, { reason: "aggregation-false-alarm" });

      const stats = await getDashboardStats(handle.db);

      expect(Number(stats.averageGForce)).toBe(0);
      expect(stats.accidentsBySeverity).toEqual([]);
      expect(stats.accidentsByImpactZone).toEqual([]);
      expect(stats.accidentsByDay).toEqual([]);
      expect(stats.totalFalseAlarms).toBe(1);
    } finally {
      await handle.close();
    }
  });

  // الحالة الحدّية: مجموعة حوادث كلّها كاذبة → totalAccidents=0، تجميعات فارغة،
  // averageGForce=0، بينما totalFalseAlarms=N.
  it("edge case: when all accidents are false alarms, all accident-derived stats are empty/zero", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(falseAlarmSpecArb, { minLength: 2, maxLength: 8 }),
        async (specs) => {
          const handle = await createTestDb();
          try {
            await seedAllFalseAlarms(handle.db, specs);
            const stats = await getDashboardStats(handle.db);
            const n = specs.length;

            expect(stats.totalAccidents).toBe(0);
            expect(stats.totalMatchedAccidents).toBe(0);
            expect(Number(stats.averageGForce)).toBe(0);
            expect(stats.accidentsBySeverity).toEqual([]);
            expect(stats.accidentsByImpactZone).toEqual([]);
            expect(stats.accidentsByDay).toEqual([]);
            expect(stats.totalFalseAlarms).toBe(n);
          } finally {
            await handle.close();
          }
        },
      ),
      { numRuns: 15 },
    );
  });
});
