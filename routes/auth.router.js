import express from 'express';
import { 
    register, 
    login, 
    changePassword, 
    refreshUserToken,
    forgotPasswordRequest,
    resetPassword
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadConfig, handleUploadErrors } from '../middlewares/upload.middleware.js';
import { 
    validateRegister, 
    validateLogin, 
    validateChangePassword,
    validateForgotPassword,    // Asegúrate de crear este validador
    validateResetPassword     // Asegúrate de crear este validador
} from '../middlewares/validator.middleware.js';

const router = express.Router();

// Rutas públicas
router.post('/register', 
    ...uploadConfig.profile,
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

// Rutas para recuperación de contraseña (no requieren autenticación)
router.post('/forgot-password',
    validateForgotPassword,
    forgotPasswordRequest
);

router.post('/reset-password/:token',
    validateResetPassword,
    resetPassword
);

// Rutas protegidas
router.post('/change-password',
    verifyToken,
    validateChangePassword,
    changePassword
);

export default router;