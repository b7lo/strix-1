import {
  findPeakZone,
  getAdjustedThreshold,
  isEngineReady,
  isInstantStrongCrash,
  recordGyroscopeSample,
  recordSample,
  registerThresholdCrossing,
  resetCrashStreak,
  resetFilter,
  setSampleRate,
  updateCurrentSpeed,
  validateCrashWithGyro,
} from "../sensorUtils";
import { calculateEvaluationMetrics } from "./metrics";
import type {
  AlgorithmEvaluationFixture,
  AlgorithmEvaluationResult,
  AlgorithmPrediction,
} from "./types";

export const BASELINE_ENGINE_VERSION = "strix-sensor-engine-v7.3-baseline";
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

    const sampleIntervalMs = 1000 / fixture.sampleRateHz;
    const warmupSamples = Math.ceil(WARMUP_SECONDS * fixture.sampleRateHz);

    for (let index = 0; index < warmupSamples; index++) {
      clockMs = FIXED_CLOCK_START_MS + index * sampleIntervalMs;
      recordSample(0, { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, clockMs);
      registerThresholdCrossing(false);
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

      recordSample(
        sample.gForce,
        sample.filtered,
        sample.raw ?? { x: sample.filtered.x, y: sample.filtered.y - 1, z: sample.filtered.z },
        clockMs,
      );

      const adjustedThreshold = getAdjustedThreshold(fixture.baseCrashThreshold);
      const aboveThreshold = sample.gForce >= adjustedThreshold;
      const confirmed =
        registerThresholdCrossing(aboveThreshold) ||
        isInstantStrongCrash(sample.gForce, adjustedThreshold);

      if (!confirmed || !isEngineReady()) continue;

      const validation = validateCrashWithGyro(
        sample.gForce,
        fixture.speedKmh,
        fixture.gyroThreshold,
        fixture.baseCrashThreshold,
      );

      if (validation.isValid) {
        const peak = findPeakZone();
        prediction = {
          fixtureId: fixture.id,
          detectedCrash: true,
          predictedZone: peak.zone,
          confidence: Math.round(validation.confidence * 100) / 100,
        };
        break;
      }

      resetCrashStreak();
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
