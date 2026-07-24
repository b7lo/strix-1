import { MATCH } from "./thresholds";
import { haversineDistance } from "./geo";
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
export function scoreMatch(a: MatchInput, b: MatchInput): MatchScore {
  const timeDiffMs = Math.abs(a.timestamp - b.timestamp);

  const hasGPS = Boolean(a.latitude && a.longitude && b.latitude && b.longitude);
  let distanceMeters = 0;
  if (hasGPS) {
    distanceMeters = haversineDistance(
      a.latitude as number,
      a.longitude as number,
      b.latitude as number,
      b.longitude as number,
    );
  }

  const angleDiff = Math.abs(
    ((a.approachAngle - b.approachAngle + 180 + 360) % 360) - 180,
  );
  const anglesAligned = angleDiff < MATCH.ANGLE_ALIGNED_DEG;

  // ── بوّابات صارمة ──
  const failsHardGate =
    timeDiffMs > MATCH.MAX_TIME_DIFF_MS ||
    (hasGPS && distanceMeters > MATCH.MAX_DISTANCE_M) ||
    // بلا GPS ولا تقارُب زاوي → رفض (يمنع التطابق العشوائي في بيئة الاختبار)
    (!hasGPS && !anglesAligned);

  if (failsHardGate) {
    return { isMatch: false, confidence: 0, distanceMeters, timeDiffMs, anglesAligned };
  }

  // ── تسجيل الثقة ──
  let confidence = 0;

  // الوقت (الأهم)
  if (timeDiffMs < 3_000) confidence += 40;
  else if (timeDiffMs < 10_000) confidence += 25;
  else if (timeDiffMs < 30_000) confidence += 10;

  // المسافة (فقط عند توفّر GPS)
  if (hasGPS) {
    if (distanceMeters < 20) confidence += 35;
    else if (distanceMeters < 50) confidence += 25;
    else if (distanceMeters < 100) confidence += 10;
  }

  // الزاوية
  if (anglesAligned) confidence += 25;

  confidence = Math.min(MATCH.MAX_CONFIDENCE, confidence);

  return {
    isMatch: confidence >= MATCH.MIN_CONFIDENCE,
    confidence,
    distanceMeters,
    timeDiffMs,
    anglesAligned,
  };
}
