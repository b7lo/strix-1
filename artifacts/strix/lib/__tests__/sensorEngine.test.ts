import {
  resetFilter,
  setSampleRate,
  applyHighPassFilter,
  calculateGForce,
  recordSample,
  recordGyroscopeSample,
  getGyroscopeSnapshot,
  detectImpactZone,
  isEngineReady,
  setPhoneYawOffset,
  isDirectionCalibrated,
  registerThresholdCrossing,
  resetCrashStreak,
  isInstantStrongCrash,
  getRingBuffer,
  getPreCrashBuffer,
} from "../sensorUtils";

/** يغذّي المحرك بقراءات جاذبية ثابتة حتى يتقارب تقدير الجاذبية لاتجاه معيّن */
function settleGravity(raw: { x: number; y: number; z: number }, n = 200) {
  for (let i = 0; i < n; i++) applyHighPassFilter(raw);
}

function mag(v: { x: number; y: number; z: number }) {
  return calculateGForce(v.x, v.y, v.z);
}

describe("Strix Sensor Engine", () => {
  beforeEach(() => {
    resetFilter();
    setSampleRate(50);
  });

  // ─────────────────────────────────────────────────────────────
  // A-1: بوّابة الاستقرار
  // ─────────────────────────────────────────────────────────────
  describe("A-1: isEngineReady (بوّابة الاستقرار)", () => {
    it("غير جاهز قبل استقرار الـ baseline", () => {
      for (let i = 0; i < 60; i++) {
        recordSample(0.0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
      }
      expect(isEngineReady()).toBe(false);
    });

    it("جاهز بعد استقرار الـ baseline (≥250 عيّنة @50Hz)", () => {
      for (let i = 0; i < 260; i++) {
        recordSample(0.0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
      }
      expect(isEngineReady()).toBe(true);
    });

    it("resetFilter يمسح المخزن الحلقي فعلياً بين الجلسات", () => {
      recordSample(1, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 });
      expect(getRingBuffer()).toHaveLength(1);
      resetFilter();
      expect(getRingBuffer()).toHaveLength(0);
      recordSample(2, { x: 2, y: 0, z: 0 }, { x: 2, y: 0, z: 1 });
      expect(getRingBuffer()).toHaveLength(1);
      expect(getRingBuffer()[0].gForce).toBe(2);
    });

    it("نافذة ما قبل الحادث تستبعد عينات بداية الصدمة", () => {
      const nowSpy = jest.spyOn(Date, "now");
      nowSpy.mockReturnValueOnce(1_000);
      recordSample(0.1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
      nowSpy.mockReturnValueOnce(1_950);
      recordSample(3, { x: 0, y: -3, z: 0 }, { x: 0, y: -3, z: 1 });
      nowSpy.mockRestore();

      const preCrash = getPreCrashBuffer(5, 2_000);
      expect(preCrash.map((s) => s.gForce)).toEqual([0.1]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // A-2: القمة صادقة بلا تنعيم + رفض السبايك المفرد عبر debounce
  // ─────────────────────────────────────────────────────────────
  describe("A-2: قمة صادقة + debounce", () => {
    it("نبضة قوية تُسجَّل بقيمتها الحقيقية (بلا تنعيم يقصّها)", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200);
      const hit = applyHighPassFilter({ x: 0, y: 0, z: 6 }); // صدمة ~5g صافية
      expect(mag(hit)).toBeGreaterThan(4.0);
    });

    it("قمة معزولة (عيّنة واحدة) لم تعد تنهار إلى ~0 (إصلاح بق 0.1g)", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200);
      // نمط متذبذب: عالٍ معزول بين قيم منخفضة — كان median يقتله
      applyHighPassFilter({ x: 0, y: 0, z: 1 });
      const spike = applyHighPassFilter({ x: 0, y: 0, z: 9 });
      expect(mag(spike)).toBeGreaterThan(7.9); // ~8g صافية بلا سحب فوري للجاذبية
    });

    it("الجوال الثابت يقرأ ~0g بعد نزع الجاذبية", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200);
      const still = applyHighPassFilter({ x: 0, y: 0, z: 1 });
      expect(mag(still)).toBeLessThan(0.2);
    });

    it("debounce: سبايك مفرد لا يُفعّل، عيّنتان متتاليتان تُفعّلان", () => {
      resetCrashStreak();
      // عيّنة واحدة فوق العتبة → لا تفعيل
      expect(registerThresholdCrossing(true)).toBe(false);
      // عيّنة ثانية متتالية → تفعيل
      expect(registerThresholdCrossing(true)).toBe(true);
    });

    it("debounce: قراءة واحدة عالية ثم هبوط لا تُفعّل (رفض الضوضاء)", () => {
      resetCrashStreak();
      expect(registerThresholdCrossing(true)).toBe(false); // سبايك مفرد
      expect(registerThresholdCrossing(false)).toBe(false); // عاد طبيعي → صفر
      expect(registerThresholdCrossing(true)).toBe(false); // واحدة فقط مجدداً
    });

    it("المسار الفوري لا يلغي debounce عند تجاوز حدّي فقط", () => {
      expect(isInstantStrongCrash(2.1, 2.0)).toBe(false);
      expect(isInstantStrongCrash(3.0, 2.0)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // إطار السيارة: اتجاه الصدمة (جاذبية مسطّحة على Z)
  // ─────────────────────────────────────────────────────────────
  describe("detectImpactZone (إطار السيارة، جوال مسطّح)", () => {
    beforeEach(() => settleGravity({ x: 0, y: 0, z: 1 }, 200));

    it("قوة جانبية يمنى/يسرى ← منطقة جانبية", () => {
      expect(detectImpactZone({ x: 2, y: 0, z: 0 })).toBe("side-left");
      expect(detectImpactZone({ x: -2, y: 0, z: 0 })).toBe("side-right");
    });

    it("قوة طولية ← أمامي/خلفي", () => {
      // الحساس يقيس ردة الفعل (معكوسة): vec.y سالب ← المصدر من الأمام
      expect(detectImpactZone({ x: 0, y: -2, z: 0 })).toBe("front");
      expect(detectImpactZone({ x: 0, y: 2, z: 0 })).toBe("rear");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // A-5: الجيروسكوب — فصل الدوران الرأسي عن الأفقي + وحدات deg/s
  // ─────────────────────────────────────────────────────────────
  describe("A-5: getGyroscopeSnapshot", () => {
    it("دوران رأسي صرف ← yaw كبير، roll ≈ 0، المحور المهيمن yaw", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200); // الأعلى = +Z
      for (let i = 0; i < 40; i++) recordGyroscopeSample({ x: 0, y: 0, z: 3 }); // 3 rad/s حول Z
      const snap = getGyroscopeSnapshot();
      expect(snap.yawRate).toBeGreaterThan(120); // ~172 deg/s
      expect(snap.rollRate).toBeLessThan(30);
      expect(snap.dominantAxis).toBe("yaw");
    });

    it("دوران أفقي صرف ← roll كبير، yaw ≈ 0، كشف انقلاب", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200);
      for (let i = 0; i < 40; i++) recordGyroscopeSample({ x: 3, y: 0, z: 0 }); // حول محور أفقي
      const snap = getGyroscopeSnapshot();
      expect(snap.rollRate).toBeGreaterThan(120);
      expect(snap.yawRate).toBeLessThan(30);
      expect(snap.rolloverDetected).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // A-3: معايرة اتجاه الجوال
  // ─────────────────────────────────────────────────────────────
  describe("A-3: معايرة الاتجاه", () => {
    it("افتراضياً غير معاير", () => {
      expect(isDirectionCalibrated()).toBe(false);
    });

    it("تدوير 90° يحوّل القوة الجانبية إلى طولية", () => {
      settleGravity({ x: 0, y: 0, z: 1 }, 200);
      // بدون معايرة: قوة على X ← جانبية
      expect(detectImpactZone({ x: 2, y: 0, z: 0 })).toContain("side");
      // بعد تدوير الإطار 90°: نفس القوة تصبح طولية (أمامي/خلفي)
      setPhoneYawOffset(Math.PI / 2);
      expect(isDirectionCalibrated()).toBe(true);
      const zone = detectImpactZone({ x: 2, y: 0, z: 0 });
      expect(["front", "rear"]).toContain(zone);
    });

    it("بدء جلسة جديدة يمسح معايرة الجلسة السابقة", () => {
      setPhoneYawOffset(Math.PI / 3);
      expect(isDirectionCalibrated()).toBe(true);
      resetFilter();
      expect(isDirectionCalibrated()).toBe(false);
    });
  });
});
