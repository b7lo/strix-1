import React, { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";

/** شاشة الدخول بالبريد — المتطلبات 2.1، 2.2، 1.3 (منع الدخول قبل تأكيد البريد). */
export default function SignInScreen() {
  const colors = useColors();
  const { t, rtl } = useLanguage();
  const { signInEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignIn = useCallback(async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t("auth.errors.requiredFields"));
      return;
    }
    setLoading(true);
    try {
      await signInEmail(email, password);
      // التوجيه يتكفّل به حارس التنقّل في _layout.
    } catch (err: unknown) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [email, password, signInEmail, t]);

  return (
    <AuthScreen title={t("auth.signInTitle")} subtitle={t("auth.signInSubtitle")}>
      <AuthField
        label={t("auth.email")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.emailPlaceholder")}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthField
        label={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        placeholder={t("auth.passwordPlaceholder")}
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
      />

      <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} accessibilityRole="button">
        <Text style={[styles.link, { color: colors.primary, textAlign: rtl.textAlign }]} weight="600">
          {t("auth.forgotPassword")}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <AuthButton label={t("auth.signInButton")} onPress={onSignIn} loading={loading} />

      <View style={[styles.footer, { flexDirection: rtl.flexDirection }]}>
        <Text style={{ color: colors.mutedForeground }}>{t("auth.noAccount")} </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} accessibilityRole="button">
          <Text style={{ color: colors.primary }} weight="700">
            {t("auth.goSignUp")}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthScreen>
  );
}

/** يحوّل خطأ Supabase إلى رسالة عربية عامة (دون كشف أي الحقلين خاطئ — المتطلب 2.2). */
export function mapAuthError(err: unknown, t: (k: string) => string): string {
  const message = (err as { message?: string })?.message?.toLowerCase() ?? "";
  // انقطاع الشبكة (دون إنترنت / تعذّر الوصول للخادم) — رسالة أوضح من العامة.
  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return t("auth.errors.network");
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return t("auth.errors.emailInUse");
  }
  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return t("auth.verifyEmailRequired");
  }
  if (message.includes("invalid") && message.includes("email")) {
    return t("auth.errors.invalidEmail");
  }
  if (message.includes("invalid login") || message.includes("credentials")) {
    return t("auth.errors.invalidCredentials");
  }
  // أخطاء رمز OTP (تأكيد التسجيل / إعادة التعيين): رمز خاطئ أو منتهي.
  if (
    message.includes("otp") ||
    message.includes("has expired") ||
    message.includes("invalid token") ||
    message.includes("token has expired") ||
    message.includes("expired or is invalid")
  ) {
    return t("auth.errors.invalidCode");
  }
  if (message.includes("ios only") || message.includes("متاح على ios")) {
    return t("auth.errors.appleUnavailable");
  }
  // أخطاء Apple/OAuth الشائعة من Supabase — رسالة أوضح تساعد على التشخيص.
  if (
    message.includes("audience") ||
    message.includes("provider is not enabled") ||
    message.includes("provider not enabled") ||
    message.includes("unable to exchange") ||
    message.includes("bad_id_token") ||
    message.includes("id_token") ||
    message.includes("nonce") ||
    message.includes("apple")
  ) {
    return t("auth.errors.appleSignInFailed");
  }
  return t("auth.errors.generic");
}

const styles = StyleSheet.create({
  link: { fontSize: 13, marginTop: 2 },
  error: { fontSize: 13, marginTop: 4 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 },
  divider: { flex: 1, height: 1 },
  orText: { fontSize: 12 },
  appleBtn: { height: 50, width: "100%", marginTop: 4 },
  footer: { justifyContent: "center", alignItems: "center", marginTop: 20 },
});
