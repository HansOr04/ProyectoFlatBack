import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dzerzykxk',
    api_key: '425821271237374',
    api_secret: 'g34Np2Ey0zNXJHkmciHirA6Ei3Q'
});

// Configuración del storage para Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: (req, file) => {
            // Determinar la carpeta según el tipo de archivo
            if (file.fieldname === 'profileImage') return 'uploads/profiles';
            if (file.fieldname === 'flatImages') return 'uploads/flats';
            if (file.fieldname === 'messageAttachment') return 'uploads/messages';
            return 'uploads/others';
        },
        format: async (req, file) => {
            // Mantener el formato original o convertir a uno específico
            if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) return 'jpg';
            if (file.mimetype.includes('png')) return 'png';
            return 'webp'; // formato por defecto
        },
        public_id: (req, file) => {
            // Generar un ID único para el archivo
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `${file.fieldname}-${uniqueSuffix}`;
        },
        transformation: [
            { width: 1000, crop: "limit" }, // limitar el tamaño máximo
            { quality: "auto" } // optimizar calidad
        ]
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WEBP images are allowed'));
    }
};

// Configuración de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

// Función para eliminar archivo de Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        throw error;
    }
};

// Configuraciones específicas para diferentes tipos de upload
const uploadConfig = {
    // Para perfiles (una sola imagen)
    profile: [
        upload.single('profileImage'),
        (req, res, next) => {
            if (req.file) {
                req.file.cloudinary = {
                    url: req.file.path,
                    public_id: req.file.filename
                };
            }
            next();
        }
    ],
    
    // Para departamentos (múltiples imágenes, máximo 5)
    flats: [
        upload.array('flatImages', 5),
        (req, res, next) => {
            if (req.files) {
                req.files = req.files.map(file => ({
                    ...file,
                    cloudinary: {
                        url: file.path,
                        public_id: file.filename
                    }
                }));
            }
            next();
        }
    ],
    
    // Para mensajes (una sola imagen)
    message: [
        upload.single('messageAttachment'),
        (req, res, next) => {
            if (req.file) {
                req.file.cloudinary = {
                    url: req.file.path,
                    public_id: req.file.filename
                };
            }
            next();
        }
    ]
};

// Middleware para manejar errores de upload
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 5MB limit'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files uploaded'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field name in upload'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
        }
    }
    if (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
    next();
};

export {
    upload,
    uploadConfig,
    handleUploadErrors,
    deleteFromCloudinary
};