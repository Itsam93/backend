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
      "KingsForms message webhook received:"
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );

    const payload = req.body;

    const name =
      payload.name ??
      payload["Member's name"] ??
      payload["Member Name"] ??
      "";

    const church =
      payload.church ??
      payload["Name of church"] ??
      payload["Name of Church"] ??
      "";

    const message =
      payload.message ??
      payload["Your message"] ??
      "";

    if (!name || !church || !message) {
      console.error(
        "Incomplete KingsForms message payload:",
        payload
      );

      return res.status(400).json({
        success: false,
        message:
          "Required message fields are missing.",
      });
    }

    const savedMessage = await Message.create({
      name: String(name).trim(),
      church: String(church).trim(),
      message: String(message).trim(),
      status: "pending",
      submittedAt: new Date(),
    });

    console.log(
      "Message saved:",
      savedMessage._id.toString()
    );

    return res.status(200).json({
      success: true,
      message:
        "Message webhook received and saved.",
      data: {
        id: savedMessage._id,
      },
    });
  } catch (error) {
    console.error(
      "Failed to process KingsForms message webhook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to process message webhook.",
    });
  }
});


router.post("/kingsform/video", async (req, res) => {
  try {
    console.log(
      "KingsForms video webhook received:"
    );

    console.log(
      JSON.stringify(req.body, null, 2)
    );

    return res.status(200).json({
      success: true,
      message:
        "Video webhook received.",
      received: req.body,
    });
  } catch (error) {
    console.error(
      "Failed to process KingsForms video webhook:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to process video webhook.",
    });
  }
});

export default router;