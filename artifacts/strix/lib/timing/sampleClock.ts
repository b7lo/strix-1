import type { SampleClockOptions, SampleTiming } from "./types";

export class SampleClock {
  private lastTimestampMs: number | null = null;
  private lastSourceTimestampMs: number | null = null;
  private fallbackIntervalMs: number;
  private maxGapMs: number;

  constructor(options: SampleClockOptions) {
    this.fallbackIntervalMs = 1000 / Math.max(1, options.fallbackRateHz);
    this.maxGapMs = options.maxGapMs ?? Math.max(200, this.fallbackIntervalMs * 3);
  }

  configure(fallbackRateHz: number): void {
    this.fallbackIntervalMs = 1000 / Math.max(1, fallbackRateHz);
    this.maxGapMs = Math.max(200, this.fallbackIntervalMs * 3);
  }

  observe(sourceTimestampMs: number): SampleTiming {
    const sourceIsFinite = Number.isFinite(sourceTimestampMs);
    const finiteTimestamp = sourceIsFinite
      ? sourceTimestampMs
      : (this.lastTimestampMs ?? 0) + this.fallbackIntervalMs;

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = finiteTimestamp;
      this.lastSourceTimestampMs = finiteTimestamp;
      return {
        sourceTimestampMs,
        timestampMs: finiteTimestamp,
        dtMs: this.fallbackIntervalMs,
        dtSec: this.fallbackIntervalMs / 1000,
        issue: "none",
      };
    }

    if (!sourceIsFinite) {
      const timestampMs = this.lastTimestampMs + this.fallbackIntervalMs;
      this.lastTimestampMs = timestampMs;
      return {
        sourceTimestampMs,
        timestampMs,
        dtMs: this.fallbackIntervalMs,
        dtSec: this.fallbackIntervalMs / 1000,
        issue: "duplicate",
      };
    }

    const rawDt = finiteTimestamp - (this.lastSourceTimestampMs ?? finiteTimestamp);
    let issue: SampleTiming["issue"] = "none";
    let dtMs = rawDt;
    let timestampMs = this.lastTimestampMs + rawDt;

    if (rawDt === 0) {
      issue = "duplicate";
      dtMs = this.fallbackIntervalMs;
      timestampMs = this.lastTimestampMs + dtMs;
    } else if (rawDt < 0) {
      issue = "out-of-order";
      dtMs = this.fallbackIntervalMs;
      timestampMs = this.lastTimestampMs + dtMs;
    } else if (rawDt > this.maxGapMs) {
      issue = "gap";
    }

    if (issue === "none" || issue === "gap") this.lastSourceTimestampMs = finiteTimestamp;
    this.lastTimestampMs = timestampMs;
    return { sourceTimestampMs, timestampMs, dtMs, dtSec: dtMs / 1000, issue };
  }

  reset(): void {
    this.lastTimestampMs = null;
    this.lastSourceTimestampMs = null;
  }
}
