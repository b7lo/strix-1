import type { ImpactSignal, MotionSignal } from "../signal/types";

export type ImpactState =
  | "IDLE"
  | "CANDIDATE"
  | "CONFIRMED"
  | "REJECTED"
  | "POST_IMPACT"
  | "COOLDOWN";

export type ImpactDecision = "candidate" | "confirmed" | "rejected" | "secondary-impact";

export interface ImpactObservation {
  impact: ImpactSignal;
  motion: MotionSignal;
  thresholdG: number;
  engineReady: boolean;
  speedKmh: number;
  gyroPeakDegS: number;
  gyroValidationPassed: boolean;
  phoneMovementDetected?: boolean;
  dataQualityScore?: number;
}

export interface ImpactCandidate {
  startedAtMs: number;
  lastAboveThresholdAtMs: number;
  peakAtMs: number;
  peakG: number;
  peakSignal: ImpactSignal;
  aboveThresholdDurationMs: number;
}

export interface ImpactTransition {
  from: ImpactState;
  to: ImpactState;
  atMs: number;
  decision?: ImpactDecision;
  reason: string;
  confidence: number;
  incidentId: number | null;
  candidate: ImpactCandidate | null;
}

export interface ImpactStateSnapshot {
  state: ImpactState;
  incidentId: number | null;
  candidate: ImpactCandidate | null;
  secondaryImpactCount: number;
  cooldownUntilMs: number;
}

export interface ImpactStateMachineConfig {
  candidateMinDurationMs: number;
  candidateMaxDurationMs: number;
  instantConfirmationMultiplier: number;
  postImpactWindowMs: number;
  cooldownMs: number;
  secondaryImpactMultiplier: number;
  minimumQualityScore: number;
}
