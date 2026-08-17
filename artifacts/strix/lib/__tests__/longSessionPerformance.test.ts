import { SensorProfiler } from "../performance/sensorProfiler";
import {
  getDiagnostics,
  recordSample,
  resetFilter,
  setSampleRate,
} from "../sensorUtils";

describe("long-session bounded performance", () => {
  beforeEach(() => {
    resetFilter();
    setSampleRate(100);
  });

  it("keeps sensor and profiler memory bounded across a logical long session", () => {
    const profiler = new SensorProfiler(128, () => 0);
    const totalSamples = 50_000;
    for (let index = 0; index < totalSamples; index++) {
      const timestamp = 1_000 + index * 10;
      const filtered = { x: 0.01, y: 0.02, z: 0.01 };
      recordSample(0.025, filtered, { x: 0.01, y: -0.98, z: 0.01 }, timestamp);
      profiler.record((index % 10) / 100);
    }

    const diagnostics = getDiagnostics();
    const performance = profiler.snapshot();
    expect(diagnostics.currentBufferLength).toBeLessThanOrEqual(1000);
    expect(performance.sampleCount).toBe(totalSamples);
    expect(performance.retainedSamples).toBe(128);
    expect(performance.capacity).toBe(128);
  });

  it("calculates deterministic P50/P95 without retaining every sample", () => {
    const profiler = new SensorProfiler(100);
    for (let duration = 1; duration <= 100; duration++) profiler.record(duration);
    const snapshot = profiler.snapshot();
    expect(snapshot.p50Ms).toBe(50);
    expect(snapshot.p95Ms).toBe(95);
    expect(snapshot.maxMs).toBe(100);
  });
});
