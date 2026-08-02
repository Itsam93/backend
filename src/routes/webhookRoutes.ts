import { Router } from "express";

const router = Router();

/*
|--------------------------------------------------------------------------
| KingsForm Webhooks
|--------------------------------------------------------------------------
|
| These endpoints receive submissions from KingsForm.
|
| Message:
| POST /api/webhooks/kingsform/message
|
| Video:
| POST /api/webhooks/kingsform/video
|
*/

router.post("/kingsform/message", (req, res) => {
  console.log(
    "KingsForm message webhook received:"
  );

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  res.status(200).json({
    success: true,
    message: "Message webhook received.",
  });
});

router.post("/kingsform/video", (req, res) => {
  console.log(
    "KingsForm video webhook received:"
  );

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  res.status(200).json({
    success: true,
    message: "Video webhook received.",
  });
});

export default router;