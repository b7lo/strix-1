/**
 * Example / metamorphic / i18n-parity tests for Axis 2 + Axis 3.
 * Feature: liability-engine-enhancement
 */
import { calculateLiability } from "../liabilityEngine";
import type {
  GyroscopeSnapshot,
  AdvancedAnalysisResult,
  OtherPartyAnalysis,
  CrossVerifiedAnalysis,
  RoadContextType,
} from "../types";
import ar from "../locales/ar.json";
import en from "../locales/en.json";

const quietGyro: GyroscopeSnapshot = {
  peakRotationRate: 0, spinDetected: false, dominantAxis: "none",
  yawRate: 0, pitchRate: 0, rollRate: 0, rolloverDetected: false,
};

const yawGyro = (yawRate: number, yawSustainedDurationMs = 0): GyroscopeSnapshot => ({
  ...quietGyro, dominantAxis: "yaw", yawRate, yawSustainedDurationMs, peakRotationRate: yawRate,
});

const advanced = (over?: Partial<AdvancedAnalysisResult> & {
  roadType?: RoadContextType; hasPriority?: boolean; wasStationary?: boolean;
}): AdvancedAnalysisResult => ({
  angularStability: { hadSuddenYaw: false, wasEvasive: false, maxYawRatePreCrash: 0, score: 0 },
  multiVector: { lateralG: 0, longitudinalG: 0, rearPushRatio: 0, score: 0 },
  roadContext: {
    roadType: over?.roadType ?? "unknown",
    hasPriority: over?.hasPriority ?? false,
    wasStationary: over?.wasStationary ?? false,
    confirmedByGyro: false, score: 0,
  },
  microKinematic: { scrapeDetected: false, highFreqVariance: 0, jerkGyroSync: false, vibrationDurationMs: 0, score: 0 },
  preCrashEvents: { hardBraking: false, hardAcceleration: false, steadyDriving: false, evasiveManeuver: false, score: 0 },
  postImpact: { driftDirection: "none", driftAngleDeg: 0, driftMagnitudeG: 0, stabilizationTimeMs: 0, secondaryImpacts: 0, postImpactRotation: false, postImpactYawRate: 0, vehicleStoppedImmediately: false, postCrashDecelG: 0, directionConfirmed: false, score: 0, factorsAr: [] },
  totalAdjustment: over?.totalAdjustment ?? 0,
  discoveredFactorsAr: over?.discoveredFactorsAr ?? [],
});

const otherAccel: OtherPartyAnalysis = {
  approachAngleDeg: 0, estimatedSpeedKmh: 60, impactForce: "moderate",
  vehicleType: "medium", wasAccelerating: true, wasBraking: false,
  confidencePercent: 60, descriptionAr: "",
};

