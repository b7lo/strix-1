import { THRESHOLDS } from "../thresholds";
import { assessImpactEvidence } from "./impactEvidence";
import type {
  ImpactCandidate,
  ImpactObservation,
  ImpactState,
  ImpactStateMachineConfig,
  ImpactStateSnapshot,
  ImpactTransition,
} from "./types";

const DEFAULT_CONFIG: ImpactStateMachineConfig = {
  candidateMinDurationMs: THRESHOLDS.IMPACT_CANDIDATE_MIN_DURATION_MS,
  candidateMaxDurationMs: THRESHOLDS.IMPACT_CANDIDATE_MAX_DURATION_MS,
  instantConfirmationMultiplier: THRESHOLDS.IMPACT_INSTANT_CONFIRM_MULTIPLIER,
  postImpactWindowMs: THRESHOLDS.IMPACT_POST_WINDOW_MS,
  cooldownMs: THRESHOLDS.IMPACT_COOLDOWN_MS,
  secondaryImpactMultiplier: THRESHOLDS.IMPACT_SECONDARY_MULTIPLIER,
  minimumQualityScore: THRESHOLDS.IMPACT_MIN_QUALITY_SCORE,
};

export class ImpactStateMachine {
  private state: ImpactState = "IDLE";
  private candidate: ImpactCandidate | null = null;
  private incidentId: number | null = null;
  private incidentSequence = 0;
  private confirmedAtMs = 0;
  private cooldownUntilMs = 0;
  private secondaryImpactCount = 0;
  private secondaryAboveThreshold = false;
  private readonly config: ImpactStateMachineConfig;

