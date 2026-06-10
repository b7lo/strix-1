import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, Path } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  data: number[];
  width?: number;
  height?: number;
}

export function SpeedGraph({ data, width = 300, height = 150 }: Props) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={{ color: colors.mutedForeground }}>لا تتوفر بيانات للسرعة</Text>
      </View>
    );
  }

  const padding = 20;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxSpeed = Math.max(...data, 20); // حد أدنى 20 للرسم
  const minSpeed = 0;

  // النقاط
  const points = data.map((speed, index) => {
    const x = padding + (index / (Math.max(data.length - 1, 1))) * graphWidth;
    const y = padding + graphHeight - ((speed - minSpeed) / (maxSpeed - minSpeed)) * graphHeight;
    return { x, y, speed };
  });

  const pathString = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaString = `${pathString} L ${points[points.length - 1].x} ${padding + graphHeight} L ${points[0].x} ${padding + graphHeight} Z`;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* الشبكة الخلفية */}
        {[0, 0.5, 1].map((r) => {
          const y = padding + graphHeight * r;
          return (
            <React.Fragment key={r}>
              <Line x1={padding} y1={y} x2={width - padding} y2={y} stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
              <SvgText x={padding - 5} y={y + 4} fill={colors.mutedForeground} fontSize="10" textAnchor="end">
                {Math.round(maxSpeed * (1 - r))}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* المساحة المظللة */}
        <Path d={areaString} fill="url(#gradient)" />

        {/* خط الرسم */}
        <Polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* النقاط */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill="#0D1117" stroke="#3B82F6" strokeWidth="2" />
        ))}
      </Svg>
      <View style={styles.labels}>
        <Text style={[styles.axisLabel, { color: colors.mutedForeground }]}>قبل 10 ثوانٍ</Text>
        <Text style={[styles.axisLabel, { color: '#FF4444', fontWeight: 'bold' }]}>وقت الحادث</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#333",
    borderRadius: 8,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    marginTop: -5,
  },
  axisLabel: {
    fontSize: 10,
  },
});
