/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Supabase Client — v1.0
 * ═══════════════════════════════════════════════════════════════════
 *
 * عميل Supabase للتطبيق (Expo/React Native) لإدارة المصادقة والجلسة.
 *
 * الأمان:
 *  ─ تُخزَّن الجلسة (JWT) في expo-secure-store (Keychain/Keystore) لا في
 *    AsyncStorage — تحقيقًا للمتطلب 6.4.
 *  ─ تجديد التوكن تلقائيًا (autoRefreshToken) وحفظ الجلسة (persistSession).
 *
 * قيود expo-secure-store:
 *  ─ المفاتيح: أحرف/أرقام + "." و"-" و"_" فقط.
 *  ─ حجم القيمة محدود (~2KB على بعض المنصّات). لذا نُقسّم القيم الكبيرة
 *    (مثل الجلسة كاملة) إلى أجزاء ونعيد تجميعها عند القراءة.
 * ═══════════════════════════════════════════════════════════════════
 */

import * as SecureStore from "expo-secure-store";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // تحذير فقط — لا نُوقف التطبيق؛ المسارات غير المصادَقة قد تعمل بدون Supabase.
  console.warn(
    "[Strix Auth] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY غير مضبوطة."
  );
}

/**
 * حدّ حجم الجزء الواحد في SecureStore. نُبقيه دون 2KB بهامش أمان.
 */
const CHUNK_SIZE = 1800;

/**
 * تنقية المفتاح ليطابق قيود expo-secure-store (أحرف/أرقام + . - _).
 * Supabase يستخدم مفاتيح مثل "sb-<ref>-auth-token" التي تحوي "-" فقط،
 * لكن نُنقّي احتياطًا لأي مفتاح آخر (مثل مفاتيح تحوي "://" أو نقاطًا).
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function chunkKey(baseKey: string, index: number): string {
  return `${baseKey}.chunk.${index}`;
}

/**
 * مُخزِّن مخصّص يعتمد expo-secure-store مع تقسيم القيم الكبيرة إلى أجزاء.
 *
 * مخطّط التخزين:
 *  ─ المفتاح الأساس يحفظ عدد الأجزاء (metadata) كرقم.
 *  ─ كل جزء يُحفظ في "<key>.chunk.<i>".
 *  ─ للتوافق مع القيم القديمة/الصغيرة، إذا لم يكن المفتاح الأساس رقمًا
 *    نعيده كما هو (قيمة غير مُقسَّمة).
 */
const SecureStoreAdapter: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    const baseKey = sanitizeKey(key);
    const meta = await SecureStore.getItemAsync(baseKey);
    if (meta === null) return null;

    const chunkCount = Number(meta);
    // قيمة غير مُقسَّمة (توافق مع صيغة قديمة أو قيم قصيرة حُفظت مباشرة).
    if (!Number.isInteger(chunkCount) || chunkCount <= 0) {
      return meta;
    }

    const parts: string[] = [];
    for (let i = 0; i < chunkCount; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(baseKey, i));
      if (part === null) {
        // جزء مفقود → القيمة تالفة؛ ننظّف ونعيد null.
        await this.removeItem(key);
        return null;
      }
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    const baseKey = sanitizeKey(key);
    // نظّف أي أجزاء سابقة قبل الكتابة لتفادي بقايا قديمة.
    await removeChunks(baseKey);

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    // نحفظ عدد الأجزاء في المفتاح الأساس (metadata).
    await SecureStore.setItemAsync(baseKey, String(chunkCount));
    for (let i = 0; i < chunkCount; i += 1) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(baseKey, i), slice);
    }
  },

  async removeItem(key: string): Promise<void> {
    const baseKey = sanitizeKey(key);
    await removeChunks(baseKey);
    await SecureStore.deleteItemAsync(baseKey);
  },
};

/**
 * حذف كل أجزاء مفتاح معيّن (يعتمد على metadata المخزّن في المفتاح الأساس).
 */
async function removeChunks(baseKey: string): Promise<void> {
  const meta = await SecureStore.getItemAsync(baseKey);
  if (meta === null) return;
  const chunkCount = Number(meta);
  if (!Number.isInteger(chunkCount) || chunkCount <= 0) return;
  for (let i = 0; i < chunkCount; i += 1) {
    await SecureStore.deleteItemAsync(chunkKey(baseKey, i));
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // على الموبايل لا نعتمد على عنوان URL لاكتشاف الجلسة (تدفّق الويب فقط).
    detectSessionInUrl: false,
  },
});
