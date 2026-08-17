import fc from "fast-check";
import { calculateImpactZoneDistribution } from "../impact/zoneProbability";

const finite = fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true });

describe("zone probability properties", () => {
  it("always returns finite non-negative probabilities summing to one", () => {
    fc.assert(fc.property(finite, finite, fc.integer({ min: 0, max: 100 }), (x, y, confidence) => {
      const distribution = calculateImpactZoneDistribution(x, y, confidence);
      const values = Object.values(distribution.probabilities);
      expect(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
      expect(distribution.primaryZone).toBeDefined();
    }));
  });

  it("broadens the leading probability when calibration confidence falls", () => {
    const high = calculateImpactZoneDistribution(0, 1, 100);
    const low = calculateImpactZoneDistribution(0, 1, 10);
    expect(low.probabilities.front).toBeLessThan(high.probabilities.front);
    expect(low.probabilities.unknown).toBeGreaterThan(high.probabilities.unknown);
  });
});
