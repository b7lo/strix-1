import { calculateLiability } from "../liabilityEngine";
import type { AdvancedAnalysisResult, GyroscopeSnapshot } from "../types";

// جيروسكوب صامت (بدون دوران) لسهولة الاختبار
const quietGyro: GyroscopeSnapshot = {
  peakRotationRate: 0,
  spinDetected: false,
  dominantAxis: "none",
  yawRate: 0,
  pitchRate: 0,
  rollRate: 0,
  rolloverDetected: false,
};

// مولّد بيانات تحليل متقدم محايدة للسيناريوهات البسيطة
const neutralAdvanced = (overrides?: Partial<AdvancedAnalysisResult>): AdvancedAnalysisResult => ({
  angularStability: { hadSuddenYaw: false, wasEvasive: false, maxYawRatePreCrash: 0, score: 0 },
  multiVector: { lateralG: 0, longitudinalG: 0, rearPushRatio: 0, score: 0 },
  roadContext: { roadType: "unknown", hasPriority: false, wasStationary: false, confirmedByGyro: false, score: 0 },
  microKinematic: { scrapeDetected: false, highFreqVariance: 0, jerkGyroSync: false, vibrationDurationMs: 0, score: 0 },
  preCrashEvents: { hardBraking: false, hardAcceleration: false, steadyDriving: false, evasiveManeuver: false, score: 0 },
  postImpact: { driftDirection: "none", driftAngleDeg: 0, driftMagnitudeG: 0, stabilizationTimeMs: 0, secondaryImpacts: 0, postImpactRotation: false, postImpactYawRate: 0, vehicleStoppedImmediately: false, postCrashDecelG: 0, directionConfirmed: false, score: 0, factorsAr: [] },
  totalAdjustment: 0,
  discoveredFactorsAr: [],
  ...overrides,
});

