import { Router } from "express";
import {
  getRandomApprovedVideo,
} from "../controllers/videoController.js";

const router = Router();

router.get(
  "/random",
  getRandomApprovedVideo
);

export default router;