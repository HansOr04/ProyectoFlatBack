
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