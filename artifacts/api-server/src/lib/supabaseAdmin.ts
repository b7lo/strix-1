/**
 * عميل Supabase بصلاحية الخدمة (service role) — لعمليات الخادم الحسّاسة فقط
 * (حذف حساب المستخدم من `auth.users`). لا يُستخدم مفتاح service role إطلاقاً في
 * التطبيق (المتطلب 5.5 / خاصية الأمان 4).
 *
 * الإعداد (متغيّرات بيئة الخادم — Coolify):
 *   SUPABASE_URL              — عنوان مشروع Supabase.
 *   SUPABASE_SERVICE_ROLE_KEY — مفتاح service role (سرّي، الخادم فقط).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

let cached: SupabaseClient | null = null;

/** هل عميل الخدمة مُهيّأ (متغيّرات البيئة مضبوطة)؟ */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * يُنشئ/يُعيد عميل Supabase بصلاحية الخدمة. يرمي إن لم تُضبط متغيّرات البيئة
 * (نمنع تشغيلاً غير آمن أو صامتاً).
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for account deletion.",
    );
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      // تعطيل Realtime لأننا لا نحتاجه لحذف الحساب، ويمنع خطأ WebSocket في Node.js 20
      realtime: { enabled: false },
    });
  }
  return cached;
}
