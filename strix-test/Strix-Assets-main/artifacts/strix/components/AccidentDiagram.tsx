import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Rect,
  Circle,
  G,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
  Line,
} from "react-native-svg";
import type { ImpactZone, CrossVerifiedAnalysis } from "@/lib/types";
import { ZONE_LABELS_AR } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface Props {
  zone: ImpactZone;
  width?: number;
  height?: number;
  crossVerifiedAnalysis?: CrossVerifiedAnalysis | null;
  currentAccidentId?: string;
}

const USER_COLOR = "#3B82F6";
const OTHER_COLOR = "#EAB308";
const IMPACT_COLOR = "#FF4444";
const BODY_COLOR = "#1E293B";
const OUTLINE_COLOR = "#334155";
const GLASS_COLOR = "rgba(56,189,248,0.12)";

// ─── إحداثيات مناطق الاصطدام (نسبية لحجم السيارة) ───
function getZonePosition(
  zone: ImpactZone,
  carX: number,
  carY: number,
  carW: number,
  carH: number
): { x: number; y: number } {
  const cx = carX + carW / 2;
  const right = carX + carW;
  const top = carY;
  const bottom = carY + carH;

  switch (zone) {
    case "front":       return { x: cx, y: top - 2 };
    case "front-left":  return { x: carX + 4, y: top + 8 };
    case "front-right": return { x: right - 4, y: top + 8 };
    case "side-left":   return { x: carX - 2, y: top + carH / 2 };
    case "side-right":  return { x: right + 2, y: top + carH / 2 };
    case "rear-left":   return { x: carX + 4, y: bottom - 8 };
    case "rear-right":  return { x: right - 4, y: bottom - 8 };
    case "rear":        return { x: cx, y: bottom + 2 };
    default:            return { x: cx, y: top + carH / 2 };
  }
}

/**
 * يحسب مكان الطرف الآخر وزاوية دورانه بناءً على مناطق الاصطدام المتبادلة.
 *
 * المنطق: منطقة الاصطدام على سيارتي تحدد من أي جهة جاء الطرف الآخر.
 * ثم نحسب دوران سيارته بحيث المنطقة المصابة فيه تواجه سيارتي.
 */
function getOtherCarPlacement(
  myZone: ImpactZone,
  otherZone: ImpactZone,
  carX: number,
  carY: number,
  carW: number,
  carH: number
): { x: number; y: number; rotation: number } {
  const gap = 18;

  function rotationForOtherZone(oz: ImpactZone): number {
    if (oz.includes("front")) return 180;
    if (oz.includes("rear")) return 0;
    if (oz === "side-left") return -90;
    if (oz === "side-right") return 90;
    return 180;
  }

  const rot = rotationForOtherZone(otherZone);

  if (myZone === "front") {
    return { x: carX, y: carY - carH - gap, rotation: rot };
  }
  if (myZone === "front-right") {
    return { x: carX + carW + gap, y: carY - carH * 0.5, rotation: rot };
  }
  if (myZone === "front-left") {
    return { x: carX - carW - gap, y: carY - carH * 0.5, rotation: rot };
  }
  if (myZone === "side-right") {
    return { x: carX + carW + gap, y: carY, rotation: rot };
  }
  if (myZone === "side-left") {
    return { x: carX - carW - gap, y: carY, rotation: rot };
  }
  if (myZone === "rear") {
    return { x: carX, y: carY + carH + gap, rotation: rot };
  }
  if (myZone === "rear-right") {
    return { x: carX + carW + gap, y: carY + carH * 0.5, rotation: rot };
  }
  if (myZone === "rear-left") {
    return { x: carX - carW - gap, y: carY + carH * 0.5, rotation: rot };
  }

  return { x: carX, y: carY - carH - gap, rotation: rot };
}

