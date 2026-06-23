/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Croquis Generator — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * مولّد كروكي (رسم بياني) تلقائي للحادث بصيغة SVG.
 * ═══════════════════════════════════════════════════════════════════
 */

import type {
  CroquisData,
  OtherPartyAnalysis,
  ImpactZone,
  AccidentReport,
} from "./types";
import { ZONE_LABELS_AR } from "./types";

const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;

// مركز الرسم
const CENTER_X = 250;
const CENTER_Y = 250;

// أبعاد السيارة (طول × عرض)
const CAR_LENGTH = 60;
const CAR_WIDTH = 30;

/**
 * دالة لتنظيف مدخلات النصوص لمنع ثغرات XSS في ملفات SVG
 */
function escapeXml(unsafe: unknown): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * الوظيفة الرئيسية: توليد الكروكي
 */
export function generateCroquis(
  report: AccidentReport,
  otherParty: OtherPartyAnalysis | null
): CroquisData {
  const svg = buildSVG(report, otherParty);
  const svgBase64 = toBase64(svg);

  return {
    svgString: svg,
    svgBase64,
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
  };
}

function buildSVG(
  report: AccidentReport,
  otherParty: OtherPartyAnalysis | null
): string {
  const impactPoint = getImpactPoint(report.impactZone);
  const otherAngle = otherParty?.approachAngleDeg ?? guessAngleFromZone(report.impactZone);

  // حساب زاوية حركة الطرف الآخر ومتجه الحركة
  const movAngle = (otherAngle + 180) % 360;
  const movRad = ((movAngle - 90) * Math.PI) / 180;
  const dx_mov = Math.cos(movRad);
  const dy_mov = Math.sin(movRad);

  // موقع مركز الطرف الآخر بحيث تلامس مقدمته نقطة الصدمة
  const carB_X = impactPoint.x - dx_mov * (CAR_LENGTH / 2);
  const carB_Y = impactPoint.y - dy_mov * (CAR_LENGTH / 2);

  const parts: string[] = [];

  // الخلفية والشبكة (Dot Grid)
  parts.push(`
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="#ffffff" rx="16"/>
    <pattern id="dotGrid" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
    </pattern>
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#dotGrid)" rx="16" />
    <!-- إطار خارجي ناعم -->
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="none" stroke="#e2e8f0" stroke-width="2" rx="16" />
  `);

  // رسم مسارات الحركة (Trajectories)
  // مسار المركبة A (من الخلف إلى المركز) - طول المسار يرتبط ديناميكياً بالسرعة
  const pathLengthA = Math.max(50, Math.min(180, report.speedKmh * 2.5));
  parts.push(`
    <line x1="${CENTER_X}" y1="${CENTER_Y + pathLengthA}" x2="${CENTER_X}" y2="${CENTER_Y + CAR_LENGTH / 2}" 
          stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,6" />
  `);

  // مسار المركبة B (من الخلف إلى موقعها)
  const bRearX = carB_X - dx_mov * (CAR_LENGTH / 2);
  const bRearY = carB_Y - dy_mov * (CAR_LENGTH / 2);
  const bStartX = carB_X - dx_mov * 120;
  const bStartY = carB_Y - dy_mov * 120;
  parts.push(`
    <line x1="${bStartX}" y1="${bStartY}" x2="${bRearX}" y2="${bRearY}" 
          stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,6" />
  `);

  // نقطة التصادم (دائرة التنبيه في نقطة التقاطع الدقيقة)
  parts.push(`
    <g transform="translate(${impactPoint.x}, ${impactPoint.y})">
      <circle cx="0" cy="0" r="28" fill="#fef2f2" stroke="#ef4444" stroke-width="2" opacity="0.9"/>
      <circle cx="0" cy="0" r="20" fill="none" stroke="#f87171" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
      <!-- أيقونة التنبيه -->
      <path d="M0,-10 L-10,8 L10,8 Z" fill="none" stroke="#ef4444" stroke-width="2" stroke-linejoin="round"/>
      <line x1="0" y1="-3" x2="0" y2="2" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
      <circle cx="0" cy="5" r="1" fill="#ef4444"/>
    </g>
    <text x="${impactPoint.x}" y="${impactPoint.y + 42}" text-anchor="middle" fill="#1e293b" font-size="11" font-weight="bold" font-family="sans-serif">نقطة التصادم</text>
  `);

  // المركبة A (أنت) - لون أزرق داكن
  parts.push(`
    <g transform="translate(${CENTER_X}, ${CENTER_Y})">
      <rect x="-15" y="-30" width="30" height="60" rx="6" fill="#1e3a8a" />
      <rect x="-12" y="-22" width="24" height="12" rx="2" fill="#93c5fd" opacity="0.4" />
      <rect x="-12" y="12" width="24" height="10" rx="2" fill="#93c5fd" opacity="0.4" />
    </g>
    <g transform="translate(${CENTER_X}, ${CENTER_Y - 45})">
      <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#1e3a8a" />
      <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif">المركبة A</text>
    </g>
  `);

  // رسم مسار الانحراف لمركبة A (Post-Impact Trajectory)
  if (report.advancedAnalysis?.postImpact && report.advancedAnalysis.postImpact.driftDirection !== "none" && !report.advancedAnalysis.postImpact.vehicleStoppedImmediately) {
    const post = report.advancedAnalysis.postImpact;
    let dx = 0; let dy = 0;
    
    // تقدير المسافة بناء على مقدار الـ G
    const distance = Math.min(post.driftMagnitudeG * 100, 150); 
    
    if (post.driftDirection === "forward") dy = -distance;
    else if (post.driftDirection === "backward") dy = distance;
    else if (post.driftDirection === "left") dx = -distance;
    else if (post.driftDirection === "right") dx = distance;

    const endX = CENTER_X + dx;
    const endY = CENTER_Y + dy;

    // رسم مسار الانحراف
    parts.push(`
      <line x1="${CENTER_X}" y1="${CENTER_Y}" x2="${endX}" y2="${endY}" 
            stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
      
      <!-- موقع الاستقرار النهائي (شبح المركبة) -->
      <g transform="translate(${endX}, ${endY})">
        <rect x="-15" y="-30" width="30" height="60" rx="6" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,2" opacity="0.6" />
      </g>
    `);
  }

  // المركبة B (الطرف الآخر) - لون أحمر
  let labelOffset = 45;
  if (carB_Y < CENTER_Y && carB_Y < impactPoint.y) labelOffset = -45;

  parts.push(`
    <g transform="translate(${carB_X}, ${carB_Y}) rotate(${movAngle})">
      <rect x="-15" y="-30" width="30" height="60" rx="6" fill="#dc2626" />
      <rect x="-12" y="-22" width="24" height="12" rx="2" fill="#fca5a5" opacity="0.4" />
      <rect x="-12" y="12" width="24" height="10" rx="2" fill="#fca5a5" opacity="0.4" />
    </g>
    <g transform="translate(${carB_X}, ${carB_Y + labelOffset})">
      <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#dc2626" />
      <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="bold" font-family="sans-serif">المركبة B</text>
    </g>
  `);

  // لوحة المفاتيح (Legend) - أعلى اليسار
  parts.push(`
    <g transform="translate(20, 20)">
      <rect x="0" y="0" width="140" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
      <circle cx="120" cy="20" r="5" fill="#1e3a8a" />
      <text x="105" y="24" text-anchor="end" fill="#64748b" font-size="11" font-family="sans-serif">مسار المركبة A</text>
      
      <circle cx="120" cy="40" r="5" fill="#dc2626" />
      <text x="105" y="44" text-anchor="end" fill="#64748b" font-size="11" font-family="sans-serif">مسار المركبة B</text>

      <line x1="115" y1="60" x2="125" y2="60" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,2" />
      <text x="105" y="64" text-anchor="end" fill="#64748b" font-size="11" font-family="sans-serif">انحراف بعد الصدمة</text>
    </g>
  `);

  // معلومات إضافية - أسفل اليمين
  const speedA = escapeXml(report.speedKmh);
  const speedB = escapeXml(otherParty?.estimatedSpeedKmh ?? "?");
  const peakG = escapeXml(report.peakGForce.toFixed(1));
  parts.push(`
    <g transform="translate(${SVG_WIDTH - 150}, ${SVG_HEIGHT - 60})">
      <text x="130" y="10" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">السرعة المتوقعة (A): ${speedA} كم/س</text>
      <text x="130" y="25" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">السرعة المتوقعة (B): ${speedB} كم/س</text>
      <text x="130" y="40" text-anchor="end" fill="#94a3b8" font-size="10" font-family="sans-serif">قوة الصدمة: ${peakG}g</text>
    </g>
  `);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}">
  ${parts.join("\n  ")}
</svg>`;
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
    "front": 0,
    "front-left": 315,
    "front-right": 45,
    "side-left": 270,
    "side-right": 90,
    "rear": 180,
    "rear-left": 225,
    "rear-right": 135,
    "unknown": 180,
  };
  return angles[zone] ?? 180;
}

function toBase64(svg: string): string {
  try {
    // Node.js fallback for testing
    if (typeof global !== "undefined" && typeof (global as any).Buffer !== "undefined") {
      return (global as any).Buffer.from(svg, "utf-8").toString("base64");
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(svg, "utf-8").toString("base64");
    }
    // Browser/Metro fallback
    if (typeof btoa !== "undefined") {
      return btoa(unescape(encodeURIComponent(svg)));
    }
    // Pure Javascript base64 encoding to be 100% safe in React Native
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
