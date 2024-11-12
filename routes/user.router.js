import express from 'express';
import { register, login, changePassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadConfig, handleUploadErrors } from '../middlewares/upload.middleware.js';
import { validateRegister, validateLogin, validateChangePassword } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Rutas públicas
router.post('/register', 
    uploadConfig.profile,      // Usa la configuración específica para perfiles
    handleUploadErrors,        // Manejo de errores de upload
    validateRegister,          // Validación de datos
    register
);

router.post('/login',
    validateLogin,
    login
);

// Rutas protegidas
router.post('/change-password',
    verifyToken,
    validateChangePassword,
    changePassword
);

export default router;