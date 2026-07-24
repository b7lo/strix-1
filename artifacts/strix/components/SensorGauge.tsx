import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";;
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  gForce: number;
  maxGForce?: number;
  size?: number;
  label?: string;
}

export function SensorGauge({ gForce, maxGForce = 5, size = 160, label = "G-Force" }: Props) {
  const colors = useColors();
  const radius = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = -220;
  const sweepAngle = 260;
  const progress = Math.min(gForce / maxGForce, 1);
  const currentAngle = startAngle + sweepAngle * progress;

  function polarToXY(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, r: number): string {
    const start = polarToXY(startDeg, r);
    const end = polarToXY(endDeg, r);
    const diff = endDeg - startDeg;
    const large = Math.abs(diff) > 180 ? 1 : 0;
    const sweep = diff > 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${sweep} ${end.x} ${end.y}`;
  }

  // ألوان تدريجية بناءً على الشدة
  function getZoneColor(value: number): string {
    if (value < 1.0) return colors.primary; // أخضر — آمن
    if (value < 2.0) return "#F59E0B"; // أصفر — تنبيه
    if (value < 3.5) return "#F97316"; // برتقالي — شديد
    return "#EF4444";                  // أحمر — حرج
  }

  const arcColor = getZoneColor(gForce);

  // حساب عرض الـ stroke بناءً على الـ size
  const strokeW = size / 20;

  const trackPath = arcPath(startAngle, startAngle + sweepAngle, radius);
  const valuePath = progress > 0 ? arcPath(startAngle, currentAngle, radius) : "";

  const needleTip = polarToXY(currentAngle, radius - strokeW / 2 + 2);

  // تقسيم المؤشر إلى 3 مناطق (خطوط فاصلة)
  const zone1End = startAngle + sweepAngle * (1.0 / maxGForce);
  const zone2End = startAngle + sweepAngle * (2.0 / maxGForce);
  const zone3End = startAngle + sweepAngle * (3.5 / maxGForce);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="40%" stopColor="#F59E0B" />
            <Stop offset="75%" stopColor="#F97316" />
            <Stop offset="100%" stopColor="#EF4444" />
          </LinearGradient>
        </Defs>

        {/* المسار الخلفي */}
        <Path
          d={trackPath}
          fill="none"
          stroke={colors.border}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* المسار المتقدم */}
        {progress > 0 && (
          <Path
            d={valuePath}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}

        {/* مركز الإبرة */}
        <Circle cx={cx} cy={cy} r={strokeW / 2} fill={arcColor} />

        {/* رأس الإبرة */}
        {progress > 0 && (
          <Circle cx={needleTip.x} cy={needleTip.y} r={strokeW / 2 + 1} fill={arcColor} />
        )}

        {/* القيمة الرقمية */}
        <Svg>
          <Path
            d=""
            fill="none"
          />
        </Svg>
      </Svg>

      {/* النص في المنتصف — خارج SVG للدقة */}
      <View style={styles.centerText} pointerEvents="none">
        <Text style={[styles.gValue, { color: arcColor }]}>
          {gForce.toFixed(2)}
        </Text>
        <Text style={[styles.gLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  gValue: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 34,
  },
  gLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
});
