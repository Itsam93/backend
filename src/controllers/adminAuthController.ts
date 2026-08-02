import type {
  Request,
  Response,
} from "express";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Admin } from "../models/Admin.js";

interface AuthenticatedRequest
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

function getJwtExpiresIn(): string {
  return (
    process.env.JWT_EXPIRES_IN ||
    "1d"
  );
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
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
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
    } = req.body;

    const normalizedEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    const suppliedPassword =
      typeof password === "string"
        ? password
        : "";

    if (!normalizedEmail) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your email address.",
      });

      return;
    }

    if (!suppliedPassword) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your password.",
      });

      return;
    }

    const admin =
      await Admin.findOne({
        email: normalizedEmail,
      }).select("+passwordHash");

    /*
     * Do not reveal whether the email exists.
     */
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
        suppliedPassword,
        admin.passwordHash
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
        },
        getJwtSecret(),
        {
          expiresIn:
            getJwtExpiresIn(),
        } as jwt.SignOptions
      );

    res.cookie(
      getCookieName(),
      token,
      getCookieOptions()
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        admin: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin login failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to authenticate administrator.",
    });
  }
}

export async function getCurrentAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required.",
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
      "Failed to fetch current admin:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch administrator.",
    });
  }
}

export async function logoutAdmin(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const isProduction =
      process.env.NODE_ENV ===
      "production";

    res.clearCookie(
      getCookieName(),
      {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction
          ? ("none" as const)
          : ("lax" as const),
        path: "/",
      }
    );

    res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error(
      "Admin logout failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to log out administrator.",
    });
  }
}