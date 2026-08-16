import fc from "fast-check";
import { calculateDirectionConfidence } from "../confidence/directionConfidence";
import { calculateEventConfidence } from "../confidence/eventConfidence";
import { calculateLiabilityConfidence } from "../confidence/liabilityConfidence";
import { calculateScenarioConfidence } from "../confidence/scenarioConfidence";

const scores = fc.integer({ min: 0, max: 100 });

describe("Phase 5 confidence model", () => {
  it("all component scores remain finite and bounded", () => {
    fc.assert(fc.property(scores, scores, scores, (event, direction, evidence) => {
      const scenario = calculateScenarioConfidence({
        evidenceScore: evidence,
        eventScore: event,
        directionScore: direction,
        requiredEvidenceScores: [direction],
        hypothesisCount: 1,
        conflicting: false,
      });
      const liability = calculateLiabilityConfidence({
        scenarioScore: scenario.score,
        dataQualityScore: 100,
        directionScore: direction,
        ruleId: "TEST",
        ruleReviewed: false,
        conflicting: false,
        hasRequiredEvidence: true,
      });
      for (const score of [scenario.score, liability.score]) {
        expect(Number.isFinite(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }));
  });

  it("weak required evidence caps scenario and liability confidence", () => {
    const scenario = calculateScenarioConfidence({
      evidenceScore: 95,
      eventScore: 95,
      directionScore: 30,
      requiredEvidenceScores: [30],
      hypothesisCount: 1,
      conflicting: false,
    });
    const liability = calculateLiabilityConfidence({
      scenarioScore: scenario.score,
      dataQualityScore: 95,
      directionScore: 30,
      ruleId: "TEST",
      ruleReviewed: false,
      conflicting: false,
      hasRequiredEvidence: false,
    });
    expect(scenario.score).toBeLessThanOrEqual(30);
    expect(liability.score).toBeLessThanOrEqual(30);
    expect(liability.conclusive).toBe(false);
  });

  it("raising event evidence cannot lower event confidence when caps are unchanged", () => {
    fc.assert(fc.property(scores, scores, (a, b) => {
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      const make = (evidenceConfidence: number) => calculateEventConfidence({
        decision: "confirmed",
        evidenceConfidence,
        peakToThresholdRatio: 1.5,
        dataQualityScore: 100,
        engineReady: true,
      }).score;
      expect(make(high)).toBeGreaterThanOrEqual(make(low));
    }));
  });

  it("phone movement and missing calibration cap direction confidence", () => {
    const confidence = calculateDirectionConfidence({
      calibrated: false,
      calibrationConfidence: 100,
      distribution: null,
      phoneMoved: true,
    });
    expect(confidence.score).toBeLessThanOrEqual(20);
    expect(confidence.limitations).toContain("direction.phone-moved");
  });
});
