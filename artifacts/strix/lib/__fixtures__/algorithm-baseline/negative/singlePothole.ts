import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const singlePotholeFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-single-pothole-50hz",
  label: "negative",
  scenario: "single-pothole",
  durationMs: 60_000,
  sampleRateHz: 50,
  speedKmh: 35,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: false,
  samples: [
    { atMs: 0, gForce: 1.8, filtered: { x: 0, y: -1.8, z: 0 } },
    { atMs: 20, gForce: 0.3, filtered: { x: 0, y: 0.3, z: 0 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "passenger-car",
    roadType: "normal",
    notes: "One vertical spike below the instant-crash gate.",
  },
};
