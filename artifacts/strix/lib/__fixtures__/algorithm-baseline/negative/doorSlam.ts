import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const doorSlamFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-door-slam-50hz",
  label: "negative",
  scenario: "door-slam-stationary",
  durationMs: 60_000,
  sampleRateHz: 50,
  speedKmh: 0,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: false,
  samples: [
    { atMs: 0, gForce: 2.2, filtered: { x: 2.2, y: 0, z: 0 } },
    { atMs: 20, gForce: 2.0, filtered: { x: 2.0, y: 0, z: 0 } },
    { atMs: 40, gForce: 0.1, filtered: { x: 0.1, y: 0, z: 0 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "stationary-vehicle",
    roadType: "smooth",
    notes: "Short low-force horizontal pulse at rest. The legacy two-sample debounce would confirm it.",
  },
};
