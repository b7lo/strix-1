import { MATCH } from "./thresholds";
import { haversineDistance } from "./geo";
import type { MatchInput, MatchScore } from "./types";

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function angleDifference(a: number, b: number): number {
  return Math.abs(((a - b + 180 + 360) % 360) - 180);
}

type ZoneFamily = "front" | "rear" | "side-left" | "side-right" | "unknown";

function zoneFamily(zone: MatchInput["impactZone"]): ZoneFamily {
  if (!zone || zone === "unknown") return "unknown";
  if (zone.startsWith("front")) return "front";
  if (zone.startsWith("rear")) return "rear";
  return zone === "side-left" ? "side-left" : "side-right";
}

/** توافق محافظ لموضعَي التماس؛ لا يفترض سيناريو عند المنطقة المجهولة. */
export function contactZonesCompatible(
  zoneA: MatchInput["impactZone"],
  zoneB: MatchInput["impactZone"],
): boolean | null {
  const a = zoneFamily(zoneA);
  const b = zoneFamily(zoneB);
  if (a === "unknown" || b === "unknown") return null;
  if (a === "rear" && b === "rear") return false;
  return true;
}

/** يقارن اتجاه السير بنوع التماس المتوقع (خلفي/وجهاً لوجه/جانبي). */
export function travelHeadingsConsistent(a: MatchInput, b: MatchInput): boolean | null {
  if (!finite(a.travelHeadingDeg) || !finite(b.travelHeadingDeg)) return null;
  const familyA = zoneFamily(a.impactZone);
  const familyB = zoneFamily(b.impactZone);
  if (familyA === "unknown" || familyB === "unknown") return null;

  const difference = angleDifference(a.travelHeadingDeg, b.travelHeadingDeg);
  const tolerance = MATCH.HEADING_TOLERANCE_DEG;
  if (
    (familyA === "front" && familyB === "rear")
    || (familyA === "rear" && familyB === "front")
  ) {
    return difference <= tolerance;
  }
  if (familyA === "front" && familyB === "front") {
    return difference >= 180 - tolerance;
  }
  const sideA = familyA.startsWith("side");
  const sideB = familyB.startsWith("side");
  if ((familyA === "front" && sideB) || (sideA && familyB === "front")) {
    return difference >= 90 - tolerance && difference <= 90 + tolerance;
  }
  return null;
}

/**
 * قرار المطابقة الموحّد: هل التقريران يصفان نفس الحادث؟
 *
 * نموذج مبني على الأدلّة (evidence-based) بدل نقطة انطلاق ثابتة:
 *   - الوقت (حتى 40 نقطة): الأقرب زمنيًا أقوى دليل.
 *   - المسافة (حتى 35 نقطة، عند توفّر GPS للطرفين).
 *   - الزاوية (25 نقطة): تقارُب زاويتَي الاقتراب.
 *
 * بوّابات صارمة قبل التسجيل: فرق زمني ضمن MAX_TIME_DIFF_MS، ومسافة ضمن
 * MAX_DISTANCE_M عند توفّر GPS. وعند غياب GPS نشترط تقارُب الزاويتَين لمنع
 * التطابق العشوائي.
 *
 * ملاحظة دلالية: `anglesAligned` تعني أن زاويتَي الاقتراب متقاربتان (ضمن
 * ANGLE_ALIGNED_DEG). الاسم السابق `anglesOpposite` كان مضلِّلًا لأن الحساب
 * نفسه يقيس التقارُب لا التعاكُس؛ أبقينا السلوك العددي كما هو وصحّحنا التسمية.
 */
