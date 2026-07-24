/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Auth Context — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * سياق المصادقة: يوفّر الجلسة والمستخدم والملف الشخصي وعمليات المصادقة
 * (تسجيل/دخول بالبريد، Apple، خروج، إعادة تعيين كلمة المرور، حذف الحساب).
 *
 * المتطلبات: 1، 2، 3، 5، 6.
 *
 * ملاحظات التصميم:
 *  ─ يستمع لـ `supabase.auth.onAuthStateChange` لتحديث الحالة تلقائياً.
 *  ─ يحمّل الملف الشخصي من جدول `profiles` (RLS: كل مستخدم صفّه فقط).
 *  ─ `profileComplete` يحدّد اكتمال الحقول الإلزامية (الاسم/الميلاد/المدينة/الهاتف)
 *    ويُستخدم من حارس التنقّل لتوجيه مستخدمي Apple لإكمال الملف.
 *  ─ حذف الحساب يتم عبر api-server (service role) لا من العميل مباشرةً.
 * ═══════════════════════════════════════════════════════════════════
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

/** بيانات الملف الشخصي كما في جدول `profiles`. */
export interface Profile {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string;
}

/** الحقول التي تُحدَّث عبر شاشات الملف/الإكمال. */
export interface ProfileUpdate {
  full_name?: string;
  birth_date?: string;
  city?: string;
  phone?: string;
}

/** الحقول الإلزامية للملف (القرار 4 / المتطلب 4.6). */
const REQUIRED_PROFILE_FIELDS: (keyof Profile)[] = [
  "full_name",
  "birth_date",
  "city",
  "phone",
];

/** عنوان api-server لعمليات الخادم الحسّاسة (حذف الحساب). */
const STRIX_API_URL = process.env.EXPO_PUBLIC_STRIX_API_URL || "";

/**
 * رابط إعادة التوجيه بعد إعادة تعيين كلمة المرور / تأكيد البريد.
 * يعتمد الـ scheme الموجود في app.json: `strix`.
 */
const REDIRECT_URL = "strix://auth-callback";

export interface AuthContextType {
  /** الجلسة الحالية (null إذا غير مسجّل). */
  session: Session | null;
  /** المستخدم الحالي (null إذا غير مسجّل). */
  user: User | null;
  /** الملف الشخصي المحمّل من `profiles` (null قبل التحميل أو إذا غير مسجّل). */
  profile: Profile | null;
  /** جارٍ تهيئة الجلسة الأولية (قبل معرفة حالة الدخول). */
  loading: boolean;
  /** هل اكتملت الحقول الإلزامية في الملف؟ (يُستخدم لحارس إكمال الملف). */
  profileComplete: boolean;
  /** تسجيل جديد بالبريد + بيانات الملف الإلزامية. */
  signUpEmail: (params: SignUpParams) => Promise<void>;
  /** الدخول بالبريد وكلمة المرور. */
  signInEmail: (email: string, password: string) => Promise<void>;
  /** الدخول عبر Apple (native)، يُرجِع false عند إلغاء المستخدم. */
  signInApple: () => Promise<boolean>;
  /** تسجيل الخروج ومسح الجلسة. */
  signOut: () => Promise<void>;
  /** إرسال رمز إعادة تعيين كلمة المرور (OTP) للبريد. */
  resetPassword: (email: string) => Promise<void>;
  /** تأكيد التسجيل برمز OTP المُرسل للبريد (type=signup) — يُنشئ جلسة عند النجاح. */
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  /** التحقق من رمز إعادة التعيين (type=recovery) — يُنشئ جلسة استرداد مؤقتة. */
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>;
  /** تحديث كلمة مرور المستخدم الحالي (بعد التحقق من رمز الاسترداد). */
  updatePassword: (newPassword: string) => Promise<void>;
  /** إعادة إرسال رمز تأكيد التسجيل للبريد. */
  resendSignupOtp: (email: string) => Promise<void>;
  /** تحديث حقول الملف الشخصي للمستخدم الحالي. */
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  /** إعادة تحميل الملف الشخصي من الخادم. */
  refreshProfile: () => Promise<void>;
  /** حذف الحساب نهائياً عبر الخادم (service role) ثم مسح الجلسة. */
  deleteAccount: () => Promise<void>;
}

