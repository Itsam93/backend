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
import cloudinaryLiveStreamRoutes from "./routes/cloudinaryLiveStreamRoutes.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

const configuredClientUrls =
  process.env.CLIENT_URL
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean) ?? [];

app.use(
  cors({
    origin:
      configuredClientUrls.length === 0
        ? true
        : (
            origin,
            callback
          ) => {
            if (!origin) {
              callback(null, true);
              return;
            }

            if (
              configuredClientUrls.includes(
                origin
              )
            ) {
              callback(null, true);
              return;
            }

            callback(
              new Error(
                `CORS policy blocked origin: ${origin}`
              )
            );
          },
    credentials: true,
  })
);

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

app.use(morgan("dev"));

app.get(
  "/api/health",
  (
    _req: Request,
    res: Response
  ) => {
    return res.status(200).json({
      success: true,
      message: "Backend is running.",
      timestamp: new Date().toISOString(),
    });
  }
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/videos",
  videoRoutes
);

app.use(
  "/api/celebration",
  celebrationRoutes
);

app.use(
  "/api/live-stream",
  liveStreamRoutes
);

app.use(
  "/api/live-stream",
  cloudinaryLiveStreamRoutes
);

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

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

export { app };