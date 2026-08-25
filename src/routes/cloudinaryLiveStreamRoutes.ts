import { Router } from "express";

import {
  provisionAllCloudinaryStreamsController,
  provisionCloudinaryStreamController,
  syncAllCloudinaryStreamsController,
} from "../controllers/cloudinaryLiveStreamController.js";

const router = Router();

/**
 * ============================================================
 * ADMIN — CLOUDINARY STREAM PROVISIONING
 * ============================================================
 *
 * POST /api/live-stream/admin/provision
 *
 * Creates/registers the complete 12-stream Cloudinary pool.
 */
router.post(
  "/admin/provision",
  provisionAllCloudinaryStreamsController
);

/**
 * ============================================================
 * ADMIN — PROVISION ONE STREAM
 * ============================================================
 *
 * POST /api/live-stream/admin/provision/:sequence
 *
 * Creates or repairs one stream in the pool.
 *
 * Example:
 *
 * POST /api/live-stream/admin/provision/1
 */
router.post(
  "/admin/provision/:sequence",
  provisionCloudinaryStreamController
);

/**
 * ============================================================
 * ADMIN — SYNCHRONIZE CLOUDINARY STREAMS
 * ============================================================
 *
 * POST /api/live-stream/admin/sync
 *
 * Synchronizes Cloudinary's current stream configuration
 * with MongoDB.
 */
router.post(
  "/admin/sync",
  syncAllCloudinaryStreamsController
);

export default router;