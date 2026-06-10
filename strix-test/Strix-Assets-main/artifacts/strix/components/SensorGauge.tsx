import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G, Text as SvgText, Path } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  gForce: number;
  maxGForce?: number;
  size?: number;
  label?: string;
}

export function SensorGauge({ gForce, maxGForce = 5, size = 160, label = "G-Force" }: Props) {
  const colors = useColors();
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = -220;
  const sweepAngle = 260;
  const progress = Math.min(gForce / maxGForce, 1);
  const currentAngle = startAngle + sweepAngle * progress;

  function polarToXY(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number, r: number): string {
    const start = polarToXY(startDeg, r);
    const end = polarToXY(endDeg, r);
    const diff = endDeg - startDeg;
    const large = Math.abs(diff) > 180 ? 1 : 0;
    const sweep = diff > 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${sweep} ${end.x} ${end.y}`;
  }

  function getArcColor(value: number): string {
    if (value < 1.0) return "#3FB950";
    if (value < 2.0) return "#D29922";
    return "#FF4444";
  }

  const arcColor = getArcColor(gForce);
  const trackPath = arcPath(startAngle, startAngle + sweepAngle, radius);
  const valuePath = progress > 0 ? arcPath(startAngle, currentAngle, radius) : "";

  const needleTip = polarToXY(currentAngle, radius - 8);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Path
          d={trackPath}
          fill="none"
          stroke={colors.border}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {progress > 0 && (
          <Path
            d={valuePath}
            fill="none"
            stroke={arcColor}
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
        <Circle cx={cx} cy={cy} r={4} fill={arcColor} />
        <Circle cx={needleTip.x} cy={needleTip.y} r={5} fill={arcColor} />

        <SvgText
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill={arcColor}
          fontSize={28}
          fontWeight="700"
        >
          {gForce.toFixed(1)}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="#8B949E"
          fontSize={11}
          fontWeight="500"
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
