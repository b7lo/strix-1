import { Router } from "express";
import { db } from "@workspace/db";
import {
  accidentsTable,
  falseAlarmsTable,
  crossVerifiedAnalysesTable,
  faultAssessmentsTable,
  leadsTable,
} from "@workspace/db/schema";
import { desc, eq, isNotNull, sql, or } from "drizzle-orm";

const router = Router();

// المصادقة مفروضة في routes/index.ts عبر requireAuth قبل الوصول لهذا الراوتر.

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
      // For a real app we'd group by day using sql`date_trunc('day', timestamp)`
      accidentsByDay: [],
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
      .orderBy(desc(accidentsTable.timestamp))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${accidentsTable.id}) as int)` })
      .from(accidentsTable);

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

// GET /api/dashboard/assessments
router.get("/assessments", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

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
      .orderBy(desc(faultAssessmentsTable.assessedAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${faultAssessmentsTable.id}) as int)` })
      .from(faultAssessmentsTable);

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
      .orderBy(desc(falseAlarmsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${falseAlarmsTable.id}) as int)` })
      .from(falseAlarmsTable);

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

    const data = await db
      .select({
        id: leadsTable.id,
        fullName: leadsTable.fullName,
        mobile: leadsTable.mobile,
        email: leadsTable.email,
        createdAt: leadsTable.createdAt,
      })
      .from(leadsTable)
      .orderBy(desc(leadsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(${leadsTable.id}) as int)` })
      .from(leadsTable);

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
