import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useReports } from "@/context/ReportsContext";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, loadAll, clearAllReports } = useReports();
  const { locale, setLocale, t, isRTL, rtl } = useLanguage();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { loadAll(); }, [loadAll]);

  const [langModalVisible, setLangModalVisible] = useState(false);

  const openLanguage = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLangModalVisible(true);
  }, []);

  const chooseLanguage = useCallback(async (code: "ar" | "en") => {
    setLangModalVisible(false);
    if (code !== locale) await setLocale(code);
  }, [locale, setLocale]);

  const handleClearAll = useCallback(() => {
    Alert.alert(t("home.deleteAll"), t("home.deleteAllConfirm"), [
      { text: t("home.cancel"), style: "cancel" },
      {
        text: t("home.delete"),
        style: "destructive",
        onPress: async () => {
          await clearAllReports();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [clearAllReports, t]);

  const chevron = flipIconName("chevron-right", isRTL) as keyof typeof Feather.glyphMap;
  const langValue = locale === "ar" ? "العربية" : "English";

  type RowProps = {
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
    iconBg: string;
    label: string;
    value?: string;
    trailing?: keyof typeof Feather.glyphMap | null;
    onPress: () => void;
    danger?: boolean;
    first?: boolean;
  };

  const Row = ({ icon, iconColor, iconBg, label, value, trailing = chevron, onPress, danger, first }: RowProps) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.row,
        { flexDirection: rtl.flexDirection, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground, textAlign: rtl.textAlign }]}>
        {label}
      </Text>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      {trailing ? <Feather name={trailing} size={18} color={colors.mutedForeground} /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("settings.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]} showsVerticalScrollIndicator={false}>
        {/* المجموعة الرئيسية */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row
            first
            icon="globe"
            iconColor={colors.primary}
            iconBg={colors.primary + "1A"}
            label={t("settings.language")}
            value={langValue}
            trailing="repeat"
            onPress={openLanguage}
          />
          <Row
            icon="sliders"
            iconColor={colors.primary}
            iconBg={colors.primary + "1A"}
            label={t("settings.detectionTitle")}
            onPress={() => router.push("/settings-detection")}
          />
          <Row
            icon="clock"
            iconColor={colors.primary}
            iconBg={colors.primary + "1A"}
            label={t("nav.log")}
            onPress={() => router.push("/log")}
          />
          <Row
            icon="shield"
            iconColor={colors.primary}
            iconBg={colors.primary + "1A"}
            label={t("settings.privacy")}
            onPress={() => router.push("/privacy")}
          />
          <Row
            icon="info"
            iconColor={colors.primary}
            iconBg={colors.primary + "1A"}
            label={t("settings.about")}
            value={t("settings.aboutVersion").split(" ")[0]}
            onPress={() => router.push("/settings-about")}
          />
        </View>

        {/* حذف السجل */}
        {reports.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.destructive + "40" }]}>
            <Row
              first
              icon="trash-2"
              iconColor={colors.destructive}
              iconBg={colors.destructive + "1A"}
              label={t("danger.title")}
              trailing={null}
              danger
              onPress={handleClearAll}
            />
          </View>
        )}
      </ScrollView>

      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 20 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t("settings.language")}</Text>
            {([
              { code: "en", label: "English", flag: "🇺🇸" },
              { code: "ar", label: "العربية", flag: "🇸🇦" },
            ] as const).map((l) => {
              const active = l.code === locale;
              return (
                <TouchableOpacity
                  key={l.code}
                  activeOpacity={0.8}
                  onPress={() => chooseLanguage(l.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.langOption,
                    {
                      flexDirection: rtl.flexDirection,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "12" : colors.background,
                    },
                  ]}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <Text style={[styles.langLabel, { color: colors.foreground }]}>{l.label}</Text>
                  <View style={{ flex: 1 }} />
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? colors.primary : colors.mutedForeground,
                        backgroundColor: active ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {active ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, gap: 16, paddingTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
  rowValue: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  langOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5 },
  flag: { fontSize: 22 },
  langLabel: { fontSize: 16, fontWeight: "600" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
