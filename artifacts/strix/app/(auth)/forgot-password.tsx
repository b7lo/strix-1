import React, { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";
import { mapAuthError } from "./sign-in";

/** شاشة إعادة تعيين كلمة المرور — المتطلب 2.3. */
export default function ForgotPasswordScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!email.trim()) {
      setError(t("auth.errors.requiredFields"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      // ننتقل لشاشة إدخال الرمز + كلمة المرور الجديدة (تدفّق OTP).
      router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } } as unknown as Href);
    } catch (err: unknown) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword, t]);

  return (
    <AuthScreen title={t("auth.forgotTitle")} subtitle={t("auth.forgotSubtitle")} showBack>
      <AuthField
        label={t("auth.email")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.emailPlaceholder")}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      {error ? <Text style={[styles.msg, { color: colors.destructive }]}>{error}</Text> : null}

      <AuthButton label={t("auth.sendResetLink")} onPress={onSubmit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  msg: { fontSize: 13, marginTop: 4 },
});
