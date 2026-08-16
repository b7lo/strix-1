import { THRESHOLDS } from "../thresholds";
import type { TimingQuality } from "../timing";
import { clampConfidence, confidenceLevel, type ConfidenceReason, type DataQualityConfidence } from "./types";

export type DataQualityLevel = "high" | "medium" | "low";

export interface DataQualityInput {
  engineReady: boolean;
  sampleRateHz: number;
  timingQuality?: TimingQuality;
  gyroscopeEnabled: boolean;
  hasGps: boolean;
  directionCalibrated: boolean;
  directionConfidence?: number;
  roadType: "smooth" | "normal" | "rough";
  peakGForce: number;
  accelerometerSaturated?: boolean;
}

export interface DataQualityResult extends DataQualityConfidence {
  factors: string[];
  accelLikelySaturated: boolean;
}

export function assessDataQuality(input: DataQualityInput): DataQualityResult {
  const reasons: ConfidenceReason[] = [];
  const factors: string[] = [];
  const limitations: string[] = [];
  let score = 0;
  const increase = (code: string, weight: number) => {
    score += weight;
    factors.push(code);
    reasons.push({ code, effect: "increase", weight });
  };
  const limit = (code: string, weight = 0) => {
    limitations.push(code);
    reasons.push({ code, effect: "limit", weight });
  };
  const decrease = (code: string, weight: number) => {
    score -= weight;
    limitations.push(code);
    reasons.push({ code, effect: "decrease", weight: -weight });
  };

  if (input.engineReady) increase("dq.engineReady", 20);
  else limit("dq.engineNotReady");

  if (input.sampleRateHz >= THRESHOLDS.DQ_GOOD_SAMPLE_RATE_HZ) increase("dq.sampleRateGood", 15);
  else if (input.sampleRateHz >= THRESHOLDS.DQ_LOW_SAMPLE_RATE_HZ) score += 8;
  else limit("dq.sampleRateLow");

  if (input.timingQuality) {
    const timing = input.timingQuality;
    if (timing.gapCount > 0) decrease("dq.sampleGaps", Math.min(10, timing.gapCount * 2));
    if (timing.jitterMs > Math.max(5, timing.medianIntervalMs * 0.5)) decrease("dq.sampleJitter", 5);
    if (timing.duplicateCount > 0 || timing.outOfOrderCount > 0) decrease("dq.sampleOrdering", 5);
  }

  if (input.hasGps) increase("dq.gpsAvailable", 20);
  else limit("dq.gpsMissing");

  if (input.directionCalibrated) {
    // Preserve the established 25-point data-quality contribution. The
    // calibration percentage is evaluated independently by DirectionConfidence.
    increase("dq.directionCalibrated", 25);
  } else limit("dq.directionUncalibrated");

  if (input.gyroscopeEnabled) increase("dq.gyroAvailable", 10);
  else limit("dq.gyroDisabled");

  if (input.roadType === "smooth") increase("dq.roadSmooth", 10);
  else if (input.roadType === "normal") score += 7;
  else {
    score += 2;
    limit("dq.roadRough");
  }

  const accelerometerSaturated = input.accelerometerSaturated === true
    || input.peakGForce >= THRESHOLDS.DQ_ACCEL_SATURATION_G;
  if (accelerometerSaturated) limit("dq.accelSaturated");

  score = clampConfidence(score);
  let level = confidenceLevel(score);
  if (!input.directionCalibrated && level === "high") level = "medium";
  const minimumPeakG = accelerometerSaturated && Number.isFinite(input.peakGForce)
    ? Math.max(0, input.peakGForce)
    : null;

  return {
    kind: "data-quality",
    score,
    level,
    reasons,
    factors,
    limitations,
    accelLikelySaturated: accelerometerSaturated,
    accelerometerSaturated,
    peakGIsLowerBound: accelerometerSaturated,
    minimumPeakG,
  };
}
