import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";;
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import type { AccidentReport, ImpactDirection, Severity } from "@/lib/types";

interface Props {
  report: AccidentReport;
  onPress?: () => void;
}

const DIRECTION_ICON: Record<ImpactDirection, keyof typeof Feather.glyphMap> = {
  front: "arrow-up",
  rear: "arrow-down",
  "side-left": "arrow-left",
  "side-right": "arrow-right",
  unknown: "help-circle",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF3B30",
  severe: "#FF6B35",
  moderate: "#F59E0B",
  minor: "#34C759",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "#FF3B3015",
  severe: "#FF6B3515",
  moderate: "#F59E0B15",
  minor: "#34C75915",
};

export function ReportCard({ report, onPress }: Props) {
  const colors = useColors();
  const sev: Severity = report.severity ?? "moderate";
  const sevColor = SEVERITY_COLOR[sev];
  const sevBg = SEVERITY_BG[sev];
  const { t, isRTL, rtl, formatDate: fmtDate } = useLanguage();

  // إذا الحادث من خلال 30 دقيقة → جديد
  const isNew = Date.now() - report.timestamp < 30 * 60 * 1000;

  const getDirectionAr = (): Record<ImpactDirection, string> => ({
    front: t("liability.dirFront"),
    rear: t("liability.dirRear"),
    "side-left": t("liability.dirSideLeft"),
    "side-right": t("liability.dirSideRight"),
    unknown: t("liability.dirUnknown"),
  });

  const getSeverityAr = (): Record<Severity, string> => ({
    critical: t("report.severityCritical"),
    severe: t("report.severitySevere"),
    moderate: t("report.severityModerate"),
    minor: t("report.severityMinor"),
  });

  const faultColor =
    report.liabilityScore >= 65
      ? "#FF3B30"
      : report.liabilityScore <= 25
      ? "#34C759"
      : "#F59E0B";

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

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.72}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: sevColor,
        },
      ]}
    >
      {/* شريط اللون العلوي - accent top bar */}
      <View style={[styles.accentBar, { backgroundColor: sevColor }]} />

      <View style={[styles.inner, { flexDirection: rtl.flexDirection }]}>
        {/* أيقونة الاتجاه */}
        <View style={[styles.dirIcon, { backgroundColor: sevBg, borderColor: sevColor + "40" }]}>
          <Feather
            name={DIRECTION_ICON[report.impactDirection] ?? "alert-circle"}
            size={18}
            color={sevColor}
          />
        </View>

        {/* المحتوى */}
        <View style={styles.body}>
          {/* الصف العلوي: النوع + الخطورة */}
          <View style={[styles.topRow, { flexDirection: rtl.flexDirection }]}>
            <View style={[styles.titleRow, { flexDirection: rtl.flexDirection }]}>
              {isNew && <View style={[styles.newDot, { backgroundColor: sevColor }]} />}
              <Text
                style={[styles.impactType, { color: colors.foreground, textAlign: rtl.textAlign }]}
                numberOfLines={1}
              >
                {report.impactZone
                  ? t(`zone.${report.impactZone}`, { defaultValue: getDirectionAr()[report.impactDirection] })
                  : (getDirectionAr()[report.impactDirection] ?? t("liability.dirUnknown"))}
              </Text>
            </View>
            <View style={[styles.sevPill, { backgroundColor: sevBg, borderColor: sevColor + "60" }]}>
              <Text style={[styles.sevText, { color: sevColor }]}>{getSeverityAr()[sev]}</Text>
            </View>
          </View>

          {/* السيناريو */}
          {report.scenarioAr ? (
            <Text
              style={[styles.scenario, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}
              numberOfLines={1}
            >
              {report.scenarioAr}
            </Text>
          ) : null}

          {/* صف البيانات */}
          <View style={[styles.metaRow, { flexDirection: rtl.flexDirection }]}>
            <Text style={[styles.date, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
              {fmtDate(report.timestamp)}
            </Text>
            <View style={[styles.chips, { flexDirection: rtl.flexDirection }]}>
              {/* قوة الصدمة */}
              <View style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border, flexDirection: rtl.flexDirection }]}>
                <Feather name="zap" size={10} color={colors.mutedForeground} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>
                  {report.peakGForce.toFixed(1)}g
                </Text>
              </View>
              {/* نسبة المسؤولية */}
              <View style={[styles.chip, { backgroundColor: faultColor + "18", borderColor: faultColor + "40" }]}>
                <Text style={[styles.chipText, { color: faultColor, fontWeight: "700" }]}>
                  {report.liabilityScore}٪
                </Text>
              </View>
              {/* حالة التحقق */}
              {report.feedback && (
                <View style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather
                    name={report.feedback === "correct" ? "check-circle" : "x-circle"}
                    size={12}
                    color={report.feedback === "correct" ? "#34C759" : "#FF3B30"}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* سهم التنقل */}
        <Feather
          name={isRTL ? "chevron-left" : "chevron-right"}
          size={16}
          color={colors.mutedForeground}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  inner: {
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  dirIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, gap: 6 },
  titleRow: { flex: 1, alignItems: "center", gap: 6 },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  topRow: { alignItems: "center", gap: 8 },
  impactType: { flex: 1, fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  sevPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  sevText: { fontSize: 11, fontWeight: "700" },
  scenario: { fontSize: 12, lineHeight: 17 },
  metaRow: {
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    marginTop: 2,
  },
  date: { flex: 1, fontSize: 11 },
  chips: { alignItems: "center", gap: 5, flexShrink: 0 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  chevron: { flexShrink: 0 },
});
