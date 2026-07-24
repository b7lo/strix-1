/**
 * تسجيل العملاء (Leads) عبر Supabase REST مباشرة من صفحة الهبوط.
 *
 * الأمان/الخصوصية:
 *  - الزائر (anon) يستطيع الإضافة فقط (INSERT) — لا يقرأ صفوف العملاء.
 *  - العدد يُجلب عبر دالة قاعدة بيانات آمنة `leads_count()` (SECURITY DEFINER)
 *    فلا تُكشف الأسماء/الجوالات للمتصفح.
 *
 * الإعداد: ضع في ملف .env الخاص بصفحة الهبوط:
 *   VITE_SUPABASE_URL=...        (نفس مشروع Supabase)
 *   VITE_SUPABASE_ANON_KEY=...
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

export function isLeadsConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export interface LeadInput {
  fullName: string;
  mobile: string;
  email?: string;
}

/** يُسجّل عميلًا جديدًا في جدول leads. يرمي خطأ عند الفشل ليعرضه النموذج. */
export async function submitLead(input: LeadInput): Promise<void> {
  if (!isLeadsConfigured()) {
    // متغيّرات البيئة غير موجودة وقت البناء (شائع عند النشر على Cloudflare/Vercel
    // بدون ضبط المتغيّرات ثم إعادة البناء).
    throw new Error("MISSING_ENV");
  }
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        full_name: input.fullName.trim(),
        mobile: input.mobile.trim(),
        email: input.email?.trim() || null,
      }),
    });
  } catch (netErr) {
    // فشل شبكي / CORS
    throw new Error("NETWORK");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // نطبع التفاصيل في الكونسول للتشخيص، ونرمي رمز الحالة للواجهة
    console.error("[Strix] Lead submit failed:", res.status, body);
    throw new Error(`HTTP_${res.status}`);
  }
}

/**
 * يُرجِع عدد العملاء المسجّلين عبر دالة leads_count() الآمنة.
 * عند أي فشل/عدم تهيئة يُرجِع null (تعرض الواجهة قيمة احتياطية).
 */
export async function getLeadsCount(): Promise<number | null> {
  if (!isLeadsConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/leads_count`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return null;
    const value = await res.json();
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
