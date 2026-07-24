/**
 * Property-based tests for the Liability Engine (fast-check).
 * Feature: liability-engine-enhancement
 *
 * Locks in the invariants delivered by the A-6 audit and the Axis 2/3
 * enhancement. Each property runs >= 100 iterations over generated inputs.
 */
import fc from "fast-check";
import { calculateLiability } from "../liabilityEngine";
import type {
  ImpactDirection,
  ImpactZone,
  GyroscopeSnapshot,
  BrakingAnalysis,
  AdvancedAnalysisResult,
  OtherPartyAnalysis,
  CrossVerifiedAnalysis,
} from "../types";

const SCALE = [0, 25, 50, 75, 100];

// ─── Arbitraries ───
const directionArb = fc.constantFrom<ImpactDirection>(
  "front", "rear", "side-left", "side-right", "unknown"
);
const zoneArb = fc.constantFrom<ImpactZone>(
  "front", "front-left", "front-right", "rear", "rear-left", "rear-right",
  "side-left", "side-right", "unknown"
);

const gyroArb: fc.Arbitrary<GyroscopeSnapshot | null> = fc.option(
  fc.record({
    peakRotationRate: fc.double({ min: 0, max: 300, noNaN: true }),
    spinDetected: fc.boolean(),
    dominantAxis: fc.constantFrom("yaw", "pitch", "roll", "none") as fc.Arbitrary<
      GyroscopeSnapshot["dominantAxis"]
    >,
    yawRate: fc.double({ min: 0, max: 300, noNaN: true }),
    pitchRate: fc.double({ min: 0, max: 300, noNaN: true }),
    rollRate: fc.double({ min: 0, max: 300, noNaN: true }),
    rolloverDetected: fc.boolean(),
  }),
  { nil: null }
);

const brakingArb: fc.Arbitrary<BrakingAnalysis | null> = fc.option(
  fc.record({
    brakingDetected: fc.boolean(),
    brakingDurationSec: fc.double({ min: 0, max: 5, noNaN: true }),
    decelerationG: fc.double({ min: 0, max: 2, noNaN: true }),
    speedBeforeBraking: fc.double({ min: 0, max: 200, noNaN: true }),
  }),
  { nil: null }
);

const roadTypeArb = fc.constantFrom(
  "roundabout", "intersection", "highway", "urban", "unknown"
) as fc.Arbitrary<AdvancedAnalysisResult["roadContext"]["roadType"]>;

const advancedArb: fc.Arbitrary<AdvancedAnalysisResult | null> = fc.option(
  fc.record({
    roadType: roadTypeArb,
    hasPriority: fc.boolean(),
    wasStationary: fc.boolean(),
    totalAdjustment: fc.integer({ min: -50, max: 50 }),
  }).map((r): AdvancedAnalysisResult => ({
    angularStability: { hadSuddenYaw: false, wasEvasive: false, maxYawRatePreCrash: 0, score: 0 },
    multiVector: { lateralG: 0, longitudinalG: 0, rearPushRatio: 0, score: 0 },
    roadContext: {
      roadType: r.roadType, hasPriority: r.hasPriority, wasStationary: r.wasStationary,
      confirmedByGyro: false, score: 0,
    },
    microKinematic: { scrapeDetected: false, highFreqVariance: 0, jerkGyroSync: false, vibrationDurationMs: 0, score: 0 },
    preCrashEvents: { hardBraking: false, hardAcceleration: false, steadyDriving: false, evasiveManeuver: false, score: 0 },
    postImpact: { driftDirection: "none", driftAngleDeg: 0, driftMagnitudeG: 0, stabilizationTimeMs: 0, secondaryImpacts: 0, postImpactRotation: false, postImpactYawRate: 0, vehicleStoppedImmediately: false, postCrashDecelG: 0, directionConfirmed: false, score: 0, factorsAr: [] },
    totalAdjustment: r.totalAdjustment,
    discoveredFactorsAr: [],
  })),
  { nil: null }
);

const otherPartyArb: fc.Arbitrary<OtherPartyAnalysis | null> = fc.option(
  fc.record({
    approachAngleDeg: fc.integer({ min: 0, max: 360 }),
    estimatedSpeedKmh: fc.integer({ min: 0, max: 200 }),
    impactForce: fc.constantFrom("light", "moderate", "heavy", "severe") as fc.Arbitrary<OtherPartyAnalysis["impactForce"]>,
    vehicleType: fc.constantFrom("light", "medium", "heavy") as fc.Arbitrary<OtherPartyAnalysis["vehicleType"]>,
    wasAccelerating: fc.boolean(),
    wasBraking: fc.boolean(),
    confidencePercent: fc.integer({ min: 0, max: 100 }),
    descriptionAr: fc.constant(""),
  }),
  { nil: null }
);

