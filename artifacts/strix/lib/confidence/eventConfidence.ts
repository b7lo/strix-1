import { clampConfidence, confidenceLevel, type ConfidenceReason, type EventConfidence } from "./types";

export interface EventConfidenceInput {
  decision: "confirmed" | "rejected" | "candidate";
  evidenceConfidence: number;
  peakToThresholdRatio: number;
  dataQualityScore: number;
  engineReady: boolean;
  accelerometerSaturated?: boolean;
}

export function calculateEventConfidence(input: EventConfidenceInput): EventConfidence {
  const reasons: ConfidenceReason[] = [];
  const limitations: string[] = [];
  let score = input.decision === "confirmed" ? input.evidenceConfidence : input.evidenceConfidence * 0.5;

  if (input.peakToThresholdRatio >= 2) {
    score += 8;
    reasons.push({ code: "event.strong-impact", effect: "increase", weight: 8 });
  } else if (input.peakToThresholdRatio < 1.1) {
    score -= 12;
    reasons.push({ code: "event.near-threshold", effect: "decrease", weight: -12 });
  }
  score = Math.min(score, input.dataQualityScore);
  if (input.dataQualityScore < 70) {
    limitations.push("event.data-quality-cap");
    reasons.push({ code: "event.data-quality-cap", effect: "limit", weight: input.dataQualityScore });
  }
  if (!input.engineReady) {
    score = Math.min(score, 20);
    limitations.push("event.engine-not-ready");
  }
  if (input.accelerometerSaturated) {
    limitations.push("event.accelerometer-saturated");
    reasons.push({ code: "event.accelerometer-saturated", effect: "limit", weight: 0 });
  }

  score = clampConfidence(score);
  return { kind: "event", decision: input.decision, score, level: confidenceLevel(score), reasons, limitations };
}
