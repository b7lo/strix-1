import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useSession } from "@/context/SessionContext";
import { ReportCard } from "@/components/ReportCard";
import type { AccidentReport } from "@/lib/types";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, loadAll, clearAllReports } = useReports();
  const { isActive, peakGForce, crashDetected, latestReport } = useSession();

  const handleClearAll = useCallback(() => {
    Alert.alert(
      "حذف جميع السجلات",
      "هل أنت متأكد أنك تريد حذف جميع تقارير الحوادث؟ لا يمكن التراجع عن هذا الإجراء.",
      [
        { text: "إلغاء", style: "cancel" },
        { 
          text: "حذف", 
          style: "destructive", 
          onPress: async () => {
            await clearAllReports();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  }, [clearAllReports]);

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.brand}>
          <Text style={[styles.brandName, { color: colors.primary }]}>
            ستركس
          </Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
            حوّل سيارتك إلى منقذ
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
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
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.monitorInner}>
                <View
                  style={[
                    styles.monitorIconWrap,
                    {
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.2)"
                        : colors.primary + "22",
                    },
                  ]}
                >
                  <Feather
                    name={isActive ? "activity" : "shield"}
                    size={30}
                    color={isActive ? "#FFFFFF" : colors.primary}
                  />
                </View>
                <View style={styles.monitorText}>
                  <Text
                    style={[
                      styles.monitorTitle,
                      {
                        color: isActive ? "#FFFFFF" : colors.foreground,
                      },
                    ]}
                  >
                    {isActive ? "المراقبة نشطة" : "ابدأ المراقبة"}
                  </Text>
                  <Text
                    style={[
                      styles.monitorSub,
                      {
                        color: isActive
                          ? "rgba(255,255,255,0.85)"
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {isActive
                      ? `الذروة: ${peakGForce.toFixed(1)}g — اضغط لعرض الجلسة`
                      : "اضغط لبدء رصد الحوادث"}
                  </Text>
                </View>
                {isActive && (
                  <View style={styles.activeDot}>
                    <View style={styles.activeDotInner} />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {crashDetected && latestReport && (
              <TouchableOpacity
                onPress={() => handleReportPress(latestReport)}
                activeOpacity={0.8}
                style={styles.alertBanner}
              >
                <Feather name="alert-triangle" size={18} color="#FFFFFF" />
                <Text style={styles.alertText}>
                  رُصد حادث — اضغط لعرض التقرير
                </Text>
                <Feather name="chevron-left" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {reports.length > 0 && (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.mutedForeground },
                ]}
              >
                سجل الحوادث
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
              لا توجد حوادث مسجّلة
            </Text>
            <Text
              style={[styles.emptySub, { color: colors.mutedForeground }]}
            >
              ابدأ جلسة مراقبة للكشف عن الحوادث وتسجيلها
            </Text>
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brand: { alignItems: "flex-start" },
  brandName: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 2,
  },
  brandTagline: { fontSize: 12, marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  monitorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  monitorInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  monitorIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  monitorText: { flex: 1, gap: 4 },
  monitorTitle: { fontSize: 18, fontWeight: "700", textAlign: "right" },
  monitorSub: { fontSize: 13, lineHeight: 18, textAlign: "right" },
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FF4444",
    borderWidth: 1,
    borderColor: "#FF6B6B",
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: "right",
  },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