export function scoreMatch(a: MatchInput, b: MatchInput): MatchScore {
  const timeDiffMs = Math.abs(a.timestamp - b.timestamp);

  const hasCoordinates = [a.latitude, a.longitude, b.latitude, b.longitude].every(finite);
  const accuracyA = finite(a.gpsAccuracyMeters) ? Math.max(0, a.gpsAccuracyMeters) : 25;
  const accuracyB = finite(b.gpsAccuracyMeters) ? Math.max(0, b.gpsAccuracyMeters) : 25;
  const hasUsableGps = hasCoordinates
    && accuracyA <= MATCH.MAX_GPS_ACCURACY_M
    && accuracyB <= MATCH.MAX_GPS_ACCURACY_M;
  let distanceMeters = 0;
  if (hasCoordinates) {
    distanceMeters = haversineDistance(
      a.latitude as number,
      a.longitude as number,
      b.latitude as number,
      b.longitude as number,
    );
  }

  const angleDiff = angleDifference(a.approachAngle, b.approachAngle);
  const anglesAligned = angleDiff < MATCH.ANGLE_ALIGNED_DEG;
  const peakTimeDiffMs = finite(a.impactPeakTimestamp) && finite(b.impactPeakTimestamp)
    ? Math.abs(a.impactPeakTimestamp - b.impactPeakTimestamp)
    : null;
  const zonesCompatible = contactZonesCompatible(a.impactZone, b.impactZone);
  const headingsConsistent = travelHeadingsConsistent(a, b);
  const contradictions: string[] = [];

  if (timeDiffMs > MATCH.MAX_TIME_DIFF_MS) contradictions.push("REPORT_TIME_GAP");
  const boundedLocationUncertainty = Math.min(accuracyA, MATCH.MAX_GPS_ACCURACY_M)
    + Math.min(accuracyB, MATCH.MAX_GPS_ACCURACY_M);
  if (hasCoordinates && distanceMeters > MATCH.MAX_DISTANCE_M + boundedLocationUncertainty) {
    contradictions.push("GPS_TOO_FAR");
  }
  if (peakTimeDiffMs !== null && peakTimeDiffMs > MATCH.MAX_PEAK_TIME_DIFF_MS) {
    contradictions.push("IMPACT_PEAK_TIME_GAP");
  }
  if (zonesCompatible === false) contradictions.push("CONTACT_ZONES_INCOMPATIBLE");
  if (headingsConsistent === false) contradictions.push("TRAVEL_HEADINGS_INCONSISTENT");

  // ── بوّابات صارمة ──
  const independentEvidenceCount = [
    peakTimeDiffMs !== null && peakTimeDiffMs <= 750,
    zonesCompatible === true,
    headingsConsistent === true,
  ].filter(Boolean).length;
  if (!hasUsableGps && independentEvidenceCount < 2) {
    contradictions.push("INSUFFICIENT_EVIDENCE_WITHOUT_GPS");
  }

  if (contradictions.length > 0) {
    return {
      isMatch: false,
      confidence: 0,
      distanceMeters,
      timeDiffMs,
      anglesAligned,
      hasUsableGps,
      peakTimeDiffMs,
      contactZonesCompatible: zonesCompatible,
      headingsConsistent,
      evidence: [],
      contradictions,
    };
  }

  // ── تسجيل الثقة ──
  let confidence = 0;
  const evidence: string[] = [];

  // الوقت (الأهم)
  if (timeDiffMs < 3_000) { confidence += 40; evidence.push("report-time:strong"); }
  else if (timeDiffMs < 10_000) { confidence += 25; evidence.push("report-time:medium"); }
  else if (timeDiffMs < 30_000) { confidence += 10; evidence.push("report-time:weak"); }

  // المسافة المرجّحة بجودة GPS
  if (hasUsableGps) {
    const locationUncertainty = accuracyA + accuracyB;
    const adjustedDistance = Math.max(0, distanceMeters - locationUncertainty);
    const qualityFactor = Math.max(0.35, 1 - locationUncertainty / 150);
    const distancePoints = adjustedDistance < 20 ? 35 : adjustedDistance < 50 ? 25 : 10;
    confidence += Math.round(distancePoints * qualityFactor);
    evidence.push(`gps:${qualityFactor >= 0.75 ? "strong" : "limited"}`);
  }

  // الزاوية
  if (anglesAligned) { confidence += 25; evidence.push("approach-angle"); }

  if (peakTimeDiffMs !== null) {
    if (peakTimeDiffMs <= 100) confidence += 15;
    else if (peakTimeDiffMs <= 300) confidence += 12;
    else if (peakTimeDiffMs <= 750) confidence += 7;
    evidence.push("impact-peak-time");
  }
  if (zonesCompatible === true) { confidence += 15; evidence.push("contact-zones"); }
  if (headingsConsistent === true) { confidence += 10; evidence.push("travel-headings"); }

  confidence = Math.min(MATCH.MAX_CONFIDENCE, confidence);
  if (!hasUsableGps) confidence = Math.min(85, confidence);

  return {
    isMatch: confidence >= MATCH.MIN_CONFIDENCE,
    confidence,
    distanceMeters,
    timeDiffMs,
    anglesAligned,
    hasUsableGps,
    peakTimeDiffMs,
    contactZonesCompatible: zonesCompatible,
    headingsConsistent,
    evidence,
    contradictions,
  };
}
