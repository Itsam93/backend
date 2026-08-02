import { Router } from "express";
import {
  getRandomApprovedMessage,
} from "../controllers/messageController.js";

const router = Router();

router.get(
  "/random",
  getRandomApprovedMessage
);

export default router;