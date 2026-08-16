import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const hardBrakingFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-hard-braking-50hz",
  label: "negative",
  scenario: "hard-braking",
  durationMs: 60_000,
  sampleRateHz: 50,
  speedKmh: 70,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: false,
  samples: Array.from({ length: 20 }, (_, index) => ({
    atMs: index * 20,
    gForce: 0.65,
    filtered: { x: 0, y: 0, z: 0.65 },
  })),
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "smooth",
    notes: "Sustained longitudinal deceleration below the crash threshold.",
  },
};
