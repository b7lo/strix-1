import { Router } from "express";
import { db } from "@workspace/db";
import {
  accidentsTable,
  falseAlarmsTable,
  crossVerifiedAnalysesTable,
  faultAssessmentsTable,
  leadsTable,
} from "@workspace/db/schema";
import { desc, eq, isNotNull, sql, and, or, type SQL } from "drizzle-orm";

const router = Router();

// المصادقة مفروضة في routes/index.ts عبر requireAuth قبل الوصول لهذا الراوتر.

// أداة مساعدة: قراءة نص البحث من الاستعلام (منقّى ومحدود الطول).
function getSearch(req: { query: Record<string, unknown> }): string {
  const raw = typeof req.query.search === "string" ? req.query.search : "";
  return raw.trim().slice(0, 120);
}

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const totalAccidentsResult = await db
      .select({ count: sql<number>`cast(count(${accidentsTable.id}) as int)` })
      .from(accidentsTable);

    const totalFalseAlarmsResult = await db
      .select({ count: sql<number>`cast(count(${falseAlarmsTable.id}) as int)` })
      .from(falseAlarmsTable);

    const totalMatchedAccidentsResult = await db
      .select({ count: sql<number>`cast(count(${accidentsTable.id}) as int)` })
      .from(accidentsTable)
      .where(isNotNull(accidentsTable.matchedAccidentId));

    const totalAssessmentsResult = await db
      .select({ count: sql<number>`cast(count(${faultAssessmentsTable.id}) as int)` })
      .from(faultAssessmentsTable);

    const averageNajmDifferenceResult = await db
      .select({ avg: sql<number>`avg(${faultAssessmentsTable.liabilityDifference})` })
      .from(faultAssessmentsTable);

    const averageGForceResult = await db
      .select({ avg: sql<number>`avg(${accidentsTable.peakGForce})` })
      .from(accidentsTable);

    // عدد العملاء المسجّلين (Leads) من صفحة الهبوط
    const totalLeadsResult = await db
      .select({ count: sql<number>`cast(count(${leadsTable.id}) as int)` })
      .from(leadsTable);

    // Group by severity
    const severityGroups = await db
      .select({
        severity: accidentsTable.severity,
        count: sql<number>`cast(count(${accidentsTable.id}) as int)`,
      })
      .from(accidentsTable)
      .groupBy(accidentsTable.severity);

    // Group by impact zone
    const zoneGroups = await db
      .select({
        zone: accidentsTable.impactZone,
        count: sql<number>`cast(count(${accidentsTable.id}) as int)`,
      })
      .from(accidentsTable)
      .groupBy(accidentsTable.impactZone);

    // الحوادث حسب اليوم لآخر 30 يومًا (بيانات فعلية لرسم الاتجاه الزمني)
    const byDay = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${accidentsTable.timestamp}), 'YYYY-MM-DD')`,
        count: sql<number>`cast(count(${accidentsTable.id}) as int)`,
      })
      .from(accidentsTable)
      .where(sql`${accidentsTable.timestamp} >= now() - interval '30 days'`)
      .groupBy(sql`date_trunc('day', ${accidentsTable.timestamp})`)
      .orderBy(sql`date_trunc('day', ${accidentsTable.timestamp})`);

    res.json({
      totalAccidents: totalAccidentsResult[0]?.count || 0,
      totalFalseAlarms: totalFalseAlarmsResult[0]?.count || 0,
      totalMatchedAccidents: totalMatchedAccidentsResult[0]?.count || 0,
      totalAssessments: totalAssessmentsResult[0]?.count || 0,
      totalLeads: totalLeadsResult[0]?.count || 0,
      averageNajmDifference: averageNajmDifferenceResult[0]?.avg || null,
      averageGForce: averageGForceResult[0]?.avg || 0,
      accidentsBySeverity: severityGroups,
      accidentsByImpactZone: zoneGroups,
      accidentsByDay: byDay,
    });
  } catch (error) {
    console.error("Failed to fetch stats", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/dashboard/accidents
router.get("/accidents", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = getSearch(req);
    const severityFilter = typeof req.query.severity === "string" ? req.query.severity : "";

    // بناء شروط البحث/الفلترة
    const conditions: SQL[] = [];
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        sql`(${accidentsTable.deviceId} ILIKE ${like} OR ${accidentsTable.id}::text ILIKE ${like} OR ${accidentsTable.impactZone}::text ILIKE ${like})`,
      );
    }
    if (severityFilter) {
      conditions.push(sql`${accidentsTable.severity}::text = ${severityFilter}`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const data = await db
      .select({
        id: accidentsTable.id,
        deviceId: accidentsTable.deviceId,
        timestamp: accidentsTable.timestamp,
        latitude: accidentsTable.latitude,
        longitude: accidentsTable.longitude,
        peakGForce: accidentsTable.peakGForce,
        impactZone: accidentsTable.impactZone,
        impactDirection: accidentsTable.impactDirection,
        speedKmh: accidentsTable.speedKmh,
        severity: accidentsTable.severity,
        matchedAccidentId: accidentsTable.matchedAccidentId,
        matchConfidence: accidentsTable.matchConfidence,
        isFalseAlarm: sql<boolean>`CASE WHEN ${falseAlarmsTable.id} IS NOT NULL THEN true ELSE false END`,
        hasAssessment: sql<boolean>`CASE WHEN ${faultAssessmentsTable.id} IS NOT NULL THEN true ELSE false END`,
        liabilityDifference: faultAssessmentsTable.liabilityDifference,
      })
      .from(accidentsTable)
      .leftJoin(falseAlarmsTable, eq(accidentsTable.id, falseAlarmsTable.accidentId))
      .leftJoin(faultAssessmentsTable, eq(accidentsTable.id, faultAssessmentsTable.accidentId))
      .where(whereClause)
      .orderBy(desc(accidentsTable.timestamp))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${accidentsTable.id}) as int)` })
      .from(accidentsTable)
      .where(whereClause);

    res.json({
      data,
      total: totalResult[0]?.count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch accidents", error);
    res.status(500).json({ error: "Failed to fetch accidents" });
  }
});

