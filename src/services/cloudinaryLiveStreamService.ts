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

export const MAX_RUNTIME_MINUTES = 180;

export const DEFAULT_ROTATION_MINUTES = 170;

const DEFAULT_TITLE =
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

export interface LiveStreamPublicData {
  id: string;
  name: string;
  title: string;
  streamId: string;
  hlsUrl: string;
  publicId: string;
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

export interface CloudinaryStreamStatus {
  streamId: string;
  status: LiveStreamStatus;
  rawStatus: string | null;
  name: string | null;
  publicId: string | null;
  hlsUrl: string | null;
}

/**
 * ============================================================
 * CLOUDINARY API CONFIGURATION
 * ============================================================
 */

const CLOUDINARY_API_BASE =
  "https://api.cloudinary.com/v1_1";

/**
 * ============================================================
 * CLOUDINARY API HELPERS
 * ============================================================
 */

/**
 * Return the configured Cloudinary cloud name.
 */
function getCloudName(): string {
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
 * Build a Cloudinary Admin API URL.
 */
function getCloudinaryApiUrl(
  path: string
): string {
  const cloudName =
    getCloudName();

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
 * Generic Cloudinary Admin API request helper.
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
 * Cloudinary status values are normalized into the application's
 * internal LiveStreamStatus values.
 *
 * This function is exported because streamRotationService.ts
 * depends on it.
 */
export function normalizeCloudinaryStatus(
  status?: string | null
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
    case null:
    case "":
      return "idle";

    default:
      return "idle";
  }
}

/**
 ============================================================
 * CLOUDINARY STREAM LIST
 * ============================================================
 */

/**
 * Fetch all live streams registered in Cloudinary.
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
 * ============================================================
 * GET ONE CLOUDINARY STREAM
 * ============================================================
 */

/**
 * Fetch one Cloudinary live stream by Cloudinary stream ID.
 */
export async function getCloudinaryLiveStream(
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
        item.id ===
        streamId
    );

  if (!stream) {
    throw new Error(
      `Cloudinary live stream "${streamId}" was not found.`
    );
  }

  return stream;
}

/**
 * Backwards-compatible alias.
 *
 * streamRotationService.ts uses fetchCloudinaryStream().
 */
export const fetchCloudinaryStream =
  getCloudinaryLiveStream;

/**
 * ============================================================
 * PUBLIC STREAM TRANSFORMATION
 * ============================================================
 *
 * IMPORTANT:
 *
 * streamKey and rtmpUrl are deliberately excluded.
 *
 * Only safe playback/application information should ever
 * reach the frontend.
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

    hlsUrl:
      stream.hlsUrl,

    publicId:
      stream.publicId,

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
 * CREATE CLOUDINARY LIVE STREAM
 * ============================================================
 */

/**
 * Create a new live stream inside Cloudinary.
 */
async function createCloudinaryStream(
  name: string
): Promise<CloudinaryLiveStream> {
  if (!name.trim()) {
    throw new Error(
      "Cloudinary live stream name is required."
    );
  }

  return cloudinaryRequest<CloudinaryLiveStream>(
    "/live_streams",
    {
      method:
        "POST",

      body:
        JSON.stringify({
          name,

          resource_type:
            "video",

          type:
            "upload",
        }),
    }
  );
}

/**
 * ============================================================
 * PROVISION ONE STREAM
 * ============================================================
 *
 * Creates one Cloudinary stream and registers it in MongoDB.
 *
 * If the sequence already exists in MongoDB, that stream is
 * returned instead of creating another Cloudinary stream.
 */
export async function provisionCloudinaryStream(
  sequence: number
): Promise<ILiveStream> {
  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    throw new Error(
      `Sequence must be an integer between 1 and ${MAX_STREAMS}.`
    );
  }

  const existing =
    await LiveStream.findOne({
      sequence,
    }).exec();

  if (existing) {
    return existing;
  }

  const name =
    `ZP Celebration Stream ${sequence}`;

  const cloudinaryStream =
    await createCloudinaryStream(
      name
    );

  if (
    !cloudinaryStream.id ||
    !cloudinaryStream.stream_key ||
    !cloudinaryStream.rtmp_url ||
    !cloudinaryStream.hls_url ||
    !cloudinaryStream.public_id
  ) {
    throw new Error(
      `Cloudinary returned incomplete information while creating stream ${sequence}.`
    );
  }

