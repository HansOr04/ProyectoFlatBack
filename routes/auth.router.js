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