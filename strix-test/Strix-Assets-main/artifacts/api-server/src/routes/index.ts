import { Router, type IRouter } from "express";
import accidentsRouter from "./accidents";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accidentsRouter);
// كل نقاط لوحة التحكم تتطلب مصادقة أدمن (بيانات حساسة: حوادث/عملاء)
router.use("/dashboard", requireAuth, dashboardRouter);

export default router;
