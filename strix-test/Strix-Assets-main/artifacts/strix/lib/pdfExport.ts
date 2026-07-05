import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { AccidentReport, Severity } from "./types";
import { ZONE_LABELS_AR } from "./types";
import i18n from "./i18n";
import { STRIX_LOGO_DATA_URI } from "./logoBase64";

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
  return `<img src="${STRIX_LOGO_DATA_URI}" width="140" height="140" alt="Strix" style="display:block;object-fit:contain;margin:0 auto;" />`;
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
  const dateStr = new Date(report.timestamp).toLocaleString(isAr ? "ar-SA" : "en-US");

  // ألوان الشدّة الموحّدة (نفس قيم التطبيق)
  const SEV_COLOR: Record<Severity, string> = {
    critical: "#FF3B30",
    severe: "#FF3B30",
    moderate: "#FF9340",
    minor: "#34C759",
  };
  const sevLabel: Record<Severity, string> = {
    critical: t("report.severityCritical"),
    severe: t("report.severitySevere"),
    moderate: t("report.severityModerate"),
    minor: t("report.severityMinor"),
  };

  const zoneLabel = report.impactZone
    ? t(`zone.${report.impactZone}`, { defaultValue: ZONE_LABELS_AR[report.impactZone] })
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
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid #ef4444;">
        <div class="card-title" style="color: #ef4444;">${t("pdf.otherPartyTitle")}</div>
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
        <p style="margin-top: 15px; color: #64748b; font-size: 13px;">${escapeHtml(op.descriptionAr)}</p>
        <p style="margin-top: 10px; color: #94a3b8; font-size: 11px;">${t("pdf.confidence")}: ${pct(op.confidencePercent)}</p>
      </div>`;
  }

  // ─── الكروكي ───
  let croquisSection = "";
  if (report.croquis?.svgString) {
    let locationHtml = "";
    if (report.latitude && report.longitude) {
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
      locationHtml = `
        <div style="margin-top: 15px; padding: 10px; background: #e2e8f0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;"><strong>${t("pdf.coords")}:</strong> <span dir="ltr">${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</span></p>
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #1e293b;">📍 ${t("pdf.mapsLink")}:</p>
          <p style="margin: 0; direction: ltr; font-size: 11px;">
            <a href="${mapsLink}" style="color: #2563eb; text-decoration: underline;">${mapsLink}</a>
          </p>
        </div>`;
    }
    croquisSection = `
      <div class="card" style="margin-bottom: 24px; text-align: center;">
        <div class="card-title">${t("pdf.croquisTitle")}</div>
        <div style="display: flex; justify-content: center; margin: 20px 0;">${report.croquis.svgString}</div>
        ${locationHtml}
        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">${t("pdf.croquisNote")}</p>
      </div>`;
  }

  // ─── المطابقة ───
  let matchSection = "";
  if (report.matchedAccidentId) {
    matchSection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid #3b82f6;">
        <div class="card-title" style="color: #2563eb;">🔗 ${t("pdf.matchTitle")}</div>
        <p style="color: #475569;">${t("pdf.matchDesc")}</p>
        <p style="color: #475569;">${t("pdf.matchConfidence")}: ${pct(report.matchConfidence ?? 0)}</p>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">${t("pdf.matchId")}: ${escapeHtml(report.matchedAccidentId)}</p>
      </div>`;
  }

  // ─── التحليل المتقدم ───
  let advancedAnalysisSection = "";
  if (report.advancedAnalysis) {
    const aa = report.advancedAnalysis;
    const adjSign = aa.totalAdjustment > 0 ? "+" : "";
    const adjColor = aa.totalAdjustment > 0 ? "#ef4444" : (aa.totalAdjustment < 0 ? "#16a34a" : "#64748b");
    const roadMap: Record<string, string> = {
      roundabout: t("pdf.roadRoundabout"), intersection: t("pdf.roadIntersection"),
      highway: t("pdf.roadHighway"), urban: t("pdf.roadUrban"), unknown: t("pdf.roadUnknown"),
    };
    const heading = aa.angularStability.wasEvasive ? t("pdf.headingEvasive")
      : (aa.angularStability.hadSuddenYaw ? t("pdf.headingSwerve") : t("pdf.headingStable"));
    const driving = aa.preCrashEvents.hardBraking ? t("pdf.hardBraking")
      : (aa.preCrashEvents.hardAcceleration ? t("pdf.hardAccel") : t("pdf.steadyDriving"));

    advancedAnalysisSection = `
      <div class="card" style="margin-bottom: 24px; ${borderSide}: 4px solid #8b5cf6;">
        <div class="card-title" style="color: #8b5cf6;">${t("pdf.advancedTitle")}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 14px; color: #475569;">${t("pdf.adjustLabel")}:</span>
          <span style="font-size: 20px; font-weight: bold; color: ${adjColor}; direction: ltr;">${adjSign}${pct(aa.totalAdjustment)}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px;">
          <div>
            <p><strong>${t("pdf.vehicleHeading")}:</strong> ${heading}</p>
            <p><strong>${t("pdf.accidentLocation")}:</strong> ${roadMap[aa.roadContext.roadType]} ${aa.roadContext.wasStationary ? t("pdf.wasStationary") : ""}</p>
            <p><strong>${t("pdf.postDrift")}:</strong> ${aa.postImpact.driftDirection !== "none" ? "✔ (" + aa.postImpact.driftMagnitudeG + "g)" : t("pdf.none")}</p>
          </div>
          <div>
            <p><strong>${t("pdf.impactDir")}:</strong> ${aa.multiVector.rearPushRatio > 0.3 ? t("pdf.rearPush") : t("pdf.normal")}</p>
            <p><strong>${t("pdf.drivingBefore")}:</strong> ${driving}</p>
            <p><strong>${t("pdf.stabilizationTime")}:</strong> ${aa.postImpact.stabilizationTimeMs}ms ${aa.postImpact.secondaryImpacts > 0 ? `(${aa.postImpact.secondaryImpacts} ${t("pdf.secondaryImpacts")})` : ""}</p>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 10px 15px; border-radius: 8px;">
          <p style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 8px;">${t("pdf.systemConclusions")}:</p>
          <ul style="margin: 0; ${padSide}: 15px; font-size: 12px; color: #475569;">
            ${aa.discoveredFactorsAr.length > 0
              ? aa.discoveredFactorsAr.map((f) => `<li style="margin-bottom: 4px;">${escapeHtml(f)}</li>`).join("")
              : `<li>${t("pdf.noExtraDetails")}</li>`}
          </ul>
        </div>
      </div>`;
  }

  // ─── المسؤولية: نطاق عند عدم القطعية (A-6) ───
  const liabilityValueHtml = report.liabilityConclusive === false && report.liabilityRange
    ? `${pct(report.liabilityRange[0])} – ${pct(report.liabilityRange[1])}<div style="font-size:11px;color:#94a3b8;font-weight:normal;margin-top:4px;">${t("pdf.liabilityRangeNote")}</div>`
    : pct(report.liabilityScore);

  const html = `
    <!DOCTYPE html>
    <html lang="${htmlLang}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <title>${t("appName")} — ${t("pdf.title")}</title>
      <style>
        body { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; text-align: ${align}; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .brandRow { display: flex; align-items: center; justify-content: center; gap: 12px; }
        .brandName { font-size: 30px; font-weight: 800; color: #0d8a49; letter-spacing: 1px; }
        .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
        .title { font-size: 22px; font-weight: bold; margin-top: 12px; }
        .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; flex: 1; min-width: 250px; }
        .card-title { font-size: 14px; color: #64748b; margin-bottom: 10px; }
        .card-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .factor-list { ${padSide}: 20px; }
        .factor-item { margin-bottom: 8px; color: #475569; }
        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; color: #fff; background-color: ${SEV_COLOR[report.severity]}; }
        .rollover { color: #ef4444; font-weight: bold; border: 1px solid #ef4444; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brandRow">
          ${logoSvg()}
        </div>
        <div class="subtitle">${t("pdf.subtitle")}</div>
        <div class="title">${t("pdf.title")}</div>
        <p style="color: #64748b; margin-top: 5px;">${t("pdf.refNo")}: #${escapeHtml(report.id.toUpperCase())}</p>
        <p style="color: #64748b;">${t("pdf.date")}: ${dateStr}</p>
      </div>

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
          <p style="color: #64748b; font-size: 12px; margin-top: 5px;">${t("pdf.liabilityHint")}</p>
          <p style="margin-top: 15px; color: #0f172a; font-weight: 500;">${escapeHtml(report.scenarioAr)}</p>
        </div>
      </div>

      ${otherPartySection}
      ${croquisSection}
      ${advancedAnalysisSection}
      ${matchSection}

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">${t("pdf.descTitle")}</div>
        <p style="font-size: 16px; margin-bottom: 15px; color: #1e293b; line-height: 1.8;">${escapeHtml(report.descriptionAr)}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <ul class="factor-list">
          ${report.factorsAr.map((f) => `<li class="factor-item">${escapeHtml(f)}</li>`).join("")}
        </ul>
      </div>

      <div class="card">
        <div class="card-title">${t("pdf.technicalTitle")}</div>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>${t("pdf.jerk")}:</strong> ${report.jerkPeak.toFixed(1)} g/s</p>
            <p><strong>${t("pdf.brakingConfirm")}:</strong> ${report.braking?.brakingDetected ? `✔ ${report.braking.brakingDurationSec}${isAr ? "ث" : "s"}` : t("pdf.none")}</p>
            <p><strong>${t("pdf.impactCount")}:</strong> ${report.impactCount}</p>
          </div>
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>${t("pdf.rotationRate")}:</strong> ${report.gyroscope ? report.gyroscope.peakRotationRate.toFixed(0) + " °/s" : t("pdf.notAvailable")}</p>
            <p><strong>${t("pdf.coords")}:</strong> ${report.latitude ? `${report.latitude.toFixed(5)}, ${report.longitude?.toFixed(5)}` : t("pdf.notRecorded")}</p>
          </div>
        </div>
      </div>

      <div class="footer">
        ${t("pdf.footer1")}<br>
        ${t("pdf.footer2")}
      </div>
    </body>
    </html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: t("pdf.shareTitle"),
      UTI: "com.adobe.pdf",
    });
  } catch (err) {
    console.error("PDF Export Error", err);
  }
}
