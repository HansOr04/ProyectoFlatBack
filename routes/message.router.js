import express from 'express';
import { 
    createMessage,
    getMessagesByFlat,
    updateMessage,
    deleteMessage,
    replyToMessage,
    toggleMessageVisibility
} from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/authorization.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validateMessage } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/flat/:flatID', getMessagesByFlat); // Obtener comentarios de un flat específico

// Rutas que requieren autenticación
router.post('/flat/:flatID',
    verifyToken,
    upload.single('attachment'), // Permite subir una imagen como adjunto
    validateMessage,
    createMessage
);

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

export default router;