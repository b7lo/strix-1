import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { AccidentReport, Severity } from "./types";
import { ZONE_LABELS_AR } from "./types";
import i18n from "./i18n";
import { getReportView } from "./reportView";
import { STRIX_LOGO_DATA_URI } from "./logoBase64";

/**
 * ═══════════════════════════════════════════════════════════════════
 * لوحة ألوان التقرير — موحّدة مع tokens التطبيق (constants/colors.ts)
 * ═══════════════════════════════════════════════════════════════════
 * كل ألوان الـ PDF تشتق من هنا فقط، لضمان التناسق مع هوية التطبيق.
 */
const C = {
  brand: "#1DB768", // Strix Green (primary)
  accent: "#0d8a49", // Deep Green
  text: "#111411", // Foreground
  textSoft: "#3A403A", // نص فقرات ثانوي
  muted: "#5F6B5F", // Muted foreground (WCAG AA)
  mutedLight: "#8A9A8A", // نص خافت / تلميحات
  cardBg: "#F5F8F5", // Card
  chipBg: "#E8EDE8", // Secondary / رقائق
  border: "#E8EDE8", // Border
  destructive: "#FF3B30", // Critical Red
  warning: "#FF9340", // Moderate Orange
  success: "#1DB768", // Safe Green
  info: "#007AFF", // Info Blue
} as const;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return char;
    }
  });
}

// لوجو ستركس الحقيقي (نفس ملف التطبيق assets/images/logo-insid-the-app.png)
// مضمّن كـ data URI حتى يظهر في الـ PDF بلا ملفات خارجية.
function logoSvg(): string {
  return `<img src="${STRIX_LOGO_DATA_URI}" width="120" height="120" alt="Strix" style="display:block;object-fit:contain;margin:0 auto;" />`;
}

/** علامة صح منسّقة (بديل الإيموجي ✔ لضمان تناسق الطباعة) */
function checkMark(color: string = C.success): string {
  return `<span style="color:${color};font-weight:bold;">&#10003;</span>`;
}

