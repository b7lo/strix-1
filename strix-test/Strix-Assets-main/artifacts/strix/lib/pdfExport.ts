import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { AccidentReport } from "./types";
import { ZONE_LABELS_AR } from "./types";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

export async function exportReportToPDF(report: AccidentReport) {
  const sevAr = {
    critical: "حرج",
    severe: "شديد",
    moderate: "متوسط",
    minor: "خفيف",
  };

  const sevColor = {
    critical: "#FF4444",
    severe: "#FF6B35",
    moderate: "#D29922",
    minor: "#3FB950",
  };

  const vehicleTypeAr: Record<string, string> = {
    light: "مركبة خفيفة",
    medium: "مركبة متوسطة",
    heavy: "مركبة ثقيلة",
  };

  const forceAr: Record<string, string> = {
    light: "خفيفة",
    moderate: "متوسطة",
    heavy: "عنيفة",
    severe: "بالغة الشدة",
  };

  // ═══════════════════════════════════════
  // v6: قسم تحليل الطرف الآخر
  // ═══════════════════════════════════════
  let otherPartySection = "";
  if (report.otherParty) {
    const op = report.otherParty;
    otherPartySection = `
      <div class="card" style="margin-bottom: 30px; border-right: 4px solid #ef4444;">
        <div class="card-title" style="color: #ef4444;">تحليل الطرف الآخر (تقديري)</div>
        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
          <div style="flex: 1; min-width: 200px;">
            <p><strong>زاوية الاقتراب:</strong> ${op.approachAngleDeg}°</p>
            <p><strong>السرعة التقديرية:</strong> ~${op.estimatedSpeedKmh} كم/س</p>
            <p><strong>قوة الصدمة:</strong> ${forceAr[op.impactForce]}</p>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <p><strong>نوع المركبة:</strong> ${vehicleTypeAr[op.vehicleType]}</p>
            <p><strong>تسارع قبل الصدم:</strong> ${op.wasAccelerating ? "نعم — لم يفرمل" : "لا"}</p>
            <p><strong>فرملة قبل الصدم:</strong> ${op.wasBraking ? "نعم — حاول التفادي" : "لا"}</p>
          </div>
        </div>
        <p style="margin-top: 15px; color: #64748b; font-size: 13px;">${escapeHtml(op.descriptionAr)}</p>
        <p style="margin-top: 10px; color: #94a3b8; font-size: 11px;">نسبة الثقة في التحليل: ${op.confidencePercent}٪</p>
      </div>
    `;
  }

  // ═══════════════════════════════════════
  // v6: قسم الكروكي
  // ═══════════════════════════════════════
  let croquisSection = "";
  if (report.croquis?.svgString) {
    let locationHtml = "";
    if (report.latitude && report.longitude) {
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
      locationHtml = `
        <div style="margin-top: 15px; padding: 10px; background: #e2e8f0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;"><strong>إحداثيات الموقع:</strong> <span dir="ltr">${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</span></p>
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #1e293b;">📍 رابط الموقع على خرائط جوجل:</p>
          <p style="margin: 0; direction: ltr; font-size: 11px;">
            <a href="${mapsLink}" style="color: #2563eb; text-decoration: underline;">${mapsLink}</a>
          </p>
        </div>
      `;
    }

    croquisSection = `
      <div class="card" style="margin-bottom: 30px; text-align: center;">
        <div class="card-title">كروكي الحادث</div>
        <div style="display: flex; justify-content: center; margin: 20px 0;">
          ${report.croquis.svgString}
        </div>
        ${locationHtml}
        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">
          الكروكي مُولَّد تلقائياً من بيانات الحساسات — الأبعاد والزوايا تقريبية
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════
  // v6: قسم المطابقة
  // ═══════════════════════════════════════
  let matchSection = "";
  if (report.matchedAccidentId) {
    matchSection = `
      <div class="card" style="margin-bottom: 30px; border-right: 4px solid #3b82f6; background: #1e3a5f;">
        <div class="card-title" style="color: #60a5fa;">🔗 تم ربط هذا الحادث بتقرير مستخدم آخر</div>
        <p style="color: #93c5fd;">تم العثور على مستخدم آخر لتطبيق Strix شارك في نفس الحادث.</p>
        <p style="color: #93c5fd;">نسبة الثقة في المطابقة: ${report.matchConfidence}٪</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 10px;">معرف التقرير المطابق: ${escapeHtml(report.matchedAccidentId)}</p>
      </div>
    `;
  }

  // ═══════════════════════════════════════
  // v7: قسم التحليل المتقدم (المبادئ الخمسة)
  // ═══════════════════════════════════════
  let advancedAnalysisSection = "";
  if (report.advancedAnalysis) {
    const aa = report.advancedAnalysis;
    const adjSign = aa.totalAdjustment > 0 ? "+" : "";
    const adjColor = aa.totalAdjustment > 0 ? "#ef4444" : (aa.totalAdjustment < 0 ? "#22c55e" : "#64748b");
    
    const roadTypeAr: Record<string, string> = {
      roundabout: "دوار",
      intersection: "تقاطع",
      highway: "طريق سريع",
      urban: "داخل المدينة",
      unknown: "غير محدد"
    };

    advancedAnalysisSection = `
      <div class="card" style="margin-bottom: 30px; border-right: 4px solid #8b5cf6;">
        <div class="card-title" style="color: #8b5cf6;">تحليل تفاصيل الحادث الذكي</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-size: 14px; color: #475569;">تعديل نسبة الخطأ بناءً على معطيات الحساسات:</span>
          <span style="font-size: 20px; font-weight: bold; color: ${adjColor}; direction: ltr;">${adjSign}${aa.totalAdjustment}٪</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px;">
          <div>
            <p><strong>توجيه المركبة:</strong> ${aa.angularStability.wasEvasive ? "مناورة تفادي" : (aa.angularStability.hadSuddenYaw ? "انحراف مفاجئ" : "مستقر")}</p>
            <p><strong>موقع الحادث:</strong> ${roadTypeAr[aa.roadContext.roadType]} ${aa.roadContext.wasStationary ? "(كان متوقفاً)" : ""}</p>
            ${aa.postImpact ? `<p><strong>انحراف ما بعد الصدمة:</strong> ${aa.postImpact.driftDirection !== 'none' ? 'نعم (' + aa.postImpact.driftMagnitudeG + 'g)' : 'لا يوجد'}</p>` : ''}
          </div>
          <div>
            <p><strong>اتجاه الصدمة:</strong> ${aa.multiVector.rearPushRatio > 0.3 ? "اندفاع من الخلف" : "طبيعي"}</p>
            <p><strong>القيادة قبل الحادث:</strong> ${aa.preCrashEvents.hardBraking ? "فرملة عنيفة" : (aa.preCrashEvents.hardAcceleration ? "تسارع مفاجئ" : "قيادة مستقرة")}</p>
            ${aa.postImpact ? `<p><strong>وقت الاستقرار:</strong> ${aa.postImpact.stabilizationTimeMs}ms ${aa.postImpact.secondaryImpacts > 0 ? `(${aa.postImpact.secondaryImpacts} صدمات ثانوية)` : ''}</p>` : ''}
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 10px 15px; border-radius: 8px;">
          <p style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 8px;">استنتاجات النظام المؤكدة:</p>
          <ul style="margin: 0; padding-right: 15px; font-size: 12px; color: #475569;">
            ${aa.discoveredFactorsAr.length > 0 
              ? aa.discoveredFactorsAr.map(f => `<li style="margin-bottom: 4px;">${escapeHtml(f)}</li>`).join("")
              : "<li>لم يتم رصد تفاصيل إضافية</li>"}
          </ul>
        </div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير حادث ستريكس</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; }
        .version { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .title { font-size: 24px; font-weight: bold; margin-top: 10px; }
        .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; flex: 1; min-width: 250px; }
        .card-title { font-size: 14px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; }
        .card-value { font-size: 24px; font-weight: bold; color: #0f172a; }
        .factor-list { padding-right: 20px; }
        .factor-item { margin-bottom: 8px; color: #475569; }
        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; color: #fff; background-color: ${sevColor[report.severity]}; }
        .rollover { color: #ef4444; font-weight: bold; border: 1px solid #ef4444; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">STRIX</div>
        <div class="version">نظام تحليل الحوادث الذكي</div>
        <div class="title">تقرير مفصل للحادث</div>
        <p style="color: #64748b; margin-top: 5px;">رقم المرجع: #${escapeHtml(report.id.toUpperCase())}</p>
        <p style="color: #64748b;">التاريخ: ${new Date(report.timestamp).toLocaleString("ar-SA")}</p>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">معلومات أساسية</div>
          <p><strong>منطقة الصدمة:</strong> ${escapeHtml(report.impactZone ? ZONE_LABELS_AR[report.impactZone] : "غير محدد")}</p>
          <p><strong>سرعة المركبة:</strong> ${report.speedKmh} كم/س</p>
          <p><strong>قوة التأثير:</strong> ${report.peakGForce.toFixed(2)} g</p>
          <p><strong>شدة الحادث:</strong> <span class="severity">${sevAr[report.severity]}</span></p>
          ${report.gyroscope?.rolloverDetected ? `<div class="rollover">تحذير: تم رصد انقلاب المركبة</div>` : ""}
        </div>

        <div class="card">
          <div class="card-title">تحليل نسبة الخطأ</div>
          <div class="card-value">${report.liabilityScore}٪</div>
          <p style="color: #64748b; font-size: 12px; margin-top: 5px;">(0٪ تعني أن المستخدم ليس المخطئ، و 100٪ تعني أنه يتحمل الخطأ بالكامل)</p>
          <p style="margin-top: 15px; color: #0f172a; font-weight: 500;">${escapeHtml(report.scenarioAr)}</p>
        </div>
      </div>

      ${otherPartySection}
      ${croquisSection}
      ${advancedAnalysisSection}
      ${matchSection}

      <div class="card" style="margin-bottom: 30px;">
        <div class="card-title">وصف الحادث والعوامل المؤثرة</div>
        <p style="font-size: 16px; margin-bottom: 15px; color: #1e293b; line-height: 1.8;">${escapeHtml(report.descriptionAr)}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <ul class="factor-list">
          ${report.factorsAr.map(f => `<li class="factor-item">${escapeHtml(f)}</li>`).join("")}
        </ul>
      </div>

      <div class="card">
        <div class="card-title">البيانات الفنية الدقيقة</div>
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>تغير السرعة المفاجئ:</strong> ${report.jerkPeak.toFixed(1)} g/s</p>
            <p><strong>تأكيد الفرملة:</strong> ${report.braking?.brakingDetected ? `نعم (${report.braking.brakingDurationSec}ث)` : "لا يوجد"}</p>
            <p><strong>عدد الصدمات:</strong> ${report.impactCount}</p>
          </div>
          <div style="flex: 1; min-width: 150px; margin-bottom: 10px;">
            <p><strong>معدل دوران المركبة:</strong> ${report.gyroscope ? report.gyroscope.peakRotationRate.toFixed(0) + " °/s" : "غير متاح"}</p>
            <p><strong>إحداثيات الموقع:</strong> ${report.latitude ? `${report.latitude.toFixed(5)}, ${report.longitude?.toFixed(5)}` : "غير مسجل"}</p>
          </div>
        </div>
      </div>

      <div class="footer">
        تم إنشاء هذا التقرير تلقائياً بواسطة نظام Strix الذكي لتحليل الحوادث.<br>
        التقرير يعتمد على قراءات دقيقة لحركة المركبة ولا يحل محل التقرير المروري الرسمي للجهات المختصة.
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "مشاركة تقرير الحادث",
      UTI: "com.adobe.pdf",
    });
  } catch (err) {
    console.error("PDF Export Error", err);
  }
}
