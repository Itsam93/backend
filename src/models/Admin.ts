import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  role: "admin";
  isActive: boolean;
  lastLoginAt?: Date | null;
}

const adminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Admin = mongoose.model<IAdmin>(
  "Admin",
  adminSchema
);