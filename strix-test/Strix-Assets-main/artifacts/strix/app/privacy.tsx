import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtl } = useLanguage();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("settings.privacy")}</Text>
        <View style={styles.navBtn} />
      </View>

      {/* محتوى الصفحة غير جاهز بعد — placeholder فقط */}
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={28} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.comingSoon, { color: colors.mutedForeground }]}>
          {t("settings.privacyComingSoon")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12, justifyContent: "space-between" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  comingSoon: { fontSize: 15, fontWeight: "500" },
});
