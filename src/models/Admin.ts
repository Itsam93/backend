import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface IAdmin
  extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema =
  new Schema<IAdmin>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: true,
        select: false,
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
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const Admin: Model<IAdmin> =
  mongoose.models.Admin ||
  mongoose.model<IAdmin>(
    "Admin",
    adminSchema
  );