function CarTopView({
  x,
  y,
  w,
  h,
  rotation = 0,
  label = "",
  color = USER_COLOR,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  label?: string;
  color?: string;
}) {
  const wheelW = 8;
  const wheelH = 16;
  const wheelR = 3;
  const glassInset = 6;
  const glassH = h * 0.16;

  return (
    <G rotation={rotation} origin={`${x + w / 2}, ${y + h / 2}`}>
      <Rect x={x} y={y} width={w} height={h} rx={w * 0.22} fill={BODY_COLOR} stroke={OUTLINE_COLOR} strokeWidth={1.5} />
      <Rect x={x + glassInset} y={y + h * 0.1} width={w - glassInset * 2} height={glassH} rx={4} fill={GLASS_COLOR} stroke={OUTLINE_COLOR} strokeWidth={0.5} />
      <Rect x={x + glassInset + 2} y={y + h - h * 0.1 - glassH * 0.8} width={w - (glassInset + 2) * 2} height={glassH * 0.8} rx={3} fill={GLASS_COLOR} stroke={OUTLINE_COLOR} strokeWidth={0.5} />
      <Rect x={x + 1} y={y + h * 0.35} width={w - 2} height={0.5} fill={OUTLINE_COLOR} opacity={0.3} />
      <Rect x={x + 1} y={y + h * 0.65} width={w - 2} height={0.5} fill={OUTLINE_COLOR} opacity={0.3} />
      <Rect x={x - wheelW + 1} y={y + h * 0.1} width={wheelW} height={wheelH} rx={wheelR} fill="#0F172A" stroke="#475569" strokeWidth={0.5} />
      <Rect x={x + w - 1} y={y + h * 0.1} width={wheelW} height={wheelH} rx={wheelR} fill="#0F172A" stroke="#475569" strokeWidth={0.5} />
      <Rect x={x - wheelW + 1} y={y + h - h * 0.1 - wheelH} width={wheelW} height={wheelH} rx={wheelR} fill="#0F172A" stroke="#475569" strokeWidth={0.5} />
      <Rect x={x + w - 1} y={y + h - h * 0.1 - wheelH} width={wheelW} height={wheelH} rx={wheelR} fill="#0F172A" stroke="#475569" strokeWidth={0.5} />
      <Rect x={x + 3} y={y + 2} width={6} height={3} rx={1.5} fill="#FCD34D" opacity={0.6} />
      <Rect x={x + w - 9} y={y + 2} width={6} height={3} rx={1.5} fill="#FCD34D" opacity={0.6} />
      <Rect x={x + 3} y={y + h - 5} width={6} height={3} rx={1.5} fill="#EF4444" opacity={0.6} />
      <Rect x={x + w - 9} y={y + h - 5} width={6} height={3} rx={1.5} fill="#EF4444" opacity={0.6} />
      <SvgText x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={color} fontSize={8} fontWeight="700" opacity={0.6}>
        {label}
      </SvgText>
    </G>
  );
}

