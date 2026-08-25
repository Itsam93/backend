import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import messageRoutes from "./routes/messageRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import celebrationRoutes from "./routes/celebrationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import liveStreamRoutes from "./routes/liveStreamRoutes.js";

/**
 * ============================================================
 * APPLICATION
 * ============================================================
 */

const app = express();

/**
 * ============================================================
 * SECURITY HEADERS
 * ============================================================
 */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/**
 * ============================================================
 * CORS
 * ============================================================
 *
 * The frontend origin can be configured through CLIENT_URL.
 *
 * When CLIENT_URL is not configured, origin:true allows the
 * requesting origin. This is useful during local development.
 */

const configuredClientUrl =
  process.env.CLIENT_URL?.trim();

app.use(
  cors({
    origin: configuredClientUrl || true,
    credentials: true,
  })
);

/**
 * ============================================================
 * REQUEST PARSERS
 * ============================================================
 */

app.use(cookieParser());

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/**
 * ============================================================
 * REQUEST LOGGING
 * ============================================================
 */

app.use(morgan("dev"));

/**
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 *
 * GET /api/health
 */

app.get(
  "/api/health",
  (
    _req: Request,
    res: Response
  ) => {
    return res.status(200).json({
      success: true,
      message: "Backend is running.",
    });
  }
);

/**
 * ============================================================
 * PUBLIC API ROUTES
 * ============================================================
 */

/**
 * Celebration messages.
 *
 * /api/messages/*
 */
app.use(
  "/api/messages",
  messageRoutes
);

/**
 * Celebration videos.
 *
 * /api/videos/*
 */
app.use(
  "/api/videos",
  videoRoutes
);

/**
 * Celebration content.
 *
 * /api/celebration/*
 */
app.use(
  "/api/celebration",
  celebrationRoutes
);

/**
 * Live-stream API.
 *
 * /api/live-stream/*
 */
app.use(
  "/api/live-stream",
  liveStreamRoutes
);

/**
 * ============================================================
 * ADMIN AUTHENTICATION
 * ============================================================
 *
 * /api/admin/auth/*
 */
app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

/**
 * ============================================================
 * ADMIN API
 * ============================================================
 *
 * /api/admin/*
 */
app.use(
  "/api/admin",
  adminRoutes
);

/**
 * ============================================================
 * 404 HANDLER
 * ============================================================
 *
 * Any request that reaches this point did not match a route.
 */

app.use(
  (
    _req: Request,
    res: Response
  ) => {
    return res.status(404).json({
      success: false,
      message: "Route not found.",
    });
  }
);

/**
 * ============================================================
 * GLOBAL ERROR HANDLER
 * ============================================================
 *
 * This must remain the final middleware.
 */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "Unhandled application error:",
      error
    );

    if (res.headersSent) {
      return;
    }

    const message =
      process.env.NODE_ENV ===
        "production"
        ? "An unexpected server error occurred."
        : error instanceof Error
          ? error.message
          : "An unexpected server error occurred.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
);

/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

export { app };