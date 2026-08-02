import { Router } from "express";

import { Message } from "../models/Message.js";
import { Video } from "../models/Video.js";

const router = Router();

router.get("/test", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Webhook routes are loaded.",
  });
});

router.post("/kingsform/message", async (req, res) => {
  try {
    console.log(
      "KingsForm message webhook received:"
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );

    const {
      name,
      church,
      message,
    } = req.body;

    if (!name || !church || !message) {
      res.status(400).json({
        success: false,
        message:
          "Name, church and message are required.",
      });

      return;
    }

    const savedMessage = await Message.create({
      name: String(name).trim(),
      church: String(church).trim(),
      message: String(message).trim(),
      status: "pending",
      submittedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message:
        "Message submitted successfully.",
      data: {
        id: savedMessage._id,
        status: savedMessage.status,
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
        "Failed to process message submission.",
    });
  }
});

router.post("/kingsform/video", async (req, res) => {
  try {
    console.log(
      "KingsForm video webhook received:"
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );

    const {
      name,
      church,
      videoUrl,
      fileName,
      duration,
    } = req.body;

    if (!name || !church || !videoUrl) {
      res.status(400).json({
        success: false,
        message:
          "Name, church and videoUrl are required.",
      });

      return;
    }

    const savedVideo = await Video.create({
      name: String(name).trim(),
      church: String(church).trim(),
      videoUrl: String(videoUrl).trim(),
      fileName: fileName
        ? String(fileName).trim()
        : "",
      duration:
        duration !== undefined &&
        duration !== null &&
        duration !== ""
          ? Number(duration)
          : null,
      status: "pending",
      submittedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message:
        "Video submitted successfully.",
      data: {
        id: savedVideo._id,
        status: savedVideo.status,
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
        "Failed to process video submission.",
    });
  }
});

export default router;