const crossVerifiedArb: fc.Arbitrary<CrossVerifiedAnalysis | null> = fc.option(
  fc.record({
    consistency_status: fc.constantFrom("VERIFIED", "INCONSISTENT", "PARTIAL") as fc.Arbitrary<CrossVerifiedAnalysis["consistency_status"]>,
    liability_a_percent: fc.integer({ min: 0, max: 100 }),
  }).map((r): CrossVerifiedAnalysis => ({
    id: "x", accident_a_id: "a", accident_b_id: "b",
    verified_impact_zone_a: "unknown", verified_impact_zone_b: "unknown",
    verified_speed_a_kmh: 0, verified_speed_b_kmh: 0,
    first_contact_party: "UNKNOWN",
    consistency_status: r.consistency_status,
    consistency_flags: [],
    liability_a_percent: r.liability_a_percent,
    liability_b_percent: 100 - r.liability_a_percent,
    created_at: 0,
  })),
  { nil: null }
);

// Full input tuple arbitrary
const inputArb = fc.tuple(
  directionArb,
  fc.double({ min: 0, max: 16, noNaN: true }),   // peakGForce
  fc.double({ min: 0, max: 250, noNaN: true }),  // speedKmh
  fc.double({ min: 0, max: 40, noNaN: true }),   // jerkPeak
  brakingArb,
  gyroArb,
  fc.integer({ min: 1, max: 5 }),                // impactCount
  fc.double({ min: 0, max: 1, noNaN: true }),    // baselineG
  zoneArb,
  advancedArb,
  fc.boolean(),                                  // directionCalibrated
  otherPartyArb,
  crossVerifiedArb
);

const call = (t: ReturnType<typeof inputArb["generate"]> extends never ? never : any[]) =>
  (calculateLiability as any)(...t);