// GET /api/dashboard/accidents/:id — عرض موحّد لكل ما يخص حالة واحدة
// (تفاصيل الحادث + تقييم نجم + الإنذار الكاذب + المطابقة/الحادث المشترك)
router.get("/accidents/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const accidentRows = await db
      .select()
      .from(accidentsTable)
      .where(eq(accidentsTable.id, id))
      .limit(1);

    const accident = accidentRows[0];
    if (!accident) {
      res.status(404).json({ error: "Accident not found" });
      return;
    }

    const assessmentRows = await db
      .select()
      .from(faultAssessmentsTable)
      .where(eq(faultAssessmentsTable.accidentId, id))
      .limit(1);

    const falseAlarmRows = await db
      .select()
      .from(falseAlarmsTable)
      .where(eq(falseAlarmsTable.accidentId, id))
      .limit(1);

    // المطابقة: نبحث في تحليلات التحقق المتقاطع عن أي سجل يضم هذا الحادث
    const matchedRows = await db
      .select()
      .from(crossVerifiedAnalysesTable)
      .where(
        or(
          eq(crossVerifiedAnalysesTable.accidentAId, id),
          eq(crossVerifiedAnalysesTable.accidentBId, id),
        ),
      )
      .limit(1);

    // بيانات الحادث الشريك (إن وُجد matchedAccidentId)
    let partner: typeof accidentRows[number] | null = null;
    if (accident.matchedAccidentId) {
      const partnerRows = await db
        .select()
        .from(accidentsTable)
        .where(eq(accidentsTable.id, accident.matchedAccidentId))
        .limit(1);
      partner = partnerRows[0] ?? null;
    }

    res.json({
      accident,
      assessment: assessmentRows[0] ?? null,
      falseAlarm: falseAlarmRows[0] ?? null,
      matched: matchedRows[0] ?? null,
      partner,
    });
  } catch (error) {
    console.error("Failed to fetch accident detail", error);
    // مؤقت للتشخيص: نكشف رسالة الخطأ للأدمن (خلف المصادقة) لتحديد السبب الجذري.
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to fetch accident detail", detail: message });
  }
});

