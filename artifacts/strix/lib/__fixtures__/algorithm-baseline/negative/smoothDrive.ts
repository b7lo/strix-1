import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const smoothDriveFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-smooth-drive-50hz",
  label: "negative",
  scenario: "smooth-driving",
  durationMs: 60_000,
  sampleRateHz: 50,
  speedKmh: 50,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: false,
  samples: [
    { atMs: 0, gForce: 0.08, filtered: { x: 0.02, y: 0, z: 0.07 } },
    { atMs: 20, gForce: 0.1, filtered: { x: -0.03, y: 0, z: 0.09 } },
    { atMs: 40, gForce: 0.06, filtered: { x: 0.01, y: 0, z: -0.05 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "smooth",
    notes: "Low-amplitude normal driving signal.",
  },
};
