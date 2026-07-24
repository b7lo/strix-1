/**
 * اختبارات أداة سياسة كلمة المرور — validatePassword.
 * تضمن رفض كلمات المرور الضعيفة (طول ناقص أو فئة أحرف مفقودة) وقبول القوية،
 * مع رسائل عربية دقيقة لكل قاعدة غير مستوفاة (القرار 4 / المتطلب 1.5).
 */
import fc from "fast-check";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_POLICY_MESSAGES,
  validatePassword,
} from "../passwordPolicy";

describe("validatePassword", () => {
  it("يقبل كلمة مرور تستوفي جميع القواعد", () => {
    const result = validatePassword("Abcdef12");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("يقبل كلمة مرور بطول 8 أحرف بالضبط (الحالة الحدّية)", () => {
    expect("Abcdef12".length).toBe(MIN_PASSWORD_LENGTH);
    const result = validatePassword("Abcdef12");
    expect(result.valid).toBe(true);
  });

  it("يرفض كلمة مرور أقصر من الحد الأدنى مع رسالة الطول", () => {
    const result = validatePassword("Abc123"); // 6 أحرف
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.minLength);
  });

  it("يرفض كلمة مرور بلا حرف كبير", () => {
    const result = validatePassword("abcdef12");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.uppercase);
    expect(result.errors).not.toContain(PASSWORD_POLICY_MESSAGES.lowercase);
  });

  it("يرفض كلمة مرور بلا حرف صغير", () => {
    const result = validatePassword("ABCDEF12");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.lowercase);
  });

  it("يرفض كلمة مرور بلا رقم", () => {
    const result = validatePassword("Abcdefgh");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.digit);
  });

  it("يرفض السلسلة الفارغة مع كل رسائل الأخطاء", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        PASSWORD_POLICY_MESSAGES.minLength,
        PASSWORD_POLICY_MESSAGES.uppercase,
        PASSWORD_POLICY_MESSAGES.lowercase,
        PASSWORD_POLICY_MESSAGES.digit,
      ]),
    );
    expect(result.errors).toHaveLength(4);
  });

  it("يجمع أخطاء متعددة عند فقدان أكثر من قاعدة", () => {
    const result = validatePassword("abc"); // قصيرة + بلا حرف كبير + بلا رقم
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.minLength);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.uppercase);
    expect(result.errors).toContain(PASSWORD_POLICY_MESSAGES.digit);
  });

  // اختبار قائم على الخصائص: أي كلمة مرور تجمع الفئات الأربع وتبلغ الطول الأدنى
  // يجب أن تكون صالحة دائمًا.
  it("خاصية: كلمة مرور تجمع الفئات الأربع بطول كافٍ تكون صالحة دائمًا", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z]$/),
        fc.stringMatching(/^[a-z]$/),
        fc.stringMatching(/^[0-9]$/),
        fc.string({ minLength: 5 }),
        (upper, lower, digit, filler) => {
          const password = upper + lower + digit + filler;
          if (password.length < MIN_PASSWORD_LENGTH) return true; // خارج النطاق
          return validatePassword(password).valid === true;
        },
      ),
    );
  });

  // خاصية: كلمة مرور أقصر من الحد الأدنى تُرفض دائمًا وتتضمن رسالة الطول.
  it("خاصية: أي كلمة مرور أقصر من الحد الأدنى تُرفض", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: MIN_PASSWORD_LENGTH - 1 }),
        (short) => {
          const result = validatePassword(short);
          return (
            result.valid === false &&
            result.errors.includes(PASSWORD_POLICY_MESSAGES.minLength)
          );
        },
      ),
    );
  });
});
