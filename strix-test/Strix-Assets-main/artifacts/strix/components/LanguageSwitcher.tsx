/**
 * LanguageSwitcher.tsx
 *
 * A reusable AR / EN toggle with active-state highlight.
 * Drop it anywhere — it reads and writes from LanguageContext.
 *
 * Usage:
 *   <LanguageSwitcher />
 */

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "@/components/Text";;
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import type { Locale } from "@/lib/i18n";
import * as Haptics from "expo-haptics";

const LANGUAGES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "en", label: "English", nativeLabel: "English" },
];

interface Props {
  style?: object;
}

export function LanguageSwitcher({ style }: Props) {
  const { locale, setLocale } = useLanguage();
  const colors = useColors();

  const handleSelect = async (code: Locale) => {
    if (code === locale) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setLocale(code);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary, borderColor: colors.border }, style]}>
      {LANGUAGES.map((lang) => {
        const active = lang.code === locale;
        return (
          <TouchableOpacity
            key={lang.code}
            onPress={() => handleSelect(lang.code)}
            activeOpacity={0.75}
            style={[
              styles.option,
              active
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
            accessibilityRole="button"
            accessibilityLabel={lang.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.optionText,
                { color: active ? "#FFFFFF" : colors.mutedForeground },
              ]}
            >
              {lang.nativeLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    height: 42,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
