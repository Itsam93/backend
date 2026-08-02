import { Router } from "express";

import {
  getAdminDashboard,
  getAdminMessages,
  getAdminVideos,

  approveMessage,
  rejectMessage,

  approveVideo,
  rejectVideo,

  deleteMessage,
  deleteVideo,
} from "../controllers/adminController.js";

import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

router.use(adminAuth);

router.get(
  "/dashboard",
  getAdminDashboard
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

router.delete(
  "/messages/:id",
  deleteMessage
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

router.delete(
  "/videos/:id",
  deleteVideo
);


export default router;