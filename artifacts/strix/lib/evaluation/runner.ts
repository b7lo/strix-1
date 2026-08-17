import {
  findPeakZone,
  getAdjustedThreshold,
  getGyroscopeSnapshot,
  isEngineReady,
  recordGyroscopeSample,
  recordSample,
  resetFilter,
  setSampleRate,
  updateCurrentSpeed,
  validateCrashWithGyro,
} from "../sensorUtils";
import { ImpactStateMachine } from "../impact/impactStateMachine";
import { MotionSignalProcessor } from "../signal/motionSignal";
import type { ImpactSignal } from "../signal/types";
import { calculateEvaluationMetrics } from "./metrics";
import type {
  AlgorithmEvaluationFixture,
  AlgorithmEvaluationResult,
  AlgorithmPrediction,
} from "./types";

export const BASELINE_ENGINE_VERSION = "strix-sensor-engine-v8.0-impact-state-machine";
const FIXED_CLOCK_START_MS = 1_700_000_000_000;
const WARMUP_SECONDS = 5;

function runFixture(fixture: AlgorithmEvaluationFixture): AlgorithmPrediction {
  const originalNow = Date.now;
  let clockMs = FIXED_CLOCK_START_MS;

  try {
    Date.now = () => clockMs;
    resetFilter();
    setSampleRate(fixture.sampleRateHz);
    updateCurrentSpeed(fixture.speedKmh);
    const impactStateMachine = new ImpactStateMachine();
    const motionProcessor = new MotionSignalProcessor();

    const sampleIntervalMs = 1000 / fixture.sampleRateHz;
    const warmupSamples = Math.ceil(WARMUP_SECONDS * fixture.sampleRateHz);

    for (let index = 0; index < warmupSamples; index++) {
      clockMs = FIXED_CLOCK_START_MS + index * sampleIntervalMs;
      recordSample(0, { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, clockMs);
    }

    const eventStartMs = FIXED_CLOCK_START_MS + warmupSamples * sampleIntervalMs;
    let prediction: AlgorithmPrediction = {
      fixtureId: fixture.id,
      detectedCrash: false,
      predictedZone: "unknown",
      confidence: 0,
    };

    for (const sample of fixture.samples) {
      clockMs = eventStartMs + sample.atMs;
      if (sample.gyro) recordGyroscopeSample(sample.gyro, clockMs);

      const raw = sample.raw ?? { x: sample.filtered.x, y: sample.filtered.y - 1, z: sample.filtered.z };
      recordSample(
        sample.gForce,
        sample.filtered,
        raw,
        clockMs,
      );

      const adjustedThreshold = getAdjustedThreshold(fixture.baseCrashThreshold);
      const validation = validateCrashWithGyro(
        sample.gForce,
        fixture.speedKmh,
        fixture.gyroThreshold,
        fixture.baseCrashThreshold,
      );
      const impact: ImpactSignal = {
        timestampMs: clockMs,
        dtSec: sampleIntervalMs / 1000,
        raw,
        gravity: {
          x: raw.x - sample.filtered.x,
          y: raw.y - sample.filtered.y,
          z: raw.z - sample.filtered.z,
        },
        linearAcceleration: sample.filtered,
        magnitudeG: sample.gForce,
        accelerometerSaturated: Math.max(Math.abs(raw.x), Math.abs(raw.y), Math.abs(raw.z)) >= 15,
        minimumPeakG: null,
      };
      if (impact.accelerometerSaturated) impact.minimumPeakG = impact.magnitudeG;
      const transitions = impactStateMachine.process({
        impact,
        motion: motionProcessor.process(impact),
        thresholdG: adjustedThreshold,
        engineReady: isEngineReady(),
        speedKmh: fixture.speedKmh,
        gyroPeakDegS: getGyroscopeSnapshot().peakRotationRate,
        gyroValidationPassed: validation.isValid,
        dataQualityScore: 100,
      });

      const confirmation = transitions.find((transition) => transition.decision === "confirmed");
      if (confirmation) {
        const peak = findPeakZone();
        prediction = {
          fixtureId: fixture.id,
          detectedCrash: true,
          predictedZone: peak.zone,
          confidence: confirmation.confidence,
        };
        break;
      }
    }

    return prediction;
  } finally {
    Date.now = originalNow;
    resetFilter();
  }
}

export function evaluateAlgorithm(
  fixtures: readonly AlgorithmEvaluationFixture[],
): AlgorithmEvaluationResult {
  const ids = new Set<string>();
  for (const fixture of fixtures) {
    if (ids.has(fixture.id)) throw new Error(`Duplicate fixture id: ${fixture.id}`);
    ids.add(fixture.id);
  }

  const predictions = fixtures.map(runFixture);
  return {
    schemaVersion: 1,
    engineVersion: BASELINE_ENGINE_VERSION,
    metrics: calculateEvaluationMetrics(fixtures, predictions),
    predictions,
  };
}
