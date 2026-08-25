import LiveStream, {
  ILiveStream,
} from "../models/LiveStream";

import {
  activateLiveStream,
  checkActiveStreamHealth,
  getActiveLiveStream,
  getNextLiveStream,
  markStreamEnded,
  markStreamError,
  markStreamLive,
  markStreamStarting,
  markStreamTransitioning,
  prepareStreamForRotation,
} from "./liveStreamService";

/**
 * ============================================================
 * STREAMING MANAGER
 * ============================================================
 *
 * Central orchestration service for the 12-stream Cloudinary
 * rotation system.
 *
 * IMPORTANT:
 *
 * This service does NOT transmit video.
 *
 * The RTMP encoder/process is responsible for sending the
 * actual video stream to Cloudinary.
 *
 * This manager is responsible for:
 *
 * 1. Selecting the active Cloudinary stream.
 * 2. Preparing the next stream.
 * 3. Tracking stream state.
 * 4. Monitoring stream health.
 * 5. Rotating before Cloudinary's 3-hour hard limit.
 * 6. Keeping MongoDB synchronized with the streaming state.
 *
 * Recommended rotation:
 *
 * Cloudinary maximum:
 *     180 minutes
 *
 * Application rotation:
 *     170 minutes
 *
 * Safety buffer:
 *     10 minutes
 *
 * ============================================================
 */

const TOTAL_STREAMS = 12;

/**
 * Cloudinary allows a maximum runtime of 180 minutes.
 *
 * We intentionally rotate at 170 minutes to avoid hitting the
 * hard Cloudinary runtime limit.
 */
const DEFAULT_ROTATION_MINUTES = 170;

/**
 * How frequently the manager checks the active stream.
 *
 * 30 seconds provides reasonably fast detection while avoiding
 * unnecessary database/API traffic.
 */
const HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * How frequently the manager checks whether rotation is due.
 *
 * We check every 30 seconds.
 */
const ROTATION_CHECK_INTERVAL_MS = 30_000;

/**
 * Time before expiry at which the next stream should be
 * prepared.
 *
 * Example:
 *
 * Active stream expires in 5 minutes.
 * Next stream can already be prepared.
 */
const PREPARE_NEXT_STREAM_BUFFER_MS =
  5 * 60 * 1000;

/**
 * Internal manager state.
 */
let managerStarted = false;

let healthCheckTimer:
  | NodeJS.Timeout
  | null = null;

let rotationTimer:
  | NodeJS.Timeout
  | null = null;

/**
 * Prevents two rotation operations from running
 * simultaneously.
 */
let rotationInProgress = false;

/**
 * Prevents two health checks from running simultaneously.
 */
let healthCheckInProgress = false;

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface StreamingManagerStatus {
  running: boolean;
  rotationInProgress: boolean;
  healthCheckInProgress: boolean;
  activeStream: {
    id: string;
    streamId: string;
    name: string;
    sequence: number;
    status: string;
    isActive: boolean;
    startedAt: Date | null | undefined;
    expiresAt: Date | null | undefined;
  } | null;
}

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Convert a MongoDB stream into a safe manager response.
 *
 * Never expose streamKey.
 */
function serializeStream(
  stream: ILiveStream | null
) {
  if (!stream) {
    return null;
  }

  return {
    id: stream._id.toString(),
    streamId: stream.streamId,
    name: stream.name,
    title: stream.title,
    sequence: stream.sequence,
    status: stream.status,
    isActive: stream.isActive,
    startedAt: stream.startedAt ?? null,
    expiresAt: stream.expiresAt ?? null,
    lastTransitionAt:
      stream.lastTransitionAt ?? null,
    usageCount: stream.usageCount,
    lastHealthCheckAt:
      stream.lastHealthCheckAt ?? null,
    lastError: stream.lastError ?? null,
  };
}

/**
 * Calculate how much time remains before a stream expires.
 */
function getTimeUntilExpiry(
  stream: ILiveStream
): number | null {
  if (!stream.expiresAt) {
    return null;
  }

  return (
    stream.expiresAt.getTime() -
    Date.now()
  );
}

/**
 * Determine whether a stream is due for rotation.
 */
function isRotationDue(
  stream: ILiveStream
): boolean {
  if (!stream.expiresAt) {
    return false;
  }

  return (
    stream.expiresAt.getTime() <=
    Date.now()
  );
}

