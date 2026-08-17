import type { ReplaySample } from "../replay/types";
import type { ImpactSignal, MotionSignal } from "../signal/types";

export const IMPACT_MODEL_FEATURES = [
  "sampleRateHz",
  "durationMs",
  "peakG",
  "peakJerk",
  "impulseMs",
  "horizontalEnergy",
  "verticalEnergy",
  "rotationPeakDegS",
  "speedBeforeKmh",
  "speedDeltaKmh",
  "dataQualityScore",
  "gapCount",
] as const;

export type ImpactModelFeature = (typeof IMPACT_MODEL_FEATURES)[number];

export interface ImpactLinearModel {
  schemaVersion: 1;
  modelType: "multinomial-linear-softmax";
  modelVersion: string;
  featureSchemaVersion: 1;
  features: ImpactModelFeature[];
  classes: string[];
  means: number[];
  scales: number[];
  coefficients: number[][];
  intercepts: number[];
}

export interface ShadowImpactPrediction {
  mode: "shadow" | "rules-only";
  modelVersion: string | null;
  predictedClass: string | null;
  confidence: number | null;
  probabilities: Record<string, number>;
  fallbackReason?: "model-unavailable" | "invalid-model" | "inference-failed";
  /** Shadow output is observational and must never replace the rules decision. */
  rulesDecisionUnchanged: true;
}

interface RuntimeFeatures extends Record<ImpactModelFeature, number> {}

