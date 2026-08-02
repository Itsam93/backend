import type { NextFunction, Request, Response } from "express";
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
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables."
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
    const token =
      req.cookies?.[getCookieName()];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    const decoded =
      jwt.verify(
        token,
        getJwtSecret()
      ) as AdminJwtPayload;

    if (
      !decoded.sub ||
      decoded.role !== "admin"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });

      return;
    }

    const admin =
      await Admin.findById(decoded.sub);

    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Admin account not found.",
      });

      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
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
        message: "Authentication session has expired.",
      });

      return;
    }

    if (
      error instanceof jwt.JsonWebTokenError
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
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