import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";
import { validatePassword, translatePasswordErrors } from "@/lib/passwordPolicy";
import { mapAuthError } from "./sign-in";

const RESEND_SECONDS = 60;

/**
 * شاشة إعادة تعيين كلمة المرور: إدخال رمز OTP + كلمة مرور جديدة.
 * التدفّق الآمن: verifyOtp(recovery) → updateUser(password) → تسجيل خروج ثم
 * دخول جديد بكلمة المرور الجديدة (تأكيد نجاح التغيير).
 */
export default function ResetPasswordScreen() {
  const colors = useColors();
  const { t, rtl } = useLanguage();
  const { verifyRecoveryOtp, updatePassword, resetPassword, signOut } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const onSubmit = useCallback(async () => {
    setFormError(null);
    setInfo(null);
    const next: Record<string, string> = {};
    if (code.trim().length < 6) next.code = t("auth.errors.invalidCode");
    const pw = validatePassword(password);
    if (!pw.valid) next.password = translatePasswordErrors(pw, t)[0];
    if (password !== confirm) next.confirm = t("auth.passwordsMismatch");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await verifyRecoveryOtp(email, code);
      await updatePassword(password);
      await signOut().catch(() => {});
      Alert.alert(t("auth.resetTitle"), t("auth.resetSuccess"), [
        { text: "OK", onPress: () => router.replace("/(auth)/sign-in") },
      ]);
    } catch (err: unknown) {
      setFormError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [code, password, confirm, email, verifyRecoveryOtp, updatePassword, signOut, t]);

  const onResend = useCallback(async () => {
    if (seconds > 0) return;
    setFormError(null);
    setInfo(null);
    try {
      await resetPassword(email);
      setInfo(t("auth.codeSent"));
      setSeconds(RESEND_SECONDS);
    } catch (err: unknown) {
      setFormError(mapAuthError(err, t));
    }
  }, [seconds, email, resetPassword, t]);

  return (
    <AuthScreen title={t("auth.resetTitle")} subtitle={t("auth.resetSubtitle")} showBack>
      <AuthField
        label={t("auth.codeLabel")}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
        placeholder={t("auth.codePlaceholder")}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        error={errors.code}
      />
      <AuthField
        label={t("auth.newPassword")}
        value={password}
        onChangeText={setPassword}
        placeholder={t("auth.passwordPlaceholder")}
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: rtl.textAlign }]}>
        {t("auth.passwordPolicyHint")}
      </Text>
      <AuthField
        label={t("auth.confirmPassword")}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t("auth.passwordPlaceholder")}
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirm}
      />

      {formError ? <Text style={[styles.msg, { color: colors.destructive }]}>{formError}</Text> : null}
      {info ? (
        <Text style={[styles.msg, { color: colors.primary, textAlign: rtl.textAlign }]} weight="600">{info}</Text>
      ) : null}

      <AuthButton label={t("auth.verifyButton")} onPress={onSubmit} loading={loading} />

      <TouchableOpacity onPress={onResend} disabled={seconds > 0} accessibilityRole="button" style={styles.resend}>
        <Text style={[styles.resendText, { color: seconds > 0 ? colors.mutedForeground : colors.primary }]} weight="600">
          {seconds > 0 ? t("auth.resendIn", { seconds }) : t("auth.resendCode")}
        </Text>
      </TouchableOpacity>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginTop: -6 },
  msg: { fontSize: 13, marginTop: 4 },
  resend: { alignSelf: "center", marginTop: 12, paddingVertical: 8 },
  resendText: { fontSize: 14 },
});
