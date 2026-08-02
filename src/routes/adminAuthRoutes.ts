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

/*
|--------------------------------------------------------------------------
| Admin Login
|--------------------------------------------------------------------------
|
| POST /api/admin/auth/login
|
| Public endpoint. Credentials are verified here and
| an HTTP-only authentication cookie is issued.
|
|--------------------------------------------------------------------------
*/

router.post(
  "/login",
  loginAdmin
);

/*
|--------------------------------------------------------------------------
| Current Admin
|--------------------------------------------------------------------------
|
| GET /api/admin/auth/me
|
| Protected endpoint. Returns the currently authenticated
| administrator.
|
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  requireAdminAuth,
  getCurrentAdmin
);

/*
|--------------------------------------------------------------------------
| Admin Logout
|--------------------------------------------------------------------------
|
| POST /api/admin/auth/logout
|
| Protected endpoint. Clears the administrator session.
|
|--------------------------------------------------------------------------
*/

router.post(
  "/logout",
  requireAdminAuth,
  logoutAdmin
);

export default router;