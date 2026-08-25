import { Router } from "express";

import {
  provisionAllCloudinaryStreamsController,
  provisionCloudinaryStreamController,
  syncAllCloudinaryStreamsController,
} from "../controllers/cloudinaryLiveStreamController.js";

const router = Router();

/**
 * ============================================================
 * ADMIN — CLOUDINARY STREAM MANAGEMENT
 * ============================================================
 */

/**
 * POST /api/live-stream/admin/provision
 *
 * Provisions/registers the complete Cloudinary stream pool.
 *
 * The service is responsible for enforcing MAX_STREAMS.
 */
router.post(
  "/admin/provision",
  provisionAllCloudinaryStreamsController
);

/**
 * ============================================================
 * ADMIN — SINGLE STREAM PROVISIONING
 * ============================================================
 */

/**
 * POST /api/live-stream/admin/provision/:sequence
 *
 * Provisions or retrieves one stream by sequence.
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
 * ADMIN — CLOUDINARY/MONGODB SYNCHRONIZATION
 * ============================================================
 */

/**
 * POST /api/live-stream/admin/sync
 *
 * Synchronizes Cloudinary stream information with MongoDB.
 */
router.post(
  "/admin/sync",
  syncAllCloudinaryStreamsController
);

export default router;