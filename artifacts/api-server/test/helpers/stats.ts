// أداة مساعدة لاستدعاء منطق معالج `GET /api/dashboard/stats` في الاختبارات.
//
// نستدعي الدالّة المستخرَجة `computeDashboardStats` مباشرةً مع تمرير قاعدة بيانات
// الاختبار (PGlite)، وهو نفس المنطق الذي يستخدمه المعالج الحقيقي. ثم نمرّر النتيجة
// عبر JSON.parse(JSON.stringify(...)) لمحاكاة شكل استجابة الـ JSON التي يستلمها
// العميل (تحويل التواريخ إلى نصوص، وundefined إلى غياب الحقل، إلخ).
import { computeDashboardStats } from "../../src/routes/dashboard";
import type { TestDatabase } from "./testDb";

export interface DashboardStatsResponse {
  totalAccidents: number;
  totalFalseAlarms: number;
  totalMatchedAccidents: number;
  totalAssessments: number;
  totalLeads: number;
  // avg() في Postgres يُعيد numeric يُسلسَل كنصّ عبر مشغّل pg/PGlite. عند غياب
  // الصفوف يعيد المعالج 0/null صراحةً. لذا النوع قد يكون رقمًا أو نصًّا.
  averageNajmDifference: number | string | null;
  averageGForce: number | string;
  accidentsBySeverity: Array<{ severity: string | null; count: number }>;
  accidentsByImpactZone: Array<{ zone: string | null; count: number }>;
  accidentsByDay: Array<{ date: string; count: number }>;
}

/**
 * تشغيل منطق /stats مقابل قاعدة اختبار وإرجاع استجابة JSON كما يراها العميل.
 */
export async function getDashboardStats(
  db: TestDatabase,
): Promise<DashboardStatsResponse> {
  // نوع db للاختبار (PGlite) متوافق وظيفيًا مع نوع قاعدة الإنتاج (node-postgres)
  // على مستوى واجهة الاستعلام، فنمرّره كما هو.
  const result = await computeDashboardStats(db as never);
  return JSON.parse(JSON.stringify(result)) as DashboardStatsResponse;
}
