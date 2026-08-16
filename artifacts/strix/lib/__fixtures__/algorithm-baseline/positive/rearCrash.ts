import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const rearCrashFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-rear-crash-50hz",
  label: "positive",
  scenario: "rear-impact",
  durationMs: 8_000,
  sampleRateHz: 50,
  speedKmh: 10,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: true,
  expectedZone: "rear",
  samples: [
    { atMs: 0, gForce: 3.1, filtered: { x: 0, y: 0, z: 3.1 } },
    { atMs: 20, gForce: 2.7, filtered: { x: -0.05, y: 0, z: 2.7 } },
    { atMs: 40, gForce: 0.4, filtered: { x: 0, y: 0, z: 0.4 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "smooth",
    notes: "Deterministic rear-impact pulse for baseline regression only.",
  },
};
