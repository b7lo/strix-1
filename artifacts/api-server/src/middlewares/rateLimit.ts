/**
 * محدّد معدّل بسيط في الذاكرة (بلا مكتبات خارجية) — كافٍ لواجهة إدارية صغيرة.
 * نافذة منزلقة تقريبية بعدّاد لكل IP. للنشر متعدد النسخ يُفضّل لاحقًا مخزن مشترك.
 */
import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

function createLimiter(windowMs: number, max: number, message: string) {
  const buckets = new Map<string, Bucket>();

  return function limiter(req: Request, res: Response, next: NextFunction): void {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}

// حماية عامة لكل الـ API (سخيّة نسبيًا)
export const apiRateLimit = createLimiter(60_000, 300, "Too many requests, slow down.");

// حماية صارمة لتسجيل الدخول (ضد التخمين)
export const loginRateLimit = createLimiter(15 * 60_000, 10, "Too many login attempts. Try again later.");

// حماية صارمة لاستقبال البلاغات من التطبيق (ضد الحقن والإغراق)
export const ingestRateLimit = createLimiter(60_000, 30, "Too many submissions, slow down.");
