import fc from "fast-check";
import { evaluateAlgorithm } from "../evaluation/runner";
import { createRateInvariantImpactFixture } from "../evaluation/rateInvariance";

describe("sample-rate invariance", () => {
  it("keeps strong-impact detection and zone stable from 20Hz to 100Hz", () => {
    fc.assert(fc.property(fc.integer({ min: 20, max: 100 }), (rateHz) => {
      const result = evaluateAlgorithm([createRateInvariantImpactFixture(rateHz)]);
      expect(result.predictions[0]).toMatchObject({ detectedCrash: true, predictedZone: "front" });
      expect(result.metrics.recall).toBe(1);
      expect(result.metrics.zoneAccuracy).toBe(1);
    }), { numRuns: 81 });
  });
});