// GET /api/dashboard/assessments
router.get("/assessments", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = getSearch(req);
    const whereClause = search
      ? sql`${faultAssessmentsTable.accidentId}::text ILIKE ${`%${search}%`}`
      : undefined;

    const data = await db
      .select({
        id: faultAssessmentsTable.id,
        accidentId: faultAssessmentsTable.accidentId,
        appLiabilityUser: faultAssessmentsTable.appLiabilityUser,
        appLiabilityOther: faultAssessmentsTable.appLiabilityOther,
        najmLiabilityUser: faultAssessmentsTable.najmLiabilityUser,
        najmLiabilityOther: faultAssessmentsTable.najmLiabilityOther,
        liabilityDifference: faultAssessmentsTable.liabilityDifference,
        userDescription: faultAssessmentsTable.userDescription,
        assessedAt: faultAssessmentsTable.assessedAt,
        accidentTimestamp: accidentsTable.timestamp,
        accidentSeverity: accidentsTable.severity,
      })
      .from(faultAssessmentsTable)
      .innerJoin(accidentsTable, eq(faultAssessmentsTable.accidentId, accidentsTable.id))
      .where(whereClause)
      .orderBy(desc(faultAssessmentsTable.assessedAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${faultAssessmentsTable.id}) as int)` })
      .from(faultAssessmentsTable)
      .where(whereClause);

    const averageResult = await db
      .select({ avg: sql<number>`avg(${faultAssessmentsTable.liabilityDifference})` })
      .from(faultAssessmentsTable);

    res.json({
      data,
      total: totalResult[0]?.count || 0,
      averageDifference: averageResult[0]?.avg || null,
    });
  } catch (error) {
    console.error("Failed to fetch assessments", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

// GET /api/dashboard/matched
router.get("/matched", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Use crossVerifiedAnalysesTable and join with accidents
    const data = await db
      .select({
        id: crossVerifiedAnalysesTable.id,
        accidentAId: crossVerifiedAnalysesTable.accidentAId,
        accidentBId: crossVerifiedAnalysesTable.accidentBId,
        consistencyStatus: crossVerifiedAnalysesTable.consistencyStatus,
        liabilityAPercent: crossVerifiedAnalysesTable.liabilityAPercent,
        liabilityBPercent: crossVerifiedAnalysesTable.liabilityBPercent,
        verifiedImpactZoneA: crossVerifiedAnalysesTable.verifiedImpactZoneA,
        verifiedImpactZoneB: crossVerifiedAnalysesTable.verifiedImpactZoneB,
        createdAt: crossVerifiedAnalysesTable.createdAt,
        // Join info for accident A
        accidentA_deviceId: accidentsTable.deviceId,
        accidentA_timestamp: accidentsTable.timestamp,
        accidentA_severity: accidentsTable.severity,
      })
      .from(crossVerifiedAnalysesTable)
      .innerJoin(accidentsTable, eq(crossVerifiedAnalysesTable.accidentAId, accidentsTable.id))
      .orderBy(desc(crossVerifiedAnalysesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${crossVerifiedAnalysesTable.id}) as int)` })
      .from(crossVerifiedAnalysesTable);

    res.json({
      data,
      total: totalResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Failed to fetch matched accidents", error);
    res.status(500).json({ error: "Failed to fetch matched accidents" });
  }
});

// GET /api/dashboard/false-alarms
router.get("/false-alarms", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = getSearch(req);
    // البحث بالجهاز أو السبب (join خارجي مع الحوادث للحصول على معرف الجهاز)
    const whereClause = search
      ? sql`(${accidentsTable.deviceId} ILIKE ${`%${search}%`} OR ${falseAlarmsTable.reason} ILIKE ${`%${search}%`})`
      : undefined;

    const data = await db
      .select({
        id: falseAlarmsTable.id,
        accidentId: falseAlarmsTable.accidentId,
        reason: falseAlarmsTable.reason,
        details: falseAlarmsTable.details,
        reportedAt: falseAlarmsTable.createdAt,
        deviceId: accidentsTable.deviceId,
        peakGForce: accidentsTable.peakGForce,
        timestamp: accidentsTable.timestamp,
      })
      .from(falseAlarmsTable)
      .leftJoin(accidentsTable, eq(falseAlarmsTable.accidentId, accidentsTable.id))
      .where(whereClause)
      .orderBy(desc(falseAlarmsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${falseAlarmsTable.id}) as int)` })
      .from(falseAlarmsTable)
      .leftJoin(accidentsTable, eq(falseAlarmsTable.accidentId, accidentsTable.id))
      .where(whereClause);

    res.json({
      data,
      total: totalResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Failed to fetch false alarms", error);
    res.status(500).json({ error: "Failed to fetch false alarms" });
  }
});

// GET /api/dashboard/leads — قائمة العملاء المسجّلين (اسم/جوال/إيميل)
// تُخدَم من الخادم فقط (بيانات شخصية) — لا تُكشف عبر anon key العام.
router.get("/leads", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = getSearch(req);
    const whereClause = search
      ? sql`(${leadsTable.fullName} ILIKE ${`%${search}%`} OR ${leadsTable.mobile} ILIKE ${`%${search}%`} OR ${leadsTable.email} ILIKE ${`%${search}%`})`
      : undefined;

    const data = await db
      .select({
        id: leadsTable.id,
        fullName: leadsTable.fullName,
        mobile: leadsTable.mobile,
        email: leadsTable.email,
        createdAt: leadsTable.createdAt,
      })
      .from(leadsTable)
      .where(whereClause)
      .orderBy(desc(leadsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${leadsTable.id}) as int)` })
      .from(leadsTable)
      .where(whereClause);

    res.json({
      data,
      total: totalResult[0]?.count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Failed to fetch leads", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

export default router;
