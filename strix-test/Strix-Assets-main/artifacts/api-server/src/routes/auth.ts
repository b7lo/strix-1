/**
 * مسار مصادقة الأدمن: POST /api/auth/login
 * يتحقق من البريد/كلمة المرور ويُصدر توكنًا موقّعًا للوحة التحكم.
 */
import { Router, type IRouter } from "express";
import { checkAdminCredentials, signToken, getAuthSecret } from "../lib/auth";
import { loginRateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.post("/auth/login", loginRateLimit, (req, res) => {
  const body = req.body as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (!checkAdminCredentials(email, password)) {
    // رسالة عامة لتفادي تعداد الحسابات
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(email.trim().toLowerCase(), getAuthSecret());
  res.json({ token, tokenType: "Bearer", expiresInSec: 12 * 60 * 60 });
});

export default router;
