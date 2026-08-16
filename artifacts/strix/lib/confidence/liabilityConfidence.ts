import { clampConfidence, confidenceLevel, type ConfidenceReason, type LiabilityConfidence } from "./types";

export interface LiabilityConfidenceInput {
  scenarioScore: number;
  dataQualityScore: number;
  directionScore: number;
  ruleId: string;
  ruleReviewed: boolean;
  conflicting: boolean;
  hasRequiredEvidence: boolean;
}

/** Conservative confidence for a liability conclusion, not for crash detection. */
export function calculateLiabilityConfidence(input: LiabilityConfidenceInput): LiabilityConfidence {
  const reasons: ConfidenceReason[] = [];
  const limitations: string[] = [];
  let score = Math.min(input.scenarioScore, input.dataQualityScore, input.directionScore);

  reasons.push({ code: "liability.rule-applied", effect: "increase", weight: score, detail: input.ruleId });
  if (!input.hasRequiredEvidence) {
    score = Math.min(score, 44);
    limitations.push("liability.required-evidence-missing");
  }
  if (input.conflicting) {
    score = Math.min(score, 35);
    limitations.push("liability.scenario-conflict");
  }
  if (!input.ruleReviewed) {
    score = Math.min(score, 69);
    limitations.push("liability.rule-not-legally-reviewed");
    reasons.push({ code: "liability.rule-not-legally-reviewed", effect: "limit", weight: 69 });
  }

  score = clampConfidence(score);
  const conclusive = score >= 70 && !input.conflicting && input.hasRequiredEvidence && input.ruleReviewed;
  return {
    kind: "liability",
    score,
    level: confidenceLevel(score),
    reasons,
    limitations,
    conclusive,
    ruleId: input.ruleId,
  };
}
