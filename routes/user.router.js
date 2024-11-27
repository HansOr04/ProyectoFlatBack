//? * /users GET
//? * /users/:id GET
//? * /users/:id PUT
//? * /users/:id DELETE
import express from "express";
import {
  saveUser,
  getUser,
  sendWelcomeEmail,
  deleteUser,
} from "../controllers/user.controller.js";
const router = express.Router();

router.post("/", saveUser);
router.get("/", getUser);
router.post("/send-welcome-email", sendWelcomeEmail);
router.delete("/:id", deleteUser);

export default router;
