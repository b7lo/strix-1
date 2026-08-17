import type { ImpactZoneDistribution } from "../types";
import { clampConfidence, confidenceLevel, type ConfidenceReason, type DirectionConfidence } from "./types";

export interface DirectionConfidenceInput {
  calibrated: boolean;
  calibrationConfidence: number;
  distribution: ImpactZoneDistribution | null;
  phoneMoved?: boolean;
}

export function calculateDirectionConfidence(input: DirectionConfidenceInput): DirectionConfidence {
  const reasons: ConfidenceReason[] = [];
  const limitations: string[] = [];
  const ambiguity = input.distribution?.ambiguity ?? (input.calibrated ? 0 : 1);
  const concentration = 1 - Math.max(0, Math.min(1, ambiguity));
  let score = input.calibrationConfidence * 0.65 + concentration * 35;

  if (!input.calibrated) {
    score = Math.min(score, 44);
    limitations.push("direction.not-calibrated");
    reasons.push({ code: "direction.not-calibrated", effect: "limit", weight: 44 });
  } else {
    reasons.push({ code: "direction.calibrated", effect: "increase", weight: input.calibrationConfidence });
  }
  if (ambiguity >= 0.75) {
    limitations.push("direction.zone-ambiguous");
    reasons.push({ code: "direction.zone-ambiguous", effect: "decrease", weight: -20 });
  }
  if (input.phoneMoved) {
    score = Math.min(score, 20);
    limitations.push("direction.phone-moved");
  }

  score = clampConfidence(score);
  return {
    kind: "direction",
    calibrated: input.calibrated,
    zoneAmbiguity: ambiguity,
    score,
    level: confidenceLevel(score),
    reasons,
    limitations,
  };
}
