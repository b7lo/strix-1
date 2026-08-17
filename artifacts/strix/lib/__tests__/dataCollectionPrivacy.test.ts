import { prepareReplayUpload } from "../dataCollection/submission";
import type { SensorReplayV1 } from "../replay/types";

const calibration = require("../__fixtures__/replay/calibration.json") as SensorReplayV1;

describe("research replay preparation", () => {
  it("removes exact location and absolute time before upload", () => {
    const prepared = prepareReplayUpload(calibration, {
      label: "pothole",
      phonePlacement: "mount",
      vehicleClass: "sedan",
      labelConfidence: 92,
    });
    const exported = JSON.parse(prepared.json) as SensorReplayV1;
    const locations = exported.samples.filter((sample) => sample.kind === "location");

    expect(exported.startedAtMs).toBe(0);
    expect(exported.sessionId).toMatch(/^anonymous-/);
    expect(locations.length).toBeGreaterThan(0);
    expect(locations.every((sample) => sample.kind === "location" && sample.latitude === null && sample.longitude === null)).toBe(true);
    expect(prepared.metadata.contains_exact_location).toBe(false);
    expect(prepared.metadata.event_label).toBe("pothole");
    expect(prepared.metadata.label_confidence).toBe(92);
  });

  it("clamps label confidence and records bounded metadata", () => {
    const prepared = prepareReplayUpload(calibration, {
      label: "normal_driving",
      phonePlacement: "unknown",
      vehicleClass: "unknown",
      labelConfidence: 500,
    });

    expect(prepared.metadata.label_confidence).toBe(100);
    expect(prepared.metadata.sample_count).toBe(calibration.samples.length);
    expect(prepared.metadata.metadata.sampleKinds.location).toBeGreaterThan(0);
  });
});
