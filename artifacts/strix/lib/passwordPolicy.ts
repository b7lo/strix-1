/**
 * أداة سياسة كلمة المرور — تتحقق من استيفاء كلمة المرور للحد الأدنى المطلوب.
 *
 * السياسة (القرار 4 / المتطلب 1.5):
 *   - 8 أحرف كحد أدنى.
 *   - حرف كبير واحد على الأقل (A-Z).
 *   - حرف صغير واحد على الأقل (a-z).
 *   - رقم واحد على الأقل (0-9).
 *
 * تُرجع الدالة النتيجة مع رسائل خطأ عربية لكل قاعدة غير مستوفاة، ليُطبَّق نفس
 * التحقق في العميل قبل استدعاء Supabase Auth.
 */

/** الحد الأدنى لطول كلمة المرور. */
export const MIN_PASSWORD_LENGTH = 8;

/** رموز أخطاء سياسة كلمة المرور المستقلة عن اللغة (تُترجَم في الواجهة عبر i18n). */
export type PasswordErrorCode = "minLength" | "uppercase" | "lowercase" | "digit";

/** نوع دالة الترجمة (i18next `t`) بما يكفي لاحتياجات التحقق. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** نتيجة التحقق من كلمة المرور. */
export interface PasswordValidationResult {
  /** صحيحة عندما تُستوفى جميع قواعد السياسة. */
  valid: boolean;
  /** رسائل الأخطاء العربية للقواعد غير المستوفاة (مُبقاة للتوافق والاختبارات). */
  errors: string[];
  /** رموز الأخطاء المستقلة عن اللغة للقواعد غير المستوفاة (فارغة عند النجاح). */
  codes: PasswordErrorCode[];
}

/** رسائل الأخطاء العربية لكل قاعدة (مُصدّرة للاستخدام في الاختبارات والواجهة). */
export const PASSWORD_POLICY_MESSAGES = {
  minLength: `يجب أن تحتوي كلمة المرور على ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
  uppercase: "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل.",
  lowercase: "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل.",
  digit: "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.",
} as const;

/**
 * تتحقق من مطابقة كلمة المرور لسياسة كلمات المرور.
 *
 * @param password كلمة المرور المُدخلة.
 * @returns نتيجة التحقق مع قائمة رسائل الأخطاء العربية.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const codes: PasswordErrorCode[] = [];
  const value = typeof password === "string" ? password : "";

  if (value.length < MIN_PASSWORD_LENGTH) {
    errors.push(PASSWORD_POLICY_MESSAGES.minLength);
    codes.push("minLength");
  }
  if (!/[A-Z]/.test(value)) {
    errors.push(PASSWORD_POLICY_MESSAGES.uppercase);
    codes.push("uppercase");
  }
  if (!/[a-z]/.test(value)) {
    errors.push(PASSWORD_POLICY_MESSAGES.lowercase);
    codes.push("lowercase");
  }
  if (!/[0-9]/.test(value)) {
    errors.push(PASSWORD_POLICY_MESSAGES.digit);
    codes.push("digit");
  }

  return { valid: errors.length === 0, errors, codes };
}

/**
 * يترجم رموز أخطاء كلمة المرور إلى رسائل موطّنة عبر i18n.
 *
 * @returns مصفوفة الرسائل المترجمة (فارغة عند النجاح).
 */
export function translatePasswordErrors(
  result: PasswordValidationResult,
  t: Translate
): string[] {
  return result.codes.map((code) =>
    t(`validation.password.${code}`, { min: MIN_PASSWORD_LENGTH })
  );
}
