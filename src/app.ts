import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import messageRoutes from "./routes/messageRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin: true,
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
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Backend is running.",
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
  "/api/webhooks",
  webhookRoutes
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
  (_req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found.",
    });
  }
);


app.use(
  (
    error: unknown,
    _req,
    res,
    _next
  ) => {
    console.error(
      "Unhandled application error:",
      error
    );

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      success: false,
      message:
        "An unexpected server error occurred.",
    });
  }
);

export { app };