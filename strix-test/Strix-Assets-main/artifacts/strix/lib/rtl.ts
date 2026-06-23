import { StyleSheet, ViewStyle, TextStyle, ImageStyle, I18nManager, FlexStyle } from "react-native";

export type RTLDirection = "ltr" | "rtl";

export interface RTLStyles {
  flexDirection: "row" | "row-reverse";
  textAlign: "left" | "right";
  writingDirection: "ltr" | "rtl";
}

export function getRTLStyles(isRTL: boolean): RTLStyles {
  // We always call I18nManager.forceRTL(false) so React Native never auto-flips.
  // Therefore we directly apply the correct direction without double-flip logic.
  return {
    flexDirection: isRTL ? "row-reverse" : "row",
    textAlign: isRTL ? "right" : "left",
    writingDirection: isRTL ? "rtl" : "ltr",
  };
}

export function rtlFlex(isRTL: boolean): ViewStyle {
  return { flexDirection: (isRTL ? "row-reverse" : "row") as FlexStyle["flexDirection"] };
}

export function rtlTextAlign(isRTL: boolean): TextStyle {
  return { textAlign: isRTL ? "right" : "left" };
}

export function rtlWritingDirection(isRTL: boolean): TextStyle {
  return { writingDirection: isRTL ? "rtl" : "ltr" };
}

export function rtlMarginStart(value: number, isRTL: boolean): ViewStyle {
  return isRTL ? { marginRight: value } : { marginLeft: value };
}

export function rtlMarginEnd(value: number, isRTL: boolean): ViewStyle {
  return isRTL ? { marginLeft: value } : { marginRight: value };
}

export function rtlPaddingStart(value: number, isRTL: boolean): ViewStyle {
  return isRTL ? { paddingRight: value } : { paddingLeft: value };
}

export function rtlPaddingEnd(value: number, isRTL: boolean): ViewStyle {
  return isRTL ? { paddingLeft: value } : { paddingRight: value };
}

export function rtlBorderStart(width: number, color: string, isRTL: boolean): ViewStyle {
  return isRTL ? { borderRightWidth: width, borderRightColor: color } : { borderLeftWidth: width, borderLeftColor: color };
}

export function rtlBorderEnd(width: number, color: string, isRTL: boolean): ViewStyle {
  return isRTL ? { borderLeftWidth: width, borderLeftColor: color } : { borderRightWidth: width, borderRightColor: color };
}

export function rtlPosition(start?: number, end?: number, isRTL?: boolean): ViewStyle {
  const styles: ViewStyle = {};
  if (start !== undefined) {
    isRTL ? (styles.right = start) : (styles.left = start);
  }
  if (end !== undefined) {
    isRTL ? (styles.left = end) : (styles.right = end);
  }
  return styles;
}

export function flipIconName(iconName: string, isRTL: boolean): string {
  const flipMap: Record<string, string> = {
    "arrow-left": "arrow-right",
    "arrow-right": "arrow-left",
    "chevron-left": "chevron-right",
    "chevron-right": "chevron-left",
    "chevrons-left": "chevrons-right",
    "chevrons-right": "chevrons-left",
    "corner-up-left": "corner-up-right",
    "corner-up-right": "corner-up-left",
    "corner-down-left": "corner-down-right",
    "corner-down-right": "corner-down-left",
    "corner-left-up": "corner-right-up",
    "corner-right-up": "corner-left-up",
    "corner-left-down": "corner-right-down",
    "corner-right-down": "corner-left-down",
  };
  return isRTL && flipMap[iconName] ? flipMap[iconName] : iconName;
}

export function createRTLStyleSheet<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  isRTL: boolean,
  styles: T
): T {
  return StyleSheet.create(styles);
}

export const RTL_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export function rtlSpaceStart(size: keyof typeof RTL_SPACING, isRTL: boolean): ViewStyle {
  return rtlMarginStart(RTL_SPACING[size], isRTL);
}

export function rtlSpaceEnd(size: keyof typeof RTL_SPACING, isRTL: boolean): ViewStyle {
  return rtlMarginEnd(RTL_SPACING[size], isRTL);
}

export function rtlGap(size: keyof typeof RTL_SPACING, isRTL: boolean): ViewStyle {
  return { gap: RTL_SPACING[size] };
}