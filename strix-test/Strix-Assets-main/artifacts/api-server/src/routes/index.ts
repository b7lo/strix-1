import { Router, type IRouter } from "express";
import accidentsRouter from "./accidents";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import { requireAuth } from "../middlewares/requireAuth";
import { requireIngestKey } from "../middlewares/requireIngestKey";
import { ingestRateLimit } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
// استقبال البلاغات من التطبيق: الحارس مقيّد بمسار /accidents فقط
// (مهم: بدون تحديد المسار كان الحارس يتسرّب لكل المسارات بما فيها /dashboard)
router.use("/accidents", ingestRateLimit, requireIngestKey);
router.use(accidentsRouter);
// كل نقاط لوحة التحكم تتطلب مصادقة أدمن (بيانات حساسة: حوادث/عملاء)
router.use("/dashboard", requireAuth, dashboardRouter);

export default router;
