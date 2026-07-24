/**
 * مسار حذف الحساب: DELETE /api/account — المتطلبات 5.2، 5.4، 5.5، 5.6.
 *
 * التدفّق:
 *  1. يتحقّق من توكن المستخدم (JWT من Supabase) في ترويسة Authorization.
 *  2. يستخرج `user.id` عبر عميل الخدمة (`auth.getUser`).
 *  3. يحذف المستخدم عبر `auth.admin.deleteUser` → حذف تسلسلي (cascade) لكل
 *     بياناته (accidents ومن ثمّ fault_assessments/false_alarms المرتبطة).
 *  4. عند الفشل: لا حذف جزئي — يبقى الحساب ويُعاد خطأ.
 */
import { Router, type IRouter } from "express";
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
  type SupabaseAdminLike,
} from "../lib/supabaseAdmin";

/** نتيجة معالجة حذف الحساب (status + body) — منفصلة عن express لتسهيل الاختبار. */
export interface DeleteAccountResult {
  status: number;
  body: Record<string, unknown>;
}

/** يستخرج توكن Bearer من ترويسة Authorization. */
export function extractBearer(header: unknown): string {
  if (typeof header !== "string") return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/**
 * منطق حذف الحساب — دالة نقيّة قابلة للاختبار دون HTTP.
 * @param getAdmin مُنشئ عميل الخدمة (يُحقن عميل وهمي في الاختبارات).
 * @param authHeader قيمة ترويسة Authorization.
 * @param configured هل متغيّرات البيئة مضبوطة (افتراضياً الفحص الحقيقي).
 */
export async function handleDeleteAccount(
  getAdmin: () => SupabaseAdminLike,
  authHeader: unknown,
  configured: boolean = isSupabaseAdminConfigured(),
): Promise<DeleteAccountResult> {
  const token = extractBearer(authHeader);
  if (!token) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!configured) {
    return { status: 503, body: { error: "Account service is not configured" } };
  }

  let admin: SupabaseAdminLike;
  try {
    admin = getAdmin();
  } catch {
    return { status: 503, body: { error: "Account service is not configured" } };
  }

  // 1) التحقّق من التوكن واستخراج المستخدم.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { status: 401, body: { error: "Invalid or expired token" } };
  }

  // 2) الحذف عبر service role (يُشغّل cascade). فشل ⇒ لا حذف جزئي.
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    return { status: 500, body: { error: "Failed to delete account" } };
  }

  return { status: 200, body: { success: true } };
}

const router: IRouter = Router();

router.delete("/account", async (req, res, next) => {
  try {
    const result = await handleDeleteAccount(getSupabaseAdmin, req.headers["authorization"]);
    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

export default router;
