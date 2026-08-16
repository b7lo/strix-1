export type TimingIssue = "none" | "duplicate" | "out-of-order" | "gap";

export interface SampleTiming {
  sourceTimestampMs: number;
  timestampMs: number;
  dtMs: number;
  dtSec: number;
  issue: TimingIssue;
}

export interface TimingQuality {
  configuredRateHz: number;
  measuredRateHz: number;
  medianIntervalMs: number;
  jitterMs: number;
  gapCount: number;
  duplicateCount: number;
  outOfOrderCount: number;
  sampleCount: number;
}

export interface SampleClockOptions {
  fallbackRateHz: number;
  maxGapMs?: number;
}

export interface TimedVectorSample {
  tMs: number;
  x: number;
  y: number;
  z: number;
}
