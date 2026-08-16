import { sensorReplayV1Schema } from "../replay/schema";
import type { SensorReplayV1 } from "../replay/types";

const frontImpact = require("../__fixtures__/replay/front-impact.json") as SensorReplayV1;

describe("SensorReplayV1 schema", () => {
  it("accepts a versioned, monotonic replay fixture", () => {
    const parsed = sensorReplayV1Schema.parse(frontImpact);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.samples).toHaveLength(4);
  });

  it("rejects unsupported schema versions", () => {
    expect(() => sensorReplayV1Schema.parse({ ...frontImpact, schemaVersion: 2 })).toThrow();
  });

  it("rejects samples ordered backwards", () => {
    const invalid = {
      ...frontImpact,
      samples: [
        { ...frontImpact.samples[0], tMs: 100 },
        { ...frontImpact.samples[1], tMs: 20 },
      ],
    };
    expect(() => sensorReplayV1Schema.parse(invalid)).toThrow("monotonic");
  });

  it("rejects non-finite sensor values", () => {
    const invalid = structuredClone(frontImpact);
    const accelerometer = invalid.samples.find((sample) => sample.kind === "accelerometer");
    if (accelerometer?.kind === "accelerometer") accelerometer.gForce = Number.NaN;
    expect(() => sensorReplayV1Schema.parse(invalid)).toThrow();
  });
});
