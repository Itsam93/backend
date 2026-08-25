import LiveStream, {
  type ILiveStream,
  type LiveStreamStatus,
} from "../models/LiveStream.js";

import {
  fetchCloudinaryStream,
  normalizeCloudinaryStatus,
} from "./cloudinaryLiveStreamService.js";

export const MAX_STREAMS = 12;

export const MAX_RUNTIME_MINUTES = 180;

export const DEFAULT_ROTATION_MINUTES = 170;

export const ROTATION_WARNING_MINUTES = 10;


export interface RotationState {
  currentStream: ILiveStream | null;
  nextStream: ILiveStream | null;

  currentSequence: number | null;
  nextSequence: number | null;

  isLive: boolean;

  rotationDue: boolean;
  rotationApproaching: boolean;

  expiresAt: Date | null;
  remainingSeconds: number | null;
}

export interface StreamHealthResult {
  success: boolean;

  streamId: string;
  sequence: number;

  localStatus: LiveStreamStatus;
  cloudinaryStatus: string | null;
  normalizedStatus: LiveStreamStatus;

  isActive: boolean;
  healthy: boolean;

  error?: string;
}

export function getRotationMinutes(): number {
  const configured = Number(
    process.env.STREAM_ROTATION_MINUTES
  );

  if (
    Number.isFinite(configured) &&
    configured > 0 &&
    configured < MAX_RUNTIME_MINUTES
  ) {
    return configured;
  }

  return DEFAULT_ROTATION_MINUTES;
}

function validateRotationMinutes(
  rotationMinutes: number
): void {
  if (
    !Number.isFinite(rotationMinutes) ||
    rotationMinutes <= 0 ||
    rotationMinutes >= MAX_RUNTIME_MINUTES
  ) {
    throw new Error(
      `Rotation time must be greater than 0 and less than ${MAX_RUNTIME_MINUTES} minutes.`
    );
  }
}

export async function getRotationStreams(): Promise<
  ILiveStream[]
> {
  return LiveStream.find()
    .sort({
      sequence: 1,
    })
    .exec();
}

export async function getCurrentStream(): Promise<
  ILiveStream | null
> {
  return LiveStream.findOne({
    isActive: true,
  }).exec();
}

export async function getStreamBySequence(
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


export async function getNextRotationStream(
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
    sequence: nextSequence,
  }).exec();
}

export function getRemainingSeconds(
  expiresAt?: Date | null
): number | null {
  if (!expiresAt) {
    return null;
  }

  const remainingMilliseconds =
    expiresAt.getTime() -
    Date.now();

  return Math.max(
    0,
    Math.floor(
      remainingMilliseconds / 1000
    )
  );
}

export function isRotationDue(
  stream: ILiveStream | null
): boolean {
  if (!stream) {
    return false;
  }

  if (!stream.isActive) {
    return false;
  }

  if (
    stream.status !== "live" &&
    stream.status !== "transitioning"
  ) {
    return false;
  }

  if (!stream.expiresAt) {
    return false;
  }

  return (
    stream.expiresAt.getTime() <=
    Date.now()
  );
}

export function isRotationApproaching(
  stream: ILiveStream | null
): boolean {
  if (!stream) {
    return false;
  }

  if (!stream.isActive) {
    return false;
  }

  if (!stream.expiresAt) {
    return false;
  }

  const remainingSeconds =
    getRemainingSeconds(
      stream.expiresAt
    );

  if (remainingSeconds === null) {
    return false;
  }

  return (
    remainingSeconds <=
      ROTATION_WARNING_MINUTES * 60 &&
    remainingSeconds > 0
  );
}

export function calculateStreamExpiry(
  startedAt: Date,
  rotationMinutes =
    getRotationMinutes()
): Date {
  validateRotationMinutes(
    rotationMinutes
  );

  return new Date(
    startedAt.getTime() +
      rotationMinutes *
        60 *
        1000
  );
}

export async function getRotationState(): Promise<RotationState> {
  const currentStream =
    await getCurrentStream();

  if (!currentStream) {
    return {
      currentStream: null,
      nextStream: null,

      currentSequence: null,
      nextSequence: null,

      isLive: false,

      rotationDue: false,
      rotationApproaching: false,

      expiresAt: null,
      remainingSeconds: null,
    };
  }

  const nextStream =
    await getNextRotationStream(
      currentStream.sequence
    );

  const isLive =
    currentStream.status === "live" ||
    currentStream.status ===
      "transitioning";

  return {
    currentStream,

    nextStream,

    currentSequence:
      currentStream.sequence,

    nextSequence:
      nextStream?.sequence ??
      null,

    isLive,

    rotationDue:
      isRotationDue(
        currentStream
      ),

    rotationApproaching:
      isRotationApproaching(
        currentStream
      ),

    expiresAt:
      currentStream.expiresAt ??
      null,

    remainingSeconds:
      getRemainingSeconds(
        currentStream.expiresAt
      ),
  };
}

