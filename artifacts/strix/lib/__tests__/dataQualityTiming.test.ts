import { assessDataQuality, type DataQualityInput } from "../dataQuality";

const base: DataQualityInput = {
  engineReady: true,
  sampleRateHz: 50,
  gyroscopeEnabled: true,
  hasGps: true,
  directionCalibrated: true,
  directionConfidence: 90,
  roadType: "smooth",
  peakGForce: 3,
};

describe("data quality timing penalties", () => {
  it("keeps clean timing at the original score", () => {
    const result = assessDataQuality({
      ...base,
      timingQuality: {
        configuredRateHz: 50,
        measuredRateHz: 50,
        medianIntervalMs: 20,
        jitterMs: 0,
        gapCount: 0,
        duplicateCount: 0,
        outOfOrderCount: 0,
        sampleCount: 250,
      },
    });
    expect(result.score).toBe(100);
    expect(result.limitations).not.toContain("dq.sampleGaps");
  });

  it("penalizes gaps, high jitter and invalid ordering", () => {
    const result = assessDataQuality({
      ...base,
      timingQuality: {
        configuredRateHz: 50,
        measuredRateHz: 42,
        medianIntervalMs: 24,
        jitterMs: 15,
        gapCount: 3,
        duplicateCount: 1,
        outOfOrderCount: 1,
        sampleCount: 250,
      },
    });
    expect(result.score).toBe(84);
    expect(result.limitations).toEqual(expect.arrayContaining([
      "dq.sampleGaps",
      "dq.sampleJitter",
      "dq.sampleOrdering",
    ]));
  });
});
