import {
  applyHighPassFilter,
  calculateGForce,
  getJerkPeak,
  getRingBuffer,
  getTimingQuality,
  recordSample,
  resetFilter,
  setSampleRate,
  updateCurrentSpeed,
} from "../sensorUtils";

describe("sensor timing safety", () => {
  beforeEach(() => {
    resetFilter();
    setSampleRate(50);
  });

  it("sanitizes non-finite sensor values", () => {
    const filtered = applyHighPassFilter({ x: Number.NaN, y: Number.POSITIVE_INFINITY, z: 0 }, 1000);
    const magnitude = calculateGForce(filtered.x, filtered.y, filtered.z);
    recordSample(Number.NaN, filtered, { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: 0 }, 1000);

    expect(Number.isFinite(magnitude)).toBe(true);
    expect(getRingBuffer().every((sample) => Number.isFinite(sample.gForce))).toBe(true);
    expect(Number.isFinite(getJerkPeak())).toBe(true);
  });

  it("handles duplicate, reversed and non-finite timestamps", () => {
    recordSample(0.1, { x: 0.1, y: 0, z: 0 }, { x: 0.1, y: -1, z: 0 }, 1000);
    recordSample(0.2, { x: 0.2, y: 0, z: 0 }, { x: 0.2, y: -1, z: 0 }, 1000);
    recordSample(0.3, { x: 0.3, y: 0, z: 0 }, { x: 0.3, y: -1, z: 0 }, 900);
    recordSample(0.4, { x: 0.4, y: 0, z: 0 }, { x: 0.4, y: -1, z: 0 }, Number.NaN);

    const timestamps = getRingBuffer().map((sample) => sample.ts);
    expect(timestamps.every((timestamp, index) => index === 0 || timestamp > timestamps[index - 1])).toBe(true);
    expect(getTimingQuality().duplicateCount).toBe(2);
    expect(getTimingQuality().outOfOrderCount).toBe(1);
    expect(Number.isFinite(getJerkPeak())).toBe(true);
  });

  it("falls back safely for invalid rate and speed", () => {
    setSampleRate(Number.NaN);
    updateCurrentSpeed(Number.NaN);
    recordSample(0, { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, 0);
    expect(getTimingQuality().configuredRateHz).toBe(50);
  });
});
