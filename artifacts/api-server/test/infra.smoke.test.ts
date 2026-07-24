// اختبار دخان (smoke test) للتحقّق من عمل بنية الاختبار فقط:
// قاعدة PGlite + إنشاء المخطّط + أدوات البذر + أداة استدعاء الإحصائيات.
//
// ملاحظة: هذا ليس اختبار شرط الخلل (المهمة 1) ولا اختبار الحفاظ (المهمة 2).
// كل التأكيدات هنا صحيحة سواءً قبل الإصلاح أو بعده (لا تعتمد على تصنيف البلاغ
// الكاذب)، فهدفها فقط إثبات أنّ الأدوات تعمل.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDbHandle } from "./helpers/testDb";
import { getDashboardStats } from "./helpers/stats";
import {
  seedAccident,
  seedLead,
  seedAssessment,
  markFalseAlarm,
} from "./helpers/seed";

describe("test infrastructure smoke test", () => {
  let handle: TestDbHandle;

  beforeEach(async () => {
    handle = await createTestDb();
  });

  afterEach(async () => {
    await handle.close();
  });

  it("returns zeroed stats for an empty database", async () => {
    const stats = await getDashboardStats(handle.db);
    expect(stats.totalAccidents).toBe(0);
    expect(stats.totalFalseAlarms).toBe(0);
    expect(stats.totalMatchedAccidents).toBe(0);
    expect(stats.totalAssessments).toBe(0);
    expect(stats.totalLeads).toBe(0);
    expect(stats.averageGForce).toBe(0);
    expect(stats.accidentsBySeverity).toEqual([]);
    expect(stats.accidentsByImpactZone).toEqual([]);
    expect(stats.accidentsByDay).toEqual([]);
  });

  it("counts a real (non-false-alarm) accident in totalAccidents", async () => {
    await seedAccident(handle.db, { peakGForce: 8, severity: "severe" });
    const stats = await getDashboardStats(handle.db);
    expect(stats.totalAccidents).toBe(1);
    expect(stats.averageGForce).toBe(8);
    expect(stats.accidentsBySeverity).toContainEqual({
      severity: "severe",
      count: 1,
    });
  });

  it("seeds leads and assessments into their independent counters", async () => {
    const accident = await seedAccident(handle.db);
    await seedAssessment(handle.db, accident.id, { liabilityDifference: 20 });
    await seedLead(handle.db);
    await seedLead(handle.db);
    const stats = await getDashboardStats(handle.db);
    expect(stats.totalAssessments).toBe(1);
    expect(stats.totalLeads).toBe(2);
    // ملاحظة مهمّة لكتّاب اختبارات المهام 1/2: دوال Postgres التجميعية avg()
    // تُعيد نوع numeric الذي يُسلسله مشغّل pg (وPGlite) كنصّ، لا كرقم — مثل
    // "20.0000000000000000". لذا averageNajmDifference و(averageGForce عند وجود
    // صفوف) يظهران كنصوص في استجابة JSON. استخدم Number(...) للمقارنة العددية.
    expect(Number(stats.averageNajmDifference)).toBe(20);
  });

  it("can link an accident to a false_alarms row via accident_id", async () => {
    // يتحقّق فقط من أنّ البذر والربط يعملان (شرط الخلل ممكن التهيئة).
    const accident = await seedAccident(handle.db);
    const fa = await markFalseAlarm(handle.db, accident.id, {
      reason: "sensor-noise",
    });
    expect(fa.accidentId).toBe(accident.id);
    const stats = await getDashboardStats(handle.db);
    expect(stats.totalFalseAlarms).toBe(1);
  });
});
