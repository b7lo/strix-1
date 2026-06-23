import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Switch } from "react-native";
import { Text } from "@/components/Text";;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage, type Locale } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { flipIconName } from "@/lib/rtl";

const THRESHOLD_OPTIONS: Array<{ value: number; labelKey: string }> = [
  { value: 1.5, labelKey: "settings.thresholdOptions.veryHigh" },
  { value: 2.0, labelKey: "settings.thresholdOptions.standard" },
  { value: 2.5, labelKey: "settings.thresholdOptions.medium" },
  { value: 3.0, labelKey: "settings.thresholdOptions.low" },
  { value: 3.5, labelKey: "settings.thresholdOptions.severe" },
  { value: 4.0, labelKey: "settings.thresholdOptions.strongOnly" },
];

const SAMPLE_RATE_OPTIONS: Array<{ value: number; labelKey: string }> = [
  { value: 10, labelKey: "settings.sampleOptions.economic" },
  { value: 25, labelKey: "settings.sampleOptions.balanced" },
  { value: 50, labelKey: "settings.sampleOptions.standard" },
  { value: 100, labelKey: "settings.sampleOptions.maxPrecision" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, settings, loadAll, updateContacts, updateSettings, reports } =
    useReports();
  const { locale, setLocale, t, isRTL, rtl, formatGForce: fmtG, formatDecimal: fmtD } = useLanguage();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleThreshold = useCallback(
    async (value: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateSettings({ ...settings, crashThresholdG: value });
    },
    [settings, updateSettings]
  );

  const handleGyroscope = useCallback(
    async (value: boolean) => {
      await updateSettings({ ...settings, gyroscopeEnabled: value });
    },
    [settings, updateSettings]
  );

  const handleSampleRate = useCallback(
    async (value: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateSettings({ ...settings, sampleRateHz: value });
    },
    [settings, updateSettings]
  );

  const totalCrashes = reports.length;
  const avgGForce =
    reports.length > 0
      ? reports.reduce((s, r) => s + r.peakGForce, 0) / reports.length
      : 0;
  const correctFeedback = reports.filter((r) => r.feedback === "correct").length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <View style={{ width: 36 }} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {t("settings.title")}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <Feather
              name={flipIconName("arrow-left", isRTL) as any}
              size={22}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: bottomPad + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Language ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {t("settings.language")}
                </Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                  {t("settings.languageSub")}
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: "#8B5CF6" + "22" },
                ]}
              >
                <Feather name="globe" size={16} color="#8B5CF6" />
              </View>
            </View>
            <LanguageSwitcher />
          </View>

          {/* ── Gyroscope ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {t("settings.gyroscope")}
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  {t("settings.gyroscopeSub")}
                </Text>
              </View>
              <Switch
                value={settings.gyroscopeEnabled}
                onValueChange={handleGyroscope}
                trackColor={{ false: "#30363D", true: "#3FB95055" }}
                thumbColor={settings.gyroscopeEnabled ? "#3FB950" : "#8B949E"}
              />
            </View>
          </View>

          {/* ── Sample Rate ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {t("settings.sampleRate")}
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  {t("settings.sampleRateSub")}
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: "#3B82F6" + "22" },
                ]}
              >
                <Feather name="cpu" size={16} color="#3B82F6" />
              </View>
            </View>

            <View style={styles.thresholdGrid}>
              {SAMPLE_RATE_OPTIONS.map((opt) => {
                const active = opt.value === settings.sampleRateHz;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSampleRate(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      styles.thresholdChip,
                      active
                        ? {
                            backgroundColor: "#3B82F6" + "22",
                            borderColor: "#3B82F6",
                          }
                        : {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdVal,
                        { color: active ? "#3B82F6" : colors.foreground },
                      ]}
                    >
                      {opt.value} Hz
                    </Text>
                    <Text
                      style={[
                        styles.thresholdLbl,
                        {
                          color: active ? "#3B82F6" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Sensitivity ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {t("settings.sensitivity")}
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  {t("settings.sensitivitySub")}
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: "#3FB950" + "22" },
                ]}
              >
                <Feather name="sliders" size={16} color="#3FB950" />
              </View>
            </View>

            <View style={styles.thresholdGrid}>
              {THRESHOLD_OPTIONS.map((opt) => {
                const active =
                  Math.abs(opt.value - settings.crashThresholdG) < 0.01;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleThreshold(opt.value)}
                    activeOpacity={0.7}
                    style={[
                      styles.thresholdChip,
                      active
                        ? {
                            backgroundColor: "#3FB950" + "22",
                            borderColor: "#3FB950",
                          }
                        : {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdVal,
                        { color: active ? "#3FB950" : colors.foreground },
                      ]}
                    >
                      {opt.value.toFixed(1)}g
                    </Text>
                    <Text
                      style={[
                        styles.thresholdLbl,
                        {
                          color: active ? "#3FB950" : colors.mutedForeground,
                        },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.thresholdHint, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
              {settings.crashThresholdG <= 1.5
                ? t("settings.hintLow")
                : settings.crashThresholdG >= 3.5
                ? t("settings.hintHigh")
                : t("settings.hintNormal")}
            </Text>
          </View>

          {/* ── Stats ── */}
          {totalCrashes > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTextBlock}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    {t("settings.stats")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather name="bar-chart-2" size={16} color={colors.mutedForeground} />
                </View>
              </View>
              {[
                { label: t("settings.totalIncidents"), value: String(totalCrashes) },
                { label: t("settings.avgGForce"), value: fmtG(avgGForce) },
                {
                  label: t("settings.correctRatings"),
                  value: `${correctFeedback} / ${reports.filter((r) => r.feedback !== null).length}`,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[styles.infoRow, { borderColor: colors.border }]}
                >
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {item.value}
                  </Text>
                  <Text
                    style={[styles.infoLabel, { color: colors.mutedForeground }]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── About ── */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextBlock}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  {t("settings.about")}
                </Text>
                <Text
                  style={[styles.sectionSub, { color: colors.mutedForeground }]}
                >
                  {t("settings.aboutVersion")}
                </Text>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather name="info" size={16} color={colors.mutedForeground} />
              </View>
            </View>
            <Text style={[styles.aboutText, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
              {t("settings.aboutDescription")}
            </Text>
            <View style={[styles.techRow, { borderColor: colors.border }]}>
              {[
                { k: t("settings.techSampleRate"), v: `${settings.sampleRateHz} Hz` },
                { k: t("settings.techFilter"), v: t("settings.techFilterVal") },
                { k: t("settings.techBuffer"), v: t("settings.techBufferVal") },
                { k: t("settings.techCooldown"), v: t("settings.techCooldownVal") },
                {
                  k: t("settings.techGyro"),
                  v: settings.gyroscopeEnabled
                    ? t("settings.techEnabled")
                    : t("settings.techDisabled"),
                },
                { k: t("settings.techBrake"), v: t("settings.techAuto") },
              ].map((tc) => (
                <View key={tc.k} style={styles.techChip}>
                  <Text style={[styles.techVal, { color: colors.foreground }]}>
                    {tc.v}
                  </Text>
                  <Text
                    style={[styles.techKey, { color: colors.mutedForeground }]}
                  >
                    {tc.k}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              style={[styles.disclaimer, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}
            >
              {t("settings.disclaimer")}
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  scroll: { paddingHorizontal: 20, gap: 14 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTextBlock: { flex: 1, gap: 2, alignItems: "flex-start" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSub: { fontSize: 12, letterSpacing: 0.1 },
  thresholdGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  thresholdChip: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 84,
    gap: 2,
  },
  thresholdVal: { fontSize: 17, fontWeight: "800" },
  thresholdLbl: { fontSize: 10, letterSpacing: 0.2 },
  thresholdHint: { fontSize: 12, lineHeight: 18, fontStyle: "italic" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  infoLabel: { fontSize: 14, letterSpacing: 0.1 },
  infoValue: { fontSize: 14, fontWeight: "700" },
  aboutText: { fontSize: 13, lineHeight: 22 },
  techRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    justifyContent: "flex-start",
  },
  techChip: { alignItems: "center", gap: 2 },
  techVal: { fontSize: 13, fontWeight: "700" },
  techKey: { fontSize: 10 },
  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    fontStyle: "italic",
  },
  emptyContacts: {
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  emptyText: { fontSize: 13 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: { flex: 1, gap: 2, alignItems: "flex-start" },
  contactName: { fontSize: 15, fontWeight: "600" },
  contactPhone: { fontSize: 13 },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addForm: { gap: 10, paddingTop: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 13,
  },
  cancelText: { fontSize: 15, fontWeight: "500" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 14, fontWeight: "500" },
});
