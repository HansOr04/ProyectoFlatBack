
import { User } from "../models/user.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";
import { Flat } from "../models/flat.models.js";
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Update request:', {
            targetId: id,
            requestingUser: {
                id: req.user.id,
                isAdmin: req.user.isAdmin
            },
            updateData: req.body
        });

        // Primero buscar el usuario existente que se quiere actualizar
        const targetUser = await User.findById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }

        // Verificar autorización
        const isAdmin = req.user.isAdmin;
        const isSelfUpdate = id === req.user.id;

        if (!isSelfUpdate && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "No autorizado para actualizar este usuario"
            });
        }

        // Preparar los datos de actualización
        let updateData = { ...req.body };

        // Validación especial para el email
        if (updateData.hasOwnProperty('email') && !isAdmin) {
            delete updateData.email;
        }

        // No permitir actualización de campos sensibles
        delete updateData.password;
        delete updateData.isAdmin;

        // Si hay archivo de imagen
        if (req.file) {
            if (targetUser.profileImageId && 
                targetUser.profileImageId !== "uploads/profiles/default/default-profile") {
                try {
                    await deleteFromCloudinary(targetUser.profileImageId);
                } catch (error) {
                    console.error('Error eliminando imagen anterior:', error);
                }
            }
            updateData.profileImage = req.file.path;
            updateData.profileImageId = req.file.filename;
        }

        // Verificar si hay datos para actualizar
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron datos para actualizar"
            });
        }

        // Realizar la actualización
        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                ...updateData,
                atUpdated: Date.now()
            },
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: "Error al actualizar el usuario"
            });
        }

        res.status(200).json({
            success: true,
            message: "Usuario actualizado exitosamente",
            data: updatedUser
        });

    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(400).json({
            success: false,
            message: error.message || "Error al actualizar usuario"
        });
    }
};
const getUsers = async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const users = await User.find({ atDeleted: null })
            .select('-password')
            .populate('favoriteFlats')
            .populate('flatsOwned');

        const usersWithCounts = users.map(user => ({
            ...user.toObject(),
            totalFlats: user.flatsOwned.length
        }));

        res.status(200).json({
            success: true,
            data: usersWithCounts
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching users",
            error: error.message
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId)
            .select('-password')
            .populate('favoriteFlats')
            .populate('flatsOwned');

        if (!user || user.atDeleted) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = user.toObject();
        userData.totalFlats = user.flatsOwned.length;

        res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching profile",
            error: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (id !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const user = await User.findById(id)
            .select('-password')
            .populate('favoriteFlats')
            .populate('flatsOwned');

        if (!user || user.atDeleted) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = user.toObject();
        userData.totalFlats = user.flatsOwned.length;

        res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching user",
            error: error.message
        });
    }
};

const getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate('favoriteFlats');
        res.status(200).json({
            success: true,
            data: user.favoriteFlats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching favorites",
            error: error.message
        });
    }
};

const addToFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { flatId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.favoriteFlats.includes(flatId)) {
            return res.status(400).json({
                success: false,
                message: "Flat already in favorites"
            });
        }

        user.favoriteFlats.push(flatId);
        await user.save();
        await user.populate('favoriteFlats');

        res.status(200).json({
            success: true,
            message: "Flat added to favorites successfully",
            data: user.favoriteFlats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error adding to favorites",
            error: error.message
        });
    }
};

const removeFromFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { flatId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.favoriteFlats.includes(flatId)) {
            return res.status(400).json({
                success: false,
                message: "Flat not in favorites"
            });
        }

        user.favoriteFlats = user.favoriteFlats.filter(
            id => id.toString() !== flatId
        );
        await user.save();
        await user.populate('favoriteFlats');

        res.status(200).json({
            success: true,
            message: "Flat removed from favorites successfully",
            data: user.favoriteFlats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error removing from favorites",
            error: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Iniciando proceso de eliminación para usuario:', id);

        // Validar autorización
        if (id !== req.user.id && !req.user.isAdmin) {
            console.log('Intento de eliminación no autorizado:', {
                targetId: id,
                requestingUserId: req.user.id,
                isAdmin: req.user.isAdmin
            });
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        // Buscar usuario
        const user = await User.findById(id);
        console.log('Usuario encontrado:', user ? 'Sí' : 'No');

        if (!user || user.atDeleted) {
            console.log('Usuario no encontrado o ya eliminado:', {
                exists: !!user,
                isDeleted: user?.atDeleted
            });
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Comenzar proceso de eliminación
        try {
            console.log('Iniciando proceso de eliminación de datos asociados');

            // 1. Obtener flats del usuario
            const userFlats = await Flat.find({ owner: id, atDeleted: null });
            console.log(`Encontrados ${userFlats.length} flats para eliminar`);

            // 2. Eliminar imágenes
            const deleteImagePromises = [];
            let deletedImages = 0;
            
            // 2.1 Eliminar imagen de perfil
            if (user.profileImageId && 
                user.profileImageId !== "uploads/profiles/default/default-profile") {
                try {
                    await deleteFromCloudinary(user.profileImageId);
                    deletedImages++;
                    console.log('Imagen de perfil eliminada');
                } catch (imageError) {
                    console.error('Error al eliminar imagen de perfil:', imageError);
                }
            }

            // 2.2 Eliminar imágenes de flats
            for (const flat of userFlats) {
                for (const image of flat.images) {
                    try {
                        await deleteFromCloudinary(image.public_id);
                        deletedImages++;
                    } catch (imageError) {
                        console.error('Error al eliminar imagen de flat:', {
                            flatId: flat._id,
                            imageId: image.public_id,
                            error: imageError.message
                        });
                    }
                }
            }
            console.log(`Eliminadas ${deletedImages} imágenes en total`);

            // 3. Eliminar mensajes
            const messagesResult = await Message.deleteMany({ 
                flatID: { $in: userFlats.map(flat => flat._id) } 
            });
            console.log(`Eliminados ${messagesResult.deletedCount} mensajes`);

            // 4. Eliminar referencias de favoritos
            const favoritesResult = await User.updateMany(
                { favoriteFlats: { $in: userFlats.map(flat => flat._id) } },
                { $pull: { favoriteFlats: { $in: userFlats.map(flat => flat._id) } } }
            );
            console.log(`Actualizadas ${favoritesResult.modifiedCount} referencias de favoritos`);

            // 5. Eliminar flats
            const flatsResult = await Flat.deleteMany({ owner: id });
            console.log(`Eliminados ${flatsResult.deletedCount} flats`);

            // 6. Marcar usuario como eliminado
            user.atDeleted = new Date();
            user.profileImage = "https://res.cloudinary.com/dzerzykxk/image/upload/v1/uploads/profiles/default/default-profile.jpg";
            user.profileImageId = "uploads/profiles/default/default-profile";
            await user.save();
            console.log('Usuario marcado como eliminado');

            res.status(200).json({
                success: true,
                message: "User and all associated data deleted successfully",
                details: {
                    deletedImages,
                    deletedMessages: messagesResult.deletedCount,
                    updatedFavorites: favoritesResult.modifiedCount,
                    deletedFlats: flatsResult.deletedCount
                }
            });

        } catch (deleteError) {
            console.error('Error durante el proceso de eliminación:', {
                error: deleteError.message,
                stack: deleteError.stack
            });
            
            if (user.atDeleted) {
                user.atDeleted = null;
                await user.save();
                console.log('Revertido el estado de eliminación del usuario');
            }

            throw new Error(`Error during deletion process: ${deleteError.message}`);
        }

    } catch (error) {
        console.error('Error principal en deleteUser:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(400).json({
            success: false,
            message: "Error deleting user and associated data",
            error: error.message,
            details: error.toString()
        });
    }
};

export {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    getProfile
};