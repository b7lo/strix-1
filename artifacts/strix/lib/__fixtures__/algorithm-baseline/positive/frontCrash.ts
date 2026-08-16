import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const frontCrashFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-front-crash-50hz",
  label: "positive",
  scenario: "front-impact",
  durationMs: 8_000,
  sampleRateHz: 50,
  speedKmh: 45,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: true,
  expectedZone: "front",
  samples: [
    { atMs: 0, gForce: 3.2, filtered: { x: 0, y: 0, z: -3.2 } },
    { atMs: 20, gForce: 2.8, filtered: { x: 0.05, y: 0, z: -2.8 } },
    { atMs: 40, gForce: 0.5, filtered: { x: 0, y: 0, z: -0.5 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "smooth",
    notes: "Deterministic front-impact pulse for baseline regression only.",
  },
};
