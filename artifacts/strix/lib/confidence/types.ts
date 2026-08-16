export type ConfidenceLevel = "high" | "medium" | "low";
export type ConfidenceReasonEffect = "increase" | "decrease" | "limit";

export interface ConfidenceReason {
  code: string;
  effect: ConfidenceReasonEffect;
  weight: number;
  detail?: string;
}

export interface ConfidenceComponent {
  score: number;
  level: ConfidenceLevel;
  reasons: ConfidenceReason[];
  limitations: string[];
}

export interface DataQualityConfidence extends ConfidenceComponent {
  kind: "data-quality";
  accelerometerSaturated: boolean;
  peakGIsLowerBound: boolean;
  minimumPeakG: number | null;
}

export interface EventConfidence extends ConfidenceComponent {
  kind: "event";
  decision: "confirmed" | "rejected" | "candidate";
}

export interface DirectionConfidence extends ConfidenceComponent {
  kind: "direction";
  calibrated: boolean;
  zoneAmbiguity: number;
}

export interface ScenarioConfidence extends ConfidenceComponent {
  kind: "scenario";
  hypothesisCount: number;
  conflicting: boolean;
}

export interface LiabilityConfidence extends ConfidenceComponent {
  kind: "liability";
  conclusive: boolean;
  ruleId: string;
}

export interface AccidentConfidenceModel {
  dataQuality: DataQualityConfidence;
  event: EventConfidence;
  direction: DirectionConfidence;
  scenario: ScenarioConfidence;
  liability: LiabilityConfidence;
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function clampConfidence(score: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
}
