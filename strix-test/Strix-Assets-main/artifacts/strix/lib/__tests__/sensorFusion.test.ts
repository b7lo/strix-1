/**
 * اختبارات طبقة دمج الحساسات (VehicleFrameEstimator) + tiltCompensatedHeading
 * + طبقة جودة البيانات (assessDataQuality).
 *
 * الفكرة: نحاكي قيادة مستقيمة مع تسارع/فرملة طولية، ونتحقق أن المُقدِّر
 * يستعيد إزاحة دوران الجوال (yawOffset) المعروفة بغضّ النظر عن توجيه الجوال
 * الابتدائي — وهو جوهر حل A-3 (الاستقلال عن اتجاه الهاتف).
 */
import {
  VehicleFrameEstimator,
  tiltCompensatedHeadingRad,
} from "../vehicleFrameEstimator";
import { assessDataQuality } from "../dataQuality";

/**
 * يحاكي سلسلة أحداث تسارع/فرملة طولية بينما "أمام السيارة" عند الزاوية theta
 * في إطار الجوال المستوي.
 * @param accelerating true=تسارع (المتجه للأمام)، false=فرملة (المتجه للخلف)
 * @param yawRateDegS معدل دوران لحظي (لاختبار بوّابة رفض الانعطاف)
 */
function feedEvents(
  est: VehicleFrameEstimator,
  thetaRad: number,
  n: number,
  accelerating = true,
  yawRateDegS = 0
) {
  const m = 0.2; // مقدار التسارع الأفقي المُسوّى (g) ≈ 2 m/s²
  // أثناء التسارع للأمام يشير المتجه للأمام؛ أثناء الفرملة يشير للخلف
  const sign = accelerating ? 1 : -1;
  const ax = sign * m * Math.sin(thetaRad);
  const ay = sign * m * Math.cos(thetaRad);

  let ts = 1000;
  let speed = accelerating ? 20 : 60;

  // تهيئة EMA للتسارع على القيمة الهدف
  for (let i = 0; i < 25; i++) est.addAccelSample(ax, ay, ts, yawRateDegS);
  est.addSpeedSample(speed, ts); // بذرة prevSpeed

  for (let i = 0; i < n; i++) {
    ts += 1000;
    for (let k = 0; k < 5; k++) est.addAccelSample(ax, ay, ts, yawRateDegS);
    speed += accelerating ? 4 : -4; // ±1.11 m/s² (> عتبة 0.7)
    est.addSpeedSample(speed, ts);
  }
}

describe("VehicleFrameEstimator (دمج الحساسات — حل A-3)", () => {
  it("الجوال محاذٍ للسيارة (offset=0): يستعيد yawOffset ≈ 0 ويُعاير", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, 0, 12, true);
    const e = est.getEstimate();
    expect(e.calibrated).toBe(true);
    expect(Math.abs(e.yawOffsetRad)).toBeLessThan(0.05);
    expect(e.confidence).toBeGreaterThanOrEqual(70);
    expect(e.resultant).toBeGreaterThan(0.9);
  });

  it("الجوال مُدار 45°: يستعيد yawOffset ≈ π/4 (استقلال عن التوجيه)", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, Math.PI / 4, 12, true);
    const e = est.getEstimate();
    expect(e.calibrated).toBe(true);
    expect(Math.abs(e.yawOffsetRad - Math.PI / 4)).toBeLessThan(0.06);
  });

  it("الجوال مُدار 90°: يستعيد yawOffset ≈ π/2", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, Math.PI / 2, 12, true);
    const e = est.getEstimate();
    expect(Math.abs(e.yawOffsetRad - Math.PI / 2)).toBeLessThan(0.06);
  });

  it("الفرملة (تسارع طولي سالب) تستعيد نفس الاتجاه الصحيح", () => {
    const est = new VehicleFrameEstimator();
    // أمام السيارة عند 30°، لكن الأحداث فرملة (المتجه للخلف) → يجب استعادة 30°
    feedEvents(est, Math.PI / 6, 12, false);
    const e = est.getEstimate();
    expect(Math.abs(e.yawOffsetRad - Math.PI / 6)).toBeLessThan(0.06);
  });

  it("بوّابة الانعطاف: دوران عالٍ (>12°/s) يمنع تسجيل أحداث المعايرة", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, 0, 12, true, 30); // yawRate=30°/s أثناء كل عيّنة
    const e = est.getEstimate();
    expect(e.eventCount).toBe(0);
    expect(e.calibrated).toBe(false);
  });

  it("عدد أحداث غير كافٍ: لا يُعاير", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, 0, 3, true); // < VF_MIN_EVENTS(8)
    const e = est.getEstimate();
    expect(e.calibrated).toBe(false);
  });

  it("سرعة منخفضة (< 18 كم/س): لا تُسجَّل أحداث", () => {
    const est = new VehicleFrameEstimator();
    let ts = 1000;
    for (let i = 0; i < 25; i++) est.addAccelSample(0, 0.2, ts, 0);
    est.addSpeedSample(5, ts);
    for (let i = 0; i < 10; i++) {
      ts += 1000;
      for (let k = 0; k < 5; k++) est.addAccelSample(0, 0.2, ts, 0);
      est.addSpeedSample(5 + i * 0.5, ts); // يبقى < 18
    }
    expect(est.getEstimate().eventCount).toBe(0);
  });

  it("reset يمسح كل الحالة", () => {
    const est = new VehicleFrameEstimator();
    feedEvents(est, 0, 12, true);
    expect(est.getEstimate().eventCount).toBeGreaterThan(0);
    est.reset();
    expect(est.getEstimate().eventCount).toBe(0);
    expect(est.getEstimate().calibrated).toBe(false);
  });
});

