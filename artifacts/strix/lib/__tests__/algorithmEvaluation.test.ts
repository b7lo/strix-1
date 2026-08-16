import { algorithmBaselineFixtures } from "../__fixtures__/algorithm-baseline";
import { calculateEvaluationMetrics } from "../evaluation/metrics";
import { evaluateAlgorithm } from "../evaluation/runner";
import type { AlgorithmPrediction } from "../evaluation/types";

describe("algorithm evaluation metrics", () => {
  it("calculates confusion matrix and rates deterministically", () => {
    const predictions: AlgorithmPrediction[] = algorithmBaselineFixtures.map((fixture) => ({
      fixtureId: fixture.id,
      detectedCrash: fixture.id !== "synthetic-single-pothole-50hz",
      predictedZone: fixture.expectedZone ?? "unknown",
      confidence: 50,
    }));

    const metrics = calculateEvaluationMetrics(algorithmBaselineFixtures, predictions);

    expect(metrics.fixtureCount).toBe(8);
    expect(metrics.positiveCount).toBe(3);
    expect(metrics.negativeCount).toBe(5);
    expect(metrics.confusionMatrix).toEqual({
      truePositive: 3,
      trueNegative: 1,
      falsePositive: 4,
      falseNegative: 0,
    });
    expect(metrics.precision).toBe(0.428571);
    expect(metrics.recall).toBe(1);
    expect(metrics.zoneAccuracy).toBe(1);
    expect(Number.isFinite(metrics.falseAlarmsPerHour)).toBe(true);
    expect(metrics.ece).toBeNull();
  });

  it("rejects a missing prediction instead of hiding incomplete evaluation", () => {
    expect(() => calculateEvaluationMetrics(algorithmBaselineFixtures, [])).toThrow(
      "Missing prediction for fixture",
    );
  });
});

describe("current algorithm baseline", () => {
  it("is deterministic and produces finite bounded metrics", () => {
    const first = evaluateAlgorithm(algorithmBaselineFixtures);
    const second = evaluateAlgorithm(algorithmBaselineFixtures);

    expect(second).toEqual(first);
    expect(first.metrics.fixtureCount).toBe(algorithmBaselineFixtures.length);
    expect(first.metrics.precision).toBeGreaterThanOrEqual(0);
    expect(first.metrics.precision).toBeLessThanOrEqual(1);
    expect(first.metrics.recall).toBeGreaterThanOrEqual(0);
    expect(first.metrics.recall).toBeLessThanOrEqual(1);
    expect(first.metrics.zoneAccuracy).toBeGreaterThanOrEqual(0);
    expect(first.metrics.zoneAccuracy).toBeLessThanOrEqual(1);
    expect(Number.isFinite(first.metrics.falseAlarmsPerHour)).toBe(true);
  });
});
