import { User } from "../models/user.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

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
            .populate('favoriteFlats');

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching users",
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
            .populate('favoriteFlats');

        if (!user || user.atDeleted) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching user",
            error: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Verificar autorización
        if (id !== req.user.id && !req.user.isAdmin) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const existingUser = await User.findById(id);
        if (!existingUser) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Solo permitir actualización de isAdmin si el usuario que hace la petición es admin
        if (!req.user.isAdmin) {
            delete updateData.isAdmin;
        }

        // No permitir actualización de campos sensibles
        delete updateData.password;

        // Actualizar imagen de perfil si se proporcionó
        if (req.file) {
            // Eliminar imagen anterior de Cloudinary si existe
            if (existingUser.profileImageId && 
                existingUser.profileImageId !== "uploads/profiles/default/default-profile") {
                await deleteFromCloudinary(existingUser.profileImageId);
            }
            updateData.profileImage = req.file.cloudinary.url;
            updateData.profileImageId = req.file.cloudinary.public_id;
        }

        const user = await User.findByIdAndUpdate(
            id,
            { 
                ...updateData,
                atUpdated: Date.now()
            },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: user
        });
    } catch (error) {
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error updating user",
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

        // Realizar borrado lógico
        user.atDeleted = new Date();
        user.profileImage = "https://res.cloudinary.com/dzerzykxk/image/upload/v1/uploads/profiles/default/default-profile.jpg";
        user.profileImageId = "uploads/profiles/default/default-profile";
        await user.save();

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting user",
            error: error.message
        });
    }
};

// Las funciones de favoritos se mantienen igual ya que no manejan archivos
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

export {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getFavorites,
    addToFavorites,
    removeFromFavorites
};