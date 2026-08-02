import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

import { Admin } from "../models/Admin.js";

interface AdminJwtPayload {
  sub: string;
  role: "admin";
  iat?: number;
  exp?: number;
}

export interface AuthenticatedAdminRequest
  extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
    role: "admin";
  };
}

function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "ADMIN_JWT_SECRET is not configured in environment variables."
    );
  }

  return secret;
}

function getCookieName(): string {
  return (
    process.env.ADMIN_COOKIE_NAME ||
    "zpb_admin_token"
  );
}

export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookieName = getCookieName();

    const token = req.cookies?.[cookieName];

    if (!token) {
      res.status(401).json({
        success: false,
        message:
          "Administrator authentication required.",
      });

      return;
    }

    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as AdminJwtPayload;

    if (
      !decoded.sub ||
      decoded.role !== "admin"
    ) {
      res.status(401).json({
        success: false,
        message:
          "Invalid administrator session.",
      });

      return;
    }

    const admin = await Admin.findById(
      decoded.sub
    ).select(
      "_id name email role isActive"
    );

    if (!admin) {
      res.status(401).json({
        success: false,
        message:
          "Administrator account no longer exists.",
      });

      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message:
          "Administrator account is inactive.",
      });

      return;
    }

    req.admin = {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: "admin",
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message:
          "Administrator session has expired.",
      });

      return;
    }

    if (
      error instanceof jwt.JsonWebTokenError
    ) {
      res.status(401).json({
        success: false,
        message:
          "Invalid administrator session.",
      });

      return;
    }

    console.error(
      "Admin authentication error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to authenticate administrator.",
    });
  }
}
