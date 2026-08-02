import mongoose, { Document, Schema } from "mongoose";

export type ModerationStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IMessage extends Document {
  name: string;
  church: string;
  message: string;

  status: ModerationStatus;

  submittedAt: Date;
  reviewedAt?: Date | null;
}

const messageSchema = new Schema<IMessage>(
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

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
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

export const Message = mongoose.model<IMessage>(
  "Message",
  messageSchema
);