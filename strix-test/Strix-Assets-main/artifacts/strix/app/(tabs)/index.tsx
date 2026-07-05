import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useSession } from "@/context/SessionContext";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, loadAll } = useReports();
  const { isActive, peakGForce } = useSession();
  const { t, isRTL, rtl, formatGForce: fmtG } = useLanguage();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleStartMonitoring = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/session");
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const maxPeakG = reports.reduce((peak, report) => Math.max(peak, report.peakGForce), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        {/* اللوجو مثبّت يمين دائمًا مهما كانت اللغة أو اتجاه النظام.
            direction:"ltr" + alignItems:"flex-end" يضمن اليمين الفيزيائي. */}
        <View style={[styles.brand, { direction: "ltr", alignItems: "flex-end" }]}>
          <Image
            source={require("@/assets/images/logo-insid-the-app.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandTagline, { color: colors.mutedForeground, textAlign: "right" }]}>
            {t("tagline")}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={handleStartMonitoring}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isActive ? t("home.monitoringActive") : t("a11y.startMonitoring")}
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
                { backgroundColor: isActive ? "#FF3B30" + "22" : "rgba(255,255,255,0.2)" },
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
                  { color: isActive ? "#FF3B30" : "#FFFFFF", textAlign: rtl.textAlign },
                ]}
              >
                {isActive ? t("home.monitoringActive") : t("home.startMonitoring")}
              </Text>
              <Text
                style={[
                  styles.monitorSub,
                  {
                    color: isActive ? colors.mutedForeground : "rgba(255,255,255,0.85)",
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
              <Feather name={flipIconName("arrow-right", isRTL) as any} size={18} color="#FFFFFF" />
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

        {reports.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="shield" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("home.noAccidents")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {t("home.noAccidentsSub")}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  brand: { flex: 1, gap: 4 },
  logoImage: { height: 84, width: 84 },
  brandTagline: { fontSize: 11, letterSpacing: 0.3 },
  body: { paddingHorizontal: 20, paddingTop: 4 },
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
  monitorInner: { alignItems: "center", gap: 16 },
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
  activeDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  summaryGrid: { gap: 10, marginBottom: 16 },
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
});
