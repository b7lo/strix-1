import type { ImpactZone } from "../types";

export type EvaluationLabel = "positive" | "negative";
export type FixtureSource = "synthetic" | "field" | "test-rig";

export interface EvaluationVector3 {
  x: number;
  y: number;
  z: number;
}

export interface EvaluationSample {
  /** Offset from the start of the event window. */
  atMs: number;
  gForce: number;
  filtered: EvaluationVector3;
  raw?: EvaluationVector3;
  gyro?: EvaluationVector3;
}

export interface EvaluationFixtureMetadata {
  source: FixtureSource;
  deviceModel: string;
  vehicleType: string;
  roadType: "smooth" | "normal" | "rough" | "unknown";
  notes: string;
}

export interface AlgorithmEvaluationFixture {
  id: string;
  label: EvaluationLabel;
  scenario: string;
  durationMs: number;
  sampleRateHz: number;
  speedKmh: number;
  baseCrashThreshold: number;
  gyroThreshold: number;
  expectedCrash: boolean;
  expectedZone?: ImpactZone;
  samples: readonly EvaluationSample[];
  metadata: EvaluationFixtureMetadata;
}

export interface AlgorithmPrediction {
  fixtureId: string;
  detectedCrash: boolean;
  predictedZone: ImpactZone;
  confidence: number;
}

export interface EvaluationConfusionMatrix {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

export interface AlgorithmEvaluationMetrics {
  fixtureCount: number;
  positiveCount: number;
  negativeCount: number;
  confusionMatrix: EvaluationConfusionMatrix;
  precision: number;
  recall: number;
  falseAlarmsPerHour: number;
  zoneAccuracy: number;
  /** Expected Calibration Error. Null until fixtures carry reviewed probabilities. */
  ece: number | null;
}

export interface AlgorithmEvaluationResult {
  schemaVersion: 1;
  engineVersion: string;
  metrics: AlgorithmEvaluationMetrics;
  predictions: readonly AlgorithmPrediction[];
}
