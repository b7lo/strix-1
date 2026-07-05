import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

const FEATURE_ICONS: (keyof typeof Feather.glyphMap)[] = [
  "shield", "bar-chart-2", "edit-3", "file-text", "users", "globe",
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtl } = useLanguage();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const features = (t("settings.features", { returnObjects: true }) as unknown as string[]) ?? [];

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("settings.about")}</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]} showsVerticalScrollIndicator={false}>
        {/* الشعار والاسم */}
        <View style={styles.brand}>
          <Image
            source={require("@/assets/images/logo-insid-the-app.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: colors.foreground }]}>{t("appName")}</Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>{t("settings.aboutVersion")}</Text>
        </View>

        {/* الوصف (عن ستركس) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {t("settings.aboutDescription")}
          </Text>
        </View>

        {/* المميزات */}
        <Text style={[styles.featuresTitle, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
          {t("settings.featuresTitle")}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
          {features.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                { flexDirection: rtl.flexDirection, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "1A" }]}>
                <Feather name={FEATURE_ICONS[i] ?? "check"} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground, textAlign: rtl.textAlign }]}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
          {t("settings.disclaimer")}
        </Text>
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
  brand: { alignItems: "center", gap: 6, paddingVertical: 16 },
  logo: { width: 88, height: 88 },
  appName: { fontSize: 24, fontWeight: "800", letterSpacing: 0.5 },
  version: { fontSize: 13 },
  card: { borderRadius: 14, borderWidth: 1, padding: 18 },
  desc: { fontSize: 14, lineHeight: 24 },
  featuresTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },
  featureRow: { alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 14, fontWeight: "500" },
  disclaimer: { fontSize: 11, lineHeight: 18, fontStyle: "italic", marginTop: 4 },
});
