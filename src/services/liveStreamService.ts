import LiveStream, {
  type ILiveStream,
  type LiveStreamStatus,
} from "../models/LiveStream.js";

/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

export const MAX_STREAMS = 12;

/**
 * Cloudinary's theoretical maximum runtime.
 *
 * The application intentionally rotates before this limit.
 */
export const MAX_RUNTIME_MINUTES = 180;

/**
 * Application-level rotation interval.
 *
 * 170 minutes = 2 hours 50 minutes.
 *
 * This provides approximately 10 minutes of safety
 * before the 180-minute Cloudinary runtime limit.
 */
export const DEFAULT_ROTATION_MINUTES = 170;

/**
 * Default title used when a stream does not have
 * a custom title.
 */
export const DEFAULT_STREAM_TITLE =
  "24 Hours ZP Celebration";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface CloudinaryLiveStream {
  id: string;

  name?: string;

  status?: string;

  stream_key?: string;

  rtmp_url?: string;

  hls_url?: string;

  public_id?: string;

  created_at?: string;

  updated_at?: string;
}

export interface CreateLiveStreamInput {
  name: string;

  title?: string;

  sequence: number;
}

export interface LiveStreamPublicData {
  id: string;

  name: string;

  title: string;

  streamId: string;

  rtmpUrl: string;

  hlsUrl: string;

  publicId: string;

  playbackId: string | null;

  sequence: number;

  status: LiveStreamStatus;

  isActive: boolean;

  startedAt: Date | null;

  expiresAt: Date | null;

  lastTransitionAt: Date | null;

  usageCount: number;

  lastHealthCheckAt: Date | null;

  lastError: string | null;
}

/**
 * ============================================================
 * CLOUDINARY CONFIGURATION
 * ============================================================
 */

const CLOUDINARY_API_BASE =
  "https://api.cloudinary.com/v2/video";

/**
 * ============================================================
 * CLOUDINARY AUTHENTICATION
 * ============================================================
 */

/**
 * Return the configured Cloudinary cloud name.
 */
function getCloudinaryCloudName(): string {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME is not configured."
    );
  }

  return cloudName;
}

/**
 * Build the Cloudinary Admin API URL.
 */
function getCloudinaryApiUrl(
  path: string
): string {
  const cloudName =
    getCloudinaryCloudName();

  return `${CLOUDINARY_API_BASE}/${cloudName}${path}`;
}

/**
 * Build the HTTP Basic authentication header
 * required by the Cloudinary Admin API.
 */
function getCloudinaryAuthHeader(): string {
  const apiKey =
    process.env.CLOUDINARY_API_KEY;

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary API credentials are not configured."
    );
  }

  const credentials =
    Buffer.from(
      `${apiKey}:${apiSecret}`
    ).toString("base64");

  return `Basic ${credentials}`;
}

/**
 * ============================================================
 * CLOUDINARY REQUEST HELPER
 * ============================================================
 */

/**
 * Generic Cloudinary Admin API request.
 */
