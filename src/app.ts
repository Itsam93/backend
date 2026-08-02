import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import messageRoutes from "./routes/messageRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running.",
  });
});

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

export default app;