/**
 * Determine whether we are close enough to expiry
 * to prepare the next stream.
 */
function shouldPrepareNextStream(
  stream: ILiveStream
): boolean {
  if (!stream.expiresAt) {
    return false;
  }

  const remaining =
    getTimeUntilExpiry(stream);

  if (remaining === null) {
    return false;
  }

  return (
    remaining <=
      PREPARE_NEXT_STREAM_BUFFER_MS &&
    remaining > 0
  );
}

/**
 * ============================================================
 * INITIALIZE STREAMING SYSTEM
 * ============================================================
 *
 * Called when the backend starts.
 *
 * The manager does NOT automatically start an RTMP encoder.
 *
 * It only restores/monitors the application's streaming state.
 */
export async function initializeStreamingManager() {
  if (managerStarted) {
    console.log(
      "[StreamingManager] Already running."
    );

    return;
  }

  console.log(
    "[StreamingManager] Initializing..."
  );

  const activeStream =
    await getActiveLiveStream();

  if (activeStream) {
    console.log(
      `[StreamingManager] Active stream: ${activeStream.name} (#${activeStream.sequence})`
    );

    if (
      activeStream.status === "live" ||
      activeStream.status ===
        "transitioning"
    ) {
      console.log(
        "[StreamingManager] Restored existing active stream."
      );
    }
  } else {
    console.log(
      "[StreamingManager] No active stream currently configured."
    );
  }

  managerStarted = true;

  startHealthMonitoring();

  startRotationMonitoring();

  console.log(
    "[StreamingManager] Started successfully."
  );
}

/**
 * ============================================================
 * SHUTDOWN
 * ============================================================
 *
 * Stops background monitoring.
 *
 * This does NOT terminate the Cloudinary stream.
 */
export function shutdownStreamingManager() {
  if (healthCheckTimer) {
    clearInterval(
      healthCheckTimer
    );

    healthCheckTimer = null;
  }

  if (rotationTimer) {
    clearInterval(
      rotationTimer
    );

    rotationTimer = null;
  }

  managerStarted = false;

  console.log(
    "[StreamingManager] Shut down."
  );
}

/**
 * ============================================================
 * HEALTH MONITORING
 * ============================================================
 */

