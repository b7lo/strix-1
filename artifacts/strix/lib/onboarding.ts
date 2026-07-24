/**
 * علم "شاهد المستخدم شاشات الترحيب" (Onboarding) — يُخزَّن في expo-secure-store.
 * يُستخدم لعرض الترحيب مرة واحدة عند أول فتح للتطبيق فقط.
 */
import * as SecureStore from "expo-secure-store";

export const ONBOARDING_SEEN_KEY = "onboarding_seen_v1";

/** هل شاهد المستخدم الترحيب سابقاً؟ (افتراضياً false عند أول تشغيل). */
export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/** يحفظ أن المستخدم أنهى/تخطّى الترحيب. */
export async function setOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, "true");
  } catch {
    /* ignore */
  }
}
