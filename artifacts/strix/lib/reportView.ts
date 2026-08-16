/**
 * ═══════════════════════════════════════════════════════════════════
 * reportView — طبقة العرض الموحّدة (single source of presentation truth)
 * ═══════════════════════════════════════════════════════════════════
 *
 * كانت نسبة "خطأك" وصياغة النص تُشتق في أكثر من ٥ أماكن بطرق مختلفة، ما أدّى
 * إلى تناقضات: البطاقات تعرض التحقق المتقاطع (مثلاً 75٪) بينما النص يبقى على
 * تقدير الهاتف الواحد (0٪)، وتضارب في وصف المنطقة (خلفي/جانبي).
 *
 * تحسم هذه الدالة كل ذلك: تحسب النسبة الفعّالة (المتحقّقة إن وُجدت وإلا الأولية)
 * وتُعيد توليد الخلاصة والوصف من **نفس** تلك النسبة والمنطقة الفعّالة، فتتطابق
 * كل الأرقام والنصوص المعروضة. يستعملها التقرير وتصدير PDF معًا.
 */
import i18n from "./i18n";
import type { AccidentReport, ImpactZone, ImpactDirection } from "./types";
import type { AccidentConfidenceModel } from "./confidence/types";
import type { EvidenceItem } from "./scenario/types";
import { buildLiabilityNarrative, zoneToImpactDirection } from "./liabilityEngine";

/**
 * فوق هذا الحدّ (g/s) نعدّ قراءة الـ jerk تشبّعًا/ضوضاء مستشعر لا دليلاً فيزيائياً.
 * قراءات مثل 300+ g/s غير واقعية وتنتج عن تشبّع مسرّع الهاتف، فلا تُذكر كدليل.
 */
export const JERK_PLAUSIBLE_MAX_G_S = 60;

export interface ReportView {
  /** هل النتيجة مبنية على تحقّق متقاطع مع هاتف الطرف الآخر؟ */
  crossVerified: boolean;
  /** نسبة خطأ صاحب هذا التقرير (٪). */
  mineFaultPercent: number;
  /** نسبة خطأ الطرف الآخر (٪). */
  otherFaultPercent: number;
  /** منطقة الاصطدام الفعّالة (المتحقّقة إن وُجدت). */
  effectiveZone: ImpactZone;
  /** الاتجاه العام المشتقّ من المنطقة الفعّالة. */
  effectiveDirection: ImpactDirection;
  /** منطقة بديلة عند تقارب الاحتمالين الأعلى. */
  alternativeZone: ImpactZone | null;
  /** اسم السيناريو (يصف ما حدث فيزيائياً — لا يتغيّر بالنسبة). */
  scenarioAr: string;
  /** خلاصة بسيطة متّسقة مع النسبة والمنطقة الفعّالتين. */
  plainSummary: string;
  /** وصف تفصيلي متّسق مع النسبة والمنطقة الفعّالتين. */
  descriptionAr: string;
  /** قيمة الـ jerk الخام (g/s) كما قيست. */
  jerkRaw: number;
  /** هل قراءة الـ jerk مشبّعة/غير موثوقة؟ (لعرض تنبيه بدل اعتبارها دليلاً). */
  jerkSaturated: boolean;
  /** معرف القاعدة الهندسية التي أنتجت تقدير المسؤولية. */
  ruleId: string | null;
  /** الأدلة المؤيدة والمعارضة والقيود القابلة للعرض. */
  evidence: EvidenceItem[];
  limitations: string[];
  /** درجات الثقة الخمس المستقلة. */
  confidenceModel: AccidentConfidenceModel | null;
}

/**
 * يحسب حالة العرض الموحّدة لتقرير حادث.
 */
export function getReportView(report: AccidentReport): ReportView {
  const cva = report.crossVerifiedAnalysis ?? null;
  const isCross = !!cva;
  // التقرير الذي بدأ المطابقة هو الطرف A؛ نتحقق أيّهما نحن لاختيار النسبة الصحيحة.
  const isPartyA = cva ? cva.accident_a_id === report.id : false;

  const mineFaultPercent = cva
    ? isPartyA
      ? cva.liability_a_percent
      : cva.liability_b_percent
    : report.liabilityScore;
  const otherFaultPercent = 100 - mineFaultPercent;

  const effectiveZone: ImpactZone = cva
    ? isPartyA
      ? cva.verified_impact_zone_a
      : cva.verified_impact_zone_b
    : report.impactZone;
  const effectiveDirection = zoneToImpactDirection(effectiveZone);
  const distribution = isCross ? null : report.impactZoneDistribution ?? null;
  const alternativeZone = distribution && distribution.ambiguity >= 0.75
    ? distribution.alternativeZone
    : null;

  const effectiveSpeed = cva
    ? isPartyA
      ? cva.verified_speed_a_kmh
      : cva.verified_speed_b_kmh
    : report.preCrashSpeedKmh ?? report.speedKmh;

  const jerkRaw = report.jerkPeak;
  const jerkSaturated = jerkRaw > JERK_PLAUSIBLE_MAX_G_S;
  // عند التشبّع لا نمرّر الـ jerk للنص (كي لا يُذكر كدليل "قوة خارجية مباغتة").
  const narrativeJerk = jerkSaturated ? 0 : jerkRaw;

  // التحقق المتقاطع نتيجة مؤكّدة، فتُصاغ بلا تحفّظ "تقديري".
  const isConclusive = isCross ? true : report.confidence === "high";

  const { plainSummaryAr, descriptionAr } = buildLiabilityNarrative({
    direction: effectiveDirection,
    zone: effectiveZone,
    fault: mineFaultPercent,
    g: report.peakGForce,
    speed: effectiveSpeed,
    jerk: narrativeJerk,
    severity: report.severity,
    braking: report.braking,
    isConclusive,
  });

  return {
    crossVerified: isCross,
    mineFaultPercent,
    otherFaultPercent,
    effectiveZone,
    effectiveDirection,
    alternativeZone,
    scenarioAr: report.scenarioAr,
    plainSummary: plainSummaryAr,
    descriptionAr: isCross
      ? descriptionAr + i18n.t("sysNotes.crossAdjusted")
      : descriptionAr,
    jerkRaw,
    jerkSaturated,
    ruleId: report.liabilityRuleId ?? null,
    evidence: report.liabilityEvidence ?? [],
    limitations: report.liabilityLimitations ?? [],
    confidenceModel: report.confidenceModel ?? null,
  };
}
