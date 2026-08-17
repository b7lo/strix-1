import { calculateImpactZoneDistribution } from "../impact/zoneProbability";

describe("zone probability boundaries", () => {
  it("changes continuously around the front/front-right boundary", () => {
    const boundary = Math.PI / 8;
    const before = calculateImpactZoneDistribution(Math.sin(boundary - 0.001), Math.cos(boundary - 0.001), 100);
    const after = calculateImpactZoneDistribution(Math.sin(boundary + 0.001), Math.cos(boundary + 0.001), 100);

    expect(Math.abs(before.probabilities.front - after.probabilities.front)).toBeLessThan(0.01);
    expect(Math.abs(before.probabilities["front-right"] - after.probabilities["front-right"])).toBeLessThan(0.01);
    expect(new Set([before.primaryZone, after.primaryZone])).toEqual(new Set(["front", "front-right"]));
    expect(before.ambiguity).toBeGreaterThan(0.9);
    expect(after.ambiguity).toBeGreaterThan(0.9);
  });

  it("uses unknown for a negligible horizontal signal", () => {
    const distribution = calculateImpactZoneDistribution(0.001, -0.001, 100);
    expect(distribution.primaryZone).toBe("unknown");
    expect(distribution.probabilities.unknown).toBe(1);
  });
});
