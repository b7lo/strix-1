/**
 * اختبارات أدوات التحقق من الملف الشخصي — العمر وصيغة الهاتف.
 *
 * تشمل حالات حدّية: عمر 18 بالضبط (يجب أن يقبل)، وأقل بيوم واحد (يجب أن يُرفض).
 * نمرّر تاريخاً مرجعياً ثابتاً لجعل الاختبارات مستقلة عن الوقت الفعلي.
 *
 * المتطلبات: 1.6، 4.4، 4.5، القرار 3.
 */
import fc from "fast-check";
import {
  MIN_AGE,
  calculateAge,
  isAdult,
  validateBirthDate,
  validatePhone,
} from "../profileValidation";

// تاريخ مرجعي ثابت لكل الاختبارات: 15 يونيو 2024.
const REF = "2024-06-15";

describe("calculateAge", () => {
  it("يحسب العمر بالسنوات المكتملة بعد مرور عيد الميلاد", () => {
    expect(calculateAge("2000-01-01", REF)).toBe(24);
  });

  it("ينقص سنة إذا لم يمرّ عيد الميلاد بعد في السنة المرجعية", () => {
    expect(calculateAge("2000-12-31", REF)).toBe(23);
  });

  it("يعطي 0 لمولود خلال السنة نفسها", () => {
    expect(calculateAge("2024-01-01", REF)).toBe(0);
  });

  it("يقبل كائن Date كمدخل", () => {
    expect(calculateAge(new Date(1990, 5, 15), new Date(2024, 5, 15))).toBe(34);
  });

  it("يرجع NaN لتاريخ غير صالح", () => {
    expect(calculateAge("not-a-date", REF)).toBeNaN();
    expect(calculateAge("2024-13-40", REF)).toBeNaN();
  });
});

describe("isAdult — الحالات الحدّية للعمر", () => {
  it("يقبل من عمره 18 سنة بالضبط اليوم", () => {
    // مولود في 2006-06-15، والتاريخ المرجعي 2024-06-15 => 18 بالضبط.
    expect(isAdult("2006-06-15", REF)).toBe(true);
    expect(calculateAge("2006-06-15", REF)).toBe(18);
  });

  it("يرفض من ينقصه يوم واحد ليبلغ 18 (يبلغ غداً)", () => {
    // مولود في 2006-06-16 => عمره 17 حتى 2024-06-16.
    expect(isAdult("2006-06-16", REF)).toBe(false);
    expect(calculateAge("2006-06-16", REF)).toBe(17);
  });

  it("يقبل من تجاوز 18 بوضوح", () => {
    expect(isAdult("1990-01-01", REF)).toBe(true);
  });

  it("يرفض التواريخ غير الصالحة", () => {
    expect(isAdult("not-a-date", REF)).toBe(false);
  });
});

describe("validateBirthDate", () => {
  it("يقبل عمر 18 بالضبط", () => {
    expect(validateBirthDate("2006-06-15", REF)).toEqual({ valid: true });
  });

  it("يرفض عمراً أقل من 18 برسالة عربية", () => {
    const result = validateBirthDate("2006-06-16", REF);
    expect(result.valid).toBe(false);
    expect(result.message).toContain(String(MIN_AGE));
  });

  it("يرفض التاريخ الفارغ", () => {
    expect(validateBirthDate("", REF).valid).toBe(false);
    expect(validateBirthDate(null, REF).valid).toBe(false);
    expect(validateBirthDate(undefined, REF).valid).toBe(false);
  });

  it("يرفض التاريخ غير الصالح", () => {
    expect(validateBirthDate("not-a-date", REF).valid).toBe(false);
  });

  it("يرفض تاريخ ميلاد مستقبلي", () => {
    expect(validateBirthDate("2030-01-01", REF).valid).toBe(false);
  });
});

describe("validatePhone", () => {
  it("يقبل الصيغة السعودية المحلية 05XXXXXXXX", () => {
    expect(validatePhone("0512345678")).toEqual({ valid: true });
  });

  it("يقبل الصيغة السعودية الدولية +9665XXXXXXXX", () => {
    expect(validatePhone("+966512345678")).toEqual({ valid: true });
    expect(validatePhone("00966512345678")).toEqual({ valid: true });
  });

  it("يقبل صيغة E.164 دولية عامة", () => {
    expect(validatePhone("+14155552671")).toEqual({ valid: true });
  });

  it("يطبّع المسافات والشرطات والأقواس", () => {
    expect(validatePhone("+966 51 234 5678").valid).toBe(true);
    expect(validatePhone("051-234-5678").valid).toBe(true);
    expect(validatePhone("(051) 234 5678").valid).toBe(true);
  });

  it("يقبل الأرقام العربية الهندية", () => {
    expect(validatePhone("٠٥١٢٣٤٥٦٧٨").valid).toBe(true);
  });

  it("يرفض الأرقام القصيرة أو الطويلة جداً", () => {
    expect(validatePhone("12345").valid).toBe(false);
    expect(validatePhone("051234567").valid).toBe(false); // 9 أرقام
    expect(validatePhone("05123456789").valid).toBe(false); // 11 رقماً
  });

  it("يرفض القيم الفارغة أو غير الرقمية", () => {
    expect(validatePhone("").valid).toBe(false);
    expect(validatePhone(null).valid).toBe(false);
    expect(validatePhone(undefined).valid).toBe(false);
    expect(validatePhone("abcdefghij").valid).toBe(false);
  });
});

/**
 * اختبار قائم على الخصائص لفرض حد العمر (Property 3 في وثيقة التصميم):
 * لا يُسمح بعمر < 18، ويُسمح بعمر ≥ 18. نولّد تواريخ ميلاد ونحسب النتيجة المتوقعة
 * من دالة العمر نفسها ونتأكد من اتساق `isAdult` و`validateBirthDate` معها.
 *
 * **Validates: Requirements 1.6, 4.5**
 */
describe("خاصية فرض حد العمر (Property 3)", () => {
  it("isAdult تتفق دائماً مع شرط العمر ≥ 18", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1900, 0, 1), max: new Date(2024, 5, 15) }),
        (birth) => {
          const age = calculateAge(birth, REF);
          const expected = Number.isFinite(age) && age >= MIN_AGE;
          expect(isAdult(birth, REF)).toBe(expected);
          // validateBirthDate يجب أن يوافق isAdult للتواريخ الصالحة غير المستقبلية.
          if (Number.isFinite(age) && age >= 0) {
            expect(validateBirthDate(birth, REF).valid).toBe(expected);
          }
        }
      )
    );
  });
});
