import { clampConfidence, confidenceLevel, type ConfidenceReason, type ScenarioConfidence } from "./types";

export interface ScenarioConfidenceInput {
  evidenceScore: number;
  eventScore: number;
  directionScore: number;
  requiredEvidenceScores: number[];
  hypothesisCount: number;
  conflicting: boolean;
}

/**
 * Scenario confidence is deliberately capped by the weakest required input.
 * More generic evidence can raise the score, but can never hide a weak event or
 * direction estimate.
 */
export function calculateScenarioConfidence(input: ScenarioConfidenceInput): ScenarioConfidence {
  const reasons: ConfidenceReason[] = [];
  const limitations: string[] = [];
  const requiredCap = Math.min(
    input.eventScore,
    input.directionScore,
    ...(input.requiredEvidenceScores.length > 0 ? input.requiredEvidenceScores : [100]),
  );
  let score = Math.min(input.evidenceScore, requiredCap);

  reasons.push({ code: "scenario.evidence", effect: "increase", weight: input.evidenceScore });
  if (score < input.evidenceScore) {
    limitations.push("scenario.required-evidence-cap");
    reasons.push({ code: "scenario.required-evidence-cap", effect: "limit", weight: requiredCap });
  }
  if (input.conflicting) {
    score = Math.min(score, 44);
    limitations.push("scenario.conflicting-hypotheses");
    reasons.push({ code: "scenario.conflicting-hypotheses", effect: "limit", weight: 44 });
  }
  if (input.hypothesisCount === 0) {
    score = Math.min(score, 25);
    limitations.push("scenario.no-supported-hypothesis");
  }

  score = clampConfidence(score);
  return {
    kind: "scenario",
    score,
    level: confidenceLevel(score),
    reasons,
    limitations,
    hypothesisCount: input.hypothesisCount,
    conflicting: input.conflicting,
  };
}
