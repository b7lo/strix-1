import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Confidence, CrossVerifiedAnalysis } from "@/lib/types";

interface Props {
  userFaultPercent: number;
  confidence: Confidence;
  factorsAr?: string[];
  crossVerifiedAnalysis?: CrossVerifiedAnalysis | null;
  currentAccidentId?: string;
}

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "#3FB950",
  medium: "#D29922",
  low: "#8B949E",
};

const CONFIDENCE_AR: Record<Confidence, string> = {
  high: "ثقة عالية",
  medium: "ثقة متوسطة",
  low: "ثقة منخفضة",
};

export function LiabilityMeter({ userFaultPercent, confidence, factorsAr, crossVerifiedAnalysis, currentAccidentId }: Props) {
  const colors = useColors();

  let finalFaultPercent = userFaultPercent;
  if (crossVerifiedAnalysis && currentAccidentId) {
    if (crossVerifiedAnalysis.accident_a_id === currentAccidentId) {
      finalFaultPercent = crossVerifiedAnalysis.liability_a_percent;
    } else if (crossVerifiedAnalysis.accident_b_id === currentAccidentId) {
      finalFaultPercent = crossVerifiedAnalysis.liability_b_percent;
    }
  }

  const otherPercent = 100 - finalFaultPercent;
  const confColor = CONFIDENCE_COLOR[confidence];

  const faultLevel =
    finalFaultPercent >= 70 ? "high" : finalFaultPercent <= 30 ? "low" : "mid";
  const faultColor =
    faultLevel === "high"
      ? "#FF4444"
      : faultLevel === "low"
      ? "#3FB950"
      : "#D29922";

  // RTL: first child in row = RIGHT
  return (
    <View style={styles.container}>
      {/* header: title RIGHT, badge LEFT */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          تقدير المسؤولية
        </Text>
        <View
          style={[
            styles.confBadge,
            { backgroundColor: confColor + "22", borderColor: confColor + "44" },
          ]}
        >
          <View style={[styles.confDot, { backgroundColor: confColor }]} />
          <Text style={[styles.confText, { color: confColor }]}>
            {CONFIDENCE_AR[confidence]}
          </Text>
        </View>
      </View>

      {/* bar: green (other) RIGHT, red (user) LEFT */}
      <View style={styles.barTrack}>
        {otherPercent > 0 && (
          <View
            style={[
              styles.barFill,
              {
                width: `${otherPercent}%` as `${number}%`,
                backgroundColor: "#3FB950",
              },
            ]}
          />
        )}
        {finalFaultPercent > 0 && (
          <View
            style={[
              styles.barFill,
              {
                width: `${finalFaultPercent}%` as `${number}%`,
                backgroundColor: "#FF4444",
              },
            ]}
          />
        )}
      </View>

      {/* labels: "other party" RIGHT, "your fault" LEFT */}
      <View style={styles.labels}>
        <View style={styles.partyBlock}>
          <Text
            style={[
              styles.partyPercent,
              { color: otherPercent >= 50 ? "#3FB950" : colors.foreground },
            ]}
          >
            {otherPercent}٪
          </Text>
          <Text style={[styles.partyLabel, { color: colors.mutedForeground }]}>
            الطرف الآخر
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.partyBlock}>
          <Text style={[styles.partyPercent, { color: faultColor }]}>
            {finalFaultPercent}٪
          </Text>
          <Text style={[styles.partyLabel, { color: colors.mutedForeground }]}>
            خطأك
          </Text>
        </View>
      </View>

      {faultLevel !== "mid" && (
        <View
          style={[
            styles.verdictBox,
            {
              backgroundColor: faultColor + "18",
              borderColor: faultColor + "40",
            },
          ]}
        >
          <Text style={[styles.verdictText, { color: faultColor }]}>
            {faultLevel === "low"
              ? "الطرف الآخر هو المسؤول الرئيسي عن الحادث"
              : "المسؤولية تقع بشكل رئيسي على السائق"}
          </Text>
        </View>
      )}

      {factorsAr && factorsAr.length > 0 && (
        <View
          style={[
            styles.factorsSection,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.factorsHeader, { color: colors.foreground }]}>
            أبرز عوامل التحليل
          </Text>
          {factorsAr.slice(0, 3).map((f, i) => (
            <View key={i} style={styles.factorItem}>
              {/* bullet RIGHT, text LEFT (flows naturally in RTL row) */}
              <Text
                style={[styles.factorBullet, { color: confColor }]}
              >
                ●
              </Text>
              <Text
                style={[styles.factorText, { color: colors.mutedForeground }]}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        للأغراض الاستعلامية فقط — ليس حكماً قانونياً
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "600" },
  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: "600" },
  barTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#21262D",
  },
  barFill: { height: "100%" },
  labels: { flexDirection: "row", alignItems: "center" },
  partyBlock: { flex: 1, gap: 2 },
  partyPercent: { fontSize: 28, fontWeight: "800" },
  partyLabel: { fontSize: 12 },
  divider: { width: 1, height: 44, marginHorizontal: 16 },
  verdictBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  verdictText: { fontSize: 13, fontWeight: "600" },
  factorsSection: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  factorsHeader: { fontSize: 12, fontWeight: "700" },
  factorItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  factorBullet: { fontSize: 8, marginTop: 7, flexShrink: 0 },
  factorText: { fontSize: 12, lineHeight: 20, flex: 1 },
  disclaimer: { fontSize: 11, fontStyle: "italic" },
});
