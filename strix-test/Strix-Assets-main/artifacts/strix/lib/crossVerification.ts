import { AccidentReport, CrossVerifiedAnalysis, ImpactZone } from "./types";
import { THRESHOLDS } from "./thresholds";
import { haversineDistance } from "./geoUtils";

function generateUUID(): string {
  try {
    // 1. Check if global crypto has randomUUID
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // 2. Check if global crypto has getRandomValues (React Native / modern JS environment)
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Set version 4 (0100) and variant (10xx)
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      
      let hex = "";
      for (let i = 0; i < 16; i++) {
        if (i === 4 || i === 6 || i === 8 || i === 10) hex += "-";
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return hex;
    }
    
    // 3. Fallback for Node.js if global crypto isn't direct
    if (typeof require !== "undefined") {
      try {
        const nodeCrypto = require("crypto");
        if (nodeCrypto && typeof nodeCrypto.randomUUID === "function") {
          return nodeCrypto.randomUUID();
        }
      } catch {}
    }
  } catch {}

  // 4. Fallback to math-based generation if no secure crypto is available
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}



/**
 * Checks if two impact zones are physically consistent.
 * Returns flags describing contradictions.
 */
function checkZoneConsistency(
  zoneA: ImpactZone,
  zoneB: ImpactZone
): string[] {
  const flags: string[] = [];

  const isFrontA = zoneA.includes("front");
  const isFrontB = zoneB.includes("front");
  const isRearA = zoneA.includes("rear");
  const isRearB = zoneB.includes("rear");

  // Both claiming rear = impossible (who hit whom?)
  if (isRearA && isRearB) {
    flags.push("ZONE_BOTH_REAR: Both vehicles report rear impact — physically impossible");
  }

  // Both claiming front = possible head-on, but rare
  if (isFrontA && isFrontB) {
    // This is a valid head-on collision — no flag, but noted
  }

  return flags;
}

/**
 * Validates the time and distance between two reports.
 */
function checkTimeAndDistance(
  reportA: AccidentReport,
  reportB: AccidentReport
): string[] {
  const flags: string[] = [];

  if (
    reportA.latitude &&
    reportA.longitude &&
    reportB.latitude &&
    reportB.longitude
  ) {
    const dist = haversineDistance(
      reportA.latitude,
      reportA.longitude,
      reportB.latitude,
      reportB.longitude
    );
    if (dist > THRESHOLDS.GPS_MAX_DISTANCE_M) {
      flags.push(
        `GPS_TOO_FAR: GPS distance > ${THRESHOLDS.GPS_MAX_DISTANCE_M}m (${Math.round(dist)}m apart)`
      );
    }
  }

  const timeDiff = Math.abs(reportA.timestamp - reportB.timestamp);
  if (timeDiff > THRESHOLDS.TIME_TOLERANCE_MS) {
    flags.push(
      `TIME_GAP: Time difference > ${THRESHOLDS.TIME_TOLERANCE_MS / 1000}s (${Math.round(timeDiff / 1000)}s apart)`
    );
  }

  return flags;
}

// ═══════════════════════════════════════════════════════════════════
// Zone-based role detection: who is the "striker" vs "struck"?
// ═══════════════════════════════════════════════════════════════════

type Role = "STRIKER" | "STRUCK" | "MUTUAL";

/**
 * Determines the role of party A based on both impact zones.
 *
 * Traffic law logic:
 *  - If A's zone is "front*" and B's zone is "rear*" → A rear-ended B → A is STRIKER
 *  - If A's zone is "front*" and B's zone is "side*" → A hit B's side → A is STRIKER
 *  - If A's zone is "rear*"  and B's zone is "front*" → B rear-ended A → A is STRUCK
 *  - If A's zone is "side*"  and B's zone is "front*" → B hit A's side → A is STRUCK
 *  - If both are "side*" → sideswipe → MUTUAL
 *  - If both are "front*" → head-on → MUTUAL
 */
function determineRoleOfA(
  zoneA: ImpactZone,
  zoneB: ImpactZone
): Role {
  const isFrontA = zoneA.includes("front");
  const isRearA = zoneA.includes("rear");
  const isSideA = zoneA.includes("side");

  const isFrontB = zoneB.includes("front");
  const isRearB = zoneB.includes("rear");
  const isSideB = zoneB.includes("side");

  // A hit B from behind (A front, B rear) → A is STRIKER
  if (isFrontA && isRearB) return "STRIKER";

  // B hit A from behind (A rear, B front) → A is STRUCK
  if (isRearA && isFrontB) return "STRUCK";

  // A hit B's side (A front, B side) → A is STRIKER
  if (isFrontA && isSideB) return "STRIKER";

  // B hit A's side (A side, B front) → A is STRUCK
  if (isSideA && isFrontB) return "STRUCK";

  // Both side = sideswipe
  if (isSideA && isSideB) return "MUTUAL";

  // Both front = head-on
  if (isFrontA && isFrontB) return "MUTUAL";

  // Rear + side: A reversing into B's side? Uncommon.
  if (isRearA && isSideB) return "STRIKER"; // A was reversing
  if (isSideA && isRearB) return "STRUCK";  // B was reversing

  // Fallback
  return "MUTUAL";
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * Independent cross-verified liability calculation.
 *
 * Instead of averaging each party's self-reported liability (which is
 * biased because each phone only sees its own perspective), this
 * algorithm performs a forensic reconstruction from scratch:
 *
 *  1. Determine roles (STRIKER / STRUCK / MUTUAL) from impact zones.
 *  2. Apply traffic-law base liability per role.
 *  3. Adjust for speed differential.
 *  4. Adjust for braking evidence.
 *  5. Snap to traffic-law quantiles (0, 25, 50, 75, 100).
 * ═══════════════════════════════════════════════════════════════════
 */
