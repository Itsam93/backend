import { Router } from "express";

import {
  createMessage,
  deleteApprovedMessage,
  getLatestApprovedMessage,
  getRandomApprovedMessage,
} from "../controllers/messageController.js";

import {
  requireAdminAuth,
} from "../middleware/adminAuth.js";

const router = Router();

/**
 * =========================================================
 * PUBLIC
 * =========================================================
 */

/**
 * Returns a random approved message.
 */
router.get(
  "/random",
  getRandomApprovedMessage
);

/**
 * Returns the most recently approved message.
 */
router.get(
  "/latest",
  getLatestApprovedMessage
);

/**
 * Submit a message for moderation.
 */
router.post(
  "/",
  createMessage
);

/**
 * =========================================================
 * ADMIN
 * =========================================================
 */

/**
 * Delete an approved message.
 *
 * Requires administrator authentication.
 */
router.delete(
  "/:id",
  requireAdminAuth,
  deleteApprovedMessage
);

export default router;