export function AccidentDiagram({
  zone,
  width = 300,
  height = 280,
  crossVerifiedAnalysis,
  currentAccidentId,
}: Props) {
  const { t } = useTranslation();
  const carW = 52;
  const carH = 96;
  const carX = (width - carW) / 2;
  const carY = (height - carH) / 2;

  let showOtherCar = false;
  let otherZone: ImpactZone = "unknown";
  let otherSpeed = 0;
  let otherPlacement = { x: carX, y: carY - carH - 20, rotation: 180 };

  if (crossVerifiedAnalysis && currentAccidentId) {
    showOtherCar = true;
    if (crossVerifiedAnalysis.accident_a_id === currentAccidentId) {
      otherZone = crossVerifiedAnalysis.verified_impact_zone_b;
      otherSpeed = crossVerifiedAnalysis.verified_speed_b_kmh;
    } else {
      otherZone = crossVerifiedAnalysis.verified_impact_zone_a;
      otherSpeed = crossVerifiedAnalysis.verified_speed_a_kmh;
    }
    otherPlacement = getOtherCarPlacement(zone, otherZone, carX, carY, carW, carH);
  }

  const impactPos = getZonePosition(zone, carX, carY, carW, carH);
  const isUnknown = zone === "unknown";
  const labelText = t(`zone.${zone}`, { defaultValue: ZONE_LABELS_AR[zone] });
  const glowR = isUnknown ? 18 : 22;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="impactGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={IMPACT_COLOR} stopOpacity="0.7" />
            <Stop offset="60%" stopColor={IMPACT_COLOR} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={IMPACT_COLOR} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* خلفية */}
        <Rect x={0} y={0} width={width} height={height} fill="#0D1117" rx={14} />

        {/* شبكة خلفية */}
        {[0.25, 0.5, 0.75].map((r) => (
          <G key={r}>
            <Rect x={width * r} y={10} width={0.5} height={height - 20} fill="#1E293B" opacity={0.3} />
            <Rect x={10} y={height * r} width={width - 20} height={0.5} fill="#1E293B" opacity={0.3} />
          </G>
        ))}

        {/* الطرف الآخر */}
        {showOtherCar && (
          <G>
            <CarTopView
              x={otherPlacement.x}
              y={otherPlacement.y}
              w={carW}
              h={carH}
              rotation={otherPlacement.rotation}
              label={t("liabilityMeter.otherParty")}
              color={OTHER_COLOR}
            />
            <Rect
              x={otherPlacement.x + carW / 2 - 25}
              y={otherPlacement.y - 18}
              width={50}
              height={14}
              fill="rgba(234,179,8,0.18)"
              rx={4}
            />
            <SvgText
              x={otherPlacement.x + carW / 2}
              y={otherPlacement.y - 8}
              textAnchor="middle"
              fill={OTHER_COLOR}
              fontSize={8}
              fontWeight="bold"
            >
              {otherSpeed} {t("report.kmh")}
            </SvgText>
          </G>
        )}

        {/* سيارتك */}
        <CarTopView x={carX} y={carY} w={carW} h={carH} label={t("report.yourCar")} />

        {/* نقطة الاصطدام */}
        {!isUnknown && (
          <G>
            <Circle cx={impactPos.x} cy={impactPos.y} r={glowR} fill="url(#impactGlow)" />
            <Circle cx={impactPos.x} cy={impactPos.y} r={10} fill="none" stroke={IMPACT_COLOR} strokeWidth={1} opacity={0.4} />
            <Circle cx={impactPos.x} cy={impactPos.y} r={5} fill={IMPACT_COLOR} />
            <Rect x={impactPos.x - 12} y={impactPos.y - 0.5} width={24} height={1} fill={IMPACT_COLOR} opacity={0.5} />
            <Rect x={impactPos.x - 0.5} y={impactPos.y - 12} width={1} height={24} fill={IMPACT_COLOR} opacity={0.5} />
          </G>
        )}

        {/* خط اتصال بين نقطتي الاصطدام */}
        {showOtherCar && !isUnknown && otherZone !== "unknown" && (
          <Line
            x1={impactPos.x}
            y1={impactPos.y}
            x2={otherPlacement.x + carW / 2}
            y2={otherPlacement.y + carH / 2}
            stroke={IMPACT_COLOR}
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.4}
          />
        )}

        {/* تسمية المنطقة */}
        <Rect x={8} y={height - 34} width={width - 16} height={26} fill="rgba(13,17,23,0.85)" rx={6} />
        <SvgText
          x={width / 2}
          y={height - 17}
          textAnchor="middle"
          fill={isUnknown ? "#8B949E" : IMPACT_COLOR}
          fontSize={12}
          fontWeight="600"
        >
          {showOtherCar
            ? `${labelText} ← → ${t(`zone.${otherZone}`, { defaultValue: ZONE_LABELS_AR[otherZone] || t("zone.unknown") })}`
            : labelText}
        </SvgText>

        {/* مفتاح الألوان */}
        <G transform="translate(12, 12)">
          <Rect x={0} y={0} width={10} height={10} rx={2} fill={USER_COLOR} />
          <SvgText x={13} y={9} fill="#8B949E" fontSize={9}>{t("report.yourCar")}</SvgText>
          {showOtherCar && (
            <>
              <Rect x={55} y={0} width={10} height={10} rx={2} fill={OTHER_COLOR} />
              <SvgText x={68} y={9} fill="#8B949E" fontSize={9}>{t("liabilityMeter.otherParty")}</SvgText>
            </>
          )}
          <Circle cx={showOtherCar ? 140 : 60} cy={5} r={4} fill={IMPACT_COLOR} />
          <SvgText x={showOtherCar ? 147 : 67} y={9} fill="#8B949E" fontSize={9}>{t("report.impactPoint")}</SvgText>
        </G>

        {/* اتجاه الحركة */}
        <SvgText x={width / 2} y={carY - 14} textAnchor="middle" fill="#475569" fontSize={9}>▲ {t("report.front")}</SvgText>
        <SvgText x={width / 2} y={carY + carH + 22} textAnchor="middle" fill="#475569" fontSize={9}>▼ {t("report.back")}</SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, overflow: "hidden" },
});
