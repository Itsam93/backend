import { Router } from "express";

import {
  getPublicLiveStreamController,
  getPublicStreamPoolController,
  getAllLiveStreamsController,
  getLiveStreamBySequenceController,
  getActiveLiveStreamController,
  activateLiveStreamController,
  deactivateLiveStreamController,
  markStreamStartingController,
  markStreamLiveController,
  markStreamTransitioningController,
  markStreamEndedController,
  markStreamErrorController,
  checkActiveStreamHealthController,
  checkAllStreamHealthController,
  prepareStreamForRotationController,
  getRotationStateController,
  getStreamDueForRotationController,
  getNextLiveStreamController,
} from "../controllers/liveStreamController.js";

const router = Router();

/**
 * ============================================================
 * PUBLIC LIVE STREAM
 * ============================================================
 */

/**
 * GET /api/live-stream
 *
 * Returns the stream currently selected for public playback.
 */
router.get(
  "/",
  getPublicLiveStreamController
);

/**
 * GET /api/live-stream/pool
 *
 * Returns the public representation of all
 * registered streams.
 */
router.get(
  "/pool",
  getPublicStreamPoolController
);

/**
 * GET /api/live-stream/sequence/:sequence
 *
 * Returns a stream by its rotation sequence.
 */
router.get(
  "/sequence/:sequence",
  getLiveStreamBySequenceController
);

/**
 * GET /api/live-stream/next/:sequence
 *
 * Returns the next stream in the rotation pool.
 */
router.get(
  "/next/:sequence",
  getNextLiveStreamController
);

/**
 * ============================================================
 * ROTATION STATE
 * ============================================================
 */

/**
 * GET /api/live-stream/rotation
 *
 * Returns:
 * - active stream
 * - next stream
 * - rotation status
 * - expiry information
 */
router.get(
  "/rotation",
  getRotationStateController
);

/**
 * GET /api/live-stream/rotation/due
 *
 * Determines whether the active stream is due
 * for rotation.
 */
router.get(
  "/rotation/due",
  getStreamDueForRotationController
);

/**
 * ============================================================
 * HEALTH MONITORING
 * ============================================================
 */

/**
 * GET /api/live-stream/health
 *
 * Checks the currently active stream.
 */
router.get(
  "/health",
  checkActiveStreamHealthController
);

/**
 * GET /api/live-stream/health/all
 *
 * Checks all registered Cloudinary streams.
 */
router.get(
  "/health/all",
  checkAllStreamHealthController
);

/**
 * ============================================================
 * ADMIN — STREAM QUERIES
 * ============================================================
 */

/**
 * GET /api/live-stream/admin/all
 *
 * Returns all streams in the rotation pool.
 */
router.get(
  "/admin/all",
  getAllLiveStreamsController
);

/**
 * GET /api/live-stream/admin/active
 *
 * Returns the stream currently marked as active.
 */
router.get(
  "/admin/active",
  getActiveLiveStreamController
);

/**
 * ============================================================
 * ADMIN — STREAM ACTIVATION
 * ============================================================
 */

/**
 * POST /api/live-stream/:streamId/activate
 *
 * Makes the specified stream the active website stream.
 *
 * IMPORTANT:
 * This does NOT start OBS or Cloudinary ingestion.
 * It only changes which stream the website uses.
 */
router.post(
  "/:streamId/activate",
  activateLiveStreamController
);

/**
 * POST /api/live-stream/:streamId/deactivate
 *
 * Removes the specified stream from the active position.
 */
router.post(
  "/:streamId/deactivate",
  deactivateLiveStreamController
);

/**
 * ============================================================
 * ADMIN — STREAM STATUS
 * ============================================================
 */

/**
 * POST /api/live-stream/:streamId/starting
 *
 * Marks a stream as starting.
 */
router.post(
  "/:streamId/starting",
  markStreamStartingController
);

/**
 * POST /api/live-stream/:streamId/live
 *
 * Marks a stream as live.
 */
router.post(
  "/:streamId/live",
  markStreamLiveController
);

/**
 * POST /api/live-stream/:streamId/transitioning
 *
 * Marks a stream as transitioning.
 */
router.post(
  "/:streamId/transitioning",
  markStreamTransitioningController
);

/**
 * POST /api/live-stream/:streamId/ended
 *
 * Marks a stream as ended.
 */
router.post(
  "/:streamId/ended",
  markStreamEndedController
);

/**
 * POST /api/live-stream/:streamId/error
 *
 * Marks a stream as having an error.
 *
 * Optional body:
 *
 * {
 *   "error": "Description of the error"
 * }
 */
router.post(
  "/:streamId/error",
  markStreamErrorController
);

/**
 * ============================================================
 * ADMIN — ROTATION MANAGEMENT
 * ============================================================
 */

/**
 * POST /api/live-stream/:streamId/prepare-rotation
 *
 * Prepares a stream for rotation.
 *
 * Optional body:
 *
 * {
 *   "rotationMinutes": 170
 * }
 */
router.post(
  "/:streamId/prepare-rotation",
  prepareStreamForRotationController
);

export default router;