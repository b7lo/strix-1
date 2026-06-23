import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, Alert } from "react-native";
import { Text } from "@/components/Text";;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useSession } from "@/context/SessionContext";
import { useLanguage } from "@/context/LanguageContext";
import { ReportCard } from "@/components/ReportCard";
import { flipIconName } from "@/lib/rtl";
import type { AccidentReport } from "@/lib/types";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, loadAll, clearAllReports } = useReports();
  const { isActive, peakGForce, crashDetected, latestReport } = useSession();
  const { t, isRTL, rtl, formatGForce: fmtG } = useLanguage();

  const handleClearAll = useCallback(() => {
    Alert.alert(
      t("home.deleteAll"),
      t("home.deleteAllConfirm"),
      [
        { text: t("home.cancel"), style: "cancel" },
        {
          text: t("home.delete"),
          style: "destructive",
          onPress: async () => {
            await clearAllReports();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [clearAllReports, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleStartMonitoring = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/session");
  }, []);

  const handleReportPress = useCallback((report: AccidentReport) => {
    router.push({
      pathname: "/report/[id]",
      params: { id: report.id, data: JSON.stringify(report) },
    });
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const maxPeakG = reports.reduce((peak, report) => Math.max(peak, report.peakGForce), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, flexDirection: rtl.flexDirection }]}>
        <View style={[styles.brand, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.brandName, { color: colors.primary }]}>
            {t("appName")}
          </Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("tagline")}
          </Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: rtl.flexDirection }]}>
          {reports.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={[styles.settingsBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.settingsBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="settings" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList<AccidentReport>
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              onPress={handleStartMonitoring}
              activeOpacity={0.85}
              style={[
                styles.monitorCard,
                {
                  backgroundColor: isActive ? "#FF3B30" + "15" : colors.primary,
                  borderColor: isActive ? "#FF3B30" + "30" : colors.primary,
                  shadowColor: isActive ? "#FF3B30" : colors.primary,
                },
              ]}
            >
              <View style={[styles.monitorInner, { flexDirection: rtl.flexDirection }]}>
                <View
                  style={[
                    styles.monitorIconWrap,
                    {
                      backgroundColor: isActive
                        ? "#FF3B30" + "22"
                        : "rgba(255,255,255,0.2)",
                    },
                  ]}
                >
                  <Feather
                    name={isActive ? "activity" : "shield"}
                    size={30}
                    color={isActive ? "#FF3B30" : "#FFFFFF"}
                  />
                </View>
                <View style={styles.monitorText}>
                  <Text
                    style={[
                      styles.monitorTitle,
                      {
                        color: isActive ? "#FF3B30" : "#FFFFFF",
                        textAlign: rtl.textAlign,
                      },
                    ]}
                  >
                    {isActive ? t("home.monitoringActive") : t("home.startMonitoring")}
                  </Text>
                  <Text
                    style={[
                      styles.monitorSub,
                      {
                        color: isActive
                          ? colors.mutedForeground
                          : "rgba(255,255,255,0.85)",
                        textAlign: rtl.textAlign,
                      },
                    ]}
                  >
                    {isActive
                      ? t("home.monitoringPeak", { g: peakGForce.toFixed(1) })
                      : t("home.startMonitoringSub")}
                  </Text>
                </View>
                {isActive && (
                  <View style={styles.activeDot}>
                    <View style={styles.activeDotInner} />
                  </View>
                )}
                {!isActive && (
                  <Feather
                    name={flipIconName("arrow-right", isRTL) as any}
                    size={18}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </TouchableOpacity>

            {reports.length > 0 && (
              <View style={[styles.summaryGrid, { flexDirection: rtl.flexDirection }]}>
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {reports.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {t("settings.totalIncidents")}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.summaryValue, { color: colors.destructive }]}>
                    {fmtG(maxPeakG)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {t("session.peak")}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.summaryValueCompact, { color: isActive ? colors.success : colors.mutedForeground }]}>
                    {isActive ? t("session.active") : t("session.stopped")}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {t("session.sensor")}
                  </Text>
                </View>
              </View>
            )}

            {reports.length > 0 && (
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.mutedForeground,
                    textAlign: rtl.textAlign,
                  },
                ]}
              >
                {t("home.accidentLog")}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Feather name="file-text" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("home.noAccidents")}
            </Text>
            <Text
              style={[styles.emptySub, { color: colors.mutedForeground }]}
            >
              {t("home.noAccidentsSub")}
            </Text>
            <TouchableOpacity
              onPress={handleStartMonitoring}
              activeOpacity={0.85}
              style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection: rtl.flexDirection }]}
            >
              <Text style={styles.emptyActionText}>{t("home.startMonitoring")}</Text>
              <Feather
                name={flipIconName("arrow-right", isRTL) as any}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ReportCard report={item} onPress={() => handleReportPress(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  brand: { flex: 1 },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 3,
  },
  brandTagline: { fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  headerActions: { gap: 8, marginTop: 4 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  monitorCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    overflow: "hidden",
  },
  monitorInner: {
    alignItems: "center",
    gap: 16,
  },
  monitorIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  monitorText: { flex: 1, gap: 4 },
  monitorTitle: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  monitorSub: { fontSize: 12, lineHeight: 18 },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  summaryGrid: {
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 74,
  },
  summaryValue: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  summaryValueCompact: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  summaryLabel: { fontSize: 10, lineHeight: 14, textAlign: "center", letterSpacing: 0.2 },
  emptyState: { alignItems: "center", paddingTop: 52, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 8,
  },
  emptyActionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
