import { Router } from "express";

import {
  getRandomApprovedVideo,
  uploadVideo,
} from "../controllers/videoController.js";

import { uploadVideo as uploadVideoMiddleware } from "../middleware/upload.js";

const router = Router();

router.get(
  "/random",
  getRandomApprovedVideo
);

router.post(
  "/",
  uploadVideoMiddleware.single(
    "video"
  ),
  uploadVideo
);

export default router;