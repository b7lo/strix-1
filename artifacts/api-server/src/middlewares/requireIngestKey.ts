/**
 * Middleware: يحمي نقاط استقبال البلاغات (/accidents) بمفتاح مشترك.
 * التطبيق يرسل الترويسة `x-strix-key`، والخادم يقارنها بـ INGEST_API_KEY.
 *
 * هذا ليس بديلاً عن مصادقة المستخدم الكاملة، لكنه يمنع الحقن العشوائي من
 * الإنترنت العام إلى أن يتوفّر تسجيل الدخول في التطبيق.
 *
 * السلوك:
 *  - إذا كان INGEST_API_KEY غير مضبوط: يُسمح بالمرور في التطوير، ويُرفض في الإنتاج.
 *  - المقارنة ثابتة الزمن (timing-safe) لتقليل تسريب المعلومات.
 */
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function requireIngestKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.INGEST_API_KEY || "";

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({ error: "Ingest is not configured" });
      return;
    }
    // تطوير فقط: نسمح بالمرور
    next();
    return;
  }

  const provided = typeof req.headers["x-strix-key"] === "string"
    ? (req.headers["x-strix-key"] as string)
    : "";

  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({ error: "Unauthorized ingest" });
    return;
  }

  next();
}
