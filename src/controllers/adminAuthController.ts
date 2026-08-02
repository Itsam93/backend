import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Admin } from "../models/Admin.js";

interface AdminJwtPayload {
  sub: string;
  role: "admin";
  iat?: number;
  exp?: number;
}

interface AuthenticatedAdminRequest
  extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
    role: "admin";
  };
}

function getJwtSecret(): string {
  const secret =
    process.env.ADMIN_JWT_SECRET;

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

function getCookieOptions() {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction
      ? ("none" as const)
      : ("lax" as const),
    path: "/",
    maxAge:
      1000 *
      60 *
      60 *
      24,
  };
}

export async function loginAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      email,
      password,
    } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });

      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      res.status(400).json({
        success: false,
        message:
          "Email address is required.",
      });

      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message:
          "Password is required.",
      });

      return;
    }
    const admin =
      await Admin.findOne({
        email: normalizedEmail,
      });

    if (!admin) {
      res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });

      return;
    }

    if (!admin.isActive) {
      res.status(403).json({
        success: false,
        message:
          "This administrator account is inactive.",
      });

      return;
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });

      return;
    }

    const token =
      jwt.sign(
        {
          sub: admin._id.toString(),
          role: "admin",
        } satisfies Omit<
          AdminJwtPayload,
          "iat" | "exp"
        >,
        getJwtSecret(),
        {
          expiresIn:
            process.env.ADMIN_JWT_EXPIRES_IN ||
            "1d",
        }
      );

    res.cookie(
      getCookieName(),
      token,
      getCookieOptions()
    );

    res.status(200).json({
      success: true,
      message:
        "Administrator login successful.",
      data: {
        admin: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          role: "admin",
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to authenticate administrator.",
    });
  }
}

export async function getCurrentAdmin(
  req: AuthenticatedAdminRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message:
          "Administrator authentication required.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: {
        admin: req.admin,
      },
    });
  } catch (error) {
    console.error(
      "Get current admin error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to retrieve administrator account.",
    });
  }
}

export async function logoutAdmin(
  _req: AuthenticatedAdminRequest,
  res: Response
): Promise<void> {
  try {
    res.clearCookie(
      getCookieName(),
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          process.env.NODE_ENV ===
          "production"
            ? ("none" as const)
            : ("lax" as const),
        path: "/",
      }
    );

    res.status(200).json({
      success: true,
      message:
        "Administrator logged out successfully.",
    });
  } catch (error) {
    console.error(
      "Admin logout error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to log out administrator.",
    });
  }
}
