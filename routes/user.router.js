import express from 'express';
import { 
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    getProfile
} from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { isAdmin, isOwnerOrAdmin } from '../middlewares/authorization.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validateUserUpdate } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Ruta para obtener el perfil del usuario actual
router.get('/profile',
    verifyToken,
    getProfile
);

// Rutas que requieren ser administrador
router.get('/',
    verifyToken,
    isAdmin,
    getUsers
);

// Rutas para favoritos
router.get('/favorites',
    verifyToken,
    getFavorites
);

router.post('/favorites/:flatId',
    verifyToken,
    addToFavorites
);

router.delete('/favorites/:flatId',
    verifyToken,
    removeFromFavorites
);

// Rutas que requieren ser el dueño de la cuenta o admin
router.get('/:id',
    verifyToken,
    isOwnerOrAdmin,
    getUserById
);

router.put('/:id',
    verifyToken,
    isOwnerOrAdmin,
    upload.single('profileImage'),
    validateUserUpdate,
    updateUser
);

router.delete('/:id',
    verifyToken,
    isOwnerOrAdmin,
    deleteUser
);

export default router;