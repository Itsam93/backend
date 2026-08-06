import { Router } from "express";

import {
  deleteApprovedVideo,
  getLatestApprovedVideo,
  getRandomApprovedVideo,
  getApprovedVideos,
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

router.get(
  "/approved",
  getApprovedVideos
);

router.post(
  "/",
  uploadVideoMiddleware.single(
    "video"
  ),
  uploadVideo
);


router.delete(
  "/:id",
  requireAdminAuth,
  deleteApprovedVideo
);

export default router;