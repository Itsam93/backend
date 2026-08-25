import type { Request, Response } from "express";

import {
  provisionAllCloudinaryStreams,
  provisionCloudinaryStream,
  syncAllCloudinaryStreams,
} from "../services/cloudinaryLiveStreamService.js";


const MAX_STREAMS = 12;

function getSequence(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const sequence = Number(value);

  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    return null;
  }

  return sequence;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export async function provisionAllCloudinaryStreamsController(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await provisionAllCloudinaryStreams();

    return res.status(200).json({
      success: true,
      message:
        "Cloudinary live stream pool provisioned successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Failed to provision Cloudinary streams:",
      error
    );

    return res.status(500).json({
      success: false,
      message: getErrorMessage(
        error,
        "Failed to provision Cloudinary streams."
      ),
    });
  }
}

/**
 * ============================================================
 * PROVISION ONE CLOUDINARY STREAM
 * ============================================================
 *
 * POST /api/live-stream/admin/provision/:sequence
 *
 * Provisions one stream in the 12-stream rotation.
 */
export async function provisionCloudinaryStreamController(
  req: Request,
  res: Response
) {
  try {
    const sequence = getSequence(
      req.params.sequence
    );

    if (sequence === null) {
      return res.status(400).json({
        success: false,
        message:
          "Sequence must be an integer between 1 and 12.",
      });
    }

    const result =
      await provisionCloudinaryStream(
        sequence
      );

    return res.status(200).json({
      success: true,
      message:
        `Cloudinary stream ${sequence} provisioned successfully.`,
      data: result,
    });
  } catch (error) {
    console.error(
      "Failed to provision Cloudinary stream:",
      error
    );

    return res.status(500).json({
      success: false,
      message: getErrorMessage(
        error,
        "Failed to provision Cloudinary stream."
      ),
    });
  }
}

/**
 * ============================================================
 * SYNCHRONIZE CLOUDINARY STREAMS
 * ============================================================
 *
 * POST /api/live-stream/admin/sync
 *
 * Synchronizes the Cloudinary live-stream pool with the
 * application's MongoDB records.
 */
export async function syncAllCloudinaryStreamsController(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await syncAllCloudinaryStreams();

    return res.status(200).json({
      success: true,
      message:
        "Cloudinary streams synchronized successfully.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Failed to synchronize Cloudinary streams:",
      error
    );

    return res.status(500).json({
      success: false,
      message: getErrorMessage(
        error,
        "Failed to synchronize Cloudinary streams."
      ),
    });
  }
}