const finite = (value: number | null | undefined, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function isValidModel(model: ImpactLinearModel | null): model is ImpactLinearModel {
  if (!model || model.schemaVersion !== 1 || model.modelType !== "multinomial-linear-softmax") return false;
  const classCount = model.classes.length;
  const featureCount = model.features.length;
  if (classCount < 2 || featureCount === 0 || new Set(model.classes).size !== classCount) return false;
  if (model.means.length !== featureCount || model.scales.length !== featureCount) return false;
  if (model.intercepts.length !== classCount || model.coefficients.length !== classCount) return false;
  if (model.coefficients.some((row) => row.length !== featureCount)) return false;
  const numbers = [...model.means, ...model.scales, ...model.intercepts, ...model.coefficients.flat()];
  return numbers.every(Number.isFinite) && model.scales.every((value) => value > 0);
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exponents = logits.map((value) => Math.exp(Math.max(-60, Math.min(60, value - max))));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("INVALID_SOFTMAX");
  return exponents.map((value) => value / total);
}

/**
 * Stateful adapter for the experimental linear model. It only emits shadow
 * predictions; callers continue using the rules state machine for decisions.
 */
export class ImpactClassifier {
  private readonly validModel: boolean;
  private firstTimestampMs: number | null = null;
  private previousMagnitudeG: number | null = null;
  private previousTimestampMs: number | null = null;
  private sampleCount = 0;
  private peakG = 0;
  private peakJerk = 0;
  private impulseStartMs: number | null = null;
  private impulseEndMs: number | null = null;
  private horizontalEnergySum = 0;
  private verticalEnergySum = 0;
  private rotationPeakDegS = 0;
  private firstSpeedKmh: number | null = null;
  private latestSpeedKmh: number | null = null;
  private sampleRateHz = 0;
  private dataQualityScore = 100;
  private gapCount = 0;

  constructor(private readonly model: ImpactLinearModel | null) {
    this.validModel = isValidModel(model);
  }

  observeSample(sample: ReplaySample): void {
    if (this.firstTimestampMs === null) this.firstTimestampMs = sample.tMs;
    switch (sample.kind) {
      case "gyroscope": {
        const magnitude = Math.hypot(finite(sample.value.x), finite(sample.value.y), finite(sample.value.z));
        this.rotationPeakDegS = Math.max(this.rotationPeakDegS, magnitude * (180 / Math.PI));
        break;
      }
      case "location": {
        const speed = Math.max(0, finite(sample.speedKmh));
        if (this.firstSpeedKmh === null) this.firstSpeedKmh = speed;
        this.latestSpeedKmh = speed;
        break;
      }
      case "quality": {
        const measuredRate = finite(sample.measuredSampleRateHz ?? sample.sampleRateHz);
        this.sampleRateHz = measuredRate > 0 ? measuredRate : this.sampleRateHz;
        const jitterPenalty = Math.min(20, Math.max(0, finite(sample.jitterMs)) * 2);
        this.gapCount = Math.max(this.gapCount, Math.max(0, Math.round(finite(sample.gapCount))));
        const gapPenalty = Math.min(30, this.gapCount * 3);
        this.dataQualityScore = Math.max(0, Math.min(100, 100 - jitterPenalty - gapPenalty));
        break;
      }
      default:
        break;
    }
  }

  observeSignals(impact: ImpactSignal, _motion: MotionSignal): ShadowImpactPrediction {
    try {
      this.sampleCount += 1;
      if (this.firstTimestampMs === null) this.firstTimestampMs = impact.timestampMs;
      const magnitude = Math.max(0, finite(impact.magnitudeG));
      this.peakG = Math.max(this.peakG, magnitude);
      if (this.previousMagnitudeG !== null && this.previousTimestampMs !== null) {
        const dtSeconds = (impact.timestampMs - this.previousTimestampMs) / 1000;
        if (dtSeconds > 0) this.peakJerk = Math.max(this.peakJerk, Math.abs(magnitude - this.previousMagnitudeG) / dtSeconds);
      }
      this.previousMagnitudeG = magnitude;
      this.previousTimestampMs = impact.timestampMs;
      this.sampleRateHz = this.sampleRateHz > 0 ? this.sampleRateHz : 1 / Math.max(impact.dtSec, 0.001);
      this.horizontalEnergySum += impact.linearAcceleration.x ** 2 + impact.linearAcceleration.y ** 2;
      this.verticalEnergySum += impact.linearAcceleration.z ** 2;
      const threshold = Math.max(0.5, this.peakG * 0.5);
      if (magnitude >= threshold) {
        if (this.impulseStartMs === null) this.impulseStartMs = impact.timestampMs;
        this.impulseEndMs = impact.timestampMs;
      }
      return this.predict();
    } catch {
      return this.fallback("inference-failed");
    }
  }

  reset(): void {
    this.firstTimestampMs = null;
    this.previousMagnitudeG = null;
    this.previousTimestampMs = null;
    this.sampleCount = 0;
    this.peakG = 0;
    this.peakJerk = 0;
    this.impulseStartMs = null;
    this.impulseEndMs = null;
    this.horizontalEnergySum = 0;
    this.verticalEnergySum = 0;
    this.rotationPeakDegS = 0;
    this.firstSpeedKmh = null;
    this.latestSpeedKmh = null;
    this.sampleRateHz = 0;
    this.dataQualityScore = 100;
    this.gapCount = 0;
  }

  private predict(): ShadowImpactPrediction {
    if (!this.model) return this.fallback("model-unavailable");
    if (!this.validModel) return this.fallback("invalid-model");
    const model = this.model;
    const features = this.runtimeFeatures();
    const normalized = model.features.map((feature, index) =>
      (features[feature] - model.means[index]) / model.scales[index]);
    const logits = model.classes.map((_, classIndex) =>
      model.intercepts[classIndex]
      + model.coefficients[classIndex].reduce((sum, coefficient, index) => sum + coefficient * normalized[index], 0));
    const probabilities = softmax(logits);
    const bestIndex = probabilities.reduce((best, value, index) => value > probabilities[best] ? index : best, 0);
    return {
      mode: "shadow",
      modelVersion: model.modelVersion,
      predictedClass: model.classes[bestIndex],
      confidence: probabilities[bestIndex],
      probabilities: Object.fromEntries(model.classes.map((label, index) => [label, probabilities[index]])),
      rulesDecisionUnchanged: true,
    };
  }

  private runtimeFeatures(): RuntimeFeatures {
    const latestTimestamp = this.previousTimestampMs ?? this.firstTimestampMs ?? 0;
    return {
      sampleRateHz: this.sampleRateHz,
      durationMs: Math.max(0, latestTimestamp - (this.firstTimestampMs ?? latestTimestamp)),
      peakG: this.peakG,
      peakJerk: this.peakJerk,
      impulseMs: this.impulseStartMs === null || this.impulseEndMs === null ? 0 : Math.max(0, this.impulseEndMs - this.impulseStartMs),
      horizontalEnergy: this.sampleCount > 0 ? this.horizontalEnergySum / this.sampleCount : 0,
      verticalEnergy: this.sampleCount > 0 ? this.verticalEnergySum / this.sampleCount : 0,
      rotationPeakDegS: this.rotationPeakDegS,
      speedBeforeKmh: this.latestSpeedKmh ?? 0,
      speedDeltaKmh: this.firstSpeedKmh === null || this.latestSpeedKmh === null ? 0 : this.latestSpeedKmh - this.firstSpeedKmh,
      dataQualityScore: this.dataQualityScore,
      gapCount: this.gapCount,
    };
  }

  private fallback(reason: ShadowImpactPrediction["fallbackReason"]): ShadowImpactPrediction {
    return {
      mode: "rules-only",
      modelVersion: this.model?.modelVersion ?? null,
      predictedClass: null,
      confidence: null,
      probabilities: {},
      fallbackReason: reason,
      rulesDecisionUnchanged: true,
    };
  }
}
