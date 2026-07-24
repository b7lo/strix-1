/**
 * أدوات التحقق من الملف الشخصي — حساب العمر والتحقق من الحد الأدنى (18 سنة)
 * والتحقق من صيغة رقم الهاتف.
 *
 * المتطلبات: 1.6 (رفض التسجيل لعمر < 18)، 4.4 (رفض صيغ غير صالحة للهاتف/التاريخ)،
 * 4.5 (رفض حفظ الملف لعمر < 18)، والقرار 3 (تاريخ الميلاد إلزامي والحد الأدنى 18).
 *
 * يُطبَّق التحقق في العميل كطبقة أولى، ويطابق دلالة قيد قاعدة البيانات:
 *   CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
 * أي أن من أكمل 18 سنة اليوم بالضبط يُقبل، ومن ينقصه يوم واحد يُرفض.
 *
 * يمرَّر تاريخ مرجعي اختياري (`reference`) لجعل الاختبارات مستقلة عن الوقت الفعلي؛
 * وعند غيابه يُستخدم تاريخ اليوم.
 */

/** الحد الأدنى المسموح للعمر (بالسنوات). */
export const MIN_AGE = 18;

/** نوع المدخل المقبول للتاريخ: سلسلة نصية (ISO) أو كائن Date. */
export type DateInput = string | Date | null | undefined;

/** رموز أخطاء تاريخ الميلاد المستقلة عن اللغة (تُترجَم في الواجهة عبر i18n). */
export type BirthDateErrorCode = "required" | "invalid" | "future" | "minAge";

/** رموز أخطاء رقم الهاتف المستقلة عن اللغة (تُترجَم في الواجهة عبر i18n). */
export type PhoneErrorCode = "required" | "invalid";

/** نوع دالة الترجمة (i18next `t`) بما يكفي لاحتياجات التحقق. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** نتيجة تحقق عامة مع رمز خطأ ورسالة عربية اختيارية عند الفشل. */
export interface ValidationResult {
  /** صحيحة عند استيفاء الشرط. */
  valid: boolean;
  /** رسالة الخطأ العربية عند الفشل (مُبقاة للتوافق الخلفي والاختبارات). */
  message?: string;
  /**
   * رمز الخطأ المستقل عن اللغة عند الفشل. تستخدمه الواجهة لاختيار مفتاح الترجمة
   * المناسب عبر i18n بدلاً من عرض الرسالة العربية الثابتة.
   */
  code?: string;
}

/** رسائل الأخطاء العربية لتاريخ الميلاد (مُصدّرة للاستخدام في الواجهة والاختبارات). */
export const BIRTH_DATE_MESSAGES = {
  required: "تاريخ الميلاد مطلوب.",
  invalid: "صيغة تاريخ الميلاد غير صالحة.",
  future: "تاريخ الميلاد لا يمكن أن يكون في المستقبل.",
  minAge: `يجب ألا يقل العمر عن ${MIN_AGE} سنة.`,
} as const;

/** رسائل الأخطاء العربية لرقم الهاتف. */
export const PHONE_MESSAGES = {
  required: "رقم الهاتف مطلوب.",
  invalid: "صيغة رقم الهاتف غير صالحة.",
} as const;

/** تمثيل مبسّط للتاريخ بمكوّناته السنوية/الشهرية/اليومية. */
interface YMD {
  year: number;
  /** الشهر (0-based، كما في Date). */
  month: number;
  day: number;
}

/**
 * تحوّل مدخل التاريخ إلى مكوّنات (سنة/شهر/يوم) بشكل ثابت:
 * - كائن Date: تُقرأ مكوّناته المحلية.
 * - سلسلة نصية: تُحلَّل ثم تُقرأ مكوّناتها بتوقيت UTC لتفادي انزياح المنطقة الزمنية
 *   مع سلاسل التاريخ من نوع YYYY-MM-DD.
 *
 * تُرجع `null` للمدخلات الفارغة أو غير الصالحة.
 */
function toYMD(input: DateInput): YMD | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return { year: input.getFullYear(), month: input.getMonth(), day: input.getDate() };
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth(),
      day: parsed.getUTCDate(),
    };
  }

  return null;
}

/** يقارن تاريخين: يُرجع سالباً إذا a قبل b، وصفراً إذا تساويا، وموجباً إذا a بعد b. */
function compareYMD(a: YMD, b: YMD): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * يحسب العمر بالسنوات المكتملة اعتماداً على تاريخ الميلاد وتاريخ مرجعي.
 *
 * @param birthDate تاريخ الميلاد (سلسلة ISO أو كائن Date).
 * @param reference التاريخ المرجعي (افتراضياً اليوم).
 * @returns عدد السنوات المكتملة، أو `NaN` إذا كان أحد التاريخين غير صالح.
 */
export function calculateAge(birthDate: DateInput, reference: DateInput = new Date()): number {
  const birth = toYMD(birthDate);
  const ref = toYMD(reference);
  if (!birth || !ref) return NaN;

  let age = ref.year - birth.year;
  // إن لم يمرّ عيد الميلاد بعد في السنة المرجعية، ننقص سنة.
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) {
    age -= 1;
  }
  return age;
}

