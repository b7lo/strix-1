/**
 * أدوات مصادقة المزامنة النقيّة (بلا اعتماد على عميل Supabase) — قابلة للاختبار
 * مباشرةً. المتطلبات 7.1، 7.2.
 */

/**
 * يبني ترويسات مصادقة طلبات Supabase REST: يستخدم توكن المستخدم في Authorization
 * عند توفّر جلسة (ليعمل RLS على مستوى المالك)، وإلا anon key. يبقى apikey دائماً
 * anon key.
 */
export function buildSupabaseAuthHeaders(
  anonKey: string,
  accessToken: string | null,
): { apikey: string; Authorization: string } {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
  };
}

/**
 * يُرفق `user_id` بسجلّ الحادث عند توفّر مستخدم مصادَق. عند غياب المستخدم يُعيد
 * السجلّ كما هو (توافق مع الحوادث المرتبطة بالجهاز فقط).
 */
export function withUserId<T extends Record<string, unknown>>(
  record: T,
  userId: string | null,
): T {
  if (!userId) return record;
  return { ...record, user_id: userId };
}
