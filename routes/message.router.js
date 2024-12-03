import express from 'express';
import { 
    createMessage,
    getMessagesByFlat,
    updateMessage,
    deleteMessage,
    replyToMessage,
    toggleMessageVisibility,
    getMessages,
    getMessagesByUser
} from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validateMessage, validateRating } from '../middlewares/validator.middleware.js';

const router = express.Router();
router.get('/', getMessages);

// Rutas públicas
router.get('/flat/:flatID', getMessagesByFlat); // Obtener comentarios y calificaciones de un flat

// Rutas que requieren autenticación
router.post('/flat/:flatID',
    verifyToken,
    upload.single('attachment'),
    validateMessage,
    validateRating, // Nuevo middleware para validar calificaciones
    createMessage
);
router.get('/user/:userID', getMessagesByUser);

router.post('/:id/reply',
    verifyToken,
    upload.single('attachment'),
    validateMessage,
    replyToMessage
);

router.put('/:id',
    verifyToken,
    upload.single('attachment'),
    validateMessage,
    validateRating, // Validación para actualizaciones de calificación
    updateMessage
);

router.delete('/:id',
    verifyToken,
    deleteMessage
);

// Rutas de administración
router.patch('/:id/visibility',
    verifyToken,
    isAdmin,
    toggleMessageVisibility
);

// Middleware de manejo de errores específico para esta ruta
router.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            errors: Object.values(err.errors).map(e => e.message)
        });
    }
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: "File upload error",
            error: err.message
        });
    }
    next(err);
});

export default router;