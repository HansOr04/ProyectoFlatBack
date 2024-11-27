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
import { upload, uploadConfig, handleUploadErrors } from '../middlewares/upload.middleware.js';
import { validateFlatCreation, validateFlatUpdate } from '../middlewares/validator.middleware.js';

const router = express.Router();

// Configuración de caché para rutas públicas
const cacheControl = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // Cache por 5 minutos
    next();
};

// Rutas públicas
router.get('/', cacheControl, getFlats);
router.get('/:id', cacheControl, getFlatById);

// Rutas protegidas
router.post('/',
    verifyToken,
    uploadConfig.flats, // Configuración específica para flats
    handleUploadErrors,
    validateFlatCreation,
    createFlat
);

router.put('/:id',
    verifyToken,
    isAdminOrOwner,
    uploadConfig.flats,
    handleUploadErrors,
    validateFlatUpdate,
    updateFlat
);

router.delete('/:id',
    verifyToken,
    isAdminOrOwner,
    deleteFlat
);

// Ruta para manejo de imágenes
router.put('/:id/images',
    verifyToken,
    isAdminOrOwner,
    uploadConfig.flats,
    handleUploadErrors,
    updateImages
);

// Ruta para favoritos
router.post('/:id/favorite',
    verifyToken,
    toggleFavorite
);

// Manejo de errores específico para esta ruta
router.use((err, req, res, next) => {
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message,
            code: 'UPLOAD_ERROR'
        });
    }
    next(err);
});

export default router;