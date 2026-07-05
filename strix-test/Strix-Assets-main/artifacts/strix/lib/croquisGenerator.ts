/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Croquis Generator — v2.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * مولّد كروكي ذكي للحادث (SVG) — يعيد بناء المشهد لكلا الطرفين:
 *  - مسار مركبتك (أ): مستقيم / تغيير مسار / مناورة تفادي / متوقف
 *  - مسار الطرف الآخر (ب): حسب زاوية الاقتراب والسرعة والسلوك
 *  - مؤشّرات الفرملة والتسارع
 *  - سياق الطريق (دوار / تقاطع)
 *  ثنائي اللغة (عربي/إنجليزي) عبر i18n.
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  CroquisData,
  OtherPartyAnalysis,
  ImpactZone,
  AccidentReport,
} from "./types";
import i18n from "./i18n";

const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const CENTER_X = 250;
const CENTER_Y = 250;
const CAR_LENGTH = 60;
const CAR_WIDTH = 30;

function escapeXml(unsafe: unknown): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

const t = (k: string) => i18n.t(k) as string;

export function generateCroquis(
  report: AccidentReport,
  otherParty: OtherPartyAnalysis | null
): CroquisData {
  const svg = buildSVG(report, otherParty);
  return {
    svgString: svg,
    svgBase64: toBase64(svg),
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
  };
}

