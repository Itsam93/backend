import { Router, Request, Response } from "express";
import { Message } from "../models/Message.js";
import { Video } from "../models/Video.js";

const router = Router();

function getPayloadValue(
  body: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = body[key];

    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return "";
}


router.post(
  "/kingsform/message",
  async (req: Request, res: Response) => {
    try {
      console.log(
        "KingsForm message webhook received:"
      );

      console.log(
        JSON.stringify(req.body, null, 2)
      );

      const body = req.body as Record<
        string,
        unknown
      >;

      const name = getPayloadValue(body, [
        "name",
        "fullName",
        "fullname",
        "full_name",
      ]);

      const church = getPayloadValue(body, [
        "church",
        "churchName",
        "church_name",
      ]);

      const message = getPayloadValue(body, [
        "message",
        "messageText",
        "message_text",
        "content",
      ]);

      if (!name || !church || !message) {
        res.status(400).json({
          success: false,
          message:
            "Missing required message fields.",
          required: [
            "name",
            "church",
            "message",
          ],
        });

        return;
      }

      const savedMessage =
        await Message.create({
          name,
          church,
          message,
          status: "pending",
          submittedAt: new Date(),
        });

      console.log(
        `Message saved successfully: ${savedMessage._id}`
      );

      res.status(201).json({
        success: true,
        message:
          "Message received successfully.",
        data: {
          id: savedMessage._id,
        },
      });
    } catch (error) {
      console.error(
        "Failed to process KingsForm message webhook:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to process message webhook.",
      });
    }
  }
);


router.post(
  "/kingsform/video",
  async (req: Request, res: Response) => {
    try {
      console.log(
        "KingsForm video webhook received:"
      );

      console.log(
        JSON.stringify(req.body, null, 2)
      );

      const body = req.body as Record<
        string,
        unknown
      >;

      const name = getPayloadValue(body, [
        "name",
        "fullName",
        "fullname",
        "full_name",
      ]);

      const church = getPayloadValue(body, [
        "church",
        "churchName",
        "church_name",
      ]);

      const videoUrl = getPayloadValue(body, [
        "videoUrl",
        "videoURL",
        "video_url",
        "url",
        "fileUrl",
        "fileURL",
        "file_url",
      ]);

      const fileName = getPayloadValue(body, [
        "fileName",
        "filename",
        "file_name",
      ]);

      let duration: number | undefined;

      const rawDuration = body.duration;

      if (
        typeof rawDuration === "number" &&
        Number.isFinite(rawDuration)
      ) {
        duration = rawDuration;
      } else if (
        typeof rawDuration === "string" &&
        rawDuration.trim() !== ""
      ) {
        const parsedDuration = Number(
          rawDuration
        );

        if (Number.isFinite(parsedDuration)) {
          duration = parsedDuration;
        }
      }

      if (!name || !church || !videoUrl) {
        res.status(400).json({
          success: false,
          message:
            "Missing required video fields.",
          required: [
            "name",
            "church",
            "videoUrl",
          ],
        });

        return;
      }

      const savedVideo =
        await Video.create({
          name,
          church,
          videoUrl,
          fileName,
          duration,
          status: "pending",
          submittedAt: new Date(),
        });

      console.log(
        `Video saved successfully: ${savedVideo._id}`
      );

      res.status(201).json({
        success: true,
        message:
          "Video received successfully.",
        data: {
          id: savedVideo._id,
        },
      });
    } catch (error) {
      console.error(
        "Failed to process KingsForm video webhook:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to process video webhook.",
      });
    }
  }
);

export default router;