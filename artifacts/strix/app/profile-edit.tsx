import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AuthScreen, AuthField, AuthButton } from "@/components/AuthUI";
import { DateField, SelectField } from "@/components/FormPickers";
import { SAUDI_CITIES } from "@/lib/saudiCities";
import {
  validateBirthDate,
  validatePhone,
  translateBirthDateError,
  translatePhoneError,
} from "@/lib/profileValidation";

/** شاشة تعديل الملف الشخصي — المتطلبات 4.2، 4.3، 4.4، 4.5، 4.6. */
export default function ProfileEditScreen() {
  const colors = useColors();
  const { t, locale } = useLanguage();
  const { profile, updateProfile } = useAuth();

  const cityOptions = useMemo(
    () => SAUDI_CITIES.map((c) => ({ id: c.id, label: locale === "ar" ? c.ar : c.en })),
    [locale]
  );
  const maxBirth = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSave = useCallback(async () => {
    setFormError(null);
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = t("auth.errors.requiredFields");
    if (!city.trim()) next.city = t("auth.errors.requiredFields");
    const bd = validateBirthDate(birthDate);
    if (!bd.valid) next.birthDate = translateBirthDateError(bd, t) ?? t("auth.errors.requiredFields");
    const ph = validatePhone(phone);
    if (!ph.valid) next.phone = translatePhoneError(ph, t) ?? t("auth.errors.requiredFields");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await updateProfile({ full_name: fullName, birth_date: birthDate, city, phone });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("account.editProfile"), t("auth.success.profileSaved"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [fullName, birthDate, city, phone, updateProfile, t]);

  return (
    <AuthScreen title={t("account.editProfile")} showBack>
      <AuthField
        label={t("auth.fullName")}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t("auth.fullNamePlaceholder")}
        error={errors.fullName}
      />
      <AuthField
        label={t("auth.email")}
        value={profile?.email ?? ""}
        editable={false}
        placeholder={t("auth.emailPlaceholder")}
        autoCapitalize="none"
      />
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

      <AuthButton label={t("auth.saveContinue")} onPress={onSave} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 13, marginTop: 4 },
});
