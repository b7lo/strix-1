import type {
  AlgorithmEvaluationFixture,
  AlgorithmEvaluationMetrics,
  AlgorithmPrediction,
  EvaluationConfusionMatrix,
} from "./types";

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateEvaluationMetrics(
  fixtures: readonly AlgorithmEvaluationFixture[],
  predictions: readonly AlgorithmPrediction[],
): AlgorithmEvaluationMetrics {
  const predictionById = new Map(predictions.map((prediction) => [prediction.fixtureId, prediction]));
  const confusionMatrix: EvaluationConfusionMatrix = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0,
  };

  let negativeDurationMs = 0;
  let zoneCaseCount = 0;
  let correctZoneCount = 0;

  for (const fixture of fixtures) {
    const prediction = predictionById.get(fixture.id);
    if (!prediction) {
      throw new Error(`Missing prediction for fixture: ${fixture.id}`);
    }

    if (fixture.expectedCrash) {
      if (prediction.detectedCrash) confusionMatrix.truePositive++;
      else confusionMatrix.falseNegative++;

      if (fixture.expectedZone) {
        zoneCaseCount++;
        if (prediction.detectedCrash && prediction.predictedZone === fixture.expectedZone) {
          correctZoneCount++;
        }
      }
    } else {
      negativeDurationMs += fixture.durationMs;
      if (prediction.detectedCrash) confusionMatrix.falsePositive++;
      else confusionMatrix.trueNegative++;
    }
  }

  const positiveCount = confusionMatrix.truePositive + confusionMatrix.falseNegative;
  const negativeCount = confusionMatrix.trueNegative + confusionMatrix.falsePositive;
  const negativeHours = negativeDurationMs / 3_600_000;

  return {
    fixtureCount: fixtures.length,
    positiveCount,
    negativeCount,
    confusionMatrix,
    precision: round(safeRatio(confusionMatrix.truePositive, confusionMatrix.truePositive + confusionMatrix.falsePositive)),
    recall: round(safeRatio(confusionMatrix.truePositive, positiveCount)),
    falseAlarmsPerHour: round(safeRatio(confusionMatrix.falsePositive, negativeHours)),
    zoneAccuracy: round(safeRatio(correctZoneCount, zoneCaseCount)),
    ece: null,
  };
}
