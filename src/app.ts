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
import webhookRoutes from "./routes/webhookRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

const app = express();

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Cookies
|--------------------------------------------------------------------------
*/

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Body Parsing
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Logging
|--------------------------------------------------------------------------
*/

app.use(morgan("dev"));

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (
    _req: Request,
    res: Response
  ) => {
    res.status(200).json({
      success: true,
      message: "Backend is running.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Admin Authentication Routes
|--------------------------------------------------------------------------
|
| These routes are responsible for:
|
| POST /api/admin/auth/login
| POST /api/admin/auth/logout
| GET  /api/admin/auth/me
|
| They are intentionally mounted BEFORE the protected
| /api/admin routes.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

/*
|--------------------------------------------------------------------------
| Protected Admin Routes
|--------------------------------------------------------------------------
|
| Authentication is handled inside adminRoutes.ts
| through the adminAuth middleware.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/admin",
  adminRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use(
  (
    _req: Request,
    res: Response
  ) => {
    res.status(404).json({
      success: false,
      message: "Route not found.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
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

    res.status(500).json({
      success: false,
      message:
        "An unexpected server error occurred.",
    });
  }
);

export { app };