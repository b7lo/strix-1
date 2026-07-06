/**
 * Middleware: يتطلب توكن أدمن صالحًا (Authorization: Bearer <token>).
 * يحمي نقاط لوحة التحكم من الوصول العام (بيانات العملاء/الحوادث حساسة).
 */
import type { Request, Response, NextFunction } from "express";
import { getAuthSecret, verifyToken, type AuthPayload } from "../lib/auth";

export interface AuthedRequest extends Request {
  admin?: AuthPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = verifyToken(token, getAuthSecret());
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.admin = payload;
  next();
}
