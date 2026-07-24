/**
 * عرض رقمي "قبل/بعد" لإثبات التحسن الفعلي في الخوارزمية.
 * يطبع الأرقام في الـ console ويتأكد أن اتجاه التحسن صحيح.
 *
 * شغّله بـ:  npx jest improvementDemo --verbose
 */
import {
  resetFilter,
  setSampleRate,
  applyHighPassFilter,
  calculateGForce,
  recordGyroscopeSample,
  getGyroscopeSnapshot,
} from "../sensorUtils";

/** يحاكي فلتر Kalman القديم (q=0.008, r=0.1) كما كان على مسار الكشف */
function oldKalmanPeak(steady: number, spike: number, spikeCount: number): number {
  let x = 0;
  let p = 1;
  const q = 0.008;
  const r = 0.1;
  const update = (m: number) => {
    p += q;
    const k = p / (p + r);
    x += k * (m - x);
    p *= 1 - k;
    return x;
  };
  // استقرار على الجاذبية
  for (let i = 0; i < 200; i++) update(steady);
  // النبضة
  let peak = 0;
  for (let i = 0; i < spikeCount; i++) {
    const v = update(spike);
    peak = Math.max(peak, Math.abs(v - steady)); // بعد نزع الجاذبية
  }
  return peak;
}

describe("عرض التحسّن (قبل/بعد)", () => {
  beforeEach(() => {
    resetFilter();
    setSampleRate(50);
  });

  it("A-2: القمة الصادقة (خام بلا تنعيم) مقابل Kalman القديم الذي يقصّها", () => {
    const GRAVITY = 1; // الجاذبية على المحور z
    const SPIKE = 6;   // صدمة 6g
    const SPIKE_SAMPLES = 3;

    // القديم (Kalman)
    const oldPeak = oldKalmanPeak(GRAVITY, SPIKE, SPIKE_SAMPLES);

    // الجديد (خام منزوع الجاذبية، بلا تنعيم)
    for (let i = 0; i < 200; i++) applyHighPassFilter({ x: 0, y: 0, z: GRAVITY });
    let newPeak = 0;
    for (let i = 0; i < SPIKE_SAMPLES; i++) {
      const f = applyHighPassFilter({ x: 0, y: 0, z: SPIKE });
      newPeak = Math.max(newPeak, calculateGForce(f.x, f.y, f.z));
    }

    console.log(`\n[A-2] صدمة حقيقية = ${SPIKE - GRAVITY}g صافية`);
    console.log(`      peakG القديم (Kalman) = ${oldPeak.toFixed(2)}g  ← مقصوص`);
    console.log(`      peakG الجديد (خام صادق) = ${newPeak.toFixed(2)}g  ← صادق`);
    console.log(`      التحسّن = ${((newPeak / oldPeak - 1) * 100).toFixed(0)}% أقرب للحقيقة\n`);

    expect(newPeak).toBeGreaterThan(oldPeak * 1.5); // الجديد أعلى بوضوح
    expect(newPeak).toBeGreaterThan(4.0);           // قريب من 5g الحقيقية
    expect(oldPeak).toBeLessThan(4.0);              // القديم مقصوص
  });

  it("A-5: تصحيح الوحدات يجعل كشف تغيير المسار يعمل فعلاً", () => {
    const HIGH_YAW_RATE = 45; // العتبة في liabilityEngine
    const omega = 0.85;       // rad/s ≈ انحراف حقيقي (~49 deg/s)

    // القديم: yawRate كان يُخرج rad/s → يُقارن بـ 45
    const oldYawValue = omega; // ≈ 0.85

    // الجديد: deg/s
    for (let i = 0; i < 200; i++) applyHighPassFilter({ x: 0, y: 0, z: 1 }); // الأعلى = z
    for (let i = 0; i < 40; i++) recordGyroscopeSample({ x: 0, y: 0, z: omega });
    const newYawValue = getGyroscopeSnapshot().yawRate;

    console.log(`\n[A-5] انحراف حقيقي = ${(omega * 180 / Math.PI).toFixed(0)} deg/s`);
    console.log(`      القديم: yawRate=${oldYawValue.toFixed(2)} (rad/s) > 45 ؟ ${oldYawValue > HIGH_YAW_RATE}  ← لا يتحقق أبداً`);
    console.log(`      الجديد: yawRate=${newYawValue.toFixed(0)} (deg/s) > 45 ؟ ${newYawValue > HIGH_YAW_RATE}  ← يعمل\n`);

    expect(oldYawValue).toBeLessThan(HIGH_YAW_RATE);  // القديم: الكشف معطّل
    expect(newYawValue).toBeGreaterThan(HIGH_YAW_RATE); // الجديد: الكشف يعمل
  });
});
