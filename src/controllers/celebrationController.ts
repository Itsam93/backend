import {
  Request,
  Response,
} from "express";

import { Message } from "../models/Message.js";
import { Video } from "../models/Video.js";

export async function getLatestApprovedContent(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [
      latestMessage,
      latestVideo,
    ] = await Promise.all([
      Message.findOne({
        status: "approved",
        reviewedAt: {
          $ne: null,
        },
      })
        .sort({
          reviewedAt: -1,
          createdAt: -1,
        })
        .lean(),

      Video.findOne({
        status: "approved",
        reviewedAt: {
          $ne: null,
        },
      })
        .sort({
          reviewedAt: -1,
          createdAt: -1,
        })
        .lean(),
    ]);

    if (
      !latestMessage &&
      !latestVideo
    ) {
      res.status(200).json({
        success: true,
        data: null,
      });

      return;
    }

    let latestContent;

    if (
      latestMessage &&
      latestVideo
    ) {
      const messageReviewTime =
        latestMessage.reviewedAt
          ? new Date(
              latestMessage.reviewedAt
            ).getTime()
          : 0;

      const videoReviewTime =
        latestVideo.reviewedAt
          ? new Date(
              latestVideo.reviewedAt
            ).getTime()
          : 0;

      if (
        messageReviewTime >=
        videoReviewTime
      ) {
        latestContent = {
          type: "message" as const,
          data: latestMessage,
        };
      } else {
        latestContent = {
          type: "video" as const,
          data: latestVideo,
        };
      }
    } else if (latestMessage) {
      latestContent = {
        type: "message" as const,
        data: latestMessage,
      };
    } else {
      latestContent = {
        type: "video" as const,
        data: latestVideo,
      };
    }

    res.status(200).json({
      success: true,
      data: latestContent,
    });
  } catch (error) {
    console.error(
      "Failed to fetch latest approved celebration content:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch latest approved content.",
    });
  }
}