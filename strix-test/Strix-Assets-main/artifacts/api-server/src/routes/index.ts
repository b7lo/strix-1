import { Router, type IRouter } from "express";
import accidentsRouter from "./accidents";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accidentsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
