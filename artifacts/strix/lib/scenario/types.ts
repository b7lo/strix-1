import type { AdvancedAnalysisResult, BrakingAnalysis, GyroscopeSnapshot, ImpactDirection, ImpactZone } from "../types";

export type EvidenceEffect = "supports" | "opposes" | "limits";

export interface EvidenceItem {
  id: string;
  source: "accelerometer" | "gyroscope" | "gps" | "vehicle-frame" | "road-context" | "braking" | "derived";
  effect: EvidenceEffect;
  strength: number;
  required?: boolean;
  detail?: string;
}

export interface ScenarioHypothesis {
  id: string;
  scenarioCode: string;
  family: "rear" | "front" | "corner-front" | "corner-rear" | "side" | "door" | "intersection" | "u-turn" | "lane-merge" | "parking" | "unknown";
  confidence: number;
  evidence: EvidenceItem[];
  conflictsWith: string[];
}

export interface ScenarioInferenceInput {
  direction: ImpactDirection;
  zone: ImpactZone;
  peakG: number;
  speedKmh: number;
  jerkPeak: number;
  gyroscope: GyroscopeSnapshot | null;
  braking: BrakingAnalysis | null;
  advancedAnalysis: AdvancedAnalysisResult | null;
}

export interface ScenarioInferenceResult {
  primary: ScenarioHypothesis;
  alternatives: ScenarioHypothesis[];
  conflicting: boolean;
}
