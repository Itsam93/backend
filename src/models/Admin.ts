import mongoose, {
  type Document,
  type Model,
} from "mongoose";

export interface IAdmin
  extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema =
  new mongoose.Schema<IAdmin>(
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
      },

      role: {
        type: String,
        enum: ["admin"],
        default: "admin",
      },
    },
    {
      timestamps: true,
    }
  );

export const Admin: Model<IAdmin> =
  mongoose.model<IAdmin>(
    "Admin",
    adminSchema
  );