function startHealthMonitoring() {
  if (healthCheckTimer) {
    return;
  }

  healthCheckTimer =
    setInterval(async () => {
      await runHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);

  /**
   * Perform an initial check immediately.
   */
  void runHealthCheck();
}

async function runHealthCheck() {
  if (healthCheckInProgress) {
    return;
  }

  healthCheckInProgress = true;

  try {
    const stream =
      await checkActiveStreamHealth();

    if (!stream) {
      return;
    }

    console.log(
      `[StreamingManager] Health: ${stream.name} -> ${stream.status}`
    );

    /**
     * If the active stream has unexpectedly ended,
     * immediately begin recovery.
     */
    if (
      stream.isActive &&
      (
        stream.status === "ended" ||
        stream.status === "error"
      )
    ) {
      console.warn(
        `[StreamingManager] Active stream ${stream.streamId} is ${stream.status}.`
      );

      await recoverFromStreamFailure(
        stream
      );
    }
  } catch (error) {
    console.error(
      "[StreamingManager] Health check failed:",
      error
    );
  } finally {
    healthCheckInProgress = false;
  }
}

/**
 * ============================================================
 * ROTATION MONITORING
 * ============================================================
 */

function startRotationMonitoring() {
  if (rotationTimer) {
    return;
  }

  rotationTimer =
    setInterval(async () => {
      await runRotationCheck();
    }, ROTATION_CHECK_INTERVAL_MS);

  /**
   * Check immediately.
   */
  void runRotationCheck();
}

async function runRotationCheck() {
  if (rotationInProgress) {
    return;
  }

  try {
    const activeStream =
      await getActiveLiveStream();

    if (!activeStream) {
      return;
    }

    /**
     * If there is no expiry configured,
     * establish one.
     */
    if (
      activeStream.status === "live" &&
      !activeStream.expiresAt
    ) {
      await prepareStreamForRotation(
        activeStream.streamId,
        DEFAULT_ROTATION_MINUTES
      );

      return;
    }

    /**
     * Prepare the next stream shortly before
     * the current stream expires.
     */
    if (
      shouldPrepareNextStream(
        activeStream
      )
    ) {
      await prepareNextStream(
        activeStream
      );
    }

    /**
     * Perform rotation once expiry is reached.
     */
    if (
      isRotationDue(activeStream)
    ) {
      await rotateToNextStream(
        activeStream
      );
    }
  } catch (error) {
    console.error(
      "[StreamingManager] Rotation check failed:",
      error
    );
  }
}

/**
 * ============================================================
 * PREPARE NEXT STREAM
 * ============================================================
 *
 * This does NOT activate the next stream.
 *
 * It simply verifies that the next stream exists and prepares
 * the application state for the upcoming handoff.
 */
async function prepareNextStream(
  currentStream: ILiveStream
) {
  const nextStream =
    await getNextLiveStream(
      currentStream.sequence
    );

  if (!nextStream) {
    console.error(
      `[StreamingManager] No next stream found after sequence ${currentStream.sequence}.`
    );

    return;
  }

  if (
    nextStream.status === "error"
  ) {
    console.warn(
      `[StreamingManager] Next stream ${nextStream.streamId} is currently in error state.`
    );

    return;
  }

  console.log(
    `[StreamingManager] Next stream prepared: ${nextStream.name} (#${nextStream.sequence})`
  );

  /**
   * We deliberately do not mark it active yet.
   *
   * The current stream remains the public stream until the
   * actual handoff.
   */
}

/**
 * ============================================================
 * ROTATE TO NEXT STREAM
 * ============================================================
 *
 * This is the core 3-hour rollover operation.
 *
 * IMPORTANT:
 *
 * The website should switch its HLS source to the next stream.
 *
 * The RTMP encoder must also switch its output to the next
 * Cloudinary RTMP endpoint.
 */
export async function rotateToNextStream(
  currentStream?: ILiveStream
) {
  if (rotationInProgress) {
    console.warn(
      "[StreamingManager] Rotation already in progress."
    );

    return null;
  }

  rotationInProgress = true;

  try {
    const current =
      currentStream ??
      (await getActiveLiveStream());

    if (!current) {
      throw new Error(
        "Cannot rotate because there is no active stream."
      );
    }

    console.log(
      `[StreamingManager] Rotating from ${current.name} (#${current.sequence})`
    );

    /**
     * Mark current stream as transitioning.
     */
    await markStreamTransitioning(
      current.streamId
    );

    /**
     * Find the next stream.
     *
     * 12 → 1
     */
    const next =
      await getNextLiveStream(
        current.sequence
      );

    if (!next) {
      throw new Error(
        `No next stream exists after sequence ${current.sequence}.`
      );
    }

    /**
     * Mark next stream as starting.
     */
    await markStreamStarting(
      next.streamId
    );

    /**
     * ========================================================
     * IMPORTANT ARCHITECTURE POINT
     * ========================================================
     *
     * At this point the actual RTMP encoder/process should
     * switch its destination from:
     *
     *     current.rtmpUrl + current.streamKey
     *
     * to:
     *
     *     next.rtmpUrl + next.streamKey
     *
     * The StreamingManager itself does NOT contain the video
     * transport layer.
     *
     * Once the encoder confirms that the new stream is
     * receiving video, the stream can be activated.
     *
     * For now, we activate the application state here.
     */
    const activated =
      await activateLiveStream(
        next.streamId
      );

    await markStreamLive(
      next.streamId
    );

    /**
     * End the previous stream in our application state.
     */
    await markStreamEnded(
      current.streamId
    );

    /**
     * Establish the expiry window for the new stream.
     */
    const prepared =
      await prepareStreamForRotation(
        next.streamId,
        DEFAULT_ROTATION_MINUTES
      );

    console.log(
      `[StreamingManager] Rotation completed: ${current.name} → ${next.name}`
    );

    return prepared;
  } catch (error) {
    console.error(
      "[StreamingManager] Stream rotation failed:",
      error
    );

    /**
     * If rotation fails, record the failure against the
     * current stream rather than silently losing state.
     */
    if (currentStream) {
      await markStreamError(
        currentStream.streamId,
        error
      );
    }

    throw error;
  } finally {
    rotationInProgress = false;
  }
}

/**
 * ============================================================
 * STREAM FAILURE RECOVERY
 * ============================================================
 */

async function recoverFromStreamFailure(
  failedStream: ILiveStream
) {
  if (rotationInProgress) {
    return;
  }

  console.warn(
    `[StreamingManager] Attempting recovery from ${failedStream.name}.`
  );

  try {
    await rotateToNextStream(
      failedStream
    );
  } catch (error) {
    console.error(
      "[StreamingManager] Recovery failed:",
      error
    );
  }
}

/**
 * ============================================================
 * MANUAL ROTATION
 * ============================================================
 *
 * Useful for:
 *
 * - Admin dashboard
 * - Testing
 * - Emergency stream switching
 * - Event-day operations
 */
export async function forceStreamRotation() {
  const activeStream =
    await getActiveLiveStream();

  if (!activeStream) {
    throw new Error(
      "There is no active stream to rotate."
    );
  }

  return rotateToNextStream(
    activeStream
  );
}

/**
 * ============================================================
 * ACTIVATE FIRST STREAM
 * ============================================================
 *
 * Used when the streaming system has never been started.
 *
 * Sequence 1 becomes the initial public stream.
 */
export async function activateInitialStream() {
  const activeStream =
    await getActiveLiveStream();

  if (activeStream) {
    return activeStream;
  }

  const firstStream =
    await LiveStream.findOne({
      sequence: 1,
    });

  if (!firstStream) {
    throw new Error(
      "Stream sequence 1 does not exist."
    );
  }

  await markStreamStarting(
    firstStream.streamId
  );

  const activated =
    await activateLiveStream(
      firstStream.streamId
    );

  await markStreamLive(
    firstStream.streamId
  );

  const prepared =
    await prepareStreamForRotation(
      firstStream.streamId,
      DEFAULT_ROTATION_MINUTES
    );

  console.log(
    `[StreamingManager] Initial stream activated: ${prepared.name}`
  );

  return activated;
}

/**
 * ============================================================
 * GET MANAGER STATUS
 * ============================================================
 */

export async function getStreamingManagerStatus(): Promise<
  StreamingManagerStatus
> {
  const activeStream =
    await getActiveLiveStream();

  return {
    running: managerStarted,
    rotationInProgress,
    healthCheckInProgress,

    activeStream:
      activeStream
        ? {
            id: activeStream._id.toString(),
            streamId:
              activeStream.streamId,
            name: activeStream.name,
            sequence:
              activeStream.sequence,
            status:
              activeStream.status,
            isActive:
              activeStream.isActive,
            startedAt:
              activeStream.startedAt,
            expiresAt:
              activeStream.expiresAt,
          }
        : null,
  };
}

/**
 * ============================================================
 * GET CURRENT STREAM
 * ============================================================
 */

export async function getCurrentStreamingState() {
  const activeStream =
    await getActiveLiveStream();

  if (!activeStream) {
    return {
      isLive: false,
      stream: null,
      nextStream: null,
      rotationDue: false,
    };
  }

  const nextStream =
    await getNextLiveStream(
      activeStream.sequence
    );

  return {
    isLive:
      activeStream.status === "live" ||
      activeStream.status ===
        "transitioning",

    stream:
      serializeStream(
        activeStream
      ),

    nextStream:
      serializeStream(
        nextStream
      ),

    rotationDue:
      isRotationDue(
        activeStream
      ),

    timeUntilExpiry:
      getTimeUntilExpiry(
        activeStream
      ),
  };
}

/**
 ============================================================
 * VERIFY STREAM POOL
 * ============================================================
 *
 * Ensures that the expected 12 streams exist.
 *
 * This does not create missing streams.
 * The provisioning service is responsible for creation.
 */
export async function verifyStreamPool() {
  const streams =
    await LiveStream.find()
      .sort({ sequence: 1 })
      .select(
        "name title streamId sequence status isActive expiresAt"
      );

  const sequences =
    streams.map(
      (stream) =>
        stream.sequence
    );

  const missingSequences: number[] =
    [];

  for (
    let sequence = 1;
    sequence <= TOTAL_STREAMS;
    sequence++
  ) {
    if (
      !sequences.includes(
        sequence
      )
    ) {
      missingSequences.push(
        sequence
      );
    }
  }

  return {
    valid:
      streams.length ===
        TOTAL_STREAMS &&
      missingSequences.length === 0,

    total:
      streams.length,

    expected:
      TOTAL_STREAMS,

    missingSequences,

    streams,
  };
}