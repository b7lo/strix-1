import { SensorPipeline } from "../sensorPipeline";
import { ImpactSignalProcessor } from "../signal/impactSignal";
import { MotionSignalProcessor } from "../signal/motionSignal";
import type { ImpactSignal } from "../signal/types";

function impactAt(x: number, timestampMs: number, dtSec: number): ImpactSignal {
  return {
    timestampMs,
    dtSec,
    raw: { x, y: -1, z: 0 },
    gravity: { x: 0, y: -1, z: 0 },
    linearAcceleration: { x, y: 0, z: 0 },
    magnitudeG: Math.abs(x),
    accelerometerSaturated: false,
    minimumPeakG: null,
  };
}

describe("dual signal paths", () => {
  it("preserves the fast raw-minus-gravity impact peak", () => {
    const processor = new ImpactSignalProcessor();
    processor.process({ x: 0, y: -1, z: 0 }, 0, 0.02);
    const impact = processor.process({ x: 6, y: -1, z: 0 }, 20, 0.02);

    expect(impact.linearAcceleration.x).toBeCloseTo(6, 2);
    expect(impact.magnitudeG).toBeGreaterThan(5.9);
  });

  it("marks clipped peaks as lower bounds", () => {
    const processor = new ImpactSignalProcessor({ saturationThresholdG: 15 });
    const impact = processor.process({ x: 15.5, y: -1, z: 0 }, 20, 0.02);

    expect(impact.accelerometerSaturated).toBe(true);
    expect(impact.minimumPeakG).toBe(impact.magnitudeG);
  });

  it("keeps the smooth motion path stable across sample rates", () => {
    const run = (rateHz: number) => {
      const processor = new MotionSignalProcessor({ timeConstantSec: 0.15 });
      processor.process(impactAt(0, 0, 1 / rateHz));
      let output = processor.process(impactAt(1, 1000 / rateHz, 1 / rateHz));
      for (let i = 2; i <= Math.round(rateHz * 0.2); i++) {
        output = processor.process(impactAt(1, i * 1000 / rateHz, 1 / rateHz));
      }
      return output.magnitudeG;
    };

    expect(run(25)).toBeCloseTo(run(100), 1);
  });

  it("emits both paths for live/replay accelerometer samples and resets deterministically", () => {
    const observed: Array<{ impact: number; motion: number }> = [];
    let latestImpact = 0;
    const pipeline = new SensorPipeline({
      onImpactSignal: (signal) => { latestImpact = signal.magnitudeG; },
      onMotionSignal: (signal) => observed.push({ impact: latestImpact, motion: signal.magnitudeG }),
    });
    const sample = {
      kind: "accelerometer" as const,
      tMs: 20,
      raw: { x: 3, y: -1, z: 0 },
      filtered: { x: 3, y: 0, z: 0 },
      gForce: 3,
    };

    pipeline.dispatch(sample);
    const first = observed.at(-1);
    pipeline.reset();
    pipeline.dispatch(sample);

    expect(observed.at(-1)).toEqual(first);
    expect(first?.impact).toBeGreaterThanOrEqual(first?.motion ?? Infinity);
  });
});
