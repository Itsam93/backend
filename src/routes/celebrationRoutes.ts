import { Router } from "express";

import {
  getLatestApprovedContent,
} from "../controllers/celebrationController.js";

const router = Router();

router.get(
  "/latest-approved",
  getLatestApprovedContent
);

export default router;