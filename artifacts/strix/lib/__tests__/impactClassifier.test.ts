import {
  IMPACT_MODEL_FEATURES,
  ImpactClassifier,
  type ImpactLinearModel,
  type ShadowImpactPrediction,
} from "../ml/impactClassifier";
import { SensorPipeline } from "../sensorPipeline";

function model(): ImpactLinearModel {
  const featureCount = IMPACT_MODEL_FEATURES.length;
  const peakIndex = IMPACT_MODEL_FEATURES.indexOf("peakG");
  const crash = Array.from({ length: featureCount }, () => 0);
  const nonCrash = Array.from({ length: featureCount }, () => 0);
  crash[peakIndex] = 2;
  nonCrash[peakIndex] = -2;
  return {
    schemaVersion: 1,
    modelType: "multinomial-linear-softmax",
    modelVersion: "test-linear-v1",
    featureSchemaVersion: 1,
    features: [...IMPACT_MODEL_FEATURES],
    classes: ["crash", "normal_driving"],
    means: Array.from({ length: featureCount }, () => 0),
    scales: Array.from({ length: featureCount }, () => 1),
    coefficients: [crash, nonCrash],
    intercepts: [0, 0],
  };
}

const impactSample = {
  kind: "accelerometer" as const,
  tMs: 20,
  raw: { x: 4, y: -1, z: 0 },
  filtered: { x: 4, y: 0, z: 0 },
  gForce: 4,
};

describe("experimental impact classifier", () => {
  it("emits a shadow prediction without replacing the rules decision", () => {
    const predictions: ShadowImpactPrediction[] = [];
    const decisions: string[] = [];
    const pipeline = new SensorPipeline({
      onShadowPrediction: (prediction) => predictions.push(prediction),
      onDecision: (sample) => decisions.push(sample.decision),
    }, {
      shadowClassifier: new ImpactClassifier(model()),
    });

    pipeline.dispatch(impactSample);
    pipeline.dispatch({ kind: "decision", tMs: 30, decision: "rejected", reason: "rules", confidence: 0.8 });

    expect(predictions).toHaveLength(1);
    expect(predictions[0]).toMatchObject({
      mode: "shadow",
      predictedClass: "crash",
      rulesDecisionUnchanged: true,
    });
    expect(decisions).toEqual(["rejected"]);
  });

  it("falls back to rules-only when the model is unavailable or invalid", () => {
    const unavailable = new ImpactClassifier(null);
    const invalid = model();
    invalid.scales[0] = 0;

    for (const classifier of [unavailable, new ImpactClassifier(invalid)]) {
      const predictions: ShadowImpactPrediction[] = [];
      const pipeline = new SensorPipeline({
        onShadowPrediction: (prediction) => predictions.push(prediction),
      }, { shadowClassifier: classifier });
      pipeline.dispatch(impactSample);
      expect(predictions[0].mode).toBe("rules-only");
      expect(predictions[0].predictedClass).toBeNull();
      expect(predictions[0].rulesDecisionUnchanged).toBe(true);
    }
  });

  it("resets accumulated features deterministically", () => {
    const predictions: ShadowImpactPrediction[] = [];
    const pipeline = new SensorPipeline({
      onShadowPrediction: (prediction) => predictions.push(prediction),
    }, { shadowClassifier: new ImpactClassifier(model()) });

    pipeline.dispatch(impactSample);
    const first = predictions.at(-1);
    pipeline.reset();
    pipeline.dispatch(impactSample);

    expect(predictions.at(-1)).toEqual(first);
  });
});