/**
 * يحدّد ما إذا كان الشخص بالغاً (عمره ≥ {@link MIN_AGE}).
 *
 * @returns `true` عند بلوغ الحد الأدنى، و`false` للأعمار الأقل أو التواريخ غير الصالحة.
 */
export function isAdult(birthDate: DateInput, reference: DateInput = new Date()): boolean {
  const age = calculateAge(birthDate, reference);
  return Number.isFinite(age) && age >= MIN_AGE;
}

/**
 * يتحقق من صلاحية تاريخ الميلاد: موجود، وصيغته صحيحة، وليس مستقبلياً، والعمر ≥ 18.
 *
 * @returns نتيجة تحقق مع رسالة عربية عند الفشل.
 */
export function validateBirthDate(
  birthDate: DateInput,
  reference: DateInput = new Date()
): ValidationResult {
  // حقل إلزامي: فارغ/غير موجود يُرفض.
  if (
    birthDate === null ||
    birthDate === undefined ||
    (typeof birthDate === "string" && birthDate.trim() === "")
  ) {
    return { valid: false, code: "required", message: BIRTH_DATE_MESSAGES.required };
  }

  const birth = toYMD(birthDate);
  if (!birth) {
    return { valid: false, code: "invalid", message: BIRTH_DATE_MESSAGES.invalid };
  }

  const ref = toYMD(reference) ?? toYMD(new Date());
  if (ref && compareYMD(birth, ref) > 0) {
    return { valid: false, code: "future", message: BIRTH_DATE_MESSAGES.future };
  }

  if (!isAdult(birthDate, reference)) {
    return { valid: false, code: "minAge", message: BIRTH_DATE_MESSAGES.minAge };
  }

  return { valid: true };
}

/** يحوّل الأرقام العربية-الهندية (٠-٩) والفارسية (۰-۹) إلى أرقام لاتينية. */
function normalizeDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

// الصيغ المقبولة بعد التطبيع وإزالة رموز التنسيق:
/** الصيغة السعودية المحلية: 05 يتبعها 8 أرقام (10 أرقام إجمالاً). */
const SAUDI_LOCAL = /^05\d{8}$/;
/** صيغة E.164 دولية تبدأ بـ +: من 8 إلى 15 رقماً. */
const INTL_PLUS = /^\+\d{8,15}$/;
/** صيغة دولية ببادئة 00: يتبعها من 8 إلى 15 رقماً. */
const INTL_ZEROS = /^00\d{8,15}$/;

/**
 * يتحقق من صلاحية صيغة رقم الهاتف.
 *
 * يقبل: الصيغة السعودية المحلية (05XXXXXXXX)، والدولية (+9665XXXXXXXX أو
 * 00966...)، وصيغة E.164 العامة (+CountryCode...). يطبّع الأرقام العربية-الهندية
 * ويتجاهل المسافات والشرطات والأقواس والنقاط.
 *
 * @returns نتيجة تحقق مع رسالة عربية عند الفشل.
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
  if (phone === null || phone === undefined) {
    return { valid: false, code: "required", message: PHONE_MESSAGES.required };
  }
  if (typeof phone !== "string" || phone.trim() === "") {
    return { valid: false, code: "required", message: PHONE_MESSAGES.required };
  }

  // تطبيع الأرقام العربية ثم إزالة رموز التنسيق الشائعة.
  const normalized = normalizeDigits(phone);
  const cleaned = normalized.replace(/[\s\-().]/g, "");

  // يُسمح بعلامة + في البداية فقط، وبقية المحارف أرقام حصراً.
  if (!/^\+?\d+$/.test(cleaned)) {
    return { valid: false, code: "invalid", message: PHONE_MESSAGES.invalid };
  }

  if (SAUDI_LOCAL.test(cleaned) || INTL_PLUS.test(cleaned) || INTL_ZEROS.test(cleaned)) {
    return { valid: true };
  }

  return { valid: false, code: "invalid", message: PHONE_MESSAGES.invalid };
}

/**
 * يترجم نتيجة تحقق تاريخ الميلاد إلى رسالة موطّنة عبر i18n.
 *
 * @returns الرسالة المترجمة عند الفشل، أو `undefined` عند النجاح أو غياب الرمز.
 */
export function translateBirthDateError(
  result: ValidationResult,
  t: Translate
): string | undefined {
  if (result.valid || !result.code) return undefined;
  return t(`validation.birthDate.${result.code}`, { age: MIN_AGE });
}

/**
 * يترجم نتيجة تحقق رقم الهاتف إلى رسالة موطّنة عبر i18n.
 *
 * @returns الرسالة المترجمة عند الفشل، أو `undefined` عند النجاح أو غياب الرمز.
 */
export function translatePhoneError(
  result: ValidationResult,
  t: Translate
): string | undefined {
  if (result.valid || !result.code) return undefined;
  return t(`validation.phone.${result.code}`);
}
