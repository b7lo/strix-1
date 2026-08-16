import { calculateLiability } from "../liabilityEngine";
import { findLiabilityRule } from "../liability/ruleRegistry";
import { buildSpeedEvidence } from "../liability/evidence";
import type { GyroscopeSnapshot } from "../types";

const quiet: GyroscopeSnapshot = {
  peakRotationRate: 0,
  spinDetected: false,
  dominantAxis: "none",
  yawRate: 0,
  pitchRate: 0,
  rollRate: 0,
  rolloverDetected: false,
};

const yaw: GyroscopeSnapshot = { ...quiet, dominantAxis: "yaw", yawRate: 50, peakRotationRate: 50 };

describe("explainable liability rule registry", () => {
  it.each([
    ["rear", "rear", quiet, "STRIX-REAR-001"],
    ["front", "front", quiet, "STRIX-FRONT-001"],
    ["side-left", "side-left", quiet, "STRIX-SIDE-001"],
    ["side-right", "side-right", yaw, "STRIX-LANE-001"],
  ] as const)("maps %s impact to a rule with evidence", (direction, zone, gyro, expectedRule) => {
    const result = calculateLiability(direction, 3, 35, 16, null, gyro, 1, 0, zone, null, true);
    expect(result.ruleId).toBe(expectedRule);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.confidenceModel.liability.ruleId).toBe(expectedRule);
  });

  it("falls back to an explicit unknown rule", () => {
    expect(findLiabilityRule("UNRECOGNIZED").id).toBe("STRIX-UNKNOWN-001");
  });

  it("does not claim external legal review", () => {
    expect(findLiabilityRule("FRONT_IMPACT").reviewed).toBe(false);
  });

  it("treats speeding as independent evidence only with a known road limit", () => {
    expect(buildSpeedEvidence({ speedKmh: 140, speedLimitKmh: null })).toBeNull();
    expect(buildSpeedEvidence({ speedKmh: 90, speedLimitKmh: 100 })).toBeNull();
    expect(buildSpeedEvidence({ speedKmh: 120, speedLimitKmh: 100 })?.id).toBe("evidence.speeding");
  });
});
