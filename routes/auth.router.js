<<<<<<< HEAD
import express from 'express';
import { register, login, changePassword, refreshUserToken } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadConfig, handleUploadErrors } from '../middlewares/upload.middleware.js';
import { validateRegister, validateLogin, validateChangePassword } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Rutas públicas
router.post('/register', 
    ...uploadConfig.profile, // Usar spread operator porque uploadConfig.profile es un array de middlewares
    handleUploadErrors,
    validateRegister,
    register
);

router.post('/login',
    validateLogin,
    login
);

// Ruta para refresh token
router.post('/refresh',
    refreshUserToken
);

// Rutas protegidas
router.post('/change-password',
    verifyToken,
    validateChangePassword,
    changePassword
);

export default router;
=======
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
>>>>>>> main
