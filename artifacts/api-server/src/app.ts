import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiRateLimit } from "./middlewares/rateLimit";

const app: Express = express();

// إخفاء بصمة الخادم (يقلّل تحديد نوع الخادم للمهاجمين)
app.disable("x-powered-by");

// خلف بروكسي (Coolify/nginx) — نثق بالـ X-Forwarded-* للحصول على IP الحقيقي
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── CORS مقيّد: أصول اللوحة المسموحة ───
// نجمع بين قيم DASHBOARD_ORIGIN (من البيئة، مفصولة بفواصل) وأصول افتراضية
// معروفة للإنتاج، حتى تعمل اللوحة حتى لو لم يُضبط المتغيّر في بيئة النشر.
const DEFAULT_ALLOWED_ORIGINS = [
  "https://dashboard.strixsa.com",
  "https://www.strixsa.com",
  "https://strixsa.com",
];

const normalizeOrigin = (o: string) => o.trim().replace(/\/+$/, "");

const allowedOrigins = Array.from(
  new Set(
    [
      ...(process.env.DASHBOARD_ORIGIN || "").split(","),
      ...DEFAULT_ALLOWED_ORIGINS,
    ]
      .map(normalizeOrigin)
      .filter(Boolean),
  ),
);

logger.info({ allowedOrigins }, "CORS allowed origins configured");

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // طلبات بلا Origin (curl/تطبيق جوال) مسموحة
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    // أصل غير مسموح: لا نرمي خطأ (يتسبب في 500)، بل نمنع ترويسات CORS فقط
    logger.warn({ origin }, "CORS: origin not allowed");
    return callback(null, false);
  },
  credentials: true,
};
app.use(cors(corsOptions));

// ─── ترويسات أمان أساسية (بلا مكتبة helmet) ───
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// صفحة الجذر: رد بسيط ونظيف بدل "Cannot GET /"
app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "strix-api", status: "ok" });
});

// محدّد معدّل عام لكل الـ API
app.use("/api", apiRateLimit, router);

// أي مسار غير معروف: رد JSON موحّد (بدل رسالة Express الخام)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Unknown server error";
  _req.log?.error({ err }, "Request failed");

  const isDatabaseConfigError = message.includes("DATABASE_URL");
  res.status(isDatabaseConfigError ? 503 : 500).json({
    error: isDatabaseConfigError
      ? "Database is not configured"
      : "Internal server error",
  });
};

app.use(errorHandler);

export default app;