  const stream =
    await LiveStream.create({
      name,

      title:
        DEFAULT_TITLE,

      streamId:
        cloudinaryStream.id,

      streamKey:
        cloudinaryStream.stream_key,

      rtmpUrl:
        cloudinaryStream.rtmp_url,

      hlsUrl:
        cloudinaryStream.hls_url,

      publicId:
        cloudinaryStream.public_id,

      sequence,

      status:
        "idle",

      isActive:
        false,

      usageCount:
        0,

      startedAt:
        null,

      expiresAt:
        null,

      lastTransitionAt:
        null,

      lastHealthCheckAt:
        null,

      lastError:
        null,
    });

  return stream;
}

/**
 * ============================================================
 * PROVISION COMPLETE STREAM POOL
 * ============================================================
 */

/**
 * Ensure all 12 Cloudinary streams exist locally.
 *
 * Existing streams are reused.
 */
export async function provisionAllCloudinaryStreams(): Promise<{
  streams: ILiveStream[];
  count: number;
}> {
  const streams: ILiveStream[] =
    [];

  for (
    let sequence = 1;
    sequence <= MAX_STREAMS;
    sequence += 1
  ) {
    const stream =
      await provisionCloudinaryStream(
        sequence
      );

    streams.push(
      stream
    );
  }

  return {
    streams,

    count:
      streams.length,
  };
}

/**
 * ============================================================
 * SYNCHRONIZE CLOUDINARY → MONGODB
 * ============================================================
 */

export async function syncAllCloudinaryStreams() {
  const cloudinaryStreams =
    await fetchCloudinaryStreams();

  const results: Array<{
    success: boolean;
    streamId: string;
    sequence?: number;
    status?: LiveStreamStatus;
    message?: string;
  }> = [];

  for (
    const cloudinaryStream
    of cloudinaryStreams
  ) {
    const existing =
      await LiveStream.findOne({
        streamId:
          cloudinaryStream.id,
      }).exec();

    if (!existing) {
      results.push({
        success:
          false,

        streamId:
          cloudinaryStream.id,

        message:
          "Cloudinary stream exists but is not registered in MongoDB.",
      });

      continue;
    }

    const status =
      normalizeCloudinaryStatus(
        cloudinaryStream.status
      );

    existing.status =
      status;

    existing.lastHealthCheckAt =
      new Date();

    if (status !== "error") {
      existing.lastError =
        null;
    }

    await existing.save();

    results.push({
      success:
        true,

      streamId:
        existing.streamId,

      sequence:
        existing.sequence,

      status,
    });
  }

  return results;
}

/**
 * ============================================================
 * SYNCHRONIZE ONE STREAM HEALTH
 * ============================================================
 */

export async function syncCloudinaryStreamHealth(
  streamId: string
): Promise<ILiveStream> {
  const cloudinaryStream =
    await getCloudinaryLiveStream(
      streamId
    );

  const stream =
    await LiveStream.findOne({
      streamId,
    }).exec();

  if (!stream) {
    throw new Error(
      `Stream "${streamId}" is not registered in MongoDB.`
    );
  }

  const status =
    normalizeCloudinaryStatus(
      cloudinaryStream.status
    );

  stream.status =
    status;

  stream.lastHealthCheckAt =
    new Date();

  if (status !== "error") {
    stream.lastError =
      null;
  }

  await stream.save();

  return stream;
}

/**
 ============================================================
 * GET CLOUDINARY STREAM STATUS
 ============================================================
 */

export async function getCloudinaryStreamStatus(
  streamId: string
): Promise<CloudinaryStreamStatus> {
  const stream =
    await getCloudinaryLiveStream(
      streamId
    );

  return {
    streamId:
      stream.id,

    status:
      normalizeCloudinaryStatus(
        stream.status
      ),

    rawStatus:
      stream.status ??
      null,

    name:
      stream.name ??
      null,

    publicId:
      stream.public_id ??
      null,

    hlsUrl:
      stream.hls_url ??
      null,
  };
}

/**
 * ============================================================
 * CHECK ALL REGISTERED STREAM HEALTH
 * ============================================================
 */

