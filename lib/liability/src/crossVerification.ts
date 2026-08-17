import type { CrossReport, CrossVerifiedAnalysis, ImpactZone } from "./types";
import { CROSS } from "./thresholds";
import { haversineDistance } from "./geo";
import { contactZonesCompatible, travelHeadingsConsistent } from "./matching";

/** واجهة مصغّرة لكائن crypto العام (متوفّر في Node وRN والمتصفّح). */
interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

function generateUUID(): string {
  const cryptoObj = (globalThis as { crypto?: CryptoLike }).crypto;
  try {
    if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
      return cryptoObj.randomUUID();
    }
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      let hex = "";
      for (let i = 0; i < 16; i++) {
        if (i === 4 || i === 6 || i === 8 || i === 10) hex += "-";
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return hex;
    }
  } catch {
    // يسقط إلى التوليد الرياضي أدناه
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** يفحص الاتّساق الفيزيائي بين منطقتَي اصطدام ويعيد أعلام التعارض. */
function checkZoneConsistency(zoneA: ImpactZone, zoneB: ImpactZone): string[] {
  const flags: string[] = [];

  const isRearA = zoneA.includes("rear");
  const isRearB = zoneB.includes("rear");

  // كلاهما خلفي = مستحيل (من صدم من؟)
  if (isRearA && isRearB) {
    flags.push("ZONE_BOTH_REAR: Both vehicles report rear impact — physically impossible");
  }

  if (contactZonesCompatible(zoneA, zoneB) === false && !(isRearA && isRearB)) {
    flags.push("CONTACT_ZONES_INCOMPATIBLE: Reported contact surfaces cannot touch in one collision");
  }

  return flags;
}

function hasCoordinates(
  report: CrossReport,
): report is CrossReport & { latitude: number; longitude: number } {
  return typeof report.latitude === "number" && Number.isFinite(report.latitude) &&
    typeof report.longitude === "number" && Number.isFinite(report.longitude);
}

/** يتحقّق من الوقت والمسافة بين تقريرين ويعيد أعلام التعارض. */
function checkTimeAndDistance(reportA: CrossReport, reportB: CrossReport): string[] {
  const flags: string[] = [];

  if (hasCoordinates(reportA) && hasCoordinates(reportB)) {
    const dist = haversineDistance(
      reportA.latitude,
      reportA.longitude,
      reportB.latitude,
      reportB.longitude,
    );
    if (dist > CROSS.GPS_MAX_DISTANCE_M) {
      flags.push(
        `GPS_TOO_FAR: GPS distance > ${CROSS.GPS_MAX_DISTANCE_M}m (${Math.round(dist)}m apart)`,
      );
    }
  }

  const timeDiff = Math.abs(reportA.timestamp - reportB.timestamp);
  if (timeDiff > CROSS.TIME_TOLERANCE_MS) {
    flags.push(
      `TIME_GAP: Time difference > ${CROSS.TIME_TOLERANCE_MS / 1000}s (${Math.round(timeDiff / 1000)}s apart)`,
    );
  }


  if (
    typeof reportA.impactPeakTimestamp === "number"
    && Number.isFinite(reportA.impactPeakTimestamp)
    && typeof reportB.impactPeakTimestamp === "number"
    && Number.isFinite(reportB.impactPeakTimestamp)
  ) {
    const peakDiff = Math.abs(reportA.impactPeakTimestamp - reportB.impactPeakTimestamp);
    if (peakDiff > CROSS.PEAK_TIME_TOLERANCE_MS) {
      flags.push(
        `IMPACT_PEAK_TIME_GAP: Peak difference > ${CROSS.PEAK_TIME_TOLERANCE_MS}ms (${Math.round(peakDiff)}ms apart)`,
      );
    }
  }

  const headingConsistency = travelHeadingsConsistent(
    {
      timestamp: reportA.timestamp,
      approachAngle: 0,
      travelHeadingDeg: reportA.travelHeadingDeg,
      impactZone: reportA.impactZone,
    },
    {
      timestamp: reportB.timestamp,
      approachAngle: 0,
      travelHeadingDeg: reportB.travelHeadingDeg,
      impactZone: reportB.impactZone,
    },
  );
  if (headingConsistency === false) {
    flags.push("TRAVEL_HEADINGS_INCONSISTENT: Travel headings contradict the reported contact zones");
  }

  return flags;
}

type Role = "STRIKER" | "STRUCK" | "MUTUAL";

/**
 * يحدّد دور الطرف A بناءً على منطقتَي الاصطدام (قانون المرور):
 *  - A أمامي + B خلفي → A صدم B من الخلف → STRIKER
 *  - A خلفي + B أمامي → B صدم A من الخلف → STRUCK
 *  - A أمامي + B جانبي → A صدم جانب B → STRIKER
 *  - A جانبي + B أمامي → B صدم جانب A → STRUCK
 *  - كلاهما جانبي → احتكاك جانبي → MUTUAL
 *  - كلاهما أمامي → وجهاً لوجه → MUTUAL
 */
function determineRoleOfA(zoneA: ImpactZone, zoneB: ImpactZone): Role {
  const isFrontA = zoneA.includes("front");
  const isRearA = zoneA.includes("rear");
  const isSideA = zoneA.includes("side");

  const isFrontB = zoneB.includes("front");
  const isRearB = zoneB.includes("rear");
  const isSideB = zoneB.includes("side");

  if (isFrontA && isRearB) return "STRIKER";
  if (isRearA && isFrontB) return "STRUCK";
  if (isFrontA && isSideB) return "STRIKER";
  if (isSideA && isFrontB) return "STRUCK";
  if (isSideA && isSideB) return "MUTUAL";
  if (isFrontA && isFrontB) return "MUTUAL";
  if (isRearA && isSideB) return "STRIKER"; // A كان يرجع للخلف
  if (isSideA && isRearB) return "STRUCK"; // B كان يرجع للخلف

  return "MUTUAL";
}

/**
 * حساب مستقل للمسؤولية المتقاطعة: إعادة بناء جنائية من الصفر بدل تمرير
 * تقدير كل طرف المتحيّز لمنظوره. الخطوات: دور → مسؤولية أساس
 * → تعديل الفرملة → قاعدة الاصطدام الخلفي → القصّ إلى السلّم القانوني.
 * السرعة لا تعدّل المسؤولية مباشرة؛ تُعد مخالفة مستقلة فقط عند وجود حد طريق
 * موثوق، وهو دليل غير متوفر في عقد المطابقة الحالي.
 */
function calculateCrossLiability(
  reportA: CrossReport,
  reportB: CrossReport,
): { liabilityA: number; liabilityB: number } {
  if (reportA.impactZone.includes("rear") && reportB.impactZone.includes("rear")) {
    return { liabilityA: 50, liabilityB: 50 };
  }

  const roleA = determineRoleOfA(reportA.impactZone, reportB.impactZone);

  let rawFaultA: number;
  switch (roleA) {
    case "STRIKER":
      rawFaultA = 75;
      break;
    case "STRUCK":
      rawFaultA = 25;
      break;
    case "MUTUAL":
    default:
      rawFaultA = 50;
      break;
  }

  if (reportA.braking?.brakingDetected) {
    rawFaultA -= 5;
  }
  if (reportB.braking?.brakingDetected) {
    rawFaultA += 5;
  }

  const isRearEndA =
    reportA.impactZone.includes("front") && reportB.impactZone.includes("rear");
  const isRearEndB =
    reportB.impactZone.includes("front") && reportA.impactZone.includes("rear");

  if (isRearEndA) {
    rawFaultA = Math.max(rawFaultA, 75);
  } else if (isRearEndB) {
    rawFaultA = Math.min(rawFaultA, 25);
  }

  rawFaultA = clamp(Math.round(rawFaultA), 0, 100);

  const allowedValues = [0, 25, 50, 75, 100];
  const liabilityA = allowedValues.reduce((prev, curr) =>
    Math.abs(curr - rawFaultA) < Math.abs(prev - rawFaultA) ? curr : prev,
  );
  const liabilityB = 100 - liabilityA;

  return { liabilityA, liabilityB };
}

/** يولّد CrossVerifiedAnalysis من تقريرَي حادث. */
export function generateCrossVerifiedAnalysis(
  reportA: CrossReport,
  reportB: CrossReport,
): CrossVerifiedAnalysis {
  const flags: string[] = [];

  flags.push(...checkTimeAndDistance(reportA, reportB));
  flags.push(...checkZoneConsistency(reportA.impactZone, reportB.impactZone));

  let status: "VERIFIED" | "INCONSISTENT" | "PARTIAL" = "VERIFIED";
  if (flags.length > 0) {
    status = "INCONSISTENT";
  } else if (!hasCoordinates(reportA) || !hasCoordinates(reportB)) {
    status = "PARTIAL";
  }

  // ترتيب أول تماس: لا نثق بساعة الجهاز إلا إذا تجاوز الفرق هامش الانجراف.
  let firstContact: "A" | "B" | "UNKNOWN" = "UNKNOWN";
  const timeDelta = reportB.timestamp - reportA.timestamp;
  if (Math.abs(timeDelta) > CROSS.CLOCK_DRIFT_MARGIN_MS) {
    firstContact = timeDelta > 0 ? "A" : "B"; // الأقدم زمنيًا هو أول تماس
  }

  const speedA = reportA.preCrashSpeedKmh ?? reportA.speedKmh ?? 0;
  const speedB = reportB.preCrashSpeedKmh ?? reportB.speedKmh ?? 0;

  const { liabilityA, liabilityB } = calculateCrossLiability(reportA, reportB);

  return {
    id: generateUUID(),
    accident_a_id: reportA.id,
    accident_b_id: reportB.id,
    verified_impact_zone_a: reportA.impactZone,
    verified_impact_zone_b: reportB.impactZone,
    verified_speed_a_kmh: speedA,
    verified_speed_b_kmh: speedB,
    first_contact_party: firstContact,
    consistency_status: status,
    consistency_flags: flags,
    liability_a_percent: liabilityA,
    liability_b_percent: liabilityB,
    rule_id: "STRIX-CROSS-CONTACT-001",
    evidence: [
      `impact-zone-a:${reportA.impactZone}`,
      `impact-zone-b:${reportB.impactZone}`,
      ...(reportA.braking?.brakingDetected ? ["braking-a"] : []),
      ...(reportB.braking?.brakingDetected ? ["braking-b"] : []),
    ],
    created_at: Date.now(),
  };
}