describe("Liability Engine — Property-Based Invariants", () => {
  // Feature: liability-engine-enhancement, Property 1: Legal-Scale Invariant
  it("P1 — userFaultPercent ∈ {0,25,50,75,100} and sums to 100", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const r = call(t);
        expect(SCALE).toContain(r.userFaultPercent);
        expect(r.userFaultPercent + r.otherFaultPercent).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 2: Bounds & Finiteness
  it("P2 — rawFaultPercent & score in [0,100]; all numeric outputs finite", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const r = call(t);
        expect(Number.isInteger(r.rawFaultPercent)).toBe(true);
        expect(r.rawFaultPercent).toBeGreaterThanOrEqual(0);
        expect(r.rawFaultPercent).toBeLessThanOrEqual(100);
        expect(r.confidenceDetails.score).toBeGreaterThanOrEqual(0);
        expect(r.confidenceDetails.score).toBeLessThanOrEqual(100);
        for (const n of [r.userFaultPercent, r.otherFaultPercent, r.rawFaultPercent, r.faultRange[0], r.faultRange[1], r.confidenceDetails.score]) {
          expect(Number.isFinite(n)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 3: Determinism
  it("P3 — identical inputs yield identical results", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const a = call(t);
        const b = call(t);
        expect(a.userFaultPercent).toBe(b.userFaultPercent);
        expect(a.otherFaultPercent).toBe(b.otherFaultPercent);
        expect(a.rawFaultPercent).toBe(b.rawFaultPercent);
        expect(a.confidence).toBe(b.confidence);
        expect(a.severity).toBe(b.severity);
        expect(a.scenarioCode).toBe(b.scenarioCode);
        expect(a.isConclusive).toBe(b.isConclusive);
        expect(a.faultRange).toEqual(b.faultRange);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 4: Purity / No Mutation
  it("P4 — does not mutate its object inputs (incl. otherParty/crossVerified)", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const snapshot = JSON.stringify([t[4], t[5], t[9], t[11], t[12]]);
        call(t);
        expect(JSON.stringify([t[4], t[5], t[9], t[11], t[12]])).toBe(snapshot);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 5: Honesty — Unknown / conclusive gating
  it("P5 — unknown direction is never conclusive; conclusive ⇒ high+known+calibrated", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const r = call(t);
        if (t[0] === "unknown") expect(r.isConclusive).toBe(false);
        if (r.isConclusive) {
          expect(r.confidence).toBe("high");
          expect(t[0]).not.toBe("unknown");
          expect(t[10]).toBe(true); // directionCalibrated
        }
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 6: Honesty — Uncalibrated
  it("P6 — directionCalibrated=false ⇒ confidence never 'high'", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const t2 = [...t];
        t2[10] = false;
        const r = call(t2);
        expect(r.confidence).not.toBe("high");
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 7: Range Consistency
  it("P7 — faultRange[0] ≤ user ≤ faultRange[1]; conclusive ⇒ point range", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const r = call(t);
        expect(r.faultRange[0]).toBeLessThanOrEqual(r.faultRange[1]);
        expect(SCALE).toContain(r.faultRange[0]);
        expect(SCALE).toContain(r.faultRange[1]);
        expect(r.faultRange[0]).toBeLessThanOrEqual(r.userFaultPercent);
        expect(r.faultRange[1]).toBeGreaterThanOrEqual(r.userFaultPercent);
        if (r.isConclusive) {
          expect(r.faultRange).toEqual([r.userFaultPercent, r.userFaultPercent]);
        }
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 9: Rear-Stationary Safety
  it("P9 — rear impact while stationary ⇒ user ≤ 25; any stationary ⇒ ≤ 50", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ImpactDirection>("rear", "front", "side-left", "side-right"),
        fc.double({ min: 0, max: 16, noNaN: true }),
        fc.double({ min: 0, max: 4.99, noNaN: true }), // speed < STATIONARY_SPEED (5)
        fc.double({ min: 0, max: 40, noNaN: true }),
        advancedArb,
        (dir, g, speed, jerk, adv) => {
          const r = calculateLiability(dir, g, speed, jerk, null, null, 1, 0, dir as ImpactZone, adv, true);
          expect(r.userFaultPercent).toBeLessThanOrEqual(50);
          if (dir === "rear") expect(r.userFaultPercent).toBeLessThanOrEqual(25);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 11: Scenario Structural Completeness
  it("P11 — non-empty scenarioCode/scenarioAr/plainSummaryAr and factorsAr list", () => {
    fc.assert(
      fc.property(inputArb, (t) => {
        const r = call(t);
        expect(typeof r.scenarioCode).toBe("string");
        expect(r.scenarioCode.length).toBeGreaterThan(0);
        expect(r.scenarioAr.length).toBeGreaterThan(0);
        expect(r.plainSummaryAr.length).toBeGreaterThan(0);
        expect(Array.isArray(r.factorsAr)).toBe(true);
        expect(r.factorsAr.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 12: Absent-Signal Handling
  it("P12 — null optional signals still yield valid, finite results", () => {
    fc.assert(
      fc.property(
        directionArb,
        fc.double({ min: 0, max: 16, noNaN: true }),
        fc.double({ min: 0, max: 250, noNaN: true }),
        zoneArb,
        (dir, g, speed, zone) => {
          const r = calculateLiability(dir, g, speed, 0, null, null, 1, 0, zone, null, true, null, null);
          expect(SCALE).toContain(r.userFaultPercent);
          expect(Number.isFinite(r.rawFaultPercent)).toBe(true);
          expect(r.faultRange[0]).toBeLessThanOrEqual(r.faultRange[1]);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 8: Confidence Monotonicity in G
  it("P8 — increasing peakGForce never decreases the confidence score", () => {
    fc.assert(
      fc.property(
        directionArb,
        fc.double({ min: 0, max: 250, noNaN: true }),
        fc.double({ min: 0, max: 40, noNaN: true }),
        gyroArb,
        zoneArb,
        fc.boolean(),
        fc.double({ min: 0, max: 8, noNaN: true }),  // base g
        fc.double({ min: 0, max: 8, noNaN: true }),  // extra g (>= 0)
        (dir, speed, jerk, gyro, zone, calib, gLow, gExtra) => {
          const r1 = calculateLiability(dir, gLow, speed, jerk, null, gyro, 1, 0, zone, null, calib);
          const r2 = calculateLiability(dir, gLow + gExtra, speed, jerk, null, gyro, 1, 0, zone, null, calib);
          expect(r2.confidenceDetails.score).toBeGreaterThanOrEqual(r1.confidenceDetails.score);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Feature: liability-engine-enhancement, Property 10: Self-Maneuver Monotonicity
  it("P10 — confirmed self-maneuver raw fault ≥ ambiguous raw fault (side impact)", () => {
    const quiet: GyroscopeSnapshot = {
      peakRotationRate: 0, spinDetected: false, dominantAxis: "none",
      yawRate: 0, pitchRate: 0, rollRate: 0, rolloverDetected: false,
    };
    fc.assert(
      fc.property(
        fc.constantFrom<ImpactDirection>("side-left", "side-right"),
        fc.double({ min: 10, max: 39, noNaN: true }), // ambiguous side band, above merge speed
        fc.double({ min: 1, max: 3, noNaN: true }),
        (dir, speed, g) => {
          const zone = dir as ImpactZone;
          const maneuver: GyroscopeSnapshot = { ...quiet, dominantAxis: "yaw", yawRate: 50, peakRotationRate: 50 };
          const ambiguous = calculateLiability(dir, g, speed, 15, null, quiet, 1, 0, zone, null, true);
          const confirmed = calculateLiability(dir, g, speed, 15, null, maneuver, 1, 0, zone, null, true);
          expect(confirmed.rawFaultPercent).toBeGreaterThanOrEqual(ambiguous.rawFaultPercent);
        }
      ),
      { numRuns: 150 }
    );
  });
});
