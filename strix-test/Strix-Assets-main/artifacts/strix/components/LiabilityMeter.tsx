import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";;
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import type { Confidence, CrossVerifiedAnalysis } from "@/lib/types";

interface Props {
  userFaultPercent: number;
  confidence: Confidence;
  factorsAr?: string[];
  crossVerifiedAnalysis?: CrossVerifiedAnalysis | null;
  currentAccidentId?: string;
}

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "#10B981",
  medium: "#F59E0B",
  low: "#94A3B8",
};

export function LiabilityMeter({ userFaultPercent, confidence, factorsAr, crossVerifiedAnalysis, currentAccidentId }: Props) {
  const colors = useColors();
  const { t, isRTL, rtl } = useLanguage();

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

  const confLabel: Record<Confidence, string> = {
    high: t("liabilityMeter.confidenceHigh"),
    medium: t("liabilityMeter.confidenceMedium"),
    low: t("liabilityMeter.confidenceLow"),
  };

  const faultLevel =
    finalFaultPercent >= 70 ? "high" : finalFaultPercent <= 30 ? "low" : "mid";
  const faultColor =
    faultLevel === "high"
      ? "#EF4444"
      : faultLevel === "low"
      ? "#10B981"
      : "#F59E0B";

  // RTL: first child in row = RIGHT
  return (
    <View style={styles.container}>
      {/* header: title RIGHT, badge LEFT */}
      <View style={[styles.header, { flexDirection: rtl.flexDirection }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign: rtl.textAlign }]}>
          {t("liabilityMeter.title")}
        </Text>
        <View
          style={[
            styles.confBadge,
            { flexDirection: rtl.flexDirection },
            { backgroundColor: confColor + "22", borderColor: confColor + "44" },
          ]}
        >
          <View style={[styles.confDot, { backgroundColor: confColor }]} />
          <Text style={[styles.confText, { color: confColor }]}>
            {confLabel[confidence]}
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
                backgroundColor: "#10B981",
                borderTopRightRadius: finalFaultPercent === 0 ? 8 : 0,
                borderBottomRightRadius: finalFaultPercent === 0 ? 8 : 0,
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
                backgroundColor: faultColor,
                borderTopLeftRadius: otherPercent === 0 ? 8 : 0,
                borderBottomLeftRadius: otherPercent === 0 ? 8 : 0,
              },
            ]}
          />
        )}
      </View>

      {/* labels: "other party" RIGHT, "your fault" LEFT */}
      <View style={[styles.labels, { flexDirection: rtl.flexDirection }]}>
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
            {t("liabilityMeter.otherParty")}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.partyBlock}>
          <Text style={[styles.partyPercent, { color: faultColor }]}>
            {finalFaultPercent}٪
          </Text>
          <Text style={[styles.partyLabel, { color: colors.mutedForeground }]}>
            {t("liabilityMeter.yourFault")}
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
          <Text style={[styles.verdictText, { color: faultColor, textAlign: rtl.textAlign }]}>
            {faultLevel === "low"
              ? t("liabilityMeter.verdictOtherParty")
              : t("liabilityMeter.verdictDriver")}
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
          <Text style={[styles.factorsHeader, { color: colors.foreground, textAlign: rtl.textAlign }]}>
            {t("liabilityMeter.topFactors")}
          </Text>
          {factorsAr.slice(0, 3).map((f, i) => (
            <View key={i} style={[styles.factorItem, { flexDirection: rtl.flexDirection }]}>
              {/* bullet RIGHT, text LEFT (flows naturally in RTL row) */}
              <Text
                style={[styles.factorBullet, { color: confColor }]}
              >
                ●
              </Text>
              <Text
                style={[styles.factorText, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.disclaimer, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
        {t("liabilityMeter.disclaimer")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "800" },
  confBadge: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  confDot: { width: 7, height: 7, borderRadius: 4 },
  confText: { fontSize: 11, fontWeight: "700" },
  barTrack: {
    flexDirection: "row",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1E2D3D",
  },
  barFill: { height: "100%" },
  labels: { alignItems: "center" },
  partyBlock: { flex: 1, gap: 3, alignItems: "center" },
  partyPercent: { fontSize: 32, fontWeight: "800", textAlign: "center", letterSpacing: -1 },
  partyLabel: { fontSize: 12, textAlign: "center", fontWeight: "500" },
  divider: { width: 1, height: 48, marginHorizontal: 16 },
  verdictBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  verdictText: { fontSize: 14, fontWeight: "700", lineHeight: 22 },
  factorsSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  factorsHeader: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  factorItem: {
    alignItems: "flex-start",
    gap: 8,
  },
  factorBullet: { fontSize: 8, marginTop: 7, flexShrink: 0 },
  factorText: { fontSize: 13, lineHeight: 21, flex: 1 },
  disclaimer: { fontSize: 11, fontStyle: "italic", lineHeight: 17 },
});
