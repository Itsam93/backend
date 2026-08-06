import {
  Request,
  Response,
} from "express";

import { Message } from "../models/Message.js";

/**
 * =========================================================
 * GET RANDOM APPROVED MESSAGE
 * =========================================================
 *
 * Used by the public celebration hero to rotate
 * approved messages.
 */
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

/**
 * =========================================================
 * GET LATEST APPROVED MESSAGE
 * =========================================================
 *
 * Returns the message that was most recently approved
 * by an administrator.
 *
 * This endpoint allows the public Hero to detect newly
 * approved messages without requiring a page refresh.
 */
export async function getLatestApprovedMessage(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const message =
      await Message.findOne({
        status: "approved",
      })
        .sort({
          reviewedAt: -1,
          updatedAt: -1,
        })
        .lean();

    res.status(200).json({
      success: true,
      data: message ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch latest approved message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch latest approved message.",
    });
  }
}

/**
 * =========================================================
 * CREATE MESSAGE
 * =========================================================
 *
 * Public users submit celebration messages.
 *
 * Every new message starts as "pending".
 * It must be approved by an administrator before
 * it can appear publicly.
 */
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

    /**
     * -------------------------------------------------------
     * NORMALIZE INPUT
     * -------------------------------------------------------
     */

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

    /**
     * -------------------------------------------------------
     * VALIDATE NAME
     * -------------------------------------------------------
     */

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

    /**
     * -------------------------------------------------------
     * VALIDATE CHURCH
     * -------------------------------------------------------
     */

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

    /**
     * -------------------------------------------------------
     * VALIDATE MESSAGE
     * -------------------------------------------------------
     */

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

    /**
     * -------------------------------------------------------
     * CREATE PENDING MESSAGE
     * -------------------------------------------------------
     */

    const createdMessage =
      await Message.create({
        name: trimmedName,

        church: trimmedChurch,

        message: trimmedMessage,

        status: "pending",

        submittedAt:
          new Date(),

        reviewedAt: null,
      });

    /**
     * -------------------------------------------------------
     * SUCCESS RESPONSE
     * -------------------------------------------------------
     */

    res.status(201).json({
      success: true,

      message:
        "Your message has been submitted successfully and is awaiting review.",

      data: {
        id: createdMessage._id,

        name:
          createdMessage.name,

        church:
          createdMessage.church,

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

/**
 * =========================================================
 * DELETE APPROVED MESSAGE
 * =========================================================
 *
 * Administrator only.
 *
 * Deletes an approved celebration message permanently.
 */
export async function deleteApprovedMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Message ID is required.",
      });

      return;
    }

    const message =
      await Message.findOne({
        _id: id,
        status: "approved",
      });

    if (!message) {
      res.status(404).json({
        success: false,
        message:
          "Approved message not found.",
      });

      return;
    }

    await Message.deleteOne({
      _id: message._id,
    });

    res.status(200).json({
      success: true,
      message:
        "Approved message deleted successfully.",
      data: {
        id: message._id,
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete approved message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete approved message.",
    });
  }
}

export async function getApprovedMessages(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const messages = await Message.find({
      status: "approved",
    })
      .select(
        "_id name church message createdAt"
      )
      .sort({
        reviewedAt: -1,
        createdAt: -1,
      })
      .lean();

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error(
      "Failed to fetch approved messages:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch approved messages.",
    });
  }
}