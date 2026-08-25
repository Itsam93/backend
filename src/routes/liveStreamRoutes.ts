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
 * PUBLIC ROUTES
 * ============================================================
 */

/**
 * GET /api/live-stream
 *
 * Returns the stream currently selected for playback
 * by the public website.
 */
router.get(
  "/",
  getPublicLiveStreamController
);

/**
 * GET /api/live-stream/pool
 *
 * Returns the public representation of all 12
 * Cloudinary streams.
 */
router.get(
  "/pool",
  getPublicStreamPoolController
);

/**
 * GET /api/live-stream/sequence/:sequence
 *
 * Get a stream by its rotation sequence.
 */
router.get(
  "/sequence/:sequence",
  getLiveStreamBySequenceController
);

/**
 * GET /api/live-stream/next/:sequence
 *
 * Get the next stream in the rotation pool.
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
 * - current active stream
 * - next stream
 * - rotation information
 */
router.get(
  "/rotation",
  getRotationStateController
);

/**
 * GET /api/live-stream/rotation/due
 *
 * Determines whether the current stream is due
 * for rotation.
 */
router.get(
  "/rotation/due",
  getStreamDueForRotationController
);

/**
 * ============================================================
 * ADMIN / OPERATIONS
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
 * STREAM ACTIVATION
 * ============================================================
 */

/**
 * POST /api/live-stream/:streamId/activate
 *
 * Marks a Cloudinary stream as the stream currently
 * used by the website.
 */
router.post(
  "/:streamId/activate",
  activateLiveStreamController
);

/**
 * POST /api/live-stream/:streamId/deactivate
 *
 * Removes a stream from the active website position.
 */
router.post(
  "/:streamId/deactivate",
  deactivateLiveStreamController
);

/**
 * ============================================================
 * STREAM STATUS
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
 * Marks a stream as failed.
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
 * Checks all Cloudinary streams.
 */
router.get(
  "/health/all",
  checkAllStreamHealthController
);

/**
 * ============================================================
 * ROTATION MANAGEMENT
 * ============================================================
 */

/**
 * POST /api/live-stream/:streamId/prepare-rotation
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
