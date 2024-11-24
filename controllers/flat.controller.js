import { Flat } from "../models/flat.models.js";
import Message from "../models/message.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

// Crear un departamento
const createFlat = async (req, res) => {
    try {
        const owner = req.user.id;
        
        const flatData = {
            ...req.body,
            owner,
            images: req.files ? req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname
            })) : []
        };

        const flat = new Flat(flatData);
        await flat.save();

        res.status(201).json({
            success: true,
            message: "Flat created successfully",
            data: flat
        });
    } catch (error) {
        // Si hay error, eliminar las imágenes subidas
        if (req.files) {
            await Promise.all(
                req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
            );
        }
        res.status(400).json({
            success: false,
            message: "Error creating flat",
            error: error.message
        });
    }
};

// Obtener todos los departamentos con filtros y paginación
const getFlats = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            city,
            minPrice,
            maxPrice,
            hasAC,
            minArea,
            available
        } = req.query;

        const filters = {};
        if (city) filters.city = new RegExp(city, 'i');
        if (minPrice) filters.rentPrice = { $gte: minPrice };
        if (maxPrice) filters.rentPrice = { ...filters.rentPrice, $lte: maxPrice };
        if (hasAC !== undefined) filters.hasAC = hasAC;
        if (minArea) filters.areaSize = { $gte: minArea };
        if (available === 'true') filters.dateAvailable = { $lte: new Date() };

        const skip = (page - 1) * limit;

        const flats = await Flat.find(filters)
            .populate('owner', 'firstName lastName email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ atCreated: -1 });

        const total = await Flat.countDocuments(filters);

        res.status(200).json({
            success: true,
            data: flats,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching flats",
            error: error.message
        });
    }
};

// Obtener un departamento por ID
const getFlatById = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id)
            .populate('owner', 'firstName lastName email')
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'firstName lastName profileImage'
                }
            });

        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        res.status(200).json({
            success: true,
            data: flat
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching flat",
            error: error.message
        });
    }
};

// Actualizar un departamento
const updateFlat = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id);
        
        if (!flat) {
            if (req.files) {
                await Promise.all(
                    req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
                );
            }
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        if (flat.owner.toString() !== req.user.id && !req.user.isAdmin) {
            if (req.files) {
                await Promise.all(
                    req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
                );
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this flat"
            });
        }

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname
            }));
            req.body.images = [...flat.images, ...newImages];
        }

        const updatedFlat = await Flat.findByIdAndUpdate(
            req.params.id,
            { 
                ...req.body,
                atUpdated: Date.now()
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Flat updated successfully",
            data: updatedFlat
        });
    } catch (error) {
        if (req.files) {
            await Promise.all(
                req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
            );
        }
        res.status(400).json({
            success: false,
            message: "Error updating flat",
            error: error.message
        });
    }
};

// Borrar un departamento
const deleteFlat = async (req, res) => {
    try {
        const flat = await Flat.findById(req.params.id);
        
        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        if (flat.owner.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this flat"
            });
        }

        // Eliminar imágenes de Cloudinary
        await Promise.all(
            flat.images.map(image => deleteFromCloudinary(image.public_id))
        );

        // Eliminar comentarios asociados
        await Message.deleteMany({ flatID: req.params.id });
        
        // Eliminar el departamento
        await Flat.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Flat and associated comments deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting flat",
            error: error.message
        });
    }
};

// Manejar imágenes del departamento
const updateImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { mainImageId, deleteImages } = req.body;
        
        const flat = await Flat.findById(id);
        
        if (!flat) {
            if (req.files) {
                await Promise.all(
                    req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
                );
            }
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        if (flat.owner.toString() !== req.user.id && !req.user.isAdmin) {
            if (req.files) {
                await Promise.all(
                    req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
                );
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        // Eliminar imágenes de Cloudinary
        if (deleteImages && deleteImages.length > 0) {
            const imagesToDelete = flat.images.filter(img => 
                deleteImages.includes(img._id.toString())
            );
            await Promise.all(
                imagesToDelete.map(img => deleteFromCloudinary(img.public_id))
            );
            flat.images = flat.images.filter(img => 
                !deleteImages.includes(img._id.toString())
            );
        }

        // Agregar nuevas imágenes
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname
            }));
            flat.images.push(...newImages);
        }

        // Actualizar imagen principal
        if (mainImageId) {
            await flat.setMainImage(mainImageId);
        }

        await flat.save();

        res.status(200).json({
            success: true,
            message: "Images updated successfully",
            data: flat
        });
    } catch (error) {
        if (req.files) {
            await Promise.all(
                req.files.map(file => deleteFromCloudinary(file.cloudinary.public_id))
            );
        }
        res.status(400).json({
            success: false,
            message: "Error updating images",
            error: error.message
        });
    }
};

// Agregar o quitar un departamento de favoritos
const toggleFavorite = async (req, res) => {
    try {
        const flatId = req.params.id;
        const userId = req.user.id;

        const user = await User.findById(userId);
        const isFavorite = user.favoriteFlats.includes(flatId);

        if (isFavorite) {
            // Remover de favoritos
            user.favoriteFlats = user.favoriteFlats.filter(id => id.toString() !== flatId);
        } else {
            // Agregar a favoritos
            user.favoriteFlats.push(flatId);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: isFavorite ? "Removed from favorites" : "Added to favorites",
            isFavorite: !isFavorite
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error toggling favorite",
            error: error.message
        });
    }
};
export { 
    createFlat, 
    getFlats, 
    getFlatById, 
    updateFlat, 
    deleteFlat,
    toggleFavorite,
    updateImages
};