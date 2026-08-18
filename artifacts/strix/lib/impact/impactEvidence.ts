import { classifyNonCrash, type NonCrashAssessment } from "./nonCrashClassifier";
import type { ImpactCandidate, ImpactObservation, ImpactStateMachineConfig } from "./types";

export type ImpactEvidenceDecision = "pending" | "confirm" | "reject";

export interface ImpactEvidenceResult {
  decision: ImpactEvidenceDecision;
  reason: string;
  confidence: number;
  nonCrash: NonCrashAssessment;
}

export function assessImpactEvidence(
  observation: ImpactObservation,
  candidate: ImpactCandidate,
  config: ImpactStateMachineConfig,
  isAboveThreshold: boolean,
): ImpactEvidenceResult {
  const pulseDurationMs = Math.max(0, observation.impact.timestampMs - candidate.startedAtMs);
  const nonCrash = classifyNonCrash({
    impact: candidate.peakSignal,
    motion: observation.motion,
    speedKmh: observation.speedKmh,
    gyroPeakDegS: observation.gyroPeakDegS,
    pulseDurationMs,
    thresholdG: observation.thresholdG,
    phoneMovementDetected: observation.phoneMovementDetected,
  });

  if (!observation.engineReady) {
    return { decision: "reject", reason: "evidence.engine-not-ready", confidence: 100, nonCrash };
  }

  if ((observation.dataQualityScore ?? 100) < config.minimumQualityScore) {
    return { decision: "reject", reason: "evidence.quality-too-low", confidence: 90, nonCrash };
  }

  if (nonCrash.rejected) {
    return {
      decision: "reject",
      reason: `evidence.${nonCrash.kind}`,
      confidence: nonCrash.confidence,
      nonCrash,
    };
  }

  const instantStrong = candidate.peakG >= observation.thresholdG * config.instantConfirmationMultiplier;
  if (instantStrong) {
    return { decision: "confirm", reason: "evidence.strong-impact", confidence: 98, nonCrash };
  }

  if (pulseDurationMs > config.candidateMaxDurationMs) {
    return { decision: "reject", reason: "evidence.pulse-too-long", confidence: 85, nonCrash };
  }

  if (!observation.gyroValidationPassed && pulseDurationMs >= config.candidateMinDurationMs) {
    return { decision: "reject", reason: "evidence.gyro-validation", confidence: 80, nonCrash };
  }

  if (isAboveThreshold && pulseDurationMs >= config.candidateMinDurationMs) {
    const strengthRatio = candidate.peakG / Math.max(0.1, observation.thresholdG);
    return {
      decision: "confirm",
      reason: "evidence.sustained-impact-pulse",
      confidence: Math.round(Math.min(95, 55 + strengthRatio * 18)),
      nonCrash,
    };
  }

  if (!isAboveThreshold) {
    return { decision: "reject", reason: "evidence.insufficient-pulse", confidence: 75, nonCrash };
  }

  return { decision: "pending", reason: "evidence.collecting", confidence: 0, nonCrash };
}
