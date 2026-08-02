import { Request, Response } from "express";
import { Message } from "../models/Message.js";

export async function getRandomApprovedMessage(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const messages = await Message.aggregate([
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
      message: "Failed to fetch message.",
    });
  }
}