function buildSVG(report: AccidentReport, otherParty: OtherPartyAnalysis | null): string {
  const aa = report.advancedAnalysis;
  const impactPoint = getImpactPoint(report.impactZone);
  const otherAngle = otherParty?.approachAngleDeg ?? guessAngleFromZone(report.impactZone);

  // ─── تصنيف سلوك مركبتك (أ) من بيانات التحليل ───
  const speedA = report.speedKmh;
  const isStationaryA = speedA < 5 || aa?.roadContext.wasStationary === true;
  const isEvasiveA = !!(aa?.angularStability.wasEvasive || aa?.preCrashEvents.evasiveManeuver);
  const isLaneChangeA = !isEvasiveA && !!aa?.angularStability.hadSuddenYaw;
  const aBraked = !!report.braking?.brakingDetected;

  // متجه حركة الطرف الآخر
  const movAngle = (otherAngle + 180) % 360;
  const movRad = ((movAngle - 90) * Math.PI) / 180;
  const dxMov = Math.cos(movRad);
  const dyMov = Math.sin(movRad);
  const carB_X = impactPoint.x - dxMov * (CAR_LENGTH / 2);
  const carB_Y = impactPoint.y - dyMov * (CAR_LENGTH / 2);

  const parts: string[] = [];

  // الخلفية + الشبكة
  parts.push(`
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="#ffffff" rx="16"/>
    <pattern id="dotGrid" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
    </pattern>
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#dotGrid)" rx="16" />
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="none" stroke="#e2e8f0" stroke-width="2" rx="16" />
  `);

  // ─── سياق الطريق (دوار / تقاطع) كخلفية خفيفة ───
  const roadType = aa?.roadContext.roadType;
  if (roadType === "roundabout") {
    parts.push(`
      <circle cx="${CENTER_X}" cy="${CENTER_Y}" r="120" fill="none" stroke="#cbd5e1" stroke-width="14" opacity="0.5"/>
      <text x="${CENTER_X}" y="${CENTER_Y - 130}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="sans-serif">${escapeXml(t("croquis.roundabout"))}</text>
    `);
  } else if (roadType === "intersection") {
    parts.push(`
      <rect x="${CENTER_X - 70}" y="0" width="140" height="${SVG_HEIGHT}" fill="#f1f5f9" opacity="0.6"/>
      <rect x="0" y="${CENTER_Y - 70}" width="${SVG_WIDTH}" height="140" fill="#f1f5f9" opacity="0.6"/>
      <text x="${CENTER_X + 78}" y="20" text-anchor="start" fill="#94a3b8" font-size="11" font-family="sans-serif">${escapeXml(t("croquis.intersection"))}</text>
    `);
  }

  // ─── مسار مركبتك (أ) حسب السلوك ───
  if (!isStationaryA) {
    const pathLenA = Math.max(60, Math.min(180, speedA * 2.5));
    const startY = CENTER_Y + pathLenA;
    const endY = CENTER_Y + CAR_LENGTH / 2;
    if (isLaneChangeA || isEvasiveA) {
      // انحراف نحو جهة الصدمة (منحنى)
      const sideSign = impactPoint.x < CENTER_X ? -1 : impactPoint.x > CENTER_X ? 1 : 1;
      const lateral = (isEvasiveA ? 55 : 40) * sideSign;
      const ctrlX = CENTER_X + lateral;
      const ctrlY = (startY + endY) / 2;
      const startX = CENTER_X - lateral * 0.4;
      parts.push(`
        <path d="M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${CENTER_X} ${endY}"
              fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,6" />
      `);
    } else {
      // مستقيم
      parts.push(`
        <line x1="${CENTER_X}" y1="${startY}" x2="${CENTER_X}" y2="${endY}"
              stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,6" />
      `);
    }
    // مؤشّر فرملة مركبتك
    if (aBraked) {
      parts.push(brakeMarks(CENTER_X, CENTER_Y + CAR_LENGTH / 2 + 18, 0));
    }
  }

  // ─── مسار الطرف الآخر (ب) ───
  const bRearX = carB_X - dxMov * (CAR_LENGTH / 2);
  const bRearY = carB_Y - dyMov * (CAR_LENGTH / 2);
  const bLen = Math.max(70, Math.min(150, (otherParty?.estimatedSpeedKmh ?? 40) * 2));
  const bStartX = carB_X - dxMov * bLen;
  const bStartY = carB_Y - dyMov * bLen;
  parts.push(`
    <line x1="${bStartX}" y1="${bStartY}" x2="${bRearX}" y2="${bRearY}"
          stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,6" />
  `);
  // فرملة / تسارع الطرف الآخر
  if (otherParty?.wasBraking) {
    parts.push(brakeMarks(bRearX, bRearY, movAngle));
  } else if (otherParty?.wasAccelerating) {
    parts.push(speedLines(bStartX, bStartY, movAngle));
  }

  // ─── نقطة التصادم ───
  parts.push(`
    <g transform="translate(${impactPoint.x}, ${impactPoint.y})">
      <circle cx="0" cy="0" r="28" fill="#fef2f2" stroke="#ef4444" stroke-width="2" opacity="0.9"/>
      <circle cx="0" cy="0" r="20" fill="none" stroke="#f87171" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
      <path d="M0,-10 L-10,8 L10,8 Z" fill="none" stroke="#ef4444" stroke-width="2" stroke-linejoin="round"/>
      <line x1="0" y1="-3" x2="0" y2="2" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
      <circle cx="0" cy="5" r="1" fill="#ef4444"/>
    </g>
    <text x="${impactPoint.x}" y="${impactPoint.y + 42}" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold" font-family="sans-serif">${escapeXml(t("croquis.impactPoint"))}</text>
  `);

  // ─── مركبتك (أ) ───
  parts.push(`
    <g transform="translate(${CENTER_X}, ${CENTER_Y})">
      <rect x="-15" y="-30" width="30" height="60" rx="6" fill="#1e3a8a" />
      <rect x="-12" y="-22" width="24" height="12" rx="2" fill="#93c5fd" opacity="0.4" />
      <rect x="-12" y="12" width="24" height="10" rx="2" fill="#93c5fd" opacity="0.4" />
      ${isStationaryA ? `<text x="0" y="2" text-anchor="middle" fill="#ffffff" font-size="9" font-family="sans-serif">${escapeXml(t("croquis.stationary"))}</text>` : ""}
    </g>
    <g transform="translate(${CENTER_X}, ${CENTER_Y - 45})">
      <rect x="-40" y="-12" width="80" height="24" rx="4" fill="#1e3a8a" />
      <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold" font-family="sans-serif">${escapeXml(t("croquis.vehicleA"))}</text>
    </g>
  `);

  // ─── مسار انحراف ما بعد الصدمة (شبح المركبة) ───
  if (
    aa?.postImpact &&
    aa.postImpact.driftDirection !== "none" &&
    !aa.postImpact.vehicleStoppedImmediately
  ) {
    const post = aa.postImpact;
    let dx = 0, dy = 0;
    const distance = Math.min(post.driftMagnitudeG * 100, 150);
    if (post.driftDirection === "forward") dy = -distance;
    else if (post.driftDirection === "backward") dy = distance;
    else if (post.driftDirection === "left") dx = -distance;
    else if (post.driftDirection === "right") dx = distance;
    const endX = CENTER_X + dx;
    const endY = CENTER_Y + dy;
    parts.push(`
      <line x1="${CENTER_X}" y1="${CENTER_Y}" x2="${endX}" y2="${endY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
      <g transform="translate(${endX}, ${endY})">
        <rect x="-15" y="-30" width="30" height="60" rx="6" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,2" opacity="0.6" />
      </g>
    `);
  }

  // ─── الطرف الآخر (ب) ───
  let labelOffset = 45;
  if (carB_Y < CENTER_Y && carB_Y < impactPoint.y) labelOffset = -45;
  parts.push(`
    <g transform="translate(${carB_X}, ${carB_Y}) rotate(${movAngle})">
      <rect x="-15" y="-30" width="30" height="60" rx="6" fill="#dc2626" />
      <rect x="-12" y="-22" width="24" height="12" rx="2" fill="#fca5a5" opacity="0.4" />
      <rect x="-12" y="12" width="24" height="10" rx="2" fill="#fca5a5" opacity="0.4" />
    </g>
    <g transform="translate(${carB_X}, ${carB_Y + labelOffset})">
      <rect x="-45" y="-12" width="90" height="24" rx="4" fill="#dc2626" />
      <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold" font-family="sans-serif">${escapeXml(t("croquis.vehicleB"))}</text>
    </g>
  `);

  // ─── لوحة المفاتيح (Legend) ───
  const legendX = 20;
  const legendItems: string[] = [
    `<circle cx="14" cy="20" r="5" fill="#1e3a8a" /><text x="26" y="24" text-anchor="start" fill="#64748b" font-size="11" font-family="sans-serif">${escapeXml(t("croquis.pathA"))}</text>`,
    `<circle cx="14" cy="40" r="5" fill="#dc2626" /><text x="26" y="44" text-anchor="start" fill="#64748b" font-size="11" font-family="sans-serif">${escapeXml(t("croquis.pathB"))}</text>`,
    `<line x1="9" y1="60" x2="19" y2="60" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,2" /><text x="26" y="64" text-anchor="start" fill="#64748b" font-size="11" font-family="sans-serif">${escapeXml(t("croquis.postDrift"))}</text>`,
  ];
  parts.push(`
    <g transform="translate(${legendX}, 20)">
      <rect x="0" y="0" width="170" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
      ${legendItems.join("\n      ")}
    </g>
  `);

  // ─── معلومات أسفل ───
  const speedAStr = escapeXml(report.speedKmh);
  const speedBStr = escapeXml(otherParty?.estimatedSpeedKmh ?? "?");
  const peakG = escapeXml(report.peakGForce.toFixed(1));
  const unit = escapeXml(t("report.kmh"));
  parts.push(`
    <g transform="translate(${SVG_WIDTH - 170}, ${SVG_HEIGHT - 60})">
      <text x="160" y="10" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">${escapeXml(t("croquis.speedA"))}: ${speedAStr} ${unit}</text>
      <text x="160" y="25" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">${escapeXml(t("croquis.speedB"))}: ${speedBStr} ${unit}</text>
      <text x="160" y="40" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">${escapeXml(t("croquis.impactG"))}: ${peakG}g</text>
    </g>
  `);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}">
  ${parts.join("\n  ")}