describe("tiltCompensatedHeadingRad", () => {
  it("جوال مسطّح (الجاذبية على Z): heading = atan2(magX, magY)", () => {
    const grav = { x: 0, y: 0, z: 9.81 };
    expect(tiltCompensatedHeadingRad({ x: 0, y: 1, z: 0 }, grav)).toBeCloseTo(0, 5);
    expect(tiltCompensatedHeadingRad({ x: 1, y: 0, z: 0 }, grav)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("يُزيل المركبة الموازية للجاذبية (لا تأثير للمجال الرأسي)", () => {
    const grav = { x: 0, y: 0, z: 9.81 };
    const h1 = tiltCompensatedHeadingRad({ x: 0, y: 1, z: 0 }, grav);
    const h2 = tiltCompensatedHeadingRad({ x: 0, y: 1, z: 50 }, grav); // أضفنا مجالاً رأسياً
    expect(h1).toBeCloseTo(h2, 5);
  });

  it("يُرجِع قيمة منتهية لأي مدخل (متانة)", () => {
    const h = tiltCompensatedHeadingRad({ x: 3, y: -2, z: 1 }, { x: 0, y: 9.81, z: 0 });
    expect(Number.isFinite(h)).toBe(true);
  });
});

describe("assessDataQuality (طبقة جودة البيانات)", () => {
  const goodInput = {
    engineReady: true,
    sampleRateHz: 50,
    gyroscopeEnabled: true,
    hasGps: true,
    directionCalibrated: true,
    directionConfidence: 80,
    roadType: "smooth" as const,
    peakGForce: 3.0,
  };

  it("كل المدخلات جيدة → جودة عالية", () => {
    const r = assessDataQuality(goodInput);
    expect(r.level).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.accelLikelySaturated).toBe(false);
    expect(r.limitations.length).toBe(0);
  });

  it("اتجاه غير معاير: لا يسمح بجودة high حتى لو الدرجة عالية", () => {
    const r = assessDataQuality({ ...goodInput, directionCalibrated: false });
    expect(r.level).not.toBe("high");
    expect(r.limitations).toContain("dq.directionUncalibrated");
  });

  it("بلا GPS + معدل عيّنات منخفض → جودة منخفضة", () => {
    const r = assessDataQuality({
      ...goodInput,
      hasGps: false,
      sampleRateHz: 10,
      directionCalibrated: false,
      gyroscopeEnabled: false,
      roadType: "rough",
    });
    expect(r.level).toBe("low");
    expect(r.limitations).toContain("dq.gpsMissing");
  });

  it("قمة قوة عالية جداً (≥15g) → تحذير تشبّع المسرّع", () => {
    const r = assessDataQuality({ ...goodInput, peakGForce: 18 });
    expect(r.accelLikelySaturated).toBe(true);
    expect(r.limitations).toContain("dq.accelSaturated");
  });

  it("طريق وعِر يضيف قيداً", () => {
    const r = assessDataQuality({ ...goodInput, roadType: "rough" });
    expect(r.limitations).toContain("dq.roadRough");
  });
});