async function cloudinaryRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response =
    await fetch(
      getCloudinaryApiUrl(path),
      {
        ...options,

        headers: {
          Authorization:
            getCloudinaryAuthHeader(),

          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          ...(options.headers ?? {}),
        },
      }
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Cloudinary API request failed (${response.status}): ${body}`
    );
  }

  return (await response.json()) as T;
}

/**
 * ============================================================
 * STATUS NORMALIZATION
 * ============================================================
 *
 * Cloudinary status values are normalized into the
 * application's LiveStreamStatus values.
 */
export function normalizeStatus(
  status?: string
): LiveStreamStatus {
  const normalized =
    status
      ?.trim()
      .toLowerCase();

  switch (normalized) {
    case "live":
    case "streaming":
    case "active":
      return "live";

    case "starting":
    case "connecting":
    case "initializing":
      return "starting";

    case "transitioning":
      return "transitioning";

    case "error":
    case "failed":
    case "failure":
      return "error";

    case "ended":
    case "stopped":
    case "terminated":
      return "ended";

    case "idle":
    case "offline":
    case "disconnected":
    case undefined:
      return "idle";

    default:
      return "idle";
  }
}

/**
 * Backwards-compatible name.
 *
 * streamRotationService.ts uses normalizeCloudinaryStatus().
 */
export const normalizeCloudinaryStatus =
  normalizeStatus;

/**
 * ============================================================
 * CLOUDINARY STREAM API
 * ============================================================
 */

/**
 * Fetch every live stream registered in Cloudinary.
 */
export async function fetchCloudinaryStreams(): Promise<
  CloudinaryLiveStream[]
> {
  const data =
    await cloudinaryRequest<
      | CloudinaryLiveStream[]
      | {
          live_streams?: CloudinaryLiveStream[];
        }
    >(
      "/live_streams"
    );

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data.live_streams ??
    []
  );
}

/**
 * Fetch one Cloudinary live stream.
 *
 * Cloudinary's API response is resolved by searching
 * the registered live-stream collection.
 */
export async function fetchCloudinaryStream(
  streamId: string
): Promise<CloudinaryLiveStream> {
  if (!streamId?.trim()) {
    throw new Error(
      "Cloudinary stream ID is required."
    );
  }

  const streams =
    await fetchCloudinaryStreams();

  const stream =
    streams.find(
      (item) =>
        item.id === streamId
    );

  if (!stream) {
    throw new Error(
      `Cloudinary live stream "${streamId}" was not found.`
    );
  }

  return stream;
}

/**
 * Alias retained for compatibility with older callers.
 */
export const getCloudinaryLiveStream =
  fetchCloudinaryStream;

/**
 * ============================================================
 * PUBLIC DATA TRANSFORMATION
 * ============================================================
 *
 * IMPORTANT:
 *
 * streamKey is intentionally never returned.
 */
export function toPublicStream(
  stream: ILiveStream
): LiveStreamPublicData {
  return {
    id:
      stream._id.toString(),

    name:
      stream.name,

    title:
      stream.title,

    streamId:
      stream.streamId,

    rtmpUrl:
      stream.rtmpUrl,

    hlsUrl:
      stream.hlsUrl,

    publicId:
      stream.publicId,

    playbackId:
      stream.playbackId ??
      null,

    sequence:
      stream.sequence,

    status:
      stream.status,

    isActive:
      stream.isActive,

    startedAt:
      stream.startedAt ??
      null,

    expiresAt:
      stream.expiresAt ??
      null,

    lastTransitionAt:
      stream.lastTransitionAt ??
      null,

    usageCount:
      stream.usageCount,

    lastHealthCheckAt:
      stream.lastHealthCheckAt ??
      null,

    lastError:
      stream.lastError ??
      null,
  };
}

/**
 * ============================================================
 * DATABASE QUERIES
 * ============================================================
 */

/**
 * Get all streams in rotation order.
 */
export async function getAllLiveStreams(): Promise<
  ILiveStream[]
> {
  return LiveStream.find()
    .sort({
      sequence: 1,
    })
    .exec();
}

/**
 * Get a stream by its rotation sequence.
 */
export async function getLiveStreamBySequence(
  sequence: number
): Promise<ILiveStream | null> {
  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    return null;
  }

  return LiveStream.findOne({
    sequence,
  }).exec();
}

/**
 * Get the stream currently selected by the website.
 */
export async function getActiveLiveStream(): Promise<
  ILiveStream | null
> {
  return LiveStream.findOne({
    isActive: true,
  }).exec();
}

/**
 * Get the next stream in the rotation.
 *
 * 1 → 2
 * 2 → 3
 * ...
 * 11 → 12
 * 12 → 1
 */
export async function getNextLiveStream(
  currentSequence: number
): Promise<ILiveStream | null> {
  if (
    !Number.isInteger(currentSequence) ||
    currentSequence < 1 ||
    currentSequence > MAX_STREAMS
  ) {
    return null;
  }

  const nextSequence =
    currentSequence >= MAX_STREAMS
      ? 1
      : currentSequence + 1;

  return LiveStream.findOne({
    sequence:
      nextSequence,
  }).exec();
}

/**
 * Get the first usable stream after the current sequence.
 *
 * This is useful when the normal next stream is unavailable.
 */
export async function getNextAvailableLiveStream(
  currentSequence: number
): Promise<ILiveStream | null> {
  const streams =
    await LiveStream.find({
      status: {
        $in: [
          "idle",
          "ended",
        ],
      },
    })
      .sort({
        sequence: 1,
      })
      .exec();

  if (
    streams.length === 0
  ) {
    return null;
  }

  const afterCurrent =
    streams.find(
      (stream) =>
        stream.sequence >
        currentSequence
    );

  return (
    afterCurrent ??
    streams[0]
  );
}

/**
 * ============================================================
 * STREAM ACTIVATION
 * ============================================================
 *
 * This changes the stream used by the website.
 *
 * It does NOT switch OBS.
 * It does NOT modify the Cloudinary stream key.
 */
export async function activateLiveStream(
  streamId: string
): Promise<ILiveStream> {
  const stream =
    await LiveStream.findOne({
      streamId,
    }).exec();

  if (!stream) {
    throw new Error(
      `Live stream "${streamId}" does not exist in MongoDB.`
    );
  }

  const wasAlreadyActive =
    stream.isActive;

  /**
   * Only one stream may be active.
   */
  await LiveStream.updateMany(
    {
      _id: {
        $ne:
          stream._id,
      },
    },
    {
      $set: {
        isActive:
          false,
      },
    }
  ).exec();

  const now =
    new Date();

  /**
   * If this is a genuine activation, establish a
   * new application-level runtime window.
   */
  if (!wasAlreadyActive) {
    stream.startedAt =
      now;

    stream.expiresAt =
      calculateStreamExpiry(
        now
      );

    stream.usageCount +=
      1;
  }

  stream.isActive =
    true;

  stream.status =
    "live";

  stream.lastTransitionAt =
    now;

  stream.lastHealthCheckAt =
    now;

  stream.lastError =
    null;

  await stream.save();

  return stream;
}

/**
 * ============================================================
 * STREAM DEACTIVATION
 * ============================================================
 */

export async function deactivateLiveStream(
  streamId: string,
  status: LiveStreamStatus =
    "ended"
): Promise<ILiveStream | null> {
  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        isActive:
          false,

        status,

        lastTransitionAt:
          new Date(),

        ...(status === "ended"
          ? {
              expiresAt:
                null,
            }
          : {}),
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * ============================================================
 * STREAM STATE MANAGEMENT
 * ============================================================
 */

/**
 * Mark a stream as starting.
 */
export async function markStreamStarting(
  streamId: string
): Promise<ILiveStream | null> {
  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        status:
          "starting",

        lastError:
          null,

        lastTransitionAt:
          new Date(),
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * Mark a stream as live.
 *
 * This establishes the beginning of the current
 * application-level runtime.
 */
export async function markStreamLive(
  streamId: string
): Promise<ILiveStream | null> {
  const startedAt =
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      startedAt
    );

  /**
   * Ensure only this stream is active.
   */
  await LiveStream.updateMany(
    {
      streamId: {
        $ne:
          streamId,
      },
    },
    {
      $set: {
        isActive:
          false,
      },
    }
  ).exec();

  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        status:
          "live",

        isActive:
          true,

        startedAt,

        expiresAt,

        lastError:
          null,

        lastTransitionAt:
          startedAt,

        lastHealthCheckAt:
          startedAt,
      },

      $inc: {
        usageCount:
          1,
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * Mark a stream as transitioning.
 */
export async function markStreamTransitioning(
  streamId: string
): Promise<ILiveStream | null> {
  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        status:
          "transitioning",

        lastTransitionAt:
          new Date(),
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * Mark a stream as ended.
 */
export async function markStreamEnded(
  streamId: string
): Promise<ILiveStream | null> {
  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        status:
          "ended",

        isActive:
          false,

        expiresAt:
          null,

        lastTransitionAt:
          new Date(),
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * Mark a stream as having encountered an error.
 */
export async function markStreamError(
  streamId: string,
  error: unknown
): Promise<ILiveStream | null> {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  return LiveStream.findOneAndUpdate(
    {
      streamId,
    },
    {
      $set: {
        status:
          "error",

        isActive:
          false,

        lastError:
          message,

        lastTransitionAt:
          new Date(),
      },
    },
    {
      new: true,
    }
  ).exec();
}

/**
 * ============================================================
 * HEALTH MONITORING
 * ============================================================
 */

/**
 * Synchronize one MongoDB stream with Cloudinary.
 */
export async function syncStreamHealth(
  streamId: string
): Promise<ILiveStream> {
  const cloudinaryStream =
    await fetchCloudinaryStream(
      streamId
    );

  const normalizedStatus =
    normalizeCloudinaryStatus(
      cloudinaryStream.status
    );

  const updatedStream =
    await LiveStream.findOneAndUpdate(
      {
        streamId,
      },
      {
        $set: {
          status:
            normalizedStatus,

          lastHealthCheckAt:
            new Date(),

          ...(normalizedStatus ===
          "live"
            ? {
                lastError:
                  null,
              }
            : {}),

          ...(normalizedStatus ===
          "error"
            ? {
                lastError:
                  "Cloudinary reported a stream error.",
              }
            : {}),
        },
      },
      {
        new: true,
      }
    ).exec();

  if (!updatedStream) {
    throw new Error(
      `Stream "${streamId}" does not exist in MongoDB.`
    );
  }

  return updatedStream;
}

/**
 * Check the currently active stream.
 */
export async function checkActiveStreamHealth(): Promise<
  ILiveStream | null
> {
  const activeStream =
    await getActiveLiveStream();

  if (!activeStream) {
    return null;
  }

  return syncStreamHealth(
    activeStream.streamId
  );
}

/**
 * Check every stream in the pool.
 */
export async function checkAllStreamHealth(): Promise<
  Array<
    | {
        success: true;
        stream: ILiveStream;
      }
    | {
        success: false;
        streamId: string;
        error: string;
      }
  >
> {
  const streams =
    await getAllLiveStreams();

  const results: Array<
    | {
        success: true;
        stream: ILiveStream;
      }
    | {
        success: false;
        streamId: string;
        error: string;
      }
  > = [];

  for (const stream of streams) {
    try {
      const updated =
        await syncStreamHealth(
          stream.streamId
        );

      results.push({
        success:
          true,

        stream:
          updated,
      });
    } catch (error) {
      results.push({
        success:
          false,

        streamId:
          stream.streamId,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  return results;
}

/**
 * ============================================================
 * ROTATION TIMING
 * ============================================================
 */

/**
 * Get the configured rotation interval.
 *
 * STREAM_ROTATION_MINUTES may be configured through
 * the environment, but it must always remain below
 * Cloudinary's 180-minute maximum.
 */
export function getRotationMinutes(): number {
  const configured =
    Number(
      process.env
        .STREAM_ROTATION_MINUTES
    );

  if (
    Number.isFinite(
      configured
    ) &&
    configured > 0 &&
    configured <
      MAX_RUNTIME_MINUTES
  ) {
    return configured;
  }

  return DEFAULT_ROTATION_MINUTES;
}

/**
 * Calculate the planned application-level stream expiry.
 */
export function calculateStreamExpiry(
  startedAt: Date,
  rotationMinutes =
    getRotationMinutes()
): Date {
  if (
    !(startedAt instanceof Date) ||
    Number.isNaN(
      startedAt.getTime()
    )
  ) {
    throw new Error(
      "A valid stream start time is required."
    );
  }

  if (
    rotationMinutes <= 0 ||
    rotationMinutes >=
      MAX_RUNTIME_MINUTES
  ) {
    throw new Error(
      `Rotation time must be greater than 0 and less than ${MAX_RUNTIME_MINUTES} minutes.`
    );
  }

  return new Date(
    startedAt.getTime() +
      rotationMinutes *
        60 *
        1000
  );
}

/**
 * ============================================================
 * PREPARE STREAM FOR ROTATION
 * ============================================================
 *
 * This only updates MongoDB.
 *
 * It does NOT switch OBS.
 */
export async function prepareStreamForRotation(
  streamId: string,
  rotationMinutes =
    getRotationMinutes()
): Promise<ILiveStream> {
  const stream =
    await LiveStream.findOne({
      streamId,
    }).exec();

  if (!stream) {
    throw new Error(
      `Stream "${streamId}" does not exist.`
    );
  }

  const startedAt =
    stream.startedAt ??
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      startedAt,
      rotationMinutes
    );

  stream.expiresAt =
    expiresAt;

  stream.status =
    "transitioning";

  stream.lastTransitionAt =
    new Date();

  await stream.save();

  return stream;
}

/**
 * ============================================================
 * ROTATION HELPERS
 * ============================================================
 */

/**
 * Determine whether a stream is due for rotation.
 */
export function isStreamDueForRotation(
  stream: ILiveStream,
  now = new Date()
): boolean {
  if (!stream.expiresAt) {
    return false;
  }

  return (
    stream.expiresAt.getTime() <=
    now.getTime()
  );
}

/**
 * Get the active stream if it is due for rotation.
 */
export async function getStreamDueForRotation(): Promise<
  ILiveStream | null
> {
  const activeStream =
    await getActiveLiveStream();

  if (!activeStream) {
    return null;
  }

  if (
    !isStreamDueForRotation(
      activeStream
    )
  ) {
    return null;
  }

  return activeStream;
}

/**
 * ============================================================
 * PUBLIC STREAM API
 * ============================================================
 */

/**
 * Return the active stream that the public website
 * should play.
 *
 * The stream key is NEVER returned.
 */
export async function getPublicLiveStream(): Promise<{
  isLive: boolean;
  stream: LiveStreamPublicData | null;
}> {
  const stream =
    await getActiveLiveStream();

  if (!stream) {
    return {
      isLive:
        false,

      stream:
        null,
    };
  }

  const isLive =
    stream.status ===
      "live" ||
    stream.status ===
      "transitioning";

  return {
    isLive,

    stream:
      toPublicStream(
        stream
      ),
  };
}

/**
 * Return the complete public 12-stream pool.
 *
 * Private stream credentials are excluded.
 */
export async function getPublicStreamPool(): Promise<
  LiveStreamPublicData[]
> {
  const streams =
    await getAllLiveStreams();

  return streams.map(
    toPublicStream
  );
}

/**
 * ============================================================
 * ROTATION STATE
 * ============================================================
 */

/**
 * Get all information required by the rotation
 * worker/admin dashboard.
 */
export async function getRotationState(): Promise<{
  activeStream:
    | LiveStreamPublicData
    | null;

  nextStream:
    | LiveStreamPublicData
    | null;

  rotationDue: boolean;
}> {
  const activeStream =
    await getActiveLiveStream();

  if (!activeStream) {
    return {
      activeStream:
        null,

      nextStream:
        null,

      rotationDue:
        false,
    };
  }

  const nextStream =
    await getNextLiveStream(
      activeStream.sequence
    );

  return {
    activeStream:
      toPublicStream(
        activeStream
      ),

    nextStream:
      nextStream
        ? toPublicStream(
            nextStream
          )
        : null,

    rotationDue:
      isStreamDueForRotation(
        activeStream
      ),
  };
}