export async function prepareCurrentStreamForRotation(
  rotationMinutes =
    getRotationMinutes()
): Promise<ILiveStream> {
  validateRotationMinutes(
    rotationMinutes
  );

  const currentStream =
    await getCurrentStream();

  if (!currentStream) {
    throw new Error(
      "There is currently no active live stream."
    );
  }

  const startedAt =
    currentStream.startedAt ??
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      startedAt,
      rotationMinutes
    );

  currentStream.expiresAt =
    expiresAt;

  currentStream.status =
    "transitioning";

  currentStream.lastTransitionAt =
    new Date();

  await currentStream.save();

  return currentStream;
}

export async function setActiveStream(
  streamId: string
): Promise<ILiveStream> {
  const targetStream =
    await LiveStream.findOne({
      streamId,
    }).exec();

  if (!targetStream) {
    throw new Error(
      `Stream "${streamId}" was not found.`
    );
  }

  if (
    targetStream.status !== "live" &&
    targetStream.status !== "starting" &&
    targetStream.status !== "idle"
  ) {
    throw new Error(
      `Stream "${streamId}" cannot become active while its status is "${targetStream.status}".`
    );
  }

  const now =
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      now
    );

  /**
   * Remove active status from all other streams.
   */
  await LiveStream.updateMany(
    {
      streamId: {
        $ne: streamId,
      },
    },
    {
      $set: {
        isActive: false,
      },
    }
  ).exec();

  /**
   * Activate the target stream.
   */
  const activatedStream =
    await LiveStream.findOneAndUpdate(
      {
        streamId,
      },
      {
        $set: {
          isActive: true,

          status: "live",

          startedAt: now,

          expiresAt,

          lastTransitionAt:
            now,

          lastHealthCheckAt:
            now,

          lastError: null,
        },

        $inc: {
          usageCount: 1,
        },
      },
      {
        new: true,
      }
    ).exec();

  if (!activatedStream) {
    throw new Error(
      "Failed to activate the target stream."
    );
  }

  return activatedStream;
}

export async function manualRotate(
  targetStreamId?: string
): Promise<{
  previousStream: ILiveStream;
  currentStream: ILiveStream;
  nextStream: ILiveStream | null;
}> {
  const currentStream =
    await getCurrentStream();

  if (!currentStream) {
    throw new Error(
      "There is no currently active stream."
    );
  }

  let nextStream:
    | ILiveStream
    | null = null;

  if (targetStreamId) {
    nextStream =
      await LiveStream.findOne({
        streamId:
          targetStreamId,
      }).exec();

    if (!nextStream) {
      throw new Error(
        `Target stream "${targetStreamId}" was not found.`
      );
    }
  } else {
    /**
     * Normal sequential rotation.
     */
    nextStream =
      await getNextRotationStream(
        currentStream.sequence
      );
  }

  if (!nextStream) {
    throw new Error(
      "The next stream could not be determined."
    );
  }

  if (
    nextStream.streamId ===
    currentStream.streamId
  ) {
    throw new Error(
      "The target stream is already active."
    );
  }

  const cloudinaryStream =
    await fetchCloudinaryStream(
      nextStream.streamId
    );

  const normalizedStatus =
    normalizeCloudinaryStatus(
      cloudinaryStream.status
    );

  if (
    normalizedStatus !==
    "live"
  ) {
    throw new Error(
      `Cannot rotate to stream ${nextStream.sequence}. Cloudinary reports status "${cloudinaryStream.status ?? "unknown"}".`
    );
  }


  const now =
    new Date();

  const expiresAt =
    calculateStreamExpiry(
      now
    );

  /**
   * Deactivate all other website streams.
   */
  await LiveStream.updateMany(
    {
      streamId: {
        $ne:
          nextStream.streamId,
      },
    },
    {
      $set: {
        isActive: false,
      },
    }
  ).exec();

  /**
   * Activate the verified Cloudinary stream.
   */
  const activatedStream =
    await LiveStream.findOneAndUpdate(
      {
        streamId:
          nextStream.streamId,
      },
      {
        $set: {
          isActive: true,

          status: "live",

          startedAt: now,

          expiresAt,

          lastTransitionAt:
            now,

          lastHealthCheckAt:
            now,

          lastError: null,
        },

        $inc: {
          usageCount: 1,
        },
      },
      {
        new: true,
      }
    ).exec();

  if (!activatedStream) {
    throw new Error(
      "Failed to activate the target stream."
    );
  }

  /**
   * Mark the previous website stream as ended.
   */
  await LiveStream.updateOne(
    {
      streamId:
        currentStream.streamId,
    },
    {
      $set: {
        isActive: false,

        status: "ended",

        expiresAt: null,

        lastTransitionAt:
          now,
      },
    }
  ).exec();

  const followingStream =
    await getNextRotationStream(
      activatedStream.sequence
    );

  return {
    previousStream:
      currentStream,

    currentStream:
      activatedStream,

    nextStream:
      followingStream,
  };
}

