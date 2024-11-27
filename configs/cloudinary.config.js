import { v2 as cloudinary } from 'cloudinary';

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dzerzykxk',
    api_key: '425821271237374',
    api_secret: 'g34Np2Ey0zNXJHkmciHirA6Ei3Q'
});

// Función para crear la estructura de carpetas
const createPath = (type, id, filename) => {
    return `uploads/${type}/${id}/${filename}`;
};

// Función para subir archivo a Cloudinary
const uploadToCloudinary = async (file, type, id) => {
    try {
        const path = createPath(type, id, file.originalname);
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: path.replace(/\.[^/.]+$/, ''), // Elimina la extensión del archivo
            folder: '/',
            resource_type: 'auto'
        });

        return {
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        throw new Error(`Error uploading to Cloudinary: ${error.message}`);
    }
};

// Función para eliminar archivo de Cloudinary
const deleteFromCloudinary = async (public_id) => {
    try {
        await cloudinary.uploader.destroy(public_id);
    } catch (error) {
        throw new Error(`Error deleting from Cloudinary: ${error.message}`);
    }
};

export { uploadToCloudinary, deleteFromCloudinary };