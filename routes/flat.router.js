import express from 'express';
import { 
    createFlat, 
    getFlats, 
    getFlatById, 
    updateFlat, 
    deleteFlat, 
    toggleFavorite,
    updateImages 
} from '../controllers/flat.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { isAdminOrOwner } from '../middlewares/authorization.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validateFlatCreation, validateFlatUpdate } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Rutas públicas
router.get('/', getFlats); // Listar todos los departamentos
router.get('/:id', getFlatById); // Obtener un departamento específico

// Rutas protegidas
router.post('/',
    verifyToken, // Verificar autenticación
    upload.array('images', 5), // Permitir subir hasta 5 imágenes
    validateFlatCreation, // Validar datos de creación
    createFlat
);

router.put('/:id',
    verifyToken,
    isAdminOrOwner, // Verificar si es admin o dueño
    upload.array('images', 5),
    validateFlatUpdate,
    updateFlat
);

router.delete('/:id',
    verifyToken,
    isAdminOrOwner,
    deleteFlat
);

// Rutas para manejo de imágenes
router.put('/:id/images',
    verifyToken,
    isAdminOrOwner,
    upload.array('images', 5),
    updateImages
);

// Rutas para favoritos
router.post('/:id/favorite',
    verifyToken,
    toggleFavorite
);

export default router;