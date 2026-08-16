import { SampleRateEstimator } from "../timing/rateEstimator";
import { SampleClock } from "../timing/sampleClock";

const fixtures = [20, 25, 50, 100].map((rate) =>
  require(`../__fixtures__/timing/${rate}hz.json`) as { rateHz: number; timestampsMs: number[] },
);
const gaps = require("../__fixtures__/timing/gaps.json") as { rateHz: number; timestampsMs: number[] };

describe("SampleClock and SampleRateEstimator", () => {
  it.each(fixtures)("measures $rateHz Hz from timestamps", (fixture) => {
    const clock = new SampleClock({ fallbackRateHz: fixture.rateHz });
    const estimator = new SampleRateEstimator(fixture.rateHz);
    fixture.timestampsMs.forEach((timestamp) => estimator.add(clock.observe(timestamp)));

    expect(estimator.getQuality().measuredRateHz).toBeCloseTo(fixture.rateHz, 5);
    expect(estimator.getQuality().jitterMs).toBe(0);
  });

  it("normalizes duplicate and out-of-order timestamps and reports gaps", () => {
    const clock = new SampleClock({ fallbackRateHz: gaps.rateHz });
    const estimator = new SampleRateEstimator(gaps.rateHz);
    const observed = gaps.timestampsMs.map((timestamp) => clock.observe(timestamp));
    observed.forEach((timing) => estimator.add(timing));

    expect(observed.every((timing, index) => index === 0 || timing.timestampMs > observed[index - 1].timestampMs)).toBe(true);
    expect(estimator.getQuality()).toMatchObject({
      duplicateCount: 1,
      outOfOrderCount: 1,
      gapCount: 1,
    });
  });
});
