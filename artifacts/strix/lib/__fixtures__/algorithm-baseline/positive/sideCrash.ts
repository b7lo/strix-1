import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const sideCrashFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-side-right-crash-50hz",
  label: "positive",
  scenario: "side-right-impact",
  durationMs: 8_000,
  sampleRateHz: 50,
  speedKmh: 30,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: true,
  expectedZone: "side-right",
  samples: [
    { atMs: 0, gForce: 3.4, filtered: { x: -3.4, y: 0, z: 0 } },
    { atMs: 20, gForce: 2.9, filtered: { x: -2.9, y: 0, z: 0.05 } },
    { atMs: 40, gForce: 0.6, filtered: { x: -0.6, y: 0, z: 0 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "smooth",
    notes: "Deterministic right-side pulse for baseline regression only.",
  },
};
