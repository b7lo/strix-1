import fc from "fast-check";
import { calculateLiability } from "../liabilityEngine";
import type { ImpactDirection, ImpactZone } from "../types";

const directions: ImpactDirection[] = ["front", "rear", "side-left", "side-right", "unknown"];

function zoneFor(direction: ImpactDirection): ImpactZone {
  return direction;
}

describe("liability rule invariants", () => {
  it("always produces a legal, complementary and explainable result", () => {
    fc.assert(fc.property(
      fc.constantFrom(...directions),
      fc.double({ min: 0, max: 20, noNaN: true }),
      fc.double({ min: 0, max: 220, noNaN: true }),
      (direction, g, speed) => {
        const result = calculateLiability(direction, g, speed, 10, null, null, 1, 0, zoneFor(direction), null, true);
        expect([0, 25, 50, 75, 100]).toContain(result.userFaultPercent);
        expect(result.userFaultPercent + result.otherFaultPercent).toBe(100);
        expect(result.ruleId.length).toBeGreaterThan(0);
        expect(result.evidence.length).toBeGreaterThan(0);
        if (result.confidenceModel.scenario.conflicting) expect(result.isConclusive).toBe(false);
      },
    ), { numRuns: 150 });
  });
});
