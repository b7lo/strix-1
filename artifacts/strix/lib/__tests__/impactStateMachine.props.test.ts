import fc from "fast-check";
import { ImpactStateMachine } from "../impact/impactStateMachine";
import type { ImpactObservation } from "../impact/types";

function observation(atMs: number, magnitudeG: number): ImpactObservation {
  return {
    impact: {
      timestampMs: atMs,
      dtSec: 0.02,
      raw: { x: magnitudeG, y: -1, z: 0 },
      gravity: { x: 0, y: -1, z: 0 },
      linearAcceleration: { x: magnitudeG, y: 0, z: 0 },
      magnitudeG,
      accelerometerSaturated: false,
      minimumPeakG: null,
    },
    motion: {
      timestampMs: atMs,
      dtSec: 0.02,
      linearAcceleration: { x: magnitudeG, y: 0, z: 0 },
      magnitudeG,
    },
    thresholdG: 1.5,
    engineReady: true,
    speedKmh: 40,
    gyroPeakDegS: 20,
    gyroValidationPassed: true,
    dataQualityScore: 90,
  };
}

describe("ImpactStateMachine properties", () => {
  it("never confirms the same incident twice", () => {
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0, max: 8, noNaN: true, noDefaultInfinity: true }), {
        minLength: 1,
        maxLength: 100,
      }),
      (magnitudes) => {
        const machine = new ImpactStateMachine({ postImpactWindowMs: 10_000 });
        const confirmations = magnitudes.flatMap((magnitude, index) =>
          machine.process(observation(index * 20, magnitude)),
        ).filter((transition) => transition.decision === "confirmed");

        expect(confirmations.length).toBeLessThanOrEqual(1);
        expect(new Set(confirmations.map((transition) => transition.incidentId)).size)
          .toBe(confirmations.length);
      },
    ));
  });
});
