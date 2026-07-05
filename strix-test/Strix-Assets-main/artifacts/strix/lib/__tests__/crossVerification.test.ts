import { generateCrossVerifiedAnalysis } from "../crossVerification";
import type { AccidentReport, ImpactZone } from "../types";

/** يبني تقرير حادث أدنى للاختبار */
function makeReport(over: Partial<AccidentReport>): AccidentReport {
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: 1_000_000_000_000,
    peakGForce: 3,
    jerkPeak: 10,
    impactZone: "front" as ImpactZone,
    impactDirection: "front",
    speedKmh: 40,
    preCrashSpeedKmh: 45,
    latitude: 24.7136,
    longitude: 46.6753,
    severity: "moderate",
    liabilityScore: 50,
    confidence: "medium",
    scenarioCode: "X",
    scenarioAr: "",
    descriptionAr: "",
    factorsAr: [],
    feedback: null,
    gyroscope: null,
    braking: null,
    confidenceDetails: null,
    impactCount: 1,
    baselineG: 0,
    sessionDurationAtCrash: 0,
    otherParty: null,
    croquis: null,
    matchedAccidentId: null,
    matchConfidence: null,
    advancedAnalysis: null,
    ...over,
  } as AccidentReport;
}

describe("A-7: cross-verification (انجراف الساعة + الأدوار)", () => {
  it("فرق زمني صغير ضمن هامش الانجراف ← first_contact = UNKNOWN", () => {
    const a = makeReport({ impactZone: "front", timestamp: 1_000_000_000_000 });
    const b = makeReport({ impactZone: "rear", timestamp: 1_000_000_001_000 }); // فرق 1s فقط
    const res = generateCrossVerifiedAnalysis(a, b);
    expect(res.first_contact_party).toBe("UNKNOWN");
  });

  it("فرق زمني كبير ← يُحدَّد أول تماس (الأقدم)", () => {
    const a = makeReport({ impactZone: "front", timestamp: 1_000_000_000_000 });
    const b = makeReport({ impactZone: "rear", timestamp: 1_000_000_010_000 }); // فرق 10s
    const res = generateCrossVerifiedAnalysis(a, b);
    expect(res.first_contact_party).toBe("A");
  });

  it("A أمامي + B خلفي ← A هو الصادم (مسؤولية ≥ 75%)", () => {
    const a = makeReport({ impactZone: "front" });
    const b = makeReport({ impactZone: "rear" });
    const res = generateCrossVerifiedAnalysis(a, b);
    expect(res.liability_a_percent).toBeGreaterThanOrEqual(75);
    expect(res.liability_a_percent + res.liability_b_percent).toBe(100);
  });

  it("كلاهما خلفي ← مستحيل فيزيائياً ← 50/50 مع علم تعارض", () => {
    const a = makeReport({ impactZone: "rear" });
    const b = makeReport({ impactZone: "rear" });
    const res = generateCrossVerifiedAnalysis(a, b);
    expect(res.liability_a_percent).toBe(50);
    expect(res.consistency_flags.some((f) => f.includes("ZONE_BOTH_REAR"))).toBe(true);
  });
});
