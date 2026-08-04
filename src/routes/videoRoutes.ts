import { Router } from "express";

import {
  deleteApprovedVideo,
  getLatestApprovedVideo,
  getRandomApprovedVideo,
  uploadVideo,
} from "../controllers/videoController.js";

import {
  uploadVideo as uploadVideoMiddleware,
} from "../middleware/upload.js";

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
 * Returns a random approved video.
 */
router.get(
  "/random",
  getRandomApprovedVideo
);

/**
 * Returns the most recently approved video.
 */
router.get(
  "/latest",
  getLatestApprovedVideo
);

/**
 * Submit a video for moderation.
 */
router.post(
  "/",
  uploadVideoMiddleware.single(
    "video"
  ),
  uploadVideo
);

/**
 * =========================================================
 * ADMIN
 * =========================================================
 */

/**
 * Delete an approved video.
 *
 * Requires administrator authentication.
 */
router.delete(
  "/:id",
  requireAdminAuth,
  deleteApprovedVideo
);

export default router;