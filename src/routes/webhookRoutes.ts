import { Router } from "express";

const router = Router();

router.get("/test", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Webhook routes are loaded.",
  });
});

router.post("/kingsform/message", (req, res) => {
  console.log("KingsForm message webhook received:");
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({
    success: true,
    message: "Message webhook received.",
    received: req.body,
  });
});

router.post("/kingsform/video", (req, res) => {
  console.log("KingsForm video webhook received:");
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({
    success: true,
    message: "Video webhook received.",
    received: req.body,
  });
});

export default router;