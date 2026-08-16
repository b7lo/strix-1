import type { SampleTiming, TimingQuality } from "./types";

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export class SampleRateEstimator {
  private readonly intervalsMs: number[] = [];
  private gapCount = 0;
  private duplicateCount = 0;
  private outOfOrderCount = 0;
  private sampleCount = 0;

  constructor(
    private configuredRateHz: number,
    private readonly windowSize = 101,
  ) {}

  configure(rateHz: number): void {
    this.configuredRateHz = Math.max(1, rateHz);
  }

  add(timing: SampleTiming): void {
    this.sampleCount++;
    if (timing.issue === "gap") this.gapCount++;
    if (timing.issue === "duplicate") this.duplicateCount++;
    if (timing.issue === "out-of-order") this.outOfOrderCount++;

    if (timing.issue === "none" && timing.dtMs > 0) {
      this.intervalsMs.push(timing.dtMs);
      if (this.intervalsMs.length > this.windowSize) this.intervalsMs.shift();
    }
  }

  getQuality(): TimingQuality {
    const medianIntervalMs = median(this.intervalsMs) || 1000 / this.configuredRateHz;
    const deviations = this.intervalsMs.map((value) => Math.abs(value - medianIntervalMs));
    const jitterMs = median(deviations);
    return {
      configuredRateHz: this.configuredRateHz,
      measuredRateHz: medianIntervalMs > 0 ? 1000 / medianIntervalMs : this.configuredRateHz,
      medianIntervalMs,
      jitterMs,
      gapCount: this.gapCount,
      duplicateCount: this.duplicateCount,
      outOfOrderCount: this.outOfOrderCount,
      sampleCount: this.sampleCount,
    };
  }

  reset(): void {
    this.intervalsMs.length = 0;
    this.gapCount = 0;
    this.duplicateCount = 0;
    this.outOfOrderCount = 0;
    this.sampleCount = 0;
  }
}
