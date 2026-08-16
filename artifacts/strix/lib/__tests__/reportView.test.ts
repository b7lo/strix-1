import i18n from "../i18n";
import { getReportView } from "../reportView";
import type { AccidentReport, CrossVerifiedAnalysis, ImpactZone } from "../types";

function makeReport(over: Partial<AccidentReport>): AccidentReport {
  return {
    id: "acc-a",
    timestamp: 1_000_000_000_000,
    peakGForce: 1.8,
    jerkPeak: 12,
    impactZone: "rear-left" as ImpactZone,
    impactDirection: "rear",
    speedKmh: 0,
    preCrashSpeedKmh: 0,
    latitude: 24.7,
    longitude: 46.6,
    severity: "minor",
    liabilityScore: 0,
    confidence: "medium",
    scenarioCode: "X",
    scenarioAr: "احتكاك جانبي سطحي",
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
    crossVerifiedAnalysis: null,
    ...over,
  } as AccidentReport;
}

function makeCVA(over: Partial<CrossVerifiedAnalysis>): CrossVerifiedAnalysis {
  return {
    id: "cva-1",
    accident_a_id: "acc-a",
    accident_b_id: "acc-b",
    verified_impact_zone_a: "rear-left",
    verified_impact_zone_b: "front",
    verified_speed_a_kmh: 0,
    verified_speed_b_kmh: 40,
    first_contact_party: "A",
    consistency_status: "VERIFIED",
    consistency_flags: [],
    liability_a_percent: 75,
    liability_b_percent: 25,
    created_at: Date.now(),
    ...over,
  };
}

describe("reportView: مصدر عرض موحّد بلا تناقض", () => {
  it("عند التحقق المتقاطع، النص يتبع نفس النسبة المعروضة (لا 75٪/0٪)", () => {
    const report = makeReport({
      liabilityScore: 0, // التقدير الأولي القديم
      crossVerifiedAnalysis: makeCVA({ liability_a_percent: 75, liability_b_percent: 25 }),
    });
    const view = getReportView(report);

    expect(view.mineFaultPercent).toBe(75);
    expect(view.otherFaultPercent).toBe(25);

    // الخلاصة تستخدم عبارة "الجزء الأكبر عليك" لا عبارة "الخطأ بالكامل على الطرف الآخر"
    expect(view.plainSummary).toContain(i18n.t("liability.summaryWhoMostlyYou"));
    expect(view.plainSummary).not.toContain(i18n.t("liability.summaryWhoOther"));

    // الوصف يذكر الحكم المطابق للنسبة 75
    expect(view.descriptionAr).toContain(i18n.t("liability.faultVerdict75"));
    expect(view.descriptionAr).not.toContain(i18n.t("liability.faultVerdict0"));
  });

  it("الطرف B يأخذ نسبته الصحيحة لا نسبة A", () => {
    const report = makeReport({
      id: "acc-b",
      crossVerifiedAnalysis: makeCVA({ liability_a_percent: 75, liability_b_percent: 25 }),
    });
    const view = getReportView(report);
    expect(view.mineFaultPercent).toBe(25);
    expect(view.effectiveZone).toBe("front");
  });

  it("وصف المنطقة متّسق: خلفي يبقى خلفي في الخلاصة والاتجاه", () => {
    const report = makeReport({
      crossVerifiedAnalysis: makeCVA({ verified_impact_zone_a: "rear-left" }),
    });
    const view = getReportView(report);
    expect(view.effectiveDirection).toBe("rear");
    expect(view.plainSummary).toContain(i18n.t("zone.rear-left"));
  });

  it("قراءة jerk مشبّعة (317 g/s) لا تُذكر كدليل في الوصف", () => {
    const report = makeReport({
      jerkPeak: 317,
      crossVerifiedAnalysis: makeCVA({}),
    });
    const view = getReportView(report);
    expect(view.jerkSaturated).toBe(true);
    // لا تظهر عبارة "التسارع المفاجئ ... g/s"
    expect(view.descriptionAr).not.toContain("g/s");
  });

  it("بلا تحقّق متقاطع: النسبة = التقدير الأولي", () => {
    const report = makeReport({ liabilityScore: 50, crossVerifiedAnalysis: null });
    const view = getReportView(report);
    expect(view.mineFaultPercent).toBe(50);
    expect(view.crossVerified).toBe(false);
  });

  it("يعرض المنطقة البديلة فقط عند تقارب الاحتمالات", () => {
    const report = makeReport({
      impactZone: "front",
      impactZoneDistribution: {
        probabilities: {
          front: 0.44,
          "front-right": 0.43,
          "side-right": 0.03,
          "rear-right": 0.02,
          rear: 0.01,
          "rear-left": 0.01,
          "side-left": 0.02,
          "front-left": 0.03,
          unknown: 0.01,
        },
        primaryZone: "front",
        alternativeZone: "front-right",
        ambiguity: 0.99,
      },
    });
    expect(getReportView(report).alternativeZone).toBe("front-right");
  });
});
