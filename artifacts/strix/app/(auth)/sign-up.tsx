import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { router, type Href } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";
import { DateField, SelectField } from "@/components/FormPickers";
import { SAUDI_CITIES } from "@/lib/saudiCities";
import { validatePassword, translatePasswordErrors } from "@/lib/passwordPolicy";
import {
  validateBirthDate,
  validatePhone,
  translateBirthDateError,
  translatePhoneError,
} from "@/lib/profileValidation";
import { mapAuthError } from "./sign-in";

/** شاشة التسجيل بالبريد — المتطلبات 1.1، 1.2، 1.5، 1.6. */
export default function SignUpScreen() {
  const colors = useColors();
  const { t, rtl, locale } = useLanguage();
  const { signUpEmail } = useAuth();

  const cityOptions = useMemo(
    () => SAUDI_CITIES.map((c) => ({ id: c.id, label: locale === "ar" ? c.ar : c.en })),
    [locale]
  );
  const maxBirth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = t("auth.errors.requiredFields");
    if (!fullName.trim()) next.fullName = t("auth.errors.requiredFields");
    if (!city.trim()) next.city = t("auth.errors.requiredFields");

    const pw = validatePassword(password);
    if (!pw.valid) next.password = translatePasswordErrors(pw, t)[0];

    const bd = validateBirthDate(birthDate);
    if (!bd.valid) next.birthDate = translateBirthDateError(bd, t) ?? t("auth.errors.requiredFields");

    const ph = validatePhone(phone);
    if (!ph.valid) next.phone = translatePhoneError(ph, t) ?? t("auth.errors.requiredFields");

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, password, fullName, birthDate, city, phone, t]);

  const onSubmit = useCallback(async () => {
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await signUpEmail({
        email,
        password,
        fullName,
        birthDate,
        city,
        phone,
      });
      // تأكيد البريد برمز OTP بدل الرابط.
      router.replace({ pathname: "/(auth)/verify-email", params: { email: email.trim() } } as unknown as Href);
    } catch (err: unknown) {
      setFormError(mapAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }, [validate, signUpEmail, email, password, fullName, birthDate, city, phone, t]);

  return (
    <AuthScreen title={t("auth.signUpTitle")} subtitle={t("auth.signUpSubtitle")} showBack>
      <AuthField
        label={t("auth.fullName")}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t("auth.fullNamePlaceholder")}
        error={errors.fullName}
      />
      <AuthField
        label={t("auth.email")}
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.emailPlaceholder")}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email}
      />
      <AuthField
        label={t("auth.password")}
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
      <DateField
        label={t("auth.birthDate")}
        value={birthDate}
        onChange={setBirthDate}
        placeholder={t("auth.birthDatePlaceholder")}
        error={errors.birthDate}
        maximumDate={maxBirth}
      />
      <SelectField
        label={t("auth.city")}
        value={city}
        onSelect={setCity}
        placeholder={t("auth.selectCity")}
        searchPlaceholder={t("auth.searchCity")}
        error={errors.city}
        options={cityOptions}
      />
      <AuthField
        label={t("auth.phone")}
        value={phone}
        onChangeText={setPhone}
        placeholder={t("auth.phonePlaceholder")}
        keyboardType="phone-pad"
        error={errors.phone}
      />

      {formError ? <Text style={[styles.error, { color: colors.destructive }]}>{formError}</Text> : null}

      <AuthButton label={t("auth.signUpButton")} onPress={onSubmit} loading={loading} />

      <View style={[styles.footer, { flexDirection: rtl.flexDirection }]}>
        <Text style={{ color: colors.mutedForeground }}>{t("auth.haveAccount")} </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")} accessibilityRole="button">
          <Text style={{ color: colors.primary }} weight="700">
            {t("auth.goSignIn")}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginTop: -6 },
  error: { fontSize: 13, marginTop: 4 },
  footer: { justifyContent: "center", alignItems: "center", marginTop: 20 },
});
