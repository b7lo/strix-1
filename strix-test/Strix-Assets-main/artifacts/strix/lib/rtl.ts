import { StyleSheet, ViewStyle, TextStyle, ImageStyle, I18nManager, FlexStyle, Platform } from "react-native";

export type RTLDirection = "ltr" | "rtl";

/**
 * ROOT FIX for device-language leakage.
 *
 * The app applies RTL manually (via the helpers in this file) and is designed
 * to run on an LTR native base (`I18nManager.isRTL === false`). On a device
 * whose *system language* is Arabic, the OS initializes the native base to RTL,
 * which makes React Native auto-flip every `flexDirection: "row"` and the
 * default text alignment — leaking the device language into the app regardless
 * of the in-app language choice.
 *
 * This bootstrap guarantees an LTR native base so the app behaves identically
 * on every device (exactly like an LTR device with in-app language switching):
 *   1. Force the native base to LTR (`allowRTL(false)` + `forceRTL(false)`).
 *   2. If the current session still reports RTL (Arabic device), reload the app
 *      once so the forced-LTR flag takes effect. This happens at most once per
 *      install — after the reload the native base is LTR permanently.
 *
 * Safe on web and when a reload mechanism is unavailable (falls back to the
 * persisted flag taking effect on the next launch).
 *
 * @returns `true` if an app reload was triggered (caller should stop bootstrapping).
 */
export async function ensureLTRNativeBase(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    I18nManager.allowRTL(false);
  } catch {
    return false;
  }

  if (I18nManager.isRTL) {
    // Device opened the app with an RTL native base. Pin it to LTR and reload
    // once so the manual RTL layer runs on a clean LTR base.
    try {
      I18nManager.forceRTL(false);
    } catch {
      /* ignore */
    }
    try {
      // Lazy import so web / test bundles never pull in native updates code.
      const Updates = require("expo-updates");
      if (Updates?.reloadAsync) {
        await Updates.reloadAsync();
        return true;
      }
    } catch {
      // reloadAsync unavailable (e.g. Expo Go). forceRTL(false) still persists
      // and takes effect on the next cold launch; the native-aware helpers keep
      // this single session correct in the meantime.
    }
    return false;
  }

  try {
    I18nManager.forceRTL(false);
  } catch {
    /* ignore */
  }
  return false;
}

export interface RTLStyles {
  flexDirection: "row" | "row-reverse";
  textAlign: "left" | "right";
  writingDirection: "ltr" | "rtl";
}

/**
 * Reads the native layout base direction (`I18nManager.isRTL`).
 *
 * On an Arabic device the OS initializes the native layout base to RTL for the
 * whole session, so `I18nManager.isRTL === true` even though the app calls
 * `forceRTL(false)` (which only takes effect after a relaunch). On LTR devices
 * and on web this is `false`. Guarded so it never throws where `I18nManager`
 * is partially implemented (web).
 */
export function getNativeIsRTL(): boolean {
  try {
    return !!I18nManager.isRTL;
  } catch {
    return false;
  }
}

/**
 * Native-aware layout resolution.
 *
 * React Native auto-flips layout-direction properties (it swaps
 * `row` ⇄ `row-reverse`) when the native base is RTL. To apply the desired
 * direction exactly once, the manual layer must only reverse the auto-flipped
 * axis when `effectiveFlip = desiredRTL XOR nativeIsRTL` is true.
 *
 * Physical properties (textAlign / writingDirection) are never auto-flipped by
 * RN, so they stay keyed to `isRTL` (the desired direction) only.
 *
 * When `nativeIsRTL === false` (every LTR device and web) this reduces to the
 * original behavior, preserving all existing layouts.
 */
export function getRTLStyles(isRTL: boolean, nativeIsRTL: boolean = getNativeIsRTL()): RTLStyles {
  const effectiveFlip = isRTL !== nativeIsRTL;
  return {
    flexDirection: effectiveFlip ? "row-reverse" : "row",
    textAlign: isRTL ? "right" : "left",
    writingDirection: isRTL ? "rtl" : "ltr",
  };
}

export function rtlFlex(isRTL: boolean, nativeIsRTL: boolean = getNativeIsRTL()): ViewStyle {
  const effectiveFlip = isRTL !== nativeIsRTL;
  return { flexDirection: (effectiveFlip ? "row-reverse" : "row") as FlexStyle["flexDirection"] };
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