/** رسم بياني بسيط (SVG) لمنحنى السرعة قبل الحادث. المحور الرأسي أرقام فقط (LTR). */
function speedChartSvg(history: number[]): string {
  const W = 500;
  const H = 150;
  const PAD = 34;
  const max = Math.max(...history, 1);
  const n = history.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  const points = history
    .map((v, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (Math.max(0, v) / max) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;">
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="${C.border}" stroke-width="1" />
      <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="${C.border}" stroke-width="1" />
      <polyline points="${points}" fill="none" stroke="${C.brand}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      <text x="6" y="${PAD - 4}" font-size="10" fill="${C.muted}">${Math.round(max)}</text>
      <text x="6" y="${H - PAD}" font-size="10" fill="${C.muted}">0</text>
    </svg>`;
}

export async function exportReportToPDF(report: AccidentReport) {
  const t = (k: string, opts?: Record<string, unknown>) => i18n.t(k, opts as any) as string;
  const isAr = i18n.language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const htmlLang = isAr ? "ar" : "en";
  const align = isAr ? "right" : "left";
  const borderSide = isAr ? "border-right" : "border-left";
  const padSide = isAr ? "padding-right" : "padding-left";
  const pct = (n: number) => (isAr ? `${n}٪` : `${n}%`);
  const now = new Date();
  const dateStr = new Date(report.timestamp).toLocaleString(isAr ? "ar-SA" : "en-US");
  const generatedStr = now.toLocaleString(isAr ? "ar-SA" : "en-US");
  // دقة موحّدة ~11م، متسقة مع تنظيف الخصوصية عند التخزين
  const coord = (v: number) => v.toFixed(4);

  // ألوان الشدّة الموحّدة (نفس قيم التطبيق)
  const SEV_COLOR: Record<Severity, string> = {
    critical: C.destructive,
    severe: C.destructive,
    moderate: C.warning,
    minor: C.success,
  };
  const sevLabel: Record<Severity, string> = {
    critical: t("report.severityCritical"),
    severe: t("report.severitySevere"),
    moderate: t("report.severityModerate"),
    minor: t("report.severityMinor"),
  };

  // مصدر العرض الموحّد: نسبة ونص ومنطقة متّسقة (نفس منطق شاشة التقرير).
  const view = getReportView(report);

  const zoneLabel = view.effectiveZone
    ? t(`zone.${view.effectiveZone}`, { defaultValue: ZONE_LABELS_AR[view.effectiveZone] })
    : t("zone.unknown", { defaultValue: "—" });

  // ─── تحليل الطرف الآخر ───
  let otherPartySection = "";
  if (report.otherParty) {
    const op = report.otherParty;
    const vehMap: Record<string, string> = {
      light: t("pdf.vehLight"), medium: t("pdf.vehMedium"), heavy: t("pdf.vehHeavy"),
    };
    const forceMap: Record<string, string> = {
      light: t("report.severityMinor"), moderate: t("report.severityModerate"),
      heavy: t("report.severitySevere"), severe: t("report.severityCritical"),
    };
    otherPartySection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid ${C.destructive};">
        <div class="card-title" style="color: ${C.destructive};">${t("pdf.otherPartyTitle")}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
          <div style="flex: 1; min-width: 200px;">
            <p><strong>${t("pdf.approachAngle")}:</strong> ${op.approachAngleDeg}°</p>
            <p><strong>${t("pdf.estSpeed")}:</strong> ~${op.estimatedSpeedKmh} ${t("report.kmh")}</p>
            <p><strong>${t("pdf.impactForce")}:</strong> ${forceMap[op.impactForce] ?? op.impactForce}</p>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <p><strong>${t("pdf.vehicleType")}:</strong> ${vehMap[op.vehicleType] ?? op.vehicleType}</p>
            <p><strong>${t("pdf.accelBefore")}:</strong> ${op.wasAccelerating ? t("pdf.accelYes") : t("pdf.no")}</p>
            <p><strong>${t("pdf.brakeBefore")}:</strong> ${op.wasBraking ? t("pdf.brakeYes") : t("pdf.no")}</p>
          </div>
        </div>
        <p style="margin-top: 15px; color: ${C.muted}; font-size: 13px;">${escapeHtml(op.descriptionAr)}</p>
        <p style="margin-top: 10px; color: ${C.mutedLight}; font-size: 11px;">${t("pdf.confidence")}: ${pct(op.confidencePercent)}</p>
      </div>`;
  }

  // ─── جودة الأدلة والثقة ───
  let dataQualitySection = "";
  if (report.dataQualityScore != null || report.confidence) {
    const dq = report.dataQualityLevel;
    const dqColor = dq === "high" ? C.success : dq === "medium" ? C.warning : dq === "low" ? C.destructive : C.muted;
    const confColor = report.confidence === "high" ? C.success : report.confidence === "medium" ? C.warning : C.destructive;
    const confLabel = report.confidence === "high" ? t("pdf.confHigh") : report.confidence === "medium" ? t("pdf.confMedium") : t("pdf.confLow");
    const limitations = report.dataQualityLimitations ?? [];
    dataQualitySection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid ${C.brand};">
        <div class="card-title" style="color: ${C.brand};">${t("pdf.dataQualityTitle")}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 28px; align-items: center;">
          ${report.dataQualityScore != null
            ? `<div><div style="font-size: 12px; color: ${C.muted};">${t("pdf.dataQualityScore")}</div><div style="font-size: 24px; font-weight: bold; color: ${dqColor}; direction: ltr;">${Math.round(report.dataQualityScore)}/100</div></div>`
            : ""}
          <div><div style="font-size: 12px; color: ${C.muted};">${t("pdf.confidenceLevelLabel")}</div><div style="font-size: 16px; font-weight: bold; color: ${confColor};">${confLabel}</div></div>
        </div>
        ${limitations.length > 0
          ? `<div style="margin-top: 14px;"><p style="font-size: 12px; font-weight: bold; color: ${C.text}; margin-bottom: 6px;">${t("pdf.limitationsLabel")}:</p><ul style="margin: 0; ${padSide}: 16px; font-size: 12px; color: ${C.textSoft};">${limitations.map((l) => `<li style="margin-bottom: 4px;">${escapeHtml(t(l, { defaultValue: l }))}</li>`).join("")}</ul></div>`
          : ""}
      </div>`;
  }

  // ─── الكروكي ───
  let croquisSection = "";
  if (report.croquis?.svgString) {
    let locationHtml = "";
    if (report.latitude && report.longitude) {
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coord(report.latitude)},${coord(report.longitude)}`;
      locationHtml = `
        <div style="margin-top: 15px; padding: 12px; background: ${C.chipBg}; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: ${C.text};"><strong>${t("pdf.coords")}:</strong> <span dir="ltr">${coord(report.latitude)}, ${coord(report.longitude)}</span></p>
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: ${C.text};">${t("pdf.mapsLink")}:</p>
          <p style="margin: 0; direction: ltr; font-size: 11px;">
            <a href="${mapsLink}" style="color: ${C.info}; text-decoration: underline;">${mapsLink}</a>
          </p>
        </div>`;
    }
    croquisSection = `
      <div class="card" style="margin-bottom: 24px; text-align: center;">
        <div class="card-title">${t("pdf.croquisTitle")}</div>
        <div style="display: flex; justify-content: center; margin: 20px 0;">${report.croquis.svgString}</div>
        ${locationHtml}
        <p style="color: ${C.mutedLight}; font-size: 11px; margin-top: 10px;">${t("pdf.croquisNote")}</p>
      </div>`;
  }

  // ─── منحنى السرعة قبل الحادث (يُعرض فقط عند وجود حركة فعلية) ───
  let speedChartSection = "";
  if (report.speedHistory && report.speedHistory.length >= 2 && Math.max(...report.speedHistory) >= 5) {
    speedChartSection = `
      <div class="card" style="margin-bottom: 24px; text-align: center;">
        <div class="card-title" style="text-align: ${align};">${t("pdf.speedChartTitle")} <span style="color:${C.mutedLight};font-weight:normal;">(${t("report.kmh")})</span></div>
        <div style="display: flex; justify-content: center; margin-top: 12px;">${speedChartSvg(report.speedHistory)}</div>
      </div>`;
  }

  // ─── مقارنة مع تقرير الجهة الرسمية ───
  let faultSection = "";
  if (report.faultAssessment) {
    const fa = report.faultAssessment;
    const authName = fa.authoritySource === "najm"
      ? t("assessment.authorityNajm")
      : fa.authoritySource === "saudi_traffic"
      ? t("assessment.authoritySaudiTraffic")
      : (fa.authorityOther || t("assessment.authorityOther"));
    const diff = fa.liabilityDifference;
    const diffColor = diff === 0 ? C.success : C.warning;
    const diffLabel = diff === 0 ? t("pdf.matchExact") : pct(Math.abs(diff));
    faultSection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid ${C.info};">
        <div class="card-title" style="color: ${C.info};">${t("pdf.faultCompareTitle")}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
          <div style="flex: 1; min-width: 140px;"><div style="font-size: 12px; color: ${C.muted};">${t("pdf.appEstimateLabel")}</div><div style="font-size: 22px; font-weight: bold; color: ${C.text}; direction: ltr;">${pct(fa.appLiability)}</div></div>
          <div style="flex: 1; min-width: 140px;"><div style="font-size: 12px; color: ${C.muted};">${t("pdf.authorityEstimateLabel")} (${escapeHtml(authName)})</div><div style="font-size: 22px; font-weight: bold; color: ${C.text}; direction: ltr;">${pct(fa.najmLiability)}</div></div>
          <div style="flex: 1; min-width: 140px;"><div style="font-size: 12px; color: ${C.muted};">${t("pdf.differenceLabel")}</div><div style="font-size: 22px; font-weight: bold; color: ${diffColor}; direction: ltr;">${diffLabel}</div></div>
        </div>
        ${fa.userDescription ? `<p style="margin-top: 12px; color: ${C.textSoft}; font-size: 13px;">${escapeHtml(fa.userDescription)}</p>` : ""}
      </div>`;
  }

  // ─── التحليل المتقدم ───
  let advancedAnalysisSection = "";
  if (report.advancedAnalysis) {
    const aa = report.advancedAnalysis;
    const adjSign = aa.totalAdjustment > 0 ? "+" : "";
    const adjColor = aa.totalAdjustment > 0 ? C.destructive : (aa.totalAdjustment < 0 ? C.success : C.muted);
    const roadMap: Record<string, string> = {
      roundabout: t("pdf.roadRoundabout"), intersection: t("pdf.roadIntersection"),
      highway: t("pdf.roadHighway"), urban: t("pdf.roadUrban"), unknown: t("pdf.roadUnknown"),
    };
    const heading = aa.angularStability.wasEvasive ? t("pdf.headingEvasive")
      : (aa.angularStability.hadSuddenYaw ? t("pdf.headingSwerve") : t("pdf.headingStable"));
    const driving = aa.preCrashEvents.hardBraking ? t("pdf.hardBraking")
      : (aa.preCrashEvents.hardAcceleration ? t("pdf.hardAccel") : t("pdf.steadyDriving"));

    advancedAnalysisSection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid ${C.accent};">
        <div class="card-title" style="color: ${C.accent};">${t("pdf.advancedTitle")}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid ${C.border};">
          <span style="font-size: 14px; color: ${C.textSoft};">${t("pdf.adjustLabel")}:</span>
          <span style="font-size: 20px; font-weight: bold; color: ${adjColor}; direction: ltr;">${adjSign}${pct(aa.totalAdjustment)}</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; font-size: 13px;">
          <div style="flex: 1; min-width: 220px;">
            <p><strong>${t("pdf.vehicleHeading")}:</strong> ${heading}</p>
            <p><strong>${t("pdf.accidentLocation")}:</strong> ${roadMap[aa.roadContext.roadType]} ${aa.roadContext.wasStationary ? t("pdf.wasStationary") : ""}</p>
            <p><strong>${t("pdf.postDrift")}:</strong> ${aa.postImpact.driftDirection !== "none" ? checkMark() + " (" + aa.postImpact.driftMagnitudeG + "g)" : t("pdf.none")}</p>
          </div>
          <div style="flex: 1; min-width: 220px;">
            <p><strong>${t("pdf.impactDir")}:</strong> ${aa.multiVector.rearPushRatio > 0.3 ? t("pdf.rearPush") : t("pdf.normal")}</p>
            <p><strong>${t("pdf.drivingBefore")}:</strong> ${driving}</p>
            <p><strong>${t("pdf.stabilizationTime")}:</strong> ${aa.postImpact.stabilizationTimeMs}ms ${aa.postImpact.secondaryImpacts > 0 ? `(${aa.postImpact.secondaryImpacts} ${t("pdf.secondaryImpacts")})` : ""}</p>
          </div>
        </div>
        <div style="background: ${C.chipBg}; padding: 12px 15px; border-radius: 8px;">
          <p style="font-size: 12px; font-weight: bold; color: ${C.text}; margin-bottom: 8px;">${t("pdf.systemConclusions")}:</p>
          <ul style="margin: 0; ${padSide}: 15px; font-size: 12px; color: ${C.textSoft};">
            ${aa.discoveredFactorsAr.length > 0
              ? aa.discoveredFactorsAr.map((f) => `<li style="margin-bottom: 4px;">${escapeHtml(f)}</li>`).join("")
              : `<li>${t("pdf.noExtraDetails")}</li>`}
          </ul>
        </div>
      </div>`;
  }

  // ─── المطابقة ───
  let matchSection = "";
  if (report.matchedAccidentId) {
    matchSection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid ${C.info};">
        <div class="card-title" style="color: ${C.info};">${t("pdf.matchTitle")}</div>
        <p style="color: ${C.textSoft};">${t("pdf.matchDesc")}</p>
        <p style="color: ${C.textSoft};">${t("pdf.matchConfidence")}: ${pct(report.matchConfidence ?? 0)}</p>
        <p style="color: ${C.mutedLight}; font-size: 11px; margin-top: 10px;">${t("pdf.matchId")}: ${escapeHtml(report.matchedAccidentId)}</p>
      </div>`;
  }

  // ─── المسؤولية: نطاق عند عدم القطعية (A-6) ───
  // عند التحقق المتقاطع النتيجة قاطعة (نعرض النسبة الفعّالة)؛ وإلا نُبقي نطاق
  // التقدير الأولي إن كان غير قاطع. النسبة تُؤخذ من مصدر العرض الموحّد.
  const liabilityValueHtml = !view.crossVerified && report.liabilityConclusive === false && report.liabilityRange
    ? `${pct(report.liabilityRange[0])} – ${pct(report.liabilityRange[1])}<div style="font-size:11px;color:${C.mutedLight};font-weight:normal;margin-top:4px;">${t("pdf.liabilityRangeNote")}</div>`
    : pct(view.mineFaultPercent);

  const html = `
    <!DOCTYPE html>
    <html lang="${htmlLang}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t("appName")} — ${t("pdf.title")}</title>
      <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, "SF Arabic", "Segoe UI", Tahoma, sans-serif; padding: 32px; margin: 0; color: ${C.text}; line-height: 1.6; text-align: ${align}; }
        p { margin: 6px 0; }
        .header { text-align: center; border-bottom: 2px solid ${C.border}; padding-bottom: 20px; margin-bottom: 30px; }
        .brandRow { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .brandName { font-size: 30px; font-weight: 800; color: ${C.brand}; letter-spacing: 1px; }
        .subtitle { font-size: 12px; color: ${C.muted}; margin-top: 4px; }
        .title { font-size: 22px; font-weight: bold; margin-top: 12px; color: ${C.text}; }
        .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
        .card { background: ${C.cardBg}; border: 1px solid ${C.border}; padding: 20px; border-radius: 12px; flex: 1; min-width: 250px; }
        .card-title { font-size: 14px; color: ${C.muted}; margin-bottom: 10px; font-weight: 600; }
        .card-value { font-size: 24px; font-weight: bold; color: ${C.text}; }
        .factor-list { ${padSide}: 20px; margin: 0; }
        .factor-item { margin-bottom: 8px; color: ${C.textSoft}; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid ${C.border}; font-size: 12px; color: ${C.muted}; }
        .legal { margin-top: 24px; padding: 14px 16px; background: ${C.cardBg}; border: 1px solid ${C.border}; border-radius: 10px; font-size: 11px; line-height: 1.7; color: ${C.muted}; }
        .summary { margin-bottom: 22px; padding: 14px 18px; background: ${C.brand}14; border: 1px solid ${C.brand}55; ${borderSide}: 4px solid ${C.brand}; border-radius: 10px; font-size: 15px; font-weight: 600; line-height: 1.7; color: ${C.text}; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; color: #fff; background-color: ${SEV_COLOR[report.severity]}; }
        .rollover { color: ${C.destructive}; font-weight: bold; border: 1px solid ${C.destructive}; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
        a { color: ${C.info}; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brandRow">
          ${logoSvg()}
        </div>
        <div class="subtitle">${t("pdf.subtitle")}</div>
        <div class="title">${t("pdf.title")}</div>
        <p style="color: ${C.muted}; margin-top: 5px;">${t("pdf.refNo")}: #${escapeHtml(report.id.toUpperCase())}</p>
        <p style="color: ${C.muted};">${t("pdf.date")}: ${dateStr}</p>
      </div>

      ${view.plainSummary ? `<div class="summary">${escapeHtml(view.plainSummary)}</div>` : ""}

      <div class="grid">
        <div class="card">
          <div class="card-title">${t("pdf.basicInfo")}</div>
          <p><strong>${t("pdf.impactZone")}:</strong> ${escapeHtml(zoneLabel)}</p>
          <p><strong>${t("pdf.vehicleSpeed")}:</strong> ${report.speedKmh} ${t("report.kmh")}</p>
          <p><strong>${t("pdf.impactForce")}:</strong> ${report.peakGForce.toFixed(2)} g</p>
          <p><strong>${t("pdf.severity")}:</strong> <span class="severity">${sevLabel[report.severity]}</span></p>
          ${report.gyroscope?.rolloverDetected ? `<div class="rollover">${t("pdf.rolloverWarning")}</div>` : ""}
        </div>
        <div class="card">
          <div class="card-title">${t("pdf.liabilityTitle")}</div>
          <div class="card-value">${liabilityValueHtml}</div>
          <p style="color: ${C.muted}; font-size: 12px; margin-top: 5px;">${t("pdf.liabilityHint")}</p>
          <p style="margin-top: 15px; color: ${C.text}; font-weight: 500;">${escapeHtml(view.scenarioAr)}</p>
        </div>
      </div>

      ${dataQualitySection}
      ${otherPartySection}
      ${croquisSection}
      ${speedChartSection}
      ${advancedAnalysisSection}
      ${faultSection}
      ${matchSection}

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">${t("pdf.descTitle")}</div>
        <p style="font-size: 16px; margin-bottom: 15px; color: ${C.text}; line-height: 1.8;">${escapeHtml(view.descriptionAr)}</p>
        <hr style="border: none; border-top: 1px solid ${C.border}; margin: 20px 0;">
        <ul class="factor-list">
          ${report.factorsAr.map((f) => f === t("liability.advancedAnalysisHeader")
            ? `<li class="factor-subhead" style="list-style:none;margin:10px 0 4px ${isAr ? "-20px" : "0"};color:${C.brand};font-weight:700;">${escapeHtml(f)}</li>`
            : `<li class="factor-item">${escapeHtml(f)}</li>`).join("")}
        </ul>
        <p style="margin-top:14px;font-size:11px;font-style:italic;color:${C.mutedLight};line-height:1.7;">${t("report.termsGlossary")}</p>
      </div>

      <div class="card">
        <div class="card-title">${t("pdf.technicalTitle")}</div>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>${t("pdf.jerk")}:</strong> ${report.jerkPeak.toFixed(1)} g/s</p>
            <p><strong>${t("pdf.brakingConfirm")}:</strong> ${report.braking?.brakingDetected ? `${checkMark()} ${report.braking.brakingDurationSec}${isAr ? "ث" : "s"}` : t("pdf.none")}</p>
            <p><strong>${t("pdf.impactCount")}:</strong> ${report.impactCount}</p>
          </div>
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>${t("pdf.rotationRate")}:</strong> ${report.gyroscope ? report.gyroscope.peakRotationRate.toFixed(0) + " °/s" : t("pdf.notAvailable")}</p>
            <p><strong>${t("pdf.coords")}:</strong> ${report.latitude && report.longitude ? `<span dir="ltr">${coord(report.latitude)}, ${coord(report.longitude)}</span>` : t("pdf.notRecorded")}</p>
          </div>
        </div>
      </div>

      <div class="legal">${t("pdf.legalDisclaimer")}</div>

      <div class="footer">
        ${t("pdf.footer1")}<br>
        ${t("pdf.footer2")}<br>
        <span style="color: ${C.muted};">${t("pdf.generatedAt")}: ${generatedStr}</span>
      </div>
    </body>
    </html>`;

  // ─── صفحة واحدة متصلة: نقدّر ارتفاع المحتوى ونمرّره لـ expo-print ───
  // العرض ثابت (نقاط PDF)، والارتفاع ديناميكي حسب الأقسام الموجودة + هامش أمان
  // سخيّ يمنع أي قص للمحتوى (الفائض يظهر كفراغ بسيط أسفل الصفحة فقط).
  const PAGE_WIDTH = 612;
  let estH = 300; // الهيدر
  if (view.plainSummary) estH += 80; // صندوق الخلاصة
  estH += 190; // بطاقتا المعلومات الأساسية + المسؤولية
  if (dataQualitySection) estH += 170;
  if (otherPartySection) estH += 230;
  if (croquisSection) estH += (report.croquis?.height ? report.croquis.height * 0.55 : 300) + 150;
  if (speedChartSection) estH += 230;
  if (advancedAnalysisSection) estH += 340;
  if (faultSection) estH += 170;
  if (matchSection) estH += 150;
  estH += 200 + report.factorsAr.length * 28; // الوصف + العوامل + توضيح المصطلحات
  estH += 170; // البيانات الفنية
  estH += 150; // إخلاء المسؤولية
  estH += 120; // الـ footer
  // هامش أمان (+25% و+160 نقطة) لتفادي أي قص بسبب التفاف النص العربي
  const PAGE_HEIGHT = Math.ceil(estH * 1.25) + 160;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false, width: PAGE_WIDTH, height: PAGE_HEIGHT });
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: t("pdf.shareTitle"),
      UTI: "com.adobe.pdf",
    });
  } catch (err) {
    console.error("PDF Export Error", err);
  }
}
