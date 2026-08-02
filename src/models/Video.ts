import mongoose, { Document, Schema } from "mongoose";

export type VideoModerationStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IVideo extends Document {
  name: string;
  church: string;

  videoUrl: string;
  fileName?: string;
  duration?: number;

  status: VideoModerationStatus;

  submittedAt: Date;
  reviewedAt?: Date | null;
}

const videoSchema = new Schema<IVideo>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    church: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    fileName: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Video = mongoose.model<IVideo>(
  "Video",
  videoSchema
);