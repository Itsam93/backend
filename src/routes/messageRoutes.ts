import { Router } from "express";

import {
  createMessage,
  getRandomApprovedMessage,
} from "../controllers/messageController.js";

const router = Router();

router.get(
  "/random",
  getRandomApprovedMessage
);

router.post(
  "/",
  createMessage
);

export default router;