</svg>`;
}

/** علامات فرملة (شرطات حمراء عرضية) عند نقطة باتجاه معيّن */
function brakeMarks(x: number, y: number, angleDeg: number): string {
  return `
    <g transform="translate(${x}, ${y}) rotate(${angleDeg})">
      <line x1="-10" y1="0" x2="10" y2="0" stroke="#ef4444" stroke-width="2.5" />
      <line x1="-10" y1="7" x2="10" y2="7" stroke="#ef4444" stroke-width="2.5" />
      <line x1="-10" y1="14" x2="10" y2="14" stroke="#ef4444" stroke-width="2.5" />
    </g>
  `;
}

/** خطوط تسارع (chevrons) خلف المركبة المسرعة */
function speedLines(x: number, y: number, angleDeg: number): string {
  return `
    <g transform="translate(${x}, ${y}) rotate(${angleDeg})">
      <path d="M-8,-8 L0,0 L-8,8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      <path d="M-2,-8 L6,0 L-2,8" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    </g>
  `;
}

function getImpactPoint(zone: ImpactZone): { x: number; y: number } {
  const cx = CENTER_X;
  const cy = CENTER_Y;
  const hw = CAR_WIDTH / 2;
  const hl = CAR_LENGTH / 2;
  const points: Record<string, { x: number; y: number }> = {
    "front": { x: cx, y: cy - hl },
    "front-left": { x: cx - hw, y: cy - hl },
    "front-right": { x: cx + hw, y: cy - hl },
    "rear": { x: cx, y: cy + hl },
    "rear-left": { x: cx - hw, y: cy + hl },
    "rear-right": { x: cx + hw, y: cy + hl },
    "side-left": { x: cx - hw, y: cy },
    "side-right": { x: cx + hw, y: cy },
    "unknown": { x: cx, y: cy },
  };
  return points[zone] ?? points["unknown"];
}

function guessAngleFromZone(zone: ImpactZone): number {
  const angles: Record<string, number> = {
    "front": 0, "front-left": 315, "front-right": 45,
    "side-left": 270, "side-right": 90,
    "rear": 180, "rear-left": 225, "rear-right": 135,
    "unknown": 180,
  };
  return angles[zone] ?? 180;
}

function toBase64(svg: string): string {
  try {
    if (typeof global !== "undefined" && typeof (global as any).Buffer !== "undefined") {
      return (global as any).Buffer.from(svg, "utf-8").toString("base64");
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(svg, "utf-8").toString("base64");
    }
    if (typeof btoa !== "undefined") {
      return btoa(unescape(encodeURIComponent(svg)));
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const str = unescape(encodeURIComponent(svg));
    let result = "";
    for (let i = 0; i < str.length; i += 3) {
      const b1 = str.charCodeAt(i);
      const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
      const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
      const r1 = b1 >> 2;
      const r2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
      const r3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
      const r4 = isNaN(b3) ? 64 : b3 & 63;
      result += chars.charAt(r1) + chars.charAt(r2) +
                (r3 === 64 ? "=" : chars.charAt(r3)) +
                (r4 === 64 ? "=" : chars.charAt(r4));
    }
    return result;
  } catch {
    return svg;
  }
}
