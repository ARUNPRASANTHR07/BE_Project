import { Router } from "express";
import { login, refreshToken } from "../controllers/authController";

const router = Router();

// Public route (No JWT required)
router.post("/login", login);
router.post("/refresh", refreshToken);




export default router;