/** معطيات التسجيل بالبريد. */
export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  city: string;
  phone: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** يحدّد اكتمال الحقول الإلزامية في الملف. */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = profile[field];
    return typeof value === "string" && value.trim() !== "";
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // نتفادى تحديث الحالة بعد إلغاء التركيب (unmount).
  const mounted = useRef(true);

  /** يجلب الملف الشخصي للمستخدم من `profiles` (RLS يضمن أنه صفّه فقط). */
  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, birth_date, city, phone, email, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[Strix Auth] Failed to load profile:", error.message);
      return null;
    }
    return (data as Profile) ?? null;
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      if (!mounted.current) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const p = await loadProfile(nextSession.user.id);
        if (mounted.current) setProfile(p);
      } else if (mounted.current) {
        setProfile(null);
      }
    },
    [loadProfile]
  );

  // تهيئة الجلسة الأولية + الاستماع للتغيّرات.
  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await applySession(data.session ?? null);
      } catch (err) {
        console.warn("[Strix Auth] getSession failed:", err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await loadProfile(user.id);
    if (mounted.current) setProfile(p);
  }, [user, loadProfile]);

  const signUpEmail = useCallback(async (params: SignUpParams) => {
    const { email, password, fullName, birthDate, city, phone } = params;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: REDIRECT_URL,
        // نُمرّر بيانات الملف كـ metadata حتى يستطيع trigger handle_new_user
        // تعبئتها في `profiles` عند إنشاء المستخدم.
        data: {
          full_name: fullName.trim(),
          birth_date: birthDate,
          city: city.trim(),
          phone: phone.trim(),
        },
      },
    });
    if (error) throw error;

    // إن لم يكن الـ trigger يملأ الحقول، نحدّثها بعد توفّر جلسة (تأكيد البريد).
    // عند تفعيل تأكيد البريد لا توجد جلسة بعد signUp، لذا التحديث الفعلي يتم
    // عند أول دخول (عبر updateProfile) أو شاشة إكمال الملف.
    if (data.session?.user) {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          birth_date: birthDate,
          city: city.trim(),
          phone: phone.trim(),
        })
        .eq("id", data.session.user.id);
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signInApple = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "ios") {
      throw new Error("Sign in with Apple متاح على iOS فقط.");
    }
    // تحميل كسول لتفادي كسر المنصّات الأخرى.
    const AppleAuthentication = await import("expo-apple-authentication");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("لم يصل رمز هوية Apple.");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        // تشخيص: نسجّل التفاصيل الفعلية لخطأ Supabase حتى نعرف السبب الحقيقي
        // (مثل: مزود Apple غير مفعّل، أو Client ID/Bundle ID غير مطابق للـ audience،
        // أو رمز غير صالح). تظهر في Console.app / Xcode عند وصل الجهاز.
        console.warn(
          "[Strix Apple] signInWithIdToken failed:",
          JSON.stringify({
            message: (error as { message?: string })?.message,
            status: (error as { status?: number })?.status,
            code: (error as { code?: string })?.code,
            name: (error as { name?: string })?.name,
          })
        );
        throw error;
      }

      // الاسم يصل من Apple أول مرة فقط؛ نملؤه في الملف إن كان ناقصاً.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fullName && data.user) {
        const existing = await loadProfile(data.user.id);
        if (existing && (!existing.full_name || existing.full_name.trim() === "")) {
          await supabase.from("profiles").update({ full_name: fullName }).eq("id", data.user.id);
        }
      }
      return true;
    } catch (err: unknown) {
      // إلغاء المستخدم لتدفّق Apple → عودة صامتة (المتطلب 3.5).
      if (isAppleCanceled(err)) return false;
      // تشخيص: نسجّل الخطأ الفعلي (سواء من طبقة Apple الأصلية أو من Supabase).
      console.warn(
        "[Strix Apple] sign-in error:",
        JSON.stringify({
          message: (err as { message?: string })?.message,
          code: (err as { code?: string })?.code,
          status: (err as { status?: number })?.status,
        })
      );
      throw err;
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // يرسل بريد الاسترداد. عند ضبط قالب البريد على {{ .Token }} يصل كرمز 6 أرقام
    // بدل رابط. redirectTo يبقى كاحتياط لو فُتح كرابط على الويب.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: REDIRECT_URL,
    });
    if (error) throw error;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "signup",
    });
    if (error) throw error;
    // onAuthStateChange يلتقط الجلسة الجديدة تلقائياً؛ الحارس يوجّه بعدها.
  }, []);

  const verifyRecoveryOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "recovery",
    });
    if (error) throw error;
    // تُنشأ جلسة استرداد مؤقتة تسمح بـ updateUser({ password }).
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      if (!user) throw new Error("لا توجد جلسة نشطة.");
      const payload: Record<string, string> = {};
      if (update.full_name !== undefined) payload.full_name = update.full_name.trim();
      if (update.birth_date !== undefined) payload.birth_date = update.birth_date;
      if (update.city !== undefined) payload.city = update.city.trim();
      if (update.phone !== undefined) payload.phone = update.phone.trim();

      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const deleteAccount = useCallback(async () => {
    if (!session?.access_token) throw new Error("لا توجد جلسة نشطة.");
    if (!STRIX_API_URL) throw new Error("عنوان الخادم غير مضبوط.");

    const res = await fetch(`${STRIX_API_URL.replace(/\/$/, "")}/api/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // فشل الحذف: نبقي الحساب ونرفع خطأ (المتطلب 5.6 — لا حذف جزئي).
      let message = "فشل حذف الحساب.";
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        /* تجاهل */
      }
      throw new Error(message);
    }

    // نجاح: نمسح الجلسة محلياً (المتطلب 5.4).
    await supabase.auth.signOut().catch(() => {});
  }, [session]);

  const profileComplete = useMemo(() => isProfileComplete(profile), [profile]);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user,
      profile,
      loading,
      profileComplete,
      signUpEmail,
      signInEmail,
      signInApple,
      signOut,
      resetPassword,
      verifyEmailOtp,
      verifyRecoveryOtp,
      updatePassword,
      resendSignupOtp,
      updateProfile,
      refreshProfile,
      deleteAccount,
    }),
    [
      session,
      user,
      profile,
      loading,
      profileComplete,
      signUpEmail,
      signInEmail,
      signInApple,
      signOut,
      resetPassword,
      verifyEmailOtp,
      verifyRecoveryOtp,
      updatePassword,
      resendSignupOtp,
      updateProfile,
      refreshProfile,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** يتحقق ما إذا كان الخطأ ناتجاً عن إلغاء المستخدم لتدفّق Apple. */
function isAppleCanceled(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    return code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED";
  }
  return false;
}
