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

// ─── CORS مقيّد: نقرأ الأصول المسموحة من DASHBOARD_ORIGIN (مفصولة بفواصل) ───
// إن لم تُضبط، نسمح للجميع في التطوير فقط مع تحذير (لا للإنتاج).
const allowedOrigins = (process.env.DASHBOARD_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === "production") {
  logger.warn(
    "DASHBOARD_ORIGIN is not set in production — CORS will reject browser requests. Set it to your dashboard URL.",
  );
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // طلبات بلا Origin (curl/تطبيق جوال) مسموحة
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) {
      // تطوير: اسمح، لكن لا تفعل هذا في الإنتاج (مضبوط بالتحذير أعلاه)
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      return callback(new Error("Not allowed by CORS"), false);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"), false);
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

// محدّد معدّل عام لكل الـ API
app.use("/api", apiRateLimit, router);

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
