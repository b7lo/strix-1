import express, {
  type ErrorRequestHandler,
  type Express,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

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