function calculateCrossLiability(
  reportA: AccidentReport,
  reportB: AccidentReport
): { liabilityA: number; liabilityB: number } {
  // Guard for physically impossible scenarios
  if (reportA.impactZone.includes("rear") && reportB.impactZone.includes("rear")) {
    // Impossible to determine liability from impact zones alone, default to 50/50
    return { liabilityA: 50, liabilityB: 50 };
  }

  const roleA = determineRoleOfA(reportA.impactZone, reportB.impactZone);

  let rawFaultA: number;

  // ── Step 1: Base liability from role ──
  switch (roleA) {
    case "STRIKER":
      // The one who hits is primarily at fault
      rawFaultA = 75;
      break;
    case "STRUCK":
      // The one who got hit is largely not at fault
      rawFaultA = 25;
      break;
    case "MUTUAL":
    default:
      // Sideswipe / head-on → start at 50-50
      rawFaultA = 50;
      break;
  }

  // ── Step 2: Speed differential adjustment ──
  // Higher speed at impact = more responsibility
  const speedA = reportA.preCrashSpeedKmh || reportA.speedKmh || 0;
  const speedB = reportB.preCrashSpeedKmh || reportB.speedKmh || 0;

  if (speedA + speedB > 0) {
    // ratio: how much of the total speed belongs to A (0 → 1)
    const speedRatio = speedA / (speedA + speedB);
    // Shift fault towards the faster driver (±15 max)
    const speedAdjust = (speedRatio - 0.5) * 30;
    rawFaultA += speedAdjust;
  }

  // ── Step 3: Braking evidence ──
  // If A was braking before impact → reduce A's fault slightly (tried to avoid)
  if (reportA.braking?.brakingDetected) {
    rawFaultA -= 5;
  }
  // If B was braking before impact → reduce B's fault (increase A's)
  if (reportB.braking?.brakingDetected) {
    rawFaultA += 5;
  }

  // ── Step 4: Rear impact override ──
  // Traffic law universal rule: rear-ender is always at major fault
  const isRearEndA =
    reportA.impactZone.includes("front") && reportB.impactZone.includes("rear");
  const isRearEndB =
    reportB.impactZone.includes("front") && reportA.impactZone.includes("rear");

  if (isRearEndA) {
    // A rear-ended B → minimum 75% fault on A
    rawFaultA = Math.max(rawFaultA, 75);
  } else if (isRearEndB) {
    // B rear-ended A → maximum 25% fault on A
    rawFaultA = Math.min(rawFaultA, 25);
  }

  // ── Step 5: Clamp and snap to allowed values ──
  rawFaultA = clamp(Math.round(rawFaultA), 0, 100);

  const allowedValues = [0, 25, 50, 75, 100];
  const liabilityA = allowedValues.reduce((prev, curr) =>
    Math.abs(curr - rawFaultA) < Math.abs(prev - rawFaultA) ? curr : prev
  );
  const liabilityB = 100 - liabilityA;

  return { liabilityA, liabilityB };
}

/**
 * Generates the CrossVerifiedAnalysis from two accident reports.
 */
export function generateCrossVerifiedAnalysis(
  reportA: AccidentReport,
  reportB: AccidentReport
): CrossVerifiedAnalysis {
  const flags: string[] = [];

  flags.push(...checkTimeAndDistance(reportA, reportB));
  flags.push(
    ...checkZoneConsistency(reportA.impactZone, reportB.impactZone)
  );

  // Determine consistency status
  let status: "VERIFIED" | "INCONSISTENT" | "PARTIAL" = "VERIFIED";
  if (flags.length > 0) {
    status = "INCONSISTENT";
  } else if (!reportA.latitude || !reportB.latitude) {
    status = "PARTIAL";
  }

  // Determine first contact based on timestamp
  // A-7: لا نعتمد على ساعة الجهاز المحلية إلا إذا تجاوز الفرق هامش الانجراف.
  // الفرق الزمني الصغير متوقّع في نفس الحادث، لذا لا نضعه في flags (حتى لا نُفسد
  // حالة التطابق)، بل نترك firstContact = UNKNOWN بصمت لتجنّب ظلم طرف.
  let firstContact: "A" | "B" | "UNKNOWN" = "UNKNOWN";
  const timeDelta = reportB.timestamp - reportA.timestamp;
  if (Math.abs(timeDelta) > THRESHOLDS.CLOCK_DRIFT_MARGIN_MS) {
    firstContact = timeDelta > 0 ? "A" : "B"; // الأقدم زمنياً هو أول تماس
  }

  // Verified speeds (use pre-crash as primary, crash speed as fallback)
  const speedA = reportA.preCrashSpeedKmh || reportA.speedKmh || 0;
  const speedB = reportB.preCrashSpeedKmh || reportB.speedKmh || 0;

  // ── Cross-verified liability (independent forensic calculation) ──
  const { liabilityA, liabilityB } = calculateCrossLiability(
    reportA,
    reportB
  );

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
    created_at: Date.now(),
  };
}
