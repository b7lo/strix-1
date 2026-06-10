import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import type { AccidentReport, ImpactDirection, Severity } from "@/lib/types";
import { ZONE_LABELS_AR } from "@/lib/types";

interface Props {
  report: AccidentReport;
  onPress?: () => void;
}

const DIRECTION_AR: Record<ImpactDirection, string> = {
  front: "أمامي",
  rear: "خلفي",
  "side-left": "جانبي أيسر",
  "side-right": "جانبي أيمن",
  unknown: "غير محدد",
};

const DIRECTION_ICON: Record<ImpactDirection, keyof typeof Feather.glyphMap> = {
  front: "arrow-up",
  rear: "arrow-down",
  "side-left": "arrow-left",
  "side-right": "arrow-right",
  unknown: "help-circle",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF4444",
  severe: "#FF6B35",
  moderate: "#D29922",
  minor: "#3FB950",
};

const SEVERITY_AR: Record<Severity, string> = {
  critical: "حرج",
  severe: "شديد",
  moderate: "متوسط",
  minor: "خفيف",
};

function formatDateAr(ts: number): string {
  return new Date(ts).toLocaleString("ar-SA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportCard({ report, onPress }: Props) {
  const colors = useColors();
  const sev: Severity = report.severity ?? "moderate";
  const sevColor = SEVERITY_COLOR[sev];

  const faultColor =
    report.liabilityScore >= 65
      ? "#FF4444"
      : report.liabilityScore <= 25
      ? "#3FB950"
      : "#D29922";

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/report/[id]",
        params: { id: report.id, data: JSON.stringify(report) },
      });
    }
  };

  // RTL: first child = RIGHT (start), last child = LEFT (end)
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderStartWidth: 4,
          borderStartColor: sevColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        },
      ]}
    >
      {/* RIGHT: direction icon */}
      <View
        style={[styles.dirIcon, { backgroundColor: sevColor + "22" }]}
      >
        <Feather
          name={DIRECTION_ICON[report.impactDirection] ?? "alert-circle"}
          size={16}
          color={sevColor}
        />
      </View>

      {/* CENTER: body */}
      <View style={styles.body}>
        {/* topRow: title RIGHT, pill LEFT */}
        <View style={styles.topRow}>
          <Text style={[styles.impactType, { color: colors.foreground }]}>
            {report.impactZone ? ZONE_LABELS_AR[report.impactZone] : (DIRECTION_AR[report.impactDirection] ?? "غير محدد")}
          </Text>
          <View
            style={[styles.sevPill, { backgroundColor: sevColor + "22" }]}
          >
            <Text style={[styles.sevText, { color: sevColor }]}>
              {SEVERITY_AR[sev]}
            </Text>
          </View>
        </View>

        {report.scenarioAr ? (
          <Text
            style={[styles.scenario, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {report.scenarioAr}
          </Text>
        ) : null}

        {/* metaRow: date RIGHT, chips LEFT */}
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDateAr(report.timestamp)}
          </Text>
          <View style={styles.chips}>
            <View
              style={[styles.chip, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                {report.peakGForce.toFixed(1)}g
              </Text>
            </View>
            <View
              style={[styles.chip, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.chipText, { color: faultColor }]}>
                {report.liabilityScore}٪
              </Text>
            </View>
            {report.feedback && (
              <Feather
                name={report.feedback === "correct" ? "check-circle" : "x-circle"}
                size={13}
                color={report.feedback === "correct" ? "#3FB950" : "#FF4444"}
              />
            )}
          </View>
        </View>
      </View>

      {/* LEFT: chevron */}
      <Feather
        name="chevron-left"
        size={16}
        color={colors.mutedForeground}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  dirIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, gap: 5 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  impactType: { fontSize: 15, fontWeight: "700" },
  sevPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  sevText: { fontSize: 11, fontWeight: "700" },
  scenario: { fontSize: 12 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  date: { fontSize: 11 },
  chips: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: "600" },
  chevron: { flexShrink: 0 },
});
