import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  scoreMatch,
  generateCrossVerifiedAnalysis,
  MATCH,
  type CrossReport,
  type ImpactZone as CrossImpactZone,
} from "@workspace/liability";

type AccidentSeverity = "critical" | "severe" | "moderate" | "minor";
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

const severityValues = new Set<AccidentSeverity>([
  "critical",
  "severe",
  "moderate",
  "minor",
]);
const impactZoneValues = new Set<ImpactZone>([
  "front",
  "front-left",
  "front-right",
  "rear",
  "rear-left",
  "rear-right",
  "side-left",
  "side-right",
  "unknown",
]);
const impactDirectionValues = new Set<ImpactDirection>([
  "front",
  "rear",
  "side-left",
  "side-right",
  "unknown",
]);

const router: IRouter = Router();

type CreateAccidentBody = {
  deviceId: string;
  userId: string | null;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  peakGForce: number;
  impactZone: ImpactZone;
  impactDirection: ImpactDirection;
  speedKmh: number;
  jerkPeak: number;
  approachAngle: number;
  severity: AccidentSeverity;
  reportJson: Record<string, unknown>;
  localId?: string;
};

type MatchAccidentBody = {
  deviceId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  approachAngle: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseCreateAccidentBody(body: unknown): CreateAccidentBody | null {
  if (!isRecord(body)) return null;

  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const timestamp = typeof body.timestamp === "string" ? body.timestamp : "";
  const impactZone = body.impactZone;
  const impactDirection = body.impactDirection;
  const severity = body.severity;
  const reportJson = body.reportJson;

  if (!deviceId || Number.isNaN(new Date(timestamp).getTime())) return null;
  if (!impactZoneValues.has(impactZone as ImpactZone)) return null;
  if (!impactDirectionValues.has(impactDirection as ImpactDirection)) return null;
  if (!severityValues.has(severity as AccidentSeverity)) return null;
  if (!isRecord(reportJson)) return null;

  const peakGForce = body.peakGForce;
  const speedKmh = body.speedKmh;
  const jerkPeak = body.jerkPeak;
  const approachAngle = body.approachAngle;

  if (typeof peakGForce !== "number" || !Number.isFinite(peakGForce)) return null;
  if (typeof speedKmh !== "number" || !Number.isFinite(speedKmh)) return null;
  if (typeof jerkPeak !== "number" || !Number.isFinite(jerkPeak)) return null;
  if (typeof approachAngle !== "number" || !Number.isFinite(approachAngle)) return null;

  return {
    deviceId,
    userId:
      typeof body.userId === "string" && body.userId.trim() !== ""
        ? body.userId.trim()
        : typeof body.user_id === "string" && body.user_id.trim() !== ""
          ? body.user_id.trim()
          : null,
    timestamp,
    latitude: numberOrNull(body.latitude),
    longitude: numberOrNull(body.longitude),
    peakGForce,
    impactZone: impactZone as ImpactZone,
    impactDirection: impactDirection as ImpactDirection,
    speedKmh: Math.round(speedKmh),
    jerkPeak,
    approachAngle,
    severity: severity as AccidentSeverity,
    reportJson,
    localId: typeof reportJson.id === "string" ? reportJson.id : undefined,
  };
}

function parseMatchAccidentBody(body: unknown): MatchAccidentBody | null {
  if (!isRecord(body)) return null;

  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const timestamp = typeof body.timestamp === "string" ? body.timestamp : "";
  const latitude = body.latitude;
  const longitude = body.longitude;
  const approachAngle = body.approachAngle;

  if (!deviceId || Number.isNaN(new Date(timestamp).getTime())) return null;
  if (typeof latitude !== "number" || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null;
  if (typeof approachAngle !== "number" || !Number.isFinite(approachAngle)) return null;

  return { deviceId, timestamp, latitude, longitude, approachAngle };
}

async function getDb() {
  return import("@workspace/db");
}

/**
 * يحوّل صف حادث من قاعدة البيانات إلى `CrossReport` (مدخل محرك المسؤولية).
 * يستخرج `preCrashSpeedKmh` و`braking` من `report_json` عند توفّرهما.
 */
function toCrossReport(row: {
  id: string;
  impactZone: string;
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number;
  reportJson: unknown;
}): CrossReport {
  const rj = isRecord(row.reportJson) ? row.reportJson : {};
  const braking = isRecord(rj.braking) && typeof rj.braking.brakingDetected === "boolean"
    ? { brakingDetected: rj.braking.brakingDetected }
    : null;
  return {
    id: row.id,
    impactZone: row.impactZone as CrossImpactZone,
    timestamp: row.timestamp.getTime(),
    latitude: row.latitude,
    longitude: row.longitude,
    speedKmh: row.speedKmh,
    preCrashSpeedKmh:
      typeof rj.preCrashSpeedKmh === "number" ? rj.preCrashSpeedKmh : null,
    braking,
  };
}

router.post("/accidents", async (req, res, next) => {
  const parsed = parseCreateAccidentBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid accident payload" });
    return;
  }

  try {
    const { db, accidentsTable } = await getDb();
    const [created] = await db
      .insert(accidentsTable)
      .values({
        deviceId: parsed.deviceId,
        userId: parsed.userId,
        timestamp: new Date(parsed.timestamp),
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        peakGForce: parsed.peakGForce,
        impactZone: parsed.impactZone,
        impactDirection: parsed.impactDirection,
        speedKmh: parsed.speedKmh,
        jerkPeak: parsed.jerkPeak,
        approachAngle: parsed.approachAngle,
        severity: parsed.severity,
        reportJson: parsed.reportJson,
        localId: parsed.localId,
      })
      .returning({ id: accidentsTable.id });

    res.status(201).json({ id: created.id });
  } catch (error) {
    next(error);
  }
});

router.post("/accidents/:id/match", async (req, res, next) => {
  const ownAccidentId = req.params.id;
  const parsed = parseMatchAccidentBody(req.body);
  if (!ownAccidentId || !parsed) {
    res.status(400).json({ error: "Invalid accident match payload" });
    return;
  }

  try {
    const { db, accidentsTable, crossVerifiedAnalysesTable } = await getDb();

    // نجلب سجلّ الحادث نفسه ليكون هو المرجع في المطابقة والحساب (بدل الاعتماد
    // على قيم الطلب فقط)، فيتطابق ما يُحسب مع ما هو مُخزَّن فعلاً.
    const [own] = await db
      .select()
      .from(accidentsTable)
      .where(eq(accidentsTable.id, ownAccidentId))
      .limit(1);

    if (!own) {
      res.status(404).json({ error: "Accident not found" });
      return;
    }

    const crashTime = own.timestamp.getTime();
    const windowStart = new Date(crashTime - MATCH.TIME_WINDOW_MS);
    const windowEnd = new Date(crashTime + MATCH.TIME_WINDOW_MS);

    const candidates = await db
      .select()
      .from(accidentsTable)
      .where(
        and(
          gte(accidentsTable.timestamp, windowStart),
          lte(accidentsTable.timestamp, windowEnd),
          ne(accidentsTable.id, ownAccidentId),
          ne(accidentsTable.deviceId, own.deviceId),
          isNull(accidentsTable.matchedAccidentId),
        ),
      )
      .limit(50);

    // نختار أفضل مطابقة (أعلى ثقة) لا أوّل مطابقة تُصادَف.
    const ownMatchInput = {
      timestamp: crashTime,
      latitude: own.latitude,
      longitude: own.longitude,
      approachAngle: own.approachAngle,
    };

    let best: { candidate: (typeof candidates)[number]; confidence: number; distanceMeters: number; timeDiffMs: number } | null = null;

    for (const candidate of candidates) {
      const score = scoreMatch(ownMatchInput, {
        timestamp: candidate.timestamp.getTime(),
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        approachAngle: candidate.approachAngle,
      });
      if (!score.isMatch) continue;
      if (!best || score.confidence > best.confidence) {
        best = {
          candidate,
          confidence: score.confidence,
          distanceMeters: score.distanceMeters,
          timeDiffMs: score.timeDiffMs,
        };
      }
    }

    if (!best) {
      res.json(null);
      return;
    }

    const candidate = best.candidate;
    const matchConfidence = Math.round(best.confidence);

    // حساب المسؤولية المتقاطعة مرّة واحدة على الخادم (المصدر الوحيد للحقيقة).
    const analysis = generateCrossVerifiedAnalysis(
      toCrossReport(own),
      toCrossReport(candidate),
    );
    analysis.accident_a_id = ownAccidentId;
    analysis.accident_b_id = candidate.id;

    // ربط الطرفين وحفظ التحليل ذرّيًّا (عملية واحدة).
    await db.transaction(async (tx) => {
      await tx
        .update(accidentsTable)
        .set({ matchedAccidentId: candidate.id, matchConfidence, updatedAt: new Date() })
        .where(eq(accidentsTable.id, ownAccidentId));
      await tx
        .update(accidentsTable)
        .set({ matchedAccidentId: ownAccidentId, matchConfidence, updatedAt: new Date() })
        .where(eq(accidentsTable.id, candidate.id));
      await tx.insert(crossVerifiedAnalysesTable).values({
        id: analysis.id,
        accidentAId: ownAccidentId,
        accidentBId: candidate.id,
        verifiedImpactZoneA: analysis.verified_impact_zone_a,
        verifiedImpactZoneB: analysis.verified_impact_zone_b,
        verifiedSpeedAKmh: analysis.verified_speed_a_kmh,
        verifiedSpeedBKmh: analysis.verified_speed_b_kmh,
        firstContactParty: analysis.first_contact_party,
        consistencyStatus: analysis.consistency_status,
        consistencyFlags: analysis.consistency_flags,
        liabilityAPercent: analysis.liability_a_percent,
        liabilityBPercent: analysis.liability_b_percent,
        createdAt: new Date(analysis.created_at),
      });
    });

    res.json({
      matchedAccidentId: candidate.id,
      matchConfidence,
      crossVerifiedAnalysis: analysis,
      otherReport: candidate.reportJson,
      distanceMeters: Math.round(best.distanceMeters),
      timeDiffMs: best.timeDiffMs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
