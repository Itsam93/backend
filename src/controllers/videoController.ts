import { Request, Response } from "express";
import { Video } from "../models/Video.js";

export async function getRandomApprovedVideo(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const videos = await Video.aggregate([
      {
        $match: {
          status: "approved",
        },
      },
      {
        $sample: {
          size: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: videos[0] ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch random approved video:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch video.",
    });
  }
}