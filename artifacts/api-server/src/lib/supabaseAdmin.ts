/**
 * عميل Supabase Auth بصلاحية الخدمة (service role) — لعمليات الخادم الحسّاسة فقط
 * (حذف حساب المستخدم من `auth.users`). لا يُستخدم مفتاح service role إطلاقاً في
 * التطبيق (المتطلب 5.5 / خاصية الأمان 4).
 *
 * الإعداد (متغيّرات بيئة الخادم — Coolify):
 *   SUPABASE_URL              — عنوان مشروع Supabase.
 *   SUPABASE_SERVICE_ROLE_KEY — مفتاح service role (سرّي، الخادم فقط).
 */
import { GoTrueClient } from "@supabase/auth-js";

/**
 * الواجهة الدنيا التي يحتاجها مسار حذف الحساب من عميل Supabase.
 * تُسهّل الاختبار عبر حقن عميل وهمي دون شبكة.
 */
export interface SupabaseAdminLike {
  auth: {
    /** يتحقّق من توكن المستخدم ويُعيد بياناته. */
    getUser(jwt: string): Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
    admin: {
      /** يحذف المستخدم من `auth.users` (يُشغّل الحذف التسلسلي). */
      deleteUser(id: string): Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

let cached: GoTrueClient | null = null;

/** هل عميل الخدمة مُهيّأ (متغيّرات البيئة مضبوطة)؟ */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * يُنشئ/يُعيد عميل GoTrue بصلاحية الخدمة. يرمي إن لم تُضبط متغيّرات البيئة
 * (نمنع تشغيلاً غير آمن أو صامتاً).
 * 
 * ملاحظة: نستخدم GoTrueClient مباشرة بدل SupabaseClient لتجنب مشكلة Realtime
 * التي تحتاج WebSocket في Node.js 20.
 */
export function getSupabaseAdmin(): SupabaseAdminLike {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for account deletion.",
    );
  }
  if (!cached) {
    // إنشاء GoTrueClient مباشرة - يتجاوز مشكلة WebSocket في Realtime
    const authUrl = url.replace(/\/$/, "");
    cached = new GoTrueClient({
      url: `${authUrl}/auth/v1`,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
  }
  return {
    auth: {
      getUser: (jwt: string) => cached!.getUser(jwt),
      admin: {
        deleteUser: (id: string) => cached!.admin.deleteUser(id),
      },
    },
  };
}
