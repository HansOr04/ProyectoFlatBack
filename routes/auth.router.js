//? * /users/login POST
//? * /users/register POST
import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;
