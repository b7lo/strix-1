import { extractImpactFeatures, type DatasetReplayRecord, type ImpactFeatureRow } from "../../ml/extract-features";
import { assertNoGroupLeakage, splitDataset } from "../../ml/split-dataset";
import type { SensorReplayV1 } from "../replay/types";

const frontImpact = require("../__fixtures__/replay/front-impact.json") as SensorReplayV1;

const record: DatasetReplayRecord = {
  replayId: "front-impact-1",
  groupId: "opaque-group-a",
  label: "crash",
  labelVerified: true,
  phonePlacement: "mount",
  vehicleClass: "sedan",
  replay: frontImpact,
};

describe("ML dataset pipeline", () => {
  it("extracts finite features without reading samples after the terminal decision", () => {
    const features = extractImpactFeatures(record);
    expect(features.durationMs).toBe(20);
    expect(features.peakG).toBe(3.2);
    expect(features.peakJerk).toBeGreaterThan(0);
    expect(features.sampleRateHz).toBe(50);
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      expect(["latitude", "longitude", "email", "phone", "phoneNumber"]).not.toContain(key);
    }
  });

  it("keeps repeated group rows in one deterministic partition", () => {
    const base = extractImpactFeatures(record);
    const rows: ImpactFeatureRow[] = Array.from({ length: 30 }, (_, index) => ({
      ...base,
      replayId: `replay-${index}`,
      groupId: `group-${Math.floor(index / 2)}`,
    }));
    const first = splitDataset(rows, "fixed-seed");
    const second = splitDataset(rows, "fixed-seed");
    assertNoGroupLeakage(first);
    expect(first).toEqual(second);

    for (const groupId of new Set(rows.map((row) => row.groupId))) {
      const partitions = (["train", "validation", "test"] as const)
        .filter((partition) => first[partition].some((row) => row.groupId === groupId));
      expect(partitions).toHaveLength(1);
    }
  });
});
