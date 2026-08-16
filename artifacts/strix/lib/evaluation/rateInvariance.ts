import { evaluateAlgorithm } from "./runner";
import type { AlgorithmEvaluationFixture } from "./types";

export function createRateInvariantImpactFixture(rateHz: number): AlgorithmEvaluationFixture {
  const dtMs = 1000 / rateHz;
  return {
    id: `rate-${rateHz}`,
    label: "positive",
    scenario: "front-impact-rate-invariance",
    durationMs: 6000,
    sampleRateHz: rateHz,
    speedKmh: 40,
    baseCrashThreshold: 1.5,
    gyroThreshold: 30,
    expectedCrash: true,
    expectedZone: "front",
    samples: [
      { atMs: 0, gForce: 3.2, filtered: { x: 0, y: 0, z: -3.2 } },
      { atMs: dtMs, gForce: 2.8, filtered: { x: 0, y: 0, z: -2.8 } },
      { atMs: dtMs * 2, gForce: 0.2, filtered: { x: 0, y: 0, z: -0.2 } },
    ],
    metadata: {
      source: "synthetic",
      deviceModel: "rate-invariance",
      vehicleType: "passenger-car",
      roadType: "smooth",
      notes: "Same physical front-impact pulse sampled at a generated rate.",
    },
  };
}

export function evaluateSampleRates(rates: readonly number[]) {
  const results = rates.map((rateHz) => {
    const result = evaluateAlgorithm([createRateInvariantImpactFixture(rateHz)]);
    return {
      rateHz,
      detectedCrash: result.predictions[0].detectedCrash,
      predictedZone: result.predictions[0].predictedZone,
      confidence: result.predictions[0].confidence,
    };
  });
  const first = results[0];
  return {
    schemaVersion: 1,
    rates: results,
    invariant: results.every((result) =>
      result.detectedCrash === first.detectedCrash &&
      result.predictedZone === first.predictedZone
    ),
  };
}
