import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";

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

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
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

  const crashTime = new Date(parsed.timestamp).getTime();
  const windowStart = new Date(crashTime - 30000);
  const windowEnd = new Date(crashTime + 30000);

  try {
    const { db, accidentsTable } = await getDb();
    const candidates = await db
      .select()
      .from(accidentsTable)
      .where(
        and(
          gte(accidentsTable.timestamp, windowStart),
          lte(accidentsTable.timestamp, windowEnd),
          ne(accidentsTable.id, ownAccidentId),
          ne(accidentsTable.deviceId, parsed.deviceId),
          isNull(accidentsTable.matchedAccidentId),
        ),
      )
      .limit(50);

    for (const candidate of candidates) {
      if (candidate.latitude === null || candidate.longitude === null) continue;

      const distanceMeters = haversineDistance(
        parsed.latitude,
        parsed.longitude,
        candidate.latitude,
        candidate.longitude,
      );
      if (distanceMeters > 100) continue;

      const timeDiffMs = Math.abs(crashTime - candidate.timestamp.getTime());
      if (timeDiffMs > 5000) continue;

      const angleDiff = Math.abs(
        ((parsed.approachAngle - candidate.approachAngle + 180 + 360) % 360) -
          180,
      );
      const anglesOpposite = angleDiff < 45;

      let matchConfidence = 50;
      if (timeDiffMs < 2000) matchConfidence += 20;
      else if (timeDiffMs < 4000) matchConfidence += 10;
      if (distanceMeters < 30) matchConfidence += 20;
      else if (distanceMeters < 60) matchConfidence += 10;
      if (anglesOpposite) matchConfidence += 10;
      matchConfidence = Math.min(98, matchConfidence);

      if (matchConfidence < 60) continue;

      await db
        .update(accidentsTable)
        .set({
          matchedAccidentId: candidate.id,
          matchConfidence,
          updatedAt: new Date(),
        })
        .where(eq(accidentsTable.id, ownAccidentId));
      await db
        .update(accidentsTable)
        .set({
          matchedAccidentId: ownAccidentId,
          matchConfidence,
          updatedAt: new Date(),
        })
        .where(eq(accidentsTable.id, candidate.id));

      res.json({
        matchedAccidentId: candidate.id,
        matchConfidence,
        otherReport: candidate.reportJson,
        distanceMeters: Math.round(distanceMeters),
        timeDiffMs,
      });
      return;
    }

    res.json(null);
  } catch (error) {
    next(error);
  }
});

export default router;
