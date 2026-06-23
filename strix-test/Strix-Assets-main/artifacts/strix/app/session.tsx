import React, { useEffect, useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform, Animated, ScrollView } from "react-native";
import { Text } from "@/components/Text";;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";
import { useReports } from "@/context/ReportsContext";
import { useLanguage } from "@/context/LanguageContext";
import { SensorGauge } from "@/components/SensorGauge";
import { flipIconName } from "@/lib/rtl";
import type { Severity } from "@/lib/types";
import { ZONE_LABELS_AR } from "@/lib/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF3B30",
  severe: "#FF6B35",
  moderate: "#F59E0B",
  minor: "#34C759",
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL, locale, rtl } = useLanguage();
  const {
    isActive,
    currentGForce,
    peakGForce,
    currentSpeedKmh,
    sessionDurationSec,
    crashDetected,
    latestReport,
    isAnalyzing,
    startSession,
    stopSession,
    resetCrash,
  } = useSession();
  const { addReport, settings } = useReports();
  const addedReportIdRef = React.useRef<string | null>(null);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Auto-start session when screen opens
  useEffect(() => {
    if (!isActive) startSession();
  }, []);

  // Auto-save the report to history when a crash is detected
  useEffect(() => {
    if (crashDetected && latestReport && addedReportIdRef.current !== latestReport.id) {
      addedReportIdRef.current = latestReport.id;
      addReport(latestReport);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.97, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 80, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [crashDetected, latestReport]);

  const handleStop = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopSession();
    router.back();
  }, [stopSession]);

  const handleViewReport = useCallback(() => {
    if (!latestReport) return;
    router.push({
      pathname: "/report/[id]",
      params: { id: latestReport.id, data: JSON.stringify(latestReport) },
    });
  }, [latestReport]);

  const sev = latestReport?.severity ?? "moderate";
  const sevColor = SEVERITY_COLOR[sev];

  // Severity label — uses locale
  const SEVERITY_LABEL: Record<Severity, string> = {
    critical: t("severity.critical"),
    severe: t("severity.severe"),
    moderate: t("severity.moderate"),
    minor: t("severity.minor"),
  };

  // Direction label uses locale
  function directionLabel(d: string): string {
    const map: Record<string, string> = {
      front: t("direction.front"),
      rear: t("direction.rear"),
      "side-left": t("direction.sideLeft"),
      "side-right": t("direction.sideRight"),
      unknown: t("direction.unknown"),
    };
    return map[d] ?? d;
  }

  const zoneLabel =
    locale === "ar"
      ? t(`zone.${latestReport?.impactZone}`) ??
        directionLabel(latestReport?.impactDirection ?? "unknown")
      : directionLabel(latestReport?.impactDirection ?? "unknown");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, flexDirection: rtl.flexDirection }]}>
        <View style={styles.statusDot}>
          <View
            style={[
              styles.statusDotInner,
              {
                backgroundColor: isActive ? colors.primary : colors.mutedForeground,
              },
            ]}
          />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("session.title")}
          </Text>
          {isActive && (
            <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
              {formatDuration(sessionDurationSec)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleStop} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottomPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", alignItems: "center", gap: 14 }}>
          <SensorGauge
            gForce={currentGForce}
            size={180}
            label={t("session.gForceLabel")}
          />

            <View style={[styles.statsGrid, { flexDirection: rtl.flexDirection }]}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statVal, { color: "#FF4444" }]}>
                  {peakGForce.toFixed(1)}g
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  {t("session.peak")}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statVal, { color: colors.primary }]}>
                  {currentSpeedKmh}
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  {t("session.kmh")}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.statusRow, { flexDirection: rtl.flexDirection }]}>
                  <Text
                    style={[
                      styles.statVal,
                      {
                        color: isActive ? colors.primary : colors.mutedForeground,
                        fontSize: 14,
                      },
                    ]}
                  >
                    {isActive ? t("session.active") : t("session.stopped")}
                  </Text>
                  <View
                    style={[
                      styles.liveDot,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : colors.mutedForeground,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  {t("session.sensor")}
                </Text>
              </View>
            </View>

            {isAnalyzing && (
              <View
                style={[
                  styles.analyzingBanner,
                  {
                    backgroundColor: "#D29922" + "22",
                    borderColor: "#D29922" + "44",
                    flexDirection: rtl.flexDirection
                  },
                ]}
              >
                <Feather name="cpu" size={16} color="#D29922" />
                <Text style={[styles.analyzingText, { color: "#D29922" }]}>
                  {t("session.analyzing")}
                </Text>
              </View>
            )}

            {crashDetected && !isAnalyzing && latestReport && (
              <Animated.View
                style={[
                  styles.crashCard,
                  {
                    borderColor: sevColor,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <View style={[styles.crashHeader, { flexDirection: rtl.flexDirection }]}>
                  <Feather name="alert-triangle" size={22} color={sevColor} />
                  <Text style={[styles.crashTitle, { textAlign: rtl.textAlign }]}>
                    {t("session.crashDetectedTitle")}
                  </Text>
                  <View
                    style={[
                      styles.sevBadge,
                      { backgroundColor: sevColor + "30" },
                    ]}
                  >
                    <Text style={[styles.sevText, { color: sevColor }]}>
                      {SEVERITY_LABEL[sev]}
                    </Text>
                  </View>
                </View>

                <View style={[styles.crashStats, { flexDirection: rtl.flexDirection }]}>
                  <View style={styles.crashStat}>
                    <Text style={[styles.crashStatVal, { color: sevColor }]}>
                      {latestReport.peakGForce.toFixed(1)}g
                    </Text>
                    <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                      {t("session.peakG")}
                    </Text>
                  </View>
                  <View
                    style={[styles.crashStatDiv, { backgroundColor: "#30363D" }]}
                  />
                  <View style={styles.crashStat}>
                    <Text style={styles.crashStatVal2}>
                      {latestReport.speedKmh} {t("session.kmh")}
                    </Text>
                    <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                      {t("session.speed")}
                    </Text>
                  </View>
                  <View
                    style={[styles.crashStatDiv, { backgroundColor: "#30363D" }]}
                  />
                  <View style={styles.crashStat}>
                    <Text style={[styles.crashStatVal2, { textAlign: 'center', maxWidth: 90 }]} numberOfLines={2}>
                      {zoneLabel}
                    </Text>
                    <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                      {t("session.zone")}
                    </Text>
                  </View>
                </View>

                <View style={styles.crashActions}>
                  <TouchableOpacity
                    style={[
                      styles.viewReportBtn,
                      { backgroundColor: sevColor, flexDirection: rtl.flexDirection },
                    ]}
                    onPress={handleViewReport}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewReportText}>
                      {t("session.viewFullReport")}
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Feather name={flipIconName("arrow-right", isRTL) as any} size={18} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={resetCrash}
                  >
                    <Text style={[styles.dismissText, { color: "#8B949E" }]}>
                      {t("session.dismissContinue")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            <View
              style={[
                styles.infoBar,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rtl.flexDirection },
              ]}
            >
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoBarText, { color: colors.mutedForeground }]}>
                {t("session.detectionThreshold", {
                  g: settings.crashThresholdG.toFixed(1),
                })}
              </Text>
            </View>

            {Platform.OS === "web" && (
              <View
                style={[
                  styles.webWarning,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    flexDirection: rtl.flexDirection
                  },
                ]}
              >
                <Feather
                  name="smartphone"
                  size={20}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.webWarningText,
                    { color: colors.mutedForeground, textAlign: rtl.textAlign },
                  ]}
                >
                  {t("session.webWarning")}
                </Text>
              </View>
            )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          onPress={handleStop}
          activeOpacity={0.85}
          style={[styles.stopBtn, { backgroundColor: colors.primary, flexDirection: rtl.flexDirection }]}
        >
          <Text style={[styles.stopText, { color: "#FFFFFF" }]}>
            {t("session.stopSession")}
          </Text>
          <Feather name="square" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 3 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  timerText: { fontSize: 13, fontVariant: ["tabular-nums"], letterSpacing: 1 },
  statusDot: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotInner: { width: 10, height: 10, borderRadius: 5 },
  body: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 14,
    paddingTop: 8,
  },
  statsGrid: { flexDirection: "row", gap: 10, width: "100%" },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 5,
  },
  statVal: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: { fontSize: 11, letterSpacing: 0.2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  analyzingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    justifyContent: "flex-start",
  },
  analyzingText: { fontSize: 14, fontWeight: "600" },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    justifyContent: "flex-start",
  },
  infoBarText: { fontSize: 13 },
  webWarning: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  webWarningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  crashCard: {
    backgroundColor: "#120B0B",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    width: "100%",
  },
  crashHeader: {
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-start",
  },
  sevBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sevText: { fontSize: 12, fontWeight: "700" },
  crashTitle: { color: "#F0F6FF", fontSize: 18, fontWeight: "800", flex: 1 },
  crashStats: {
    alignItems: "center",
    justifyContent: "space-around",
  },
  crashStat: { alignItems: "center", gap: 4 },
  crashStatVal: { fontSize: 22, fontWeight: "800" },
  crashStatVal2: { fontSize: 14, fontWeight: "700", color: "#F0F6FF" },
  crashStatLbl: { fontSize: 10 },
  crashStatDiv: { width: 1, height: 32 },
  crashActions: { gap: 10 },
  viewReportBtn: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  viewReportText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  dismissBtn: { borderRadius: 12, alignItems: "center", paddingVertical: 10 },
  dismissText: { fontSize: 13, fontWeight: "500" },

  footer: { paddingHorizontal: 20, paddingTop: 8 },
  stopBtn: {
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
  },
  stopText: { fontSize: 16, fontWeight: "700" },
});
