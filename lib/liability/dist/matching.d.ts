import type { MatchInput, MatchScore } from "./types";
/**
 * قرار المطابقة الموحّد: هل التقريران يصفان نفس الحادث؟
 *
 * نموذج مبني على الأدلّة (evidence-based) بدل نقطة انطلاق ثابتة:
 *   - الوقت (حتى 40 نقطة): الأقرب زمنيًا أقوى دليل.
 *   - المسافة (حتى 35 نقطة، عند توفّر GPS للطرفين).
 *   - الزاوية (25 نقطة): تقارُب زاويتَي الاقتراب.
 *
 * بوّابات صارمة قبل التسجيل: فرق زمني ضمن MAX_TIME_DIFF_MS، ومسافة ضمن
 * MAX_DISTANCE_M عند توفّر GPS. وعند غياب GPS نشترط تقارُب الزاويتَين لمنع
 * التطابق العشوائي.
 *
 * ملاحظة دلالية: `anglesAligned` تعني أن زاويتَي الاقتراب متقاربتان (ضمن
 * ANGLE_ALIGNED_DEG). الاسم السابق `anglesOpposite` كان مضلِّلًا لأن الحساب
 * نفسه يقيس التقارُب لا التعاكُس؛ أبقينا السلوك العددي كما هو وصحّحنا التسمية.
 */
export declare function scoreMatch(a: MatchInput, b: MatchInput): MatchScore;
//# sourceMappingURL=matching.d.ts.map