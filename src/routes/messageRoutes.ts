import { Router } from "express";

import {
  createMessage,
  deleteApprovedMessage,
  getLatestApprovedMessage,
  getRandomApprovedMessage,
  getApprovedMessages,
} from "../controllers/messageController.js";

import {
  requireAdminAuth,
} from "../middleware/adminAuth.js";

const router = Router();

router.get(
  "/random",
  getRandomApprovedMessage
);

router.get(
  "/latest",
  getLatestApprovedMessage
);

router.get(
  "/approved",
  getApprovedMessages
);

router.post(
  "/",
  createMessage
);


router.delete(
  "/:id",
  requireAdminAuth,
  deleteApprovedMessage
);

export default router;