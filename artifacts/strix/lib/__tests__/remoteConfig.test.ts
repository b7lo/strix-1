/**
 * اختبارات Remote Config — دالة الترشيح النقية sanitizeRemoteConfig.
 * تضمن أن التجاوزات لا تقبل إلا المفاتيح المعروفة والقيم الرقمية الصالحة،
 * فلا يستطيع خادم/رد فاسد كسر معايرة المحرك.
 */
import { sanitizeRemoteConfig } from "../remoteConfig";
import { THRESHOLDS } from "../thresholds";

describe("sanitizeRemoteConfig", () => {
  it("يقبل المفاتيح المعروفة بقيم رقمية صالحة فقط", () => {
    const out = sanitizeRemoteConfig({ G_MODERATE: 2.5, HIGH_YAW_RATE: 50 });
    expect(out).toEqual({ G_MODERATE: 2.5, HIGH_YAW_RATE: 50 });
  });

  it("يتجاهل المفاتيح غير المعروفة", () => {
    const out = sanitizeRemoteConfig({ NOT_A_KEY: 5, G_MODERATE: 3 });
    expect(out).toEqual({ G_MODERATE: 3 });
    expect((out as Record<string, unknown>).NOT_A_KEY).toBeUndefined();
  });

  it("يتجاهل القيم غير الرقمية أو غير المنتهية (NaN/Infinity/نص/null)", () => {
    const out = sanitizeRemoteConfig({
      G_MODERATE: "3" as unknown as number,
      G_SEVERE: NaN,
      G_CRITICAL: Infinity,
      JERK_HIGH: null as unknown as number,
      HIGH_YAW_RATE: 42,
    });
    expect(out).toEqual({ HIGH_YAW_RATE: 42 });
  });

  it("يرجع كائنًا فارغًا لمدخلات غير صالحة (null/مصفوفة/نص)", () => {
    expect(sanitizeRemoteConfig(null)).toEqual({});
    expect(sanitizeRemoteConfig([1, 2, 3])).toEqual({});
    expect(sanitizeRemoteConfig("oops")).toEqual({});
    expect(sanitizeRemoteConfig(undefined)).toEqual({});
  });

  it("كل مفتاح مُرجَع موجود فعلًا في THRESHOLDS", () => {
    const out = sanitizeRemoteConfig({ G_MODERATE: 2.1, VF_MIN_SPEED_KMH: 20 });
    for (const key of Object.keys(out)) {
      expect(key in THRESHOLDS).toBe(true);
    }
  });
});
