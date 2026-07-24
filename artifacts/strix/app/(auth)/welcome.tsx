import React, { useCallback, useState } from "react";
import { View, StyleSheet, Image, Platform, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthButton } from "@/components/AuthUI";
import { mapAuthError } from "./sign-in";

/**
 * شاشة الترحيب/الاختيار: اللوجو واسم التطبيق وخيارات الدخول — كلها موزونة في
 * منتصف الشاشة. لا تسجيل مباشر؛ المستخدم يختار الطريقة (Apple / البريد).
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useLanguage();
  const { signInApple } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onApple = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await signInApple();
    } catch (err: unknown) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [signInApple, t]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* توهّج أخضر خفيف جداً بالهوية */}
      <LinearGradient
        colors={[colors.primary + "12", colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {/* كل شيء موزون في المنتصف: اللوجو + الاسم + خيارات الدخول */}
      <View style={styles.center}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={t("welcome.appName")}
        />
        <Text style={[styles.appName, { color: colors.foreground }]} weight="800">
          {t("welcome.appName")}
        </Text>

        <View style={styles.actions}>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleBtn}
              onPress={onApple}
            />
          ) : null}

          <AuthButton
            label={t("welcome.continueEmail")}
            onPress={() => router.push("/(auth)/sign-in")}
            loading={loading}
          />

          <View style={[styles.footer, { flexDirection: rtl.flexDirection }]}>
            <Text style={{ color: colors.mutedForeground }}>{t("welcome.noAccount")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} accessibilityRole="button">
              <Text style={{ color: colors.primary }} weight="700">{t("welcome.signUp")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  logo: { width: 96, height: 96, borderRadius: 22 },
  appName: { fontSize: 32 },
  actions: { alignSelf: "stretch", gap: 12, marginTop: 24 },
  appleBtn: { height: 52, width: "100%" },
  error: { fontSize: 13, textAlign: "center" },
  footer: { justifyContent: "center", alignItems: "center", marginTop: 4 },
});
