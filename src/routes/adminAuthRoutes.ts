import { Router } from "express";

import {
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
} from "../controllers/adminAuthController.js";

import {
  requireAdminAuth,
} from "../middleware/adminAuth.js";

const router = Router();

router.post(
  "/login",
  loginAdmin
);

router.get(
  "/me",
  requireAdminAuth,
  getCurrentAdmin
);

router.post(
  "/logout",
  requireAdminAuth,
  logoutAdmin
);

export default router;