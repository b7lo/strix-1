import { resampleVectorSeries } from "../timing/resampler";

describe("resampleVectorSeries", () => {
  it("interpolates a continuous vector series onto a fixed grid", () => {
    const result = resampleVectorSeries([
      { tMs: 0, x: 0, y: 0, z: 0 },
      { tMs: 100, x: 10, y: 20, z: 30 },
    ], { targetRateHz: 20, maxInterpolationGapMs: 200 });

    expect(result).toEqual([
      { tMs: 0, x: 0, y: 0, z: 0 },
      { tMs: 50, x: 5, y: 10, z: 15 },
      { tMs: 100, x: 10, y: 20, z: 30 },
    ]);
  });

  it("does not invent samples across a large gap", () => {
    const result = resampleVectorSeries([
      { tMs: 0, x: 0, y: 0, z: 0 },
      { tMs: 1000, x: 10, y: 10, z: 10 },
    ], { targetRateHz: 50, maxInterpolationGapMs: 100 });

    expect(result).toEqual([{ tMs: 1000, x: 10, y: 10, z: 10 }]);
  });
});
