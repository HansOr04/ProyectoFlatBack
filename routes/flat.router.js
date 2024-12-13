import express from 'express';
import { 
    createFlat, 
    getFlats, 
    getFlatById, 
    updateFlat, 
    deleteFlat, 
    toggleFavorite,
    updateImages,
    getFlatStats
} from '../controllers/flat.controller.js';
import { contactOwner } from '../controllers/contact.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { isAdminOrOwner } from '../middlewares/authorization.middleware.js';
import { upload, uploadConfig, handleUploadErrors } from '../middlewares/upload.middleware.js';
import { validateFlatCreation, validateFlatUpdate, validateContactForm} from '../middlewares/validator.middleware.js';

const router = express.Router();

// Configuración de caché para rutas públicas
const cacheControl = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // Cache por 5 minutos
    next();
};

// Rutas públicas
router.get('/', cacheControl, getFlats);
router.get('/:id', cacheControl, getFlatById);
router.get('/:id/stats', cacheControl, getFlatStats); // Nueva ruta para estadísticas

// Rutas protegidas
router.post('/',
    verifyToken,
    uploadConfig.flats,
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
router.post('/:flatId/contact',
    validateContactForm,
    contactOwner
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

// Filtros avanzados
router.get('/search/advanced', cacheControl, getFlats); // Ruta alternativa para búsqueda avanzada

// Manejo de errores específico para esta ruta
router.use((err, req, res, next) => {
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message,
            code: 'UPLOAD_ERROR'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    next(err);
});

export default router;