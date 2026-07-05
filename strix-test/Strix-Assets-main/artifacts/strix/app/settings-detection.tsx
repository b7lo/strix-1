import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

const SAMPLE_RATE_OPTIONS = [
  { value: 10, labelKey: "settings.sampleOptions.economic" },
  { value: 25, labelKey: "settings.sampleOptions.balanced" },
  { value: 50, labelKey: "settings.sampleOptions.standard" },
  { value: 100, labelKey: "settings.sampleOptions.maxPrecision" },
];

const THRESHOLD_OPTIONS = [
  { value: 1.5, labelKey: "settings.thresholdOptions.veryHigh" },
  { value: 2.0, labelKey: "settings.thresholdOptions.standard" },
  { value: 2.5, labelKey: "settings.thresholdOptions.medium" },
  { value: 3.0, labelKey: "settings.thresholdOptions.low" },
  { value: 3.5, labelKey: "settings.thresholdOptions.severe" },
  { value: 4.0, labelKey: "settings.thresholdOptions.strongOnly" },
];

export default function DetectionSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, loadAll } = useReports();
  const { t, isRTL, rtl } = useLanguage();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSampleRate = useCallback(async (value: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ ...settings, sampleRateHz: value });
  }, [settings, updateSettings]);

  const handleThreshold = useCallback(async (value: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ ...settings, crashThresholdG: value });
  }, [settings, updateSettings]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, flexDirection: rtl.flexDirection }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.back")}
        >
          <Feather name={flipIconName("arrow-left", isRTL) as any} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("settings.detectionTitle")}
        </Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]} showsVerticalScrollIndicator={false}>
        {/* تردد العينات (الدقة) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: rtl.flexDirection }]}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="cpu" size={16} color={colors.primary} />
            </View>
            <View style={[styles.sectionTextBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("settings.sampleRate")}</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{t("settings.sampleRateSub")}</Text>
            </View>
          </View>
          <View style={[styles.grid, { flexDirection: rtl.flexDirection }]}>
            {SAMPLE_RATE_OPTIONS.map((opt) => {
              const active = opt.value === settings.sampleRateHz;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSampleRate(opt.value)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  style={[styles.chip, active
                    ? { backgroundColor: colors.primary + "22", borderColor: colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Text style={[styles.chipVal, { color: active ? colors.primary : colors.foreground }]}>{opt.value} Hz</Text>
                  <Text style={[styles.chipLbl, { color: active ? colors.primary : colors.mutedForeground }]}>{t(opt.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* حساسية الكشف (قوة جي) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: rtl.flexDirection }]}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="sliders" size={16} color={colors.primary} />
            </View>
            <View style={[styles.sectionTextBlock, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("settings.sensitivity")}</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{t("settings.sensitivitySub")}</Text>
            </View>
          </View>
          <View style={[styles.grid, { flexDirection: rtl.flexDirection }]}>
            {THRESHOLD_OPTIONS.map((opt) => {
              const active = Math.abs(opt.value - settings.crashThresholdG) < 0.01;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleThreshold(opt.value)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  style={[styles.chip, active
                    ? { backgroundColor: colors.primary + "22", borderColor: colors.primary }
                    : { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Text style={[styles.chipVal, { color: active ? colors.primary : colors.foreground }]}>{opt.value.toFixed(1)}g</Text>
                  <Text style={[styles.chipLbl, { color: active ? colors.primary : colors.mutedForeground }]}>{t(opt.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {settings.crashThresholdG <= 1.5 ? t("settings.hintLow")
              : settings.crashThresholdG >= 3.5 ? t("settings.hintHigh")
              : t("settings.hintNormal")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12, justifyContent: "space-between" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, gap: 14 },
  section: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 14 },
  sectionHeader: { alignItems: "center", gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTextBlock: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSub: { fontSize: 12 },
  grid: { flexWrap: "wrap", gap: 8, justifyContent: "flex-start" },
  chip: { alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, minWidth: 84, gap: 2 },
  chipVal: { fontSize: 17, fontWeight: "800" },
  chipLbl: { fontSize: 10, letterSpacing: 0.2 },
  hint: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
});