describe("Strix Liability Engine - Comprehensive Scenarios", () => {
  // ─────────────────────────────────────────────────────────────────
  // السيناريوهات الخلفية (Rear Impacts)
  // ─────────────────────────────────────────────────────────────────
  describe("Rear Impacts (الاصطدام من الخلف)", () => {
    it("يعطي 0% مسؤولية على المستخدم إذا انصدم من الخلف وهو واقف (100% على الطرف الآخر)", () => {
      const result = calculateLiability("rear", 2.5, 0, 15, null, quietGyro, 1, 0, "rear", neutralAdvanced());
      expect(result.userFaultPercent).toBe(0);
      expect(result.otherFaultPercent).toBe(100);
      expect(result.scenarioCode).toBe("REAR_IMPACT");
      expect(result.factorsAr.length).toBeGreaterThan(0);
    });

    it("يحمّل السائق بعض المسؤولية (15%) في حال الصدمة الخلفية مع فرملة مفاجئة جداً (Brake Checking)", () => {
      const result = calculateLiability(
        "rear",
        3.0,
        60,
        25,
        { brakingDetected: true, brakingDurationSec: 1, decelerationG: 0.8, speedBeforeBraking: 80 },
        quietGyro,
        1,
        0,
        "rear",
        neutralAdvanced({
          preCrashEvents: { hardBraking: true, hardAcceleration: false, steadyDriving: false, evasiveManeuver: false, score: 15 },
          totalAdjustment: 15,
          discoveredFactorsAr: ["رُصدت فرملة مفاجئة وعنيفة من السائق قبل الاصطدام — قد يتحمل جزءاً من المسؤولية (Brake Checking)."]
        })
      );
      // المفترض المسؤولية ترتفع عن الصفر بسبب التوقف المفاجئ غير المبرر
      expect(result.userFaultPercent).toBe(25); // أقرب نسبة من سلم (0,25,50,75,100) هي 25
      expect(result.factorsAr).toContain("رُصدت فرملة مفاجئة وعنيفة من السائق قبل الاصطدام — قد يتحمل جزءاً من المسؤولية (Brake Checking).");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // السيناريوهات الأمامية (Front Impacts)
  // ─────────────────────────────────────────────────────────────────
  describe("Front Impacts (الاصطدام من الأمام)", () => {
    it("يُحمّل المستخدم المسؤولية (75-100%) في الاصطدام الأمامي المباشر", () => {
      const result = calculateLiability("front", 3.0, 40, 20, null, quietGyro, 1, 0, "front", neutralAdvanced());
      // بدون فرملة أو عوامل مخففة، المسؤولية 100% (v7.3)
      expect(result.userFaultPercent).toBe(100);
      expect(result.otherFaultPercent).toBe(0);
    });

    it("لا يخفف مسؤولية السائق حتى إذا قام بمحاولة فرملة قوية قبل الصدمة الأمامية", () => {
      const result = calculateLiability(
        "front",
        3.0,
        40,
        20,
        { brakingDetected: true, brakingDurationSec: 1.5, decelerationG: 0.7, speedBeforeBraking: 60 },
        quietGyro,
        1,
        0,
        "front",
        neutralAdvanced()
      );
      // المسؤولية تبقى 100 (v7.3)
      expect(result.userFaultPercent).toBe(100);
      expect(result.factorsAr.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // السيناريوهات الزاوية (التقاطعات والدوارات)
  // ─────────────────────────────────────────────────────────────────
  describe("Corner Impacts (الاصطدام بالزوايا - تقاطعات وتغيير مسارات)", () => {
    it("زاوية أمامية-يمنى (front-right) + مستقيم = يُرجّح الطرف الآخر دخل المسار (25% مسؤولية)", () => {
      const result = calculateLiability("front", 2.5, 30, 20, null, quietGyro, 1, 0, "front-right", neutralAdvanced());
      
      // fault يبدأ 50، مستقيم = -15، الصدمة حادة (jerk 20) = -5 -> الإجمالي 30. تتقرب إلى 25%
      expect(result.userFaultPercent).toBe(25);
      expect(result.scenarioCode).toBe("CORNER_FRONT_R");
      expect(result.factorsAr.length).toBeGreaterThan(0);
    });

    it("زاوية أمامية-يسرى (front-left) + دوران قوي = السائق يغير مساره (75% مسؤولية)", () => {
      const changingLaneGyro = { ...quietGyro, dominantAxis: "yaw" as const, yawRate: 50 };
      const advanced = neutralAdvanced();

      const result = calculateLiability("front", 2.0, 30, 15, null, changingLaneGyro, 1, 0, "front-left", advanced);
      
      // fault يبدأ 50، دوران = +20 -> الإجمالي 70. تتقرب إلى 75%
      expect(result.userFaultPercent).toBe(75);
      expect(result.factorsAr.length).toBeGreaterThan(0);
    });

    it("زاوية أمامية داخل دوار = 0% مسؤولية (لصالح السائق لأن له الأولوية)", () => {
      const result = calculateLiability(
        "front", 
        2.5, 
        25, 
        18, 
        null, 
        quietGyro, 
        1, 
        0, 
        "front-right",
        neutralAdvanced({
          roadContext: { roadType: "roundabout", hasPriority: true, wasStationary: false, confirmedByGyro: true, score: -40 },
          totalAdjustment: -40
        })
      );
      // Base corner fault ≈ 30 (مستقيم). مع الدوار (-40) = -10، تتقرب لـ 0%
      expect(result.userFaultPercent).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // السيناريوهات الجانبية (Side Impacts)
  // ─────────────────────────────────────────────────────────────────
  describe("Side Impacts (الاصطدام الجانبي)", () => {
    it("صدمة جانبية وأنت متوقف تماماً = 0% مسؤولية (الطرف الآخر اندفع عليك)", () => {
      const result = calculateLiability(
        "side-left",
        2.4,
        0, // واقف
        18,
        null,
        quietGyro,
        1,
        0,
        "side-left",
        neutralAdvanced({
          roadContext: { roadType: "unknown", hasPriority: false, wasStationary: true, confirmedByGyro: false, score: -35 },
          totalAdjustment: -35
        })
      );
      // fault = 35. مع التوقف (-35) = 0
      expect(result.userFaultPercent).toBe(0);
    });

    it("صدمة جانبية مع دفع من الخلف بزاوية (rearPushRatio عالٍ) = يُحمّل الطرف الآخر المسؤولية", () => {
      const result = calculateLiability(
        "side-right",
        2.8,
        40,
        20,
        null,
        quietGyro,
        1,
        0,
        "side-right",
        neutralAdvanced({
          multiVector: { lateralG: 2.0, longitudinalG: 1.5, rearPushRatio: 0.42, score: -28 },
          totalAdjustment: -28,
          discoveredFactorsAr: ["تحليل متجهات القوة يُظهر مركبة طولية بنسبة 42٪ — الطرف الآخر كان مندفعاً بزاوية وليس بشكل عمودي"]
        })
      );
      // fault = 48 (في Side). مع الدفع من الخلف (-28) = 20، تتقرب لـ 25%
      expect(result.userFaultPercent).toBe(25);
      expect(result.factorsAr).toContain("تحليل متجهات القوة يُظهر مركبة طولية بنسبة 42٪ — الطرف الآخر كان مندفعاً بزاوية وليس بشكل عمودي");
    });
  });
});
