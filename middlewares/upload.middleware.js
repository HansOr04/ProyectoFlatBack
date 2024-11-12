import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear directorios necesarios si no existen
const createUploadDirectories = () => {
    const directories = [
        './uploads',
        './uploads/profiles',
        './uploads/flats',
        './uploads/messages'
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

// Crear directorios al iniciar la aplicación
createUploadDirectories();

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = './uploads/';

        switch (file.fieldname) {
            case 'profileImage':
                uploadPath += 'profiles/';
                break;
            case 'flatImages':
                uploadPath += 'flats/';
                break;
            case 'messageAttachment':
                uploadPath += 'messages/';
                break;
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Configuración principal de multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    }
});

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

// Middleware para eliminar archivos
const deleteFile = async (filePath) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

// Configuraciones específicas para diferentes tipos de upload
const uploadConfig = {
    // Para perfiles (una sola imagen)
    profile: upload.single('profileImage'),
    
    // Para departamentos (múltiples imágenes, máximo 5)
    flats: upload.array('flatImages', 5),
    
    // Para mensajes (una sola imagen)
    message: upload.single('messageAttachment')
};

export {
    upload,
    uploadConfig,
    handleUploadErrors,
    deleteFile
};