  constructor(config: Partial<ImpactStateMachineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  process(observation: ImpactObservation): ImpactTransition[] {
    const atMs = observation.impact.timestampMs;

    if (this.state === "COOLDOWN") {
      if (atMs < this.cooldownUntilMs) return [];
      this.resetIncident("IDLE");
    }

    if (this.state === "REJECTED") {
      this.resetIncident("IDLE");
    }

    if (this.state === "CONFIRMED") {
      this.state = "POST_IMPACT";
    }

    if (this.state === "POST_IMPACT") {
      return this.processPostImpact(observation);
    }

    const isAboveThreshold = observation.impact.magnitudeG >= observation.thresholdG;
    if (this.state === "IDLE") {
      if (!isAboveThreshold) return [];
      if (!observation.engineReady) {
        return [this.transition("REJECTED", atMs, "rejected", "evidence.engine-not-ready", 100)];
      }

      this.candidate = this.createCandidate(observation);
      const candidateTransition = this.transition(
        "CANDIDATE",
        atMs,
        "candidate",
        "threshold-crossed",
        0,
      );
      const evidence = assessImpactEvidence(observation, this.candidate, this.config, true);
      if (evidence.decision === "confirm") {
        return [candidateTransition, this.confirm(atMs, evidence.reason, evidence.confidence)];
      }
      if (evidence.decision === "reject") {
        return [candidateTransition, this.reject(atMs, evidence.reason, evidence.confidence)];
      }
      return [candidateTransition];
    }

    if (this.state !== "CANDIDATE" || !this.candidate) return [];
    this.updateCandidate(observation, isAboveThreshold);
    const evidence = assessImpactEvidence(observation, this.candidate, this.config, isAboveThreshold);
    if (evidence.decision === "confirm") {
      return [this.confirm(atMs, evidence.reason, evidence.confidence)];
    }
    if (evidence.decision === "reject") {
      return [this.reject(atMs, evidence.reason, evidence.confidence)];
    }
    return [];
  }

  completeAnalysis(atMs: number, cooldownMs = this.config.cooldownMs): ImpactTransition | null {
    if (this.state !== "CONFIRMED" && this.state !== "POST_IMPACT") return null;
    const safeAtMs = Number.isFinite(atMs) ? atMs : this.confirmedAtMs + this.config.postImpactWindowMs;
    this.cooldownUntilMs = safeAtMs + Math.max(0, cooldownMs);
    return this.transition("COOLDOWN", safeAtMs, undefined, "analysis-complete", 100);
  }

  getSnapshot(): ImpactStateSnapshot {
    return {
      state: this.state,
      incidentId: this.incidentId,
      candidate: this.candidate ? { ...this.candidate, peakSignal: { ...this.candidate.peakSignal } } : null,
      secondaryImpactCount: this.secondaryImpactCount,
      cooldownUntilMs: this.cooldownUntilMs,
    };
  }

  reset(): void {
    this.resetIncident("IDLE");
    this.incidentSequence = 0;
  }

  private processPostImpact(observation: ImpactObservation): ImpactTransition[] {
    const atMs = observation.impact.timestampMs;
    if (atMs - this.confirmedAtMs > this.config.postImpactWindowMs) {
      this.cooldownUntilMs = atMs + this.config.cooldownMs;
      return [this.transition("COOLDOWN", atMs, undefined, "post-impact-window-complete", 100)];
    }

    const secondaryThreshold = observation.thresholdG * this.config.secondaryImpactMultiplier;
    const aboveSecondary = observation.impact.magnitudeG >= secondaryThreshold;
    if (aboveSecondary && !this.secondaryAboveThreshold) {
      this.secondaryAboveThreshold = true;
      this.secondaryImpactCount++;
      return [this.transition(
        "POST_IMPACT",
        atMs,
        "secondary-impact",
        "secondary-impact-same-incident",
        90,
      )];
    }
    if (!aboveSecondary) this.secondaryAboveThreshold = false;
    return [];
  }

  private createCandidate(observation: ImpactObservation): ImpactCandidate {
    const atMs = observation.impact.timestampMs;
    return {
      startedAtMs: atMs,
      lastAboveThresholdAtMs: atMs,
      peakAtMs: atMs,
      peakG: observation.impact.magnitudeG,
      peakSignal: observation.impact,
      aboveThresholdDurationMs: 0,
    };
  }

  private updateCandidate(observation: ImpactObservation, isAboveThreshold: boolean): void {
    if (!this.candidate) return;
    const atMs = observation.impact.timestampMs;
    if (isAboveThreshold) {
      this.candidate.lastAboveThresholdAtMs = atMs;
      this.candidate.aboveThresholdDurationMs = Math.max(0, atMs - this.candidate.startedAtMs);
    }
    if (observation.impact.magnitudeG > this.candidate.peakG) {
      this.candidate.peakG = observation.impact.magnitudeG;
      this.candidate.peakAtMs = atMs;
      this.candidate.peakSignal = observation.impact;
    }
  }

  private confirm(atMs: number, reason: string, confidence: number): ImpactTransition {
    this.incidentSequence++;
    this.incidentId = this.incidentSequence;
    this.confirmedAtMs = atMs;
    this.secondaryImpactCount = 0;
    this.secondaryAboveThreshold = true;
    return this.transition("CONFIRMED", atMs, "confirmed", reason, confidence);
  }

  private reject(atMs: number, reason: string, confidence: number): ImpactTransition {
    return this.transition("REJECTED", atMs, "rejected", reason, confidence);
  }

  private transition(
    to: ImpactState,
    atMs: number,
    decision: ImpactTransition["decision"],
    reason: string,
    confidence: number,
  ): ImpactTransition {
    const from = this.state;
    this.state = to;
    return {
      from,
      to,
      atMs,
      decision,
      reason,
      confidence,
      incidentId: this.incidentId,
      candidate: this.candidate,
    };
  }

  private resetIncident(state: ImpactState): void {
    this.state = state;
    this.candidate = null;
    this.incidentId = null;
    this.confirmedAtMs = 0;
    this.cooldownUntilMs = 0;
    this.secondaryImpactCount = 0;
    this.secondaryAboveThreshold = false;
  }
}
