import type { AlgorithmEvaluationFixture } from "../../../evaluation/types";

export const phoneDropFixture: AlgorithmEvaluationFixture = {
  id: "synthetic-phone-drop-50hz",
  label: "negative",
  scenario: "phone-drop",
  durationMs: 60_000,
  sampleRateHz: 50,
  speedKmh: 0,
  baseCrashThreshold: 1.5,
  gyroThreshold: 30,
  expectedCrash: false,
  samples: [
    {
      atMs: 0,
      gForce: 2.2,
      filtered: { x: 1.4, y: 0.8, z: 1.5 },
      gyro: { x: 3.2, y: 1.5, z: 2.8 },
    },
    { atMs: 20, gForce: 0.2, filtered: { x: 0.1, y: 0.1, z: 0.1 } },
  ],
  metadata: {
    source: "synthetic",
    deviceModel: "generic-synthetic",
    vehicleType: "stationary-vehicle",
    roadType: "smooth",
    notes: "Intentional hard negative expected to expose the current phone-drop false alarm.",
  },
};
