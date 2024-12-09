
import { User } from "../models/user.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";
import { Flat } from "../models/flat.models.js";
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Body:', req.body);
        console.log('File:', req.file);

        // Verificar autorización
        if (id !== req.user.id && !req.user.isAdmin) {
            // No es necesario eliminar la imagen aquí ya que Cloudinary la maneja
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updateData = { ...req.body };

        // Solo permitir actualización de isAdmin si el usuario que hace la petición es admin
        if (!req.user.isAdmin) {
            delete updateData.isAdmin;
        }

        // No permitir actualización de campos sensibles
        delete updateData.password;

        // Actualizar imagen de perfil si se proporcionó
        if (req.file) {
            console.log('Procesando nueva imagen:', req.file);
            
            // Eliminar imagen anterior de Cloudinary si existe
            if (existingUser.profileImageId && 
                existingUser.profileImageId !== "uploads/profiles/default/default-profile") {
                try {
                    await deleteFromCloudinary(existingUser.profileImageId);
                } catch (error) {
                    console.error('Error eliminando imagen anterior:', error);
                }
            }

            // Extraer el public_id del filename
            const public_id = req.file.filename;
            
            // Actualizar con la nueva imagen
            updateData.profileImage = req.file.path;
            updateData.profileImageId = public_id;
        }

        console.log('Datos de actualización finales:', updateData);

        // Actualizar usuario
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

        console.log('Usuario actualizado:', updatedUser);

        if (!updatedUser) {
            throw new Error('Error al actualizar el usuario');
        }

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: updatedUser
        });

    } catch (error) {
        console.error('Error en updateUser:', error);
        // No es necesario eliminar el archivo aquí ya que Cloudinary lo maneja
        
        res.status(400).json({
            success: false,
            message: "Error updating user",
            error: error.message
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