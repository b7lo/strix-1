import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  // Linking, // DEMO: disabled for client demo
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";
import { useReports } from "@/context/ReportsContext";
import { SensorGauge } from "@/components/SensorGauge";
import type { Severity } from "@/lib/types";
import { ZONE_LABELS_AR } from "@/lib/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF4444",
  severe: "#FF6B35",
  moderate: "#D29922",
  minor: "#3FB950",
};

const SEVERITY_LABEL_AR: Record<Severity, string> = {
  critical: "حرج",
  severe: "شديد",
  moderate: "متوسط",
  minor: "خفيف",
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function directionLabelAr(d: string): string {
  const map: Record<string, string> = {
    front: "أمامي",
    rear: "خلفي",
    "side-left": "جانبي أيسر",
    "side-right": "جانبي أيمن",
    unknown: "غير محدد",
  };
  return map[d] ?? d;
}

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
  const { addReport, /* contacts, */ settings } = useReports();
  // DEMO: emergency contact state disabled for client demo
  // const [alertDismissed, setAlertDismissed] = useState(false);
  // const [countdown, setCountdown] = useState(15);
  // const countdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
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

  // DEMO: Emergency countdown logic removed for client demo

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

  // DEMO: Emergency call function removed for client demo
  // const handleEmergencyCall = useCallback(async (phone: string) => {
  //   await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  //   Linking.openURL(`tel:${phone}`);
  // }, []);

  const sev = latestReport?.severity ?? "moderate";
  const sevColor = SEVERITY_COLOR[sev];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.statusDot}>
          <View
            style={[
              styles.statusDotInner,
              {
                backgroundColor: isActive ? "#3FB950" : colors.mutedForeground,
              },
            ]}
          />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            المراقبة المباشرة
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
        {crashDetected && latestReport ? (
          <>
            <Animated.View
              style={[
                styles.crashCard,
                {
                  borderColor: sevColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.crashHeader}>
                <Feather name="alert-triangle" size={22} color={sevColor} />
                <Text style={styles.crashTitle}>تم رصد حادث</Text>
                <View
                  style={[
                    styles.sevBadge,
                    { backgroundColor: sevColor + "30" },
                  ]}
                >
                  <Text style={[styles.sevText, { color: sevColor }]}>
                    {SEVERITY_LABEL_AR[sev]}
                  </Text>
                </View>
              </View>

              <View style={styles.crashStats}>
                <View style={styles.crashStat}>
                  <Text style={[styles.crashStatVal, { color: sevColor }]}>
                    {latestReport.peakGForce.toFixed(1)}g
                  </Text>
                  <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                    ذروة G
                  </Text>
                </View>
                <View
                  style={[styles.crashStatDiv, { backgroundColor: "#30363D" }]}
                />
                <View style={styles.crashStat}>
                  <Text style={styles.crashStatVal2}>
                    {latestReport.speedKmh} كم/س
                  </Text>
                  <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                    السرعة
                  </Text>
                </View>
                <View
                  style={[styles.crashStatDiv, { backgroundColor: "#30363D" }]}
                />
                <View style={styles.crashStat}>
                  <Text style={[styles.crashStatVal2, { textAlign: 'center', maxWidth: 90 }]} numberOfLines={2}>
                    {ZONE_LABELS_AR[latestReport.impactZone] || directionLabelAr(latestReport.impactDirection)}
                  </Text>
                  <Text style={[styles.crashStatLbl, { color: "#8B949E" }]}>
                    المنطقة
                  </Text>
                </View>
              </View>

              <View style={styles.crashActions}>
                <TouchableOpacity
                  onPress={handleViewReport}
                  style={[styles.viewReportBtn, { backgroundColor: sevColor }]}
                >
                  <Text style={styles.viewReportText}>عرض التقرير الكامل</Text>
                  <Feather name="arrow-left" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resetCrash}
                  style={styles.dismissBtn}
                >
                  <Text
                    style={[styles.dismissText, { color: colors.mutedForeground }]}
                  >
                    تجاهل — متابعة المراقبة
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* DEMO: Emergency contact panel removed for client demo */}
          </>
        ) : (
          <>
            <SensorGauge
              gForce={currentGForce}
              size={180}
              label="قوة الاصطدام G"
            />

            <View style={styles.statsGrid}>
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
                  الذروة
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.statVal, { color: "#3FB950" }]}>
                  {currentSpeedKmh}
                </Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  كم/س
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.statusRow}>
                  <Text
                    style={[
                      styles.statVal,
                      {
                        color: isActive ? "#3FB950" : colors.mutedForeground,
                        fontSize: 14,
                      },
                    ]}
                  >
                    {isActive ? "نشط" : "متوقف"}
                  </Text>
                  <View
                    style={[
                      styles.liveDot,
                      {
                        backgroundColor: isActive
                          ? "#3FB950"
                          : colors.mutedForeground,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  الحساس
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
                  },
                ]}
              >
                <Feather name="cpu" size={16} color="#D29922" />
                <Text style={[styles.analyzingText, { color: "#D29922" }]}>
                  جاري تحليل الحادث...
                </Text>
              </View>
            )}

            <View
              style={[
                styles.infoBar,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoBarText, { color: colors.mutedForeground }]}>
                عتبة الكشف: {settings.crashThresholdG.toFixed(1)}g
              </Text>
            </View>

            {Platform.OS === "web" && (
              <View
                style={[
                  styles.webWarning,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
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
                    { color: colors.mutedForeground },
                  ]}
                >
                  الحساسات تعمل على iPhone حقيقي فقط. امسح رمز QR بتطبيق Expo Go.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          onPress={handleStop}
          activeOpacity={0.85}
          style={[styles.stopBtn, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.stopText, { color: colors.foreground }]}>
            إيقاف الجلسة
          </Text>
          <Feather name="square" size={18} color={colors.foreground} />
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
    paddingBottom: 12,
    gap: 12,
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  timerText: { fontSize: 13, fontVariant: ["tabular-nums"] },
  statusDot: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotInner: { width: 10, height: 10, borderRadius: 5 },
  body: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
  },
  statsGrid: { flexDirection: "row", gap: 10, width: "100%" },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 5,
  },
  statVal: { fontSize: 20, fontWeight: "700" },
  statLbl: { fontSize: 11 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  analyzingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    justifyContent: "flex-start",
  },
  analyzingText: { fontSize: 14, fontWeight: "500" },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    justifyContent: "flex-start",
  },
  infoBarText: { fontSize: 12 },
  webWarning: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  webWarningText: { flex: 1, fontSize: 13, lineHeight: 18, textAlign: "right" },
  crashCard: {
    backgroundColor: "#120B0B",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    width: "100%",
  },
  crashHeader: {
    flexDirection: "row",
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
  crashTitle: { color: "#F0F6FF", fontSize: 18, fontWeight: "800", flex: 1, textAlign: "right" },
  crashStats: {
    flexDirection: "row",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  viewReportText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  dismissBtn: { borderRadius: 12, alignItems: "center", paddingVertical: 10 },
  dismissText: { fontSize: 13, fontWeight: "500" },
  // DEMO: Emergency styles removed for client demo
  // emergencyCard: { ... },
  // emergencyHeader: { ... },
  // emergencyDismiss: { ... },
  // emergencyTitle: { ... },
  // emergencySub: { ... },
  // emergencyCallBtn: { ... },
  // emergencyCallName: { ... },
  // emergencyCallPhone: { ... },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  stopBtn: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  stopText: { fontSize: 16, fontWeight: "600" },
});
