import {
  Document,
  Schema,
  model,
} from "mongoose";

/**
 * ============================================================
 * LIVE STREAM STATUS
 * ============================================================
 */

export type LiveStreamStatus =
  | "idle"
  | "starting"
  | "live"
  | "transitioning"
  | "ended"
  | "error";

/**
 * ============================================================
 * LIVE STREAM DOCUMENT
 * ============================================================
 */

export interface ILiveStream extends Document {
  name: string;
  title: string;

  /**
   * Cloudinary live stream ID.
   */
  streamId: string;

  /**
   * Cloudinary RTMP credentials.
   *
   * This field is hidden from normal queries and JSON output.
   */
  streamKey?: string;

  /**
   * Cloudinary RTMP ingest URL.
   */
  rtmpUrl: string;

  /**
   * Cloudinary HLS playback URL.
   */
  hlsUrl: string;

  /**
   * Cloudinary public ID.
   */
  publicId: string;

  /**
   * Optional playback identifier.
   *
   * Kept for future compatibility with other
   * streaming providers.
   */
  playbackId?: string | null;

  /**
   * Rotation sequence.
   *
   * Valid range:
   * 1 - 12
   */
  sequence: number;

  /**
   * Current application-side stream status.
   */
  status: LiveStreamStatus;

  /**
   * Whether this is the stream currently
   * being served to website viewers.
   */
  isActive: boolean;

  /**
   * Time the current stream became active.
   */
  startedAt?: Date | null;

  /**
   * Time at which the application expects
   * this stream to require rotation.
   */
  expiresAt?: Date | null;

  /**
   * Last time the website switched
   * to or from this stream.
   */
  lastTransitionAt?: Date | null;

  /**
   * Number of times this stream has been activated.
   */
  usageCount: number;

  /**
   * Last time Cloudinary health was checked.
   */
  lastHealthCheckAt?: Date | null;

  /**
   * Last known error.
   */
  lastError?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * ============================================================
 * SCHEMA
 * ============================================================
 */

const liveStreamSchema =
  new Schema<ILiveStream>(
    {
      /**
       * Human-readable stream name.
       */
      name: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * Public title displayed by the application.
       */
      title: {
        type: String,
        required: true,
        trim: true,
        default:
          "24 Hours ZP Celebration",
      },

      /**
       * Cloudinary live stream ID.
       */
      streamId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      /**
       * Cloudinary stream key.
       *
       * IMPORTANT:
       * - Never expose through normal queries.
       * - Never expose through API JSON.
       */
      streamKey: {
        type: String,
        required: true,
        select: false,
        trim: true,
      },

      /**
       * Cloudinary RTMP ingest URL.
       */
      rtmpUrl: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * Cloudinary HLS playback URL.
       */
      hlsUrl: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * Cloudinary public ID.
       */
      publicId: {
        type: String,
        required: true,
        trim: true,
      },

      /**
       * Optional playback ID.
       */
      playbackId: {
        type: String,
        default: null,
        trim: true,
      },

      /**
       * Rotation sequence.
       *
       * There are exactly 12 streams.
       */
      sequence: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 12,
        index: true,
      },

      /**
       * Application-side stream status.
       */
      status: {
        type: String,
        enum: [
          "idle",
          "starting",
          "live",
          "transitioning",
          "ended",
          "error",
        ],
        default: "idle",
        required: true,
        index: true,
      },

      /**
       * Only one stream can be active at a time.
       */
      isActive: {
        type: Boolean,
        default: false,
        required: true,
        index: true,
      },

      /**
       * When the stream became active.
       */
      startedAt: {
        type: Date,
        default: null,
      },

      /**
       * Expected rotation/expiry time.
       */
      expiresAt: {
        type: Date,
        default: null,
      },

      /**
       * Last stream transition time.
       */
      lastTransitionAt: {
        type: Date,
        default: null,
      },

      /**
       * Number of times the stream has been activated.
       */
      usageCount: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      /**
       * Last Cloudinary health check.
       */
      lastHealthCheckAt: {
        type: Date,
        default: null,
      },

      /**
       * Last recorded stream error.
       */
      lastError: {
        type: String,
        default: null,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * ============================================================
 * ACTIVE STREAM CONSTRAINT
 * ============================================================
 *
 * MongoDB will allow:
 *
 * isActive = false
 * isActive = false
 * isActive = false
 *
 * but only ONE:
 *
 * isActive = true
 *
 * can exist at a time.
 */

liveStreamSchema.index(
  {
    isActive: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  }
);

/**
 * ============================================================
 * COMPOUND INDEXES
 * ============================================================
 */

liveStreamSchema.index({
  sequence: 1,
  status: 1,
});

liveStreamSchema.index({
  expiresAt: 1,
  status: 1,
});

/**
 * ============================================================
 * JSON TRANSFORMATION
 * ============================================================
 *
 * Never expose the Cloudinary stream key
 * to API consumers.
 */

liveStreamSchema.set(
  "toJSON",
  {
    transform: (
      _doc,
      ret
    ) => {
      delete ret.streamKey;

      return ret;
    },
  }
);

/**
 * ============================================================
 * MODEL
 * ============================================================
 */

export const LiveStream =
  model<ILiveStream>(
    "LiveStream",
    liveStreamSchema
  );

export default LiveStream;