import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage } from "@/context/LanguageContext";
import { ReportCard } from "@/components/ReportCard";
import type { AccidentReport } from "@/lib/types";

export default function LogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, loadAll } = useReports();
  const { t, rtl } = useLanguage();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
        <Text style={[styles.headerTitle, { color: colors.foreground, textAlign: rtl.textAlign }]}>
          {t("home.accidentLog")}
        </Text>
        {reports.length > 0 && (
          <Text style={[styles.headerCount, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("settings.totalIncidents")}: {reports.length}
          </Text>
        )}
      </View>

      <FlatList<AccidentReport>
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("home.noAccidents")}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  headerCount: { fontSize: 13 },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", textAlign: "center" },
});