export async function syncAllCloudinaryStreamHealth() {
  const streams =
    await LiveStream.find()
      .sort({
        sequence: 1,
      })
      .exec();

  const results: Array<{
    success: boolean;
    streamId: string;
    sequence: number;
    status: LiveStreamStatus;
    error?: string;
  }> = [];

  for (
    const stream of streams
  ) {
    try {
      const updated =
        await syncCloudinaryStreamHealth(
          stream.streamId
        );

      results.push({
        success:
          true,

        streamId:
          updated.streamId,

        sequence:
          updated.sequence,

        status:
          updated.status,
      });
    } catch (error) {
      results.push({
        success:
          false,

        streamId:
          stream.streamId,

        sequence:
          stream.sequence,

        status:
          stream.status,

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
 * ACTIVATE WEBSITE STREAM
 * ============================================================
 *
 * IMPORTANT:
 *
 * This changes the stream used by the website.
 *
 * It does NOT control OBS.
 * It does NOT change the Cloudinary RTMP destination.
 *
 * OBS must already be streaming to this Cloudinary stream
 * before this function is used for a live rotation.
 */
export async function activateCloudinaryStream(
  streamId: string
): Promise<ILiveStream> {
  const stream =
    await LiveStream.findOne({
      streamId,
    }).exec();

  if (!stream) {
    throw new Error(
      `Stream "${streamId}" was not found in MongoDB.`
    );
  }

  /**
   * Make every other stream inactive.
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

  const now =
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      now
    );

  const activated =
    await LiveStream.findOneAndUpdate(
      {
        streamId,
      },
      {
        $set: {
          isActive:
            true,

          status:
            "live",

          startedAt:
            now,

          expiresAt,

          lastTransitionAt:
            now,

          lastHealthCheckAt:
            now,

          lastError:
            null,
        },

        $inc: {
          usageCount:
            1,
        },
      },
      {
        new:
          true,
      }
    ).exec();

  if (!activated) {
    throw new Error(
      `Failed to activate stream "${streamId}".`
    );
  }

  return activated;
}

/**
 * ============================================================
 * DEACTIVATE WEBSITE STREAM
 * ============================================================
 */

export async function deactivateCloudinaryStream(
  streamId: string,
  status: LiveStreamStatus = "ended"
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
      },
    },
    {
      new:
        true,
    }
  ).exec();
}

/**
 * ============================================================
 * GET STREAM POOL
 * ============================================================
 *
 * streamKey is explicitly excluded.
 */
export async function getCloudinaryStreamPool() {
  return LiveStream.find()
    .sort({
      sequence:
        1,
    })
    .select(
      "-streamKey"
    )
    .exec();
}

/**
 * ============================================================
 * GET ACTIVE STREAM
 * ============================================================
 *
 * streamKey is explicitly excluded.
 */
export async function getActiveCloudinaryStream() {
  return LiveStream.findOne({
    isActive:
      true,
  })
    .select(
      "-streamKey"
    )
    .exec();
}

/**
 * ============================================================
 * CALCULATE ROTATION EXPIRY
 * ============================================================
 *
 * The application intentionally rotates before Cloudinary's
 * theoretical 180-minute maximum.
 */
export function calculateStreamExpiry(
  startedAt: Date,
  rotationMinutes =
    DEFAULT_ROTATION_MINUTES
): Date {
  if (
    !Number.isFinite(
      rotationMinutes
    ) ||
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
 * PUBLIC ACTIVE STREAM
 * ============================================================
 *
 * Returns only the stream currently intended for website
 * playback.
 *
 * Private credentials are never returned.
 */
export async function getPublicCloudinaryStream(): Promise<{
  isLive: boolean;
  stream: LiveStreamPublicData | null;
}> {
  const stream =
    await getActiveCloudinaryStream();

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
 * ============================================================
 * GET PUBLIC STREAM POOL
 * ============================================================
 *
 * Safe representation of all registered streams.
 *
 * No stream keys or RTMP URLs are returned.
 */
export async function getPublicCloudinaryStreamPool(): Promise<
  LiveStreamPublicData[]
> {
  const streams =
    await LiveStream.find()
      .sort({
        sequence:
          1,
      })
      .exec();

  return streams.map(
    toPublicStream
  );
}

/**
 * ============================================================
 * GET ROTATION INFORMATION
 * ============================================================
 *
 * This function is intentionally read-only.
 *
 * It does not rotate streams.
 */
export async function getCloudinaryRotationState() {
  const activeStream =
    await LiveStream.findOne({
      isActive:
        true,
    }).exec();

  if (!activeStream) {
    return {
      activeStream:
        null,

      nextStream:
        null,

      rotationDue:
        false,

      expiresAt:
        null,
    };
  }

  const nextSequence =
    activeStream.sequence >=
    MAX_STREAMS
      ? 1
      : activeStream.sequence + 1;

  const nextStream =
    await LiveStream.findOne({
      sequence:
        nextSequence,
    }).exec();

  const rotationDue =
    Boolean(
      activeStream.expiresAt &&
        activeStream.expiresAt.getTime() <=
          Date.now()
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

    rotationDue,

    expiresAt:
      activeStream.expiresAt ??
      null,
  };
}

/**
 ============================================================
 * EXPORTS
 ============================================================
 */

export {
  DEFAULT_TITLE,
};
