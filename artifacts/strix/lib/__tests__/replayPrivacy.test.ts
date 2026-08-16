import { exportReplayJson, importReplayJson } from "../replay/exporter";
import { sanitizeReplayForExport } from "../replay/privacy";
import type { SensorReplayV1 } from "../replay/types";

const calibration = require("../__fixtures__/replay/calibration.json") as SensorReplayV1;

describe("replay privacy", () => {
  it("removes exact location and absolute start time by default", () => {
    const safe = sanitizeReplayForExport(calibration);
    const location = safe.samples.find((sample) => sample.kind === "location");

    expect(safe.startedAtMs).toBe(0);
    expect(safe.sessionId).toMatch(/^anonymous-/);
    expect(location?.kind).toBe("location");
    if (location?.kind === "location") {
      expect(location.latitude).toBeNull();
      expect(location.longitude).toBeNull();
    }
  });

  it("rounds coordinates when explicitly included", () => {
    const safe = sanitizeReplayForExport(calibration, {
      includeLocation: true,
      coordinateDecimals: 2,
    });
    const location = safe.samples.find((sample) => sample.kind === "location");

    if (location?.kind !== "location") throw new Error("Missing location fixture");
    expect(location.latitude).toBe(24.71);
    expect(location.longitude).toBe(46.68);
  });

  it("exports schema-valid JSON without mutating the source", () => {
    const before = JSON.stringify(calibration);
    const exported = exportReplayJson(calibration);
    const imported = importReplayJson(exported);

    expect(JSON.stringify(calibration)).toBe(before);
    expect(imported.startedAtMs).toBe(0);
  });
});
