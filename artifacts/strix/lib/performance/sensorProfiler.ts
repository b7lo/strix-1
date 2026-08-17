export interface SensorPerformanceSnapshot {
  sampleCount: number;
  retainedSamples: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  capacity: number;
}

/** Bounded profiler: recording is O(1); sorting occurs only when taking a report. */
export class SensorProfiler {
  private readonly durations: Float64Array;
  private writeIndex = 0;
  private retained = 0;
  private total = 0;

  constructor(
    readonly capacity = 2048,
    private readonly now: () => number = () => globalThis.performance?.now?.() ?? Date.now(),
  ) {
    this.durations = new Float64Array(Math.max(16, Math.trunc(capacity)));
  }

  start(): number {
    return this.now();
  }

  end(startedAt: number): number {
    const duration = Math.max(0, this.now() - startedAt);
    this.record(duration);
    return duration;
  }

  record(durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    this.durations[this.writeIndex] = durationMs;
    this.writeIndex = (this.writeIndex + 1) % this.durations.length;
    this.retained = Math.min(this.retained + 1, this.durations.length);
    this.total += 1;
  }

  snapshot(): SensorPerformanceSnapshot {
    const values = new Array<number>(this.retained);
    const start = this.retained === this.durations.length ? this.writeIndex : 0;
    for (let index = 0; index < this.retained; index++) {
      values[index] = this.durations[(start + index) % this.durations.length];
    }
    values.sort((a, b) => a - b);
    const percentile = (ratio: number): number => {
      if (values.length === 0) return 0;
      return values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];
    };
    return {
      sampleCount: this.total,
      retainedSamples: this.retained,
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      maxMs: values.at(-1) ?? 0,
      capacity: this.durations.length,
    };
  }

  reset(): void {
    this.writeIndex = 0;
    this.retained = 0;
    this.total = 0;
  }
}

export const sensorProfiler = new SensorProfiler();
