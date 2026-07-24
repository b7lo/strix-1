import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";
import { mapAuthError } from "./sign-in";

const RESEND_SECONDS = 60;

/** شاشة تأكيد البريد برمز OTP (بعد التسجيل). عند نجاح التحقق يتكفّل الحارس بالتوجيه. */
export default function VerifyEmailScreen() {
  const colors = useColors();
  const { t, rtl } = useLanguage();
  const { verifyEmailOtp, resendSignupOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  const onVerify = useCallback(async () => {
    setError(null);
    setInfo(null);
    if (code.trim().length < 6) {
      setError(t("auth.errors.invalidCode"));
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp(email, code);
      // نجاح: onAuthStateChange ينشئ الجلسة والحارس يوجّه لإكمال الملف/الرئيسية.
    } catch (err: unknown) {
      setError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [code, email, verifyEmailOtp, t]);

  const onResend = useCallback(async () => {
    if (seconds > 0) return;
    setError(null);
    setInfo(null);
    try {
      await resendSignupOtp(email);
      setInfo(t("auth.codeSent"));
      setSeconds(RESEND_SECONDS);
    } catch (err: unknown) {
      setError(mapAuthError(err, t));
    }
  }, [seconds, email, resendSignupOtp, t]);

  return (
    <AuthScreen title={t("auth.verifyTitle")} subtitle={t("auth.verifySubtitle", { email })} showBack>
      <AuthField
        label={t("auth.codeLabel")}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
        placeholder={t("auth.codePlaceholder")}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        error={error ?? undefined}
      />

      {info ? (
        <Text style={[styles.msg, { color: colors.primary, textAlign: rtl.textAlign }]} weight="600">
          {info}
        </Text>
      ) : null}

      <AuthButton label={t("auth.verifyButton")} onPress={onVerify} loading={loading} />

      <TouchableOpacity onPress={onResend} disabled={seconds > 0} accessibilityRole="button" style={styles.resend}>
        <Text style={[styles.resendText, { color: seconds > 0 ? colors.mutedForeground : colors.primary }]} weight="600">
          {seconds > 0 ? t("auth.resendIn", { seconds }) : t("auth.resendCode")}
        </Text>
      </TouchableOpacity>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  msg: { fontSize: 13, marginTop: 4 },
  resend: { alignSelf: "center", marginTop: 12, paddingVertical: 8 },
  resendText: { fontSize: 14 },
});
