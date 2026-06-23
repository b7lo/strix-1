import React from "react";
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from "react-native";
import { useLanguage } from "@/context/LanguageContext";

export interface TextProps extends RNTextProps {
  weight?: "400" | "500" | "600" | "700" | "800" | "bold" | "normal";
}

export function Text({ style, weight, ...props }: TextProps) {
  const { locale } = useLanguage();
  const isArabic = locale === "ar";

  // Flatten styles to extract fontWeight if not explicitly provided as prop
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const effectiveWeight = weight || flattenedStyle.fontWeight || "400";

  let fontFamily = isArabic ? "IBMPlexSansArabic_400Regular" : "Inter_400Regular";

  switch (effectiveWeight) {
    case "500":
      fontFamily = isArabic ? "IBMPlexSansArabic_500Medium" : "Inter_500Medium";
      break;
    case "600":
      fontFamily = isArabic ? "IBMPlexSansArabic_600SemiBold" : "Inter_600SemiBold";
      break;
    case "700":
    case "800":
    case "bold":
      fontFamily = isArabic ? "IBMPlexSansArabic_700Bold" : "Inter_700Bold";
      break;
    case "400":
    case "normal":
    default:
      fontFamily = isArabic ? "IBMPlexSansArabic_400Regular" : "Inter_400Regular";
      break;
  }

  // Remove fontWeight from style to let fontFamily take over cleanly
  const { fontWeight, ...restStyle } = flattenedStyle as TextStyle;

  // Auto-apply RTL defaults for Arabic
  const rtlDefaults: TextStyle = isArabic
    ? { writingDirection: "rtl", textAlign: restStyle.textAlign || "right" }
    : {};

  return (
    <RNText
      style={[{ fontFamily }, rtlDefaults, restStyle]}
      {...props}
    />
  );
}