describe("Axis 3 — New Scenario Codes", () => {
  it("DOOR_OPENING: light side impact, near-stationary, no lane change", () => {
    const r = calculateLiability("side-right", 1.2, 0, 5, null, quietGyro, 1, 0, "side-right", advanced());
    expect(r.scenarioCode).toBe("DOOR_OPENING_R");
    expect(r.factorsAr.length).toBeGreaterThan(0);
    expect(r.userFaultPercent).toBeLessThanOrEqual(25);
  });

  it("INTERSECTION_ROW_PRIORITY: side impact at intersection with priority ⇒ low fault", () => {
    const r = calculateLiability("side-left", 2.6, 30, 18, null, quietGyro, 1, 0, "side-left",
      advanced({ roadType: "intersection", hasPriority: true }));
    expect(r.scenarioCode).toBe("INTERSECTION_ROW_PRIORITY");
    expect(r.userFaultPercent).toBeLessThanOrEqual(25);
  });

  it("INTERSECTION_ROW_NO_PRIORITY: side impact at intersection without priority ⇒ high fault", () => {
    const r = calculateLiability("side-left", 2.6, 30, 18, null, quietGyro, 1, 0, "side-left",
      advanced({ roadType: "intersection", hasPriority: false }));
    expect(r.scenarioCode).toBe("INTERSECTION_ROW_NO_PRIORITY");
    expect(r.userFaultPercent).toBeGreaterThanOrEqual(75);
  });

  it("U_TURN: sustained high yaw ⇒ U_TURN code", () => {
    const r = calculateLiability("side-left", 2.5, 30, 18, null, yawGyro(70, 900), 1, 0, "side-left", advanced());
    expect(r.scenarioCode).toBe("U_TURN");
  });

  it("U_TURN: قمة yaw قصيرة لا تكفي لتصنيف انعطاف كامل", () => {
    const r = calculateLiability("side-left", 2.5, 30, 18, null, yawGyro(70, 100), 1, 0, "side-left", advanced());
    expect(r.scenarioCode).not.toBe("U_TURN");
  });

  it("LANE_MERGE: confirmed lane change (yaw between merge & u-turn thresholds)", () => {
    const r = calculateLiability("side-right", 2.5, 40, 18, null, yawGyro(50), 1, 0, "side-right", advanced());
    expect(r.scenarioCode).toBe("LANE_MERGE_R");
    expect(r.userFaultPercent).toBeGreaterThanOrEqual(50);
  });

  it("PARKING_MANEUVER: slow creep (5..10 km/h), non-rear/front", () => {
    const r = calculateLiability("side-left", 2.0, 7, 8, null, quietGyro, 1, 0, "side-left", advanced());
    expect(r.scenarioCode).toBe("PARKING_MANEUVER");
  });

  it("CHAIN_COLLISION: impactCount ≥ 2 relabels and includes count; rear+stationary keeps user low", () => {
    const r = calculateLiability("rear", 2.5, 0, 15, null, quietGyro, 3, 0, "rear", advanced());
    expect(r.scenarioCode).toBe("CHAIN_COLLISION");
    expect(r.factorsAr.join(" ")).toContain("3");
    expect(r.userFaultPercent).toBeLessThanOrEqual(25);
  });

  it("scenario codes are unique across representative inputs (injective)", () => {
    const codes = [
      calculateLiability("side-right", 1.2, 0, 5, null, quietGyro, 1, 0, "side-right", advanced()).scenarioCode,
      calculateLiability("side-left", 2.6, 30, 18, null, quietGyro, 1, 0, "side-left", advanced({ roadType: "intersection", hasPriority: true })).scenarioCode,
      calculateLiability("side-left", 2.6, 30, 18, null, quietGyro, 1, 0, "side-left", advanced({ roadType: "intersection", hasPriority: false })).scenarioCode,
      calculateLiability("side-left", 2.5, 30, 18, null, yawGyro(70), 1, 0, "side-left", advanced()).scenarioCode,
      calculateLiability("side-right", 2.5, 40, 18, null, yawGyro(50), 1, 0, "side-right", advanced()).scenarioCode,
      calculateLiability("side-left", 2.0, 7, 8, null, quietGyro, 1, 0, "side-left", advanced()).scenarioCode,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("Axis 2 — Metamorphic (single-signal differential)", () => {
  it("otherParty.wasAccelerating reduces (or keeps) user's raw fault (Req 6.3)", () => {
    const base = calculateLiability("side-right", 2.8, 40, 20, null, quietGyro, 1, 0, "side-right", advanced());
    const withAccel = calculateLiability("side-right", 2.8, 40, 20, null, quietGyro, 1, 0, "side-right", advanced(), true, otherAccel);
    expect(withAccel.rawFaultPercent).toBeLessThanOrEqual(base.rawFaultPercent);
  });

  it("crossVerified VERIFIED blends raw toward the verified liability (Req 6.1)", () => {
    const verified: CrossVerifiedAnalysis = {
      id: "x", accident_a_id: "a", accident_b_id: "b",
      verified_impact_zone_a: "front", verified_impact_zone_b: "rear",
      verified_speed_a_kmh: 0, verified_speed_b_kmh: 0, first_contact_party: "A",
      consistency_status: "VERIFIED", consistency_flags: [],
      liability_a_percent: 0, liability_b_percent: 100, created_at: 0,
    };
    const sensorOnly = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", advanced());
    const blended = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", advanced(), true, null, verified);
    // sensorOnly.raw = 100, verified = 0 ⇒ blended strictly between
    expect(blended.rawFaultPercent).toBeLessThan(sensorOnly.rawFaultPercent);
    expect(blended.rawFaultPercent).toBeGreaterThanOrEqual(0);
  });

  it("crossVerified INCONSISTENT is excluded (raw unchanged) + adds a note (Req 6.2)", () => {
    const inconsistent: CrossVerifiedAnalysis = {
      id: "x", accident_a_id: "a", accident_b_id: "b",
      verified_impact_zone_a: "front", verified_impact_zone_b: "rear",
      verified_speed_a_kmh: 0, verified_speed_b_kmh: 0, first_contact_party: "UNKNOWN",
      consistency_status: "INCONSISTENT", consistency_flags: [],
      liability_a_percent: 0, liability_b_percent: 100, created_at: 0,
    };
    const base = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", advanced());
    const withInc = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", advanced(), true, null, inconsistent);
    expect(withInc.rawFaultPercent).toBe(base.rawFaultPercent);
    expect(withInc.factorsAr.length).toBeGreaterThan(base.factorsAr.length);
  });
});

describe("i18n parity (ar ↔ en)", () => {
  const keys = (obj: any, prefix = ""): string[] => {
    const out: string[] = [];
    for (const k of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      const v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keys(v, path));
      else out.push(path);
    }
    return out;
  };

  it("ar.json and en.json have identical key sets", () => {
    const arKeys = new Set(keys(ar));
    const enKeys = new Set(keys(en));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));
    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInAr).toEqual([]);
  });

  it("new scenario dynamic factor lists are non-empty in both locales", () => {
    const lists = [
      "intersectionPriorityFactor", "intersectionNoPriorityFactor",
      "laneMergeSelfFactor", "laneMergeOtherFactor", "uTurnSelfFactor",
      "parkingManeuverFactor", "chainRearStationaryFactor", "doorOpeningFactor",
      "otherPartyAcceleratingFactor",
    ];
    for (const key of lists) {
      expect(Array.isArray((ar as any).dynamic[key])).toBe(true);
      expect((ar as any).dynamic[key].length).toBeGreaterThan(0);
      expect(Array.isArray((en as any).dynamic[key])).toBe(true);
      expect((en as any).dynamic[key].length).toBeGreaterThan(0);
    }
  });
});
