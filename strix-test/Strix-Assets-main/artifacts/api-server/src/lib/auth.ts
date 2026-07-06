/**
 * مصادقة الأدمن للوحة التحكم — توكن موقّع HS256 عبر crypto المدمج (بلا مكتبات).
 *
 * الإعداد (متغيّرات بيئة الخادم):
 *   AUTH_SECRET     — سر توقيع التوكنات (سلسلة عشوائية طويلة). إلزامي للأمان.
 *   ADMIN_EMAIL     — بريد الأدمن للدخول.
 *   ADMIN_PASSWORD  — كلمة مرور الأدمن.
 *
 * ملاحظة: كلمة المرور تُقارن مقارنة ثابتة الزمن (timing-safe). للإنتاج يُفضّل
 * تخزين هاش بدل نص صريح، لكن مقارنة env الثابتة الزمن كافية كخطوة أولى آمنة.
 */
import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 ساعة

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export interface AuthPayload {
  sub: string; // email
  role: "admin";
  iat: number;
  exp: number;
}

/** سرّ التوقيع من البيئة. يرمي في الإنتاج إذا غير مضبوط (نمنع سرًّا افتراضيًا ضعيفًا). */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required (>=16 chars) in production.");
    }
    // تطوير فقط: سرّ ثابت واضح أنه غير آمن
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

export function signToken(email: string, secret: string, ttlSec = TOKEN_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: AuthPayload = { sub: email, role: "admin", iat: now, exp: now + ttlSec };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret: string): AuthPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(parts[2]);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AuthPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** تحقق من بيانات دخول الأدمن مقابل متغيّرات البيئة (مقارنة ثابتة الزمن). */
export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPassword) return false;
  // نقارن الاثنين دائمًا لتقليل تسريب التوقيت
  const emailOk = safeEqual(email.trim().toLowerCase(), adminEmail.trim().toLowerCase());
  const passOk = safeEqual(password, adminPassword);
  return emailOk && passOk;
}
