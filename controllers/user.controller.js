
import { User } from "../models/user.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";
import { Flat } from "../models/flat.models.js";
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Agregar más logging
        console.log('Request Body:', req.body);
        console.log('Request User:', req.user);
        console.log('Request Params:', req.params);
        console.log('Update ID:', id);

        // Validar ID
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID de usuario no proporcionado"
            });
        }

        // Verificar que el usuario existe
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado",
                details: { id }
            });
        }

        // Verificar autorización con más detalles
        if (id !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "No autorizado para actualizar este usuario",
                details: {
                    requestedId: id,
                    userId: req.user.id,
                    isAdmin: req.user.isAdmin
                }
            });
        }

        const updateData = { ...req.body };
        console.log('Update Data:', updateData);

        // Solo permitir actualización de isAdmin si el usuario es admin
        if (!req.user.isAdmin) {
            delete updateData.isAdmin;
        }

        // No permitir actualización de campos sensibles
        delete updateData.password;

        // Verificar que hay datos para actualizar
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron datos para actualizar"
            });
        }

        // Intentar actualizar
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
                message: "Error al actualizar el usuario",
                details: updateData
            });
        }

        console.log('Updated User:', updatedUser);

        res.status(200).json({
            success: true,
            message: "Usuario actualizado exitosamente",
            data: updatedUser
        });

    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(400).json({
            success: false,
            message: "Error al actualizar usuario",
            error: error.message,
            stack: error.stack
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

        if (id !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const user = await User.findById(id);
        if (!user || user.atDeleted) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Eliminar imagen de perfil si existe y no es la imagen por defecto
        if (user.profileImageId && 
            user.profileImageId !== "uploads/profiles/default/default-profile") {
            await deleteFromCloudinary(user.profileImageId);
        }

        // Actualizar el estado de los flats asociados
        await Flat.updateMany(
            { _id: { $in: user.flatsOwned } },
            { $set: { atDeleted: new Date() } }
        );

        // Realizar borrado lógico
        user.atDeleted = new Date();
        user.profileImage = "https://res.cloudinary.com/dzerzykxk/image/upload/v1/uploads/profiles/default/default-profile.jpg";
        user.profileImageId = "uploads/profiles/default/default-profile";
        await user.save();

        res.status(200).json({
            success: true,
            message: "User and associated flats deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting user",
            error: error.message
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