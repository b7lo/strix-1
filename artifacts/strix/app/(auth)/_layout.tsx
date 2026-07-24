import { Stack } from "expo-router";

/** مجموعة شاشات المصادقة (بلا رؤوس افتراضية — كل شاشة تدير رأسها). */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}
