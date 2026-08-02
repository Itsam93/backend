import {
  Request,
  Response,
} from "express";

import { Message } from "../models/Message.js";

export async function getRandomApprovedMessage(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const messages =
      await Message.aggregate([
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
      data: messages[0] ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch random approved message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch message.",
    });
  }
}

export async function createMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      name,
      church,
      message,
    } = req.body;

    const trimmedName =
      typeof name === "string"
        ? name.trim()
        : "";

    const trimmedChurch =
      typeof church === "string"
        ? church.trim()
        : "";

    const trimmedMessage =
      typeof message === "string"
        ? message.trim()
        : "";

    if (!trimmedName) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your name.",
      });

      return;
    }

    if (trimmedName.length > 80) {
      res.status(400).json({
        success: false,
        message:
          "Name must not exceed 80 characters.",
      });

      return;
    }

    if (!trimmedChurch) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your church.",
      });

      return;
    }

    if (
      trimmedChurch.length > 120
    ) {
      res.status(400).json({
        success: false,
        message:
          "Church name must not exceed 120 characters.",
      });

      return;
    }

    if (!trimmedMessage) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your message.",
      });

      return;
    }

    if (
      trimmedMessage.length > 500
    ) {
      res.status(400).json({
        success: false,
        message:
          "Message must not exceed 500 characters.",
      });

      return;
    }

    const createdMessage =
      await Message.create({
        name: trimmedName,
        church: trimmedChurch,
        message: trimmedMessage,
        status: "pending",
        submittedAt: new Date(),
        reviewedAt: null,
      });

    res.status(201).json({
      success: true,
      message:
        "Your message has been submitted successfully and is awaiting review.",
      data: {
        id: createdMessage._id,
        name: createdMessage.name,
        church: createdMessage.church,
        message:
          createdMessage.message,
        status:
          createdMessage.status,
        submittedAt:
          createdMessage.submittedAt,
      },
    });
  } catch (error) {
    console.error(
      "Message creation failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to submit message.",
    });
  }
}