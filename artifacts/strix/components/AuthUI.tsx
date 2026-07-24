/**
 * مكوّنات واجهة مشتركة لشاشات المصادقة — حقل إدخال وزر أساسي وغلاف شاشة.
 * تتبع نمط التصميم الموجود (useColors + Text + rtl) لتوحيد المظهر.
 */
import React from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { flipIconName } from "@/lib/rtl";

/** غلاف شاشة مصادقة: رأس بعنوان + زر رجوع اختياري + محتوى قابل للتمرير. */
export function AuthScreen({
  title,
  subtitle,
  showBack = false,
  children,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRTL, rtl } = useLanguage();
  const topPad = Platform.OS === "web" ? 40 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, flexDirection: rtl.flexDirection }]}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.navBtn}
            accessibilityRole="button"
          >
            <Feather name={flipIconName("arrow-left", isRTL) as any} size={22} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground, textAlign: rtl.textAlign }]} weight="800">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** حقل إدخال بعنوان مع دعم إظهار رسالة خطأ. */
export function AuthField({
  label,
  error,
  ...inputProps
}: { label: string; error?: string } & TextInputProps) {
  const colors = useColors();
  const { rtl } = useLanguage();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.foreground, textAlign: rtl.textAlign }]} weight="600">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
            textAlign: rtl.textAlign,
            writingDirection: rtl.writingDirection,
          },
        ]}
        {...inputProps}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive, textAlign: rtl.textAlign }]}>{error}</Text>
      ) : null}
    </View>
  );
}

/** زر أساسي بحالة تحميل. */
export function AuthButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "destructive" | "outline";
}) {
  const colors = useColors();
  const bg =
    variant === "primary" ? colors.primary : variant === "destructive" ? colors.destructive : "transparent";
  const fg = variant === "outline" ? colors.foreground : "#FFFFFF";
  const borderColor = variant === "outline" ? colors.border : bg;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor, opacity: disabled || loading ? 0.6 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]} weight="700">
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 4, justifyContent: "space-between" },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, gap: 6, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, marginTop: 2, marginBottom: 8 },
  body: { marginTop: 16, gap: 14 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 16,
  },
  error: { fontSize: 12 },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
});
