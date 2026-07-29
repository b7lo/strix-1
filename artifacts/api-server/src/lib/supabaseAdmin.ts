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
import type WebSocket from "ws";

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
    // استيراد ديناميكي لتجنب خطأ في البيئات التي لا تدعم WebSocket
    let transport: typeof globalThis.WebSocket | undefined;
    try {
      const ws = require("ws") as typeof WebSocket;
      transport = ws as unknown as typeof globalThis.WebSocket;
    } catch {
      // WebSocket غير متوفر - Realtime لن يعمل لكن Auth سيعمل
    }
    
    cached = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      // توفير WebSocket polyfill لـ Node.js 20 (Realtime يحتاجه)
      realtime: transport ? { transport } : undefined,
    });
  }
  return cached;
}
