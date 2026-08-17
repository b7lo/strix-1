import assert from "node:assert/strict";
import test from "node:test";
import { generateCrossVerifiedAnalysis } from "../crossVerification";
import type { CrossReport } from "../types";

function report(overrides: Partial<CrossReport>): CrossReport {
  return {
    id: Math.random().toString(36),
    timestamp: 1_000_000,
    impactZone: "front",
    latitude: 24.7136,
    longitude: 46.6753,
    ...overrides,
  };
}

test("rejects physically impossible contact surfaces", () => {
  const result = generateCrossVerifiedAnalysis(
    report({ impactZone: "rear-left" }),
    report({ impactZone: "rear-right" }),
  );
  assert.equal(result.consistency_status, "INCONSISTENT");
  assert.ok(result.consistency_flags.some((flag) => flag.startsWith("ZONE_BOTH_REAR")));
});

test("rejects impact peaks that cannot belong to one collision", () => {
  const result = generateCrossVerifiedAnalysis(
    report({ impactZone: "front", impactPeakTimestamp: 1_000_000 }),
    report({ impactZone: "rear", impactPeakTimestamp: 1_005_000 }),
  );
  assert.equal(result.consistency_status, "INCONSISTENT");
  assert.ok(result.consistency_flags.some((flag) => flag.startsWith("IMPACT_PEAK_TIME_GAP")));
});

test("rejects headings that contradict a rear-end contact", () => {
  const result = generateCrossVerifiedAnalysis(
    report({ impactZone: "front", travelHeadingDeg: 0 }),
    report({ impactZone: "rear", travelHeadingDeg: 180 }),
  );
  assert.equal(result.consistency_status, "INCONSISTENT");
  assert.ok(result.consistency_flags.some((flag) => flag.startsWith("TRAVEL_HEADINGS_INCONSISTENT")));
});

test("accepts coherent peak, heading and reciprocal contact evidence", () => {
  const result = generateCrossVerifiedAnalysis(
    report({ impactZone: "front", travelHeadingDeg: 90, impactPeakTimestamp: 1_000_020 }),
    report({ impactZone: "rear", travelHeadingDeg: 93, impactPeakTimestamp: 1_000_080 }),
  );
  assert.equal(result.consistency_status, "VERIFIED");
  assert.deepEqual(result.consistency_flags, []);
});