export async function checkStreamHealth(
  stream: ILiveStream
): Promise<StreamHealthResult> {
  try {
    const cloudinaryStream =
      await fetchCloudinaryStream(
        stream.streamId
      );

    const normalizedStatus =
      normalizeCloudinaryStatus(
        cloudinaryStream.status
      );

    const healthy =
      normalizedStatus === "live" ||
      normalizedStatus === "starting" ||
      normalizedStatus === "idle";

    const now =
      new Date();

    const update: Partial<ILiveStream> =
      {
        status:
          normalizedStatus,

        lastHealthCheckAt:
          now,
      };

    if (healthy) {
      update.lastError =
        null;
    }

    if (
      normalizedStatus ===
      "error"
    ) {
      update.lastError =
        "Cloudinary reported a stream error.";
    }

    const updatedStream =
      await LiveStream.findOneAndUpdate(
        {
          streamId:
            stream.streamId,
        },
        {
          $set: update,
        },
        {
          new: true,
        }
      ).exec();

    if (!updatedStream) {
      throw new Error(
        `Stream "${stream.streamId}" is no longer registered in MongoDB.`
      );
    }

    return {
      success: true,

      streamId:
        updatedStream.streamId,

      sequence:
        updatedStream.sequence,

      localStatus:
        updatedStream.status,

      cloudinaryStatus:
        cloudinaryStream.status ??
        null,

      normalizedStatus,

      isActive:
        updatedStream.isActive,

      healthy,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const updatedStream =
      await LiveStream.findOneAndUpdate(
        {
          streamId:
            stream.streamId,
        },
        {
          $set: {
            status: "error",

            lastHealthCheckAt:
              new Date(),

            lastError:
              message,
          },
        },
        {
          new: true,
        }
      ).exec();

    return {
      success: false,

      streamId:
        stream.streamId,

      sequence:
        stream.sequence,

      localStatus:
        updatedStream?.status ??
        "error",

      cloudinaryStatus:
        null,

      normalizedStatus:
        "error",

      isActive:
        updatedStream?.isActive ??
        stream.isActive,

      healthy: false,

      error:
        message,
    };
  }
}

export async function checkActiveStreamHealth(): Promise<
  StreamHealthResult | null
> {
  const activeStream =
    await getCurrentStream();

  if (!activeStream) {
    return null;
  }

  return checkStreamHealth(
    activeStream
  );
}

export async function checkAllStreamHealth(): Promise<
  StreamHealthResult[]
> {
  const streams =
    await getRotationStreams();

  const results: StreamHealthResult[] =
    [];

  for (const stream of streams) {
    const result =
      await checkStreamHealth(
        stream
      );

    results.push(result);
  }

  return results;
}

export async function getStreamDueForRotation(): Promise<
  ILiveStream | null
> {
  const currentStream =
    await getCurrentStream();

  if (
    !currentStream ||
    !isRotationDue(
      currentStream
    )
  ) {
    return null;
  }

  return currentStream;
}

export async function getStreamApproachingRotation(): Promise<
  ILiveStream | null
> {
  const currentStream =
    await getCurrentStream();

  if (
    !currentStream ||
    !isRotationApproaching(
      currentStream
    )
  ) {
    return null;
  }

  return currentStream;
}

export async function activateNextStream() {
  const currentStream =
    await getCurrentStream();

  if (!currentStream) {
    throw new Error(
      "There is no currently active stream."
    );
  }

  const nextStream =
    await getNextRotationStream(
      currentStream.sequence
    );

  if (!nextStream) {
    throw new Error(
      `Stream after sequence ${currentStream.sequence} was not found.`
    );
  }

  return manualRotate(
    nextStream.streamId
  );
}

export async function activateSpecificStream(
  sequence: number
) {
  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    throw new Error(
      `Stream sequence must be an integer between 1 and ${MAX_STREAMS}.`
    );
  }

  const stream =
    await getStreamBySequence(
      sequence
    );

  if (!stream) {
    throw new Error(
      `Stream sequence ${sequence} does not exist.`
    );
  }

  return manualRotate(
    stream.streamId
  );
}
