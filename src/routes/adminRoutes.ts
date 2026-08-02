import { Router } from "express";

import {
  getAdminMessages,
  approveMessage,
  rejectMessage,
  getAdminVideos,
  approveVideo,
  rejectVideo,
} from "../controllers/adminController.js";

import {
  requireAdminAuth,
} from "../middleware/adminAuth.js";

const router = Router();

router.use(
  requireAdminAuth
);

router.get(
  "/messages",
  getAdminMessages
);

router.patch(
  "/messages/:id/approve",
  approveMessage
);

router.patch(
  "/messages/:id/reject",
  rejectMessage
);

router.get(
  "/videos",
  getAdminVideos
);

router.patch(
  "/videos/:id/approve",
  approveVideo
);

router.patch(
  "/videos/:id/reject",
  rejectVideo
);

export default router;
