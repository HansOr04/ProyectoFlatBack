import { Flat } from "../models/flat.models.js";
import {Message} from "../models/message.model.js";
import { User } from "../models/user.model.js"; // Añadido para toggleFavorite
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

// Crear un departamento
const createFlat = async (req, res) => {
    try {
        const owner = req.user.id;
        
        // Validar que se envíen imágenes
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required"
            });
        }

        // Procesar las imágenes
        let images = req.files.map((file, index) => ({
            url: file.path,
            public_id: file.filename,
            description: file.originalname,
            isMainImage: index === 0
        }));

        // Crear el objeto de datos del departamento
        const flatData = {
            ...req.body,
            owner,
            images
        };

        // Convertir los valores numéricos
        if (flatData.areaSize) flatData.areaSize = Number(flatData.areaSize);
        if (flatData.rentPrice) flatData.rentPrice = Number(flatData.rentPrice);
        if (flatData.yearBuilt) flatData.yearBuilt = Number(flatData.yearBuilt);
        if (flatData.hasAC) flatData.hasAC = flatData.hasAC === 'true';

        const flat = new Flat(flatData);
        await flat.save();

        // Poblar el owner antes de enviar la respuesta
        await flat.populate('owner', 'firstName lastName email');

        res.status(201).json({
            success: true,
            message: "Flat created successfully",
            data: flat
        });
    } catch (error) {
        if (req.files) {
            for (const file of req.files) {
                try {
                    await deleteFromCloudinary(file.filename);
                } catch (deleteError) {
                    console.error('Error deleting file:', deleteError);
                }
            }
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
        if (minPrice) filters.rentPrice = { $gte: Number(minPrice) };
        if (maxPrice) filters.rentPrice = { ...filters.rentPrice, $lte: Number(maxPrice) };
        if (hasAC !== undefined) filters.hasAC = hasAC === 'true';
        if (minArea) filters.areaSize = { $gte: Number(minArea) };
        if (available === 'true') filters.dateAvailable = { $lte: new Date() };

        const skip = (page - 1) * limit;

        const [flats, total] = await Promise.all([
            Flat.find(filters)
                .populate('owner', 'firstName lastName email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ atCreated: -1 }),
            Flat.countDocuments(filters)
        ]);

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
        const [flat, messages] = await Promise.all([
            Flat.findById(req.params.id)
                .populate('owner', 'firstName lastName email'),
            Message.find({ flatID: req.params.id })
                .populate('author', 'firstName lastName profileImage')
                .sort({ atCreated: -1 })
        ]);

        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...flat.toObject(),
                messages
            }
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
                    req.files.map(file => deleteFromCloudinary(file.filename))
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
                    req.files.map(file => deleteFromCloudinary(file.filename))
                );
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this flat"
            });
        }

        // Convertir campos numéricos
        const updateData = { ...req.body };
        if (updateData.rentPrice) {
            updateData.rentPrice = Number(updateData.rentPrice);
            if (isNaN(updateData.rentPrice) || updateData.rentPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Rent price must be a positive number"
                });
            }
        }
        if (updateData.areaSize) updateData.areaSize = Number(updateData.areaSize);
        if (updateData.yearBuilt) updateData.yearBuilt = Number(updateData.yearBuilt);
        if (updateData.hasAC !== undefined) updateData.hasAC = updateData.hasAC === 'true';

        // Manejar imágenes nuevas si existen
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.path,
                public_id: file.filename,
                description: file.originalname
            }));
            updateData.images = [...flat.images, ...newImages];
        }

        // Actualizar
        const updatedFlat = await Flat.findByIdAndUpdate(
            req.params.id,
            { 
                ...updateData,
                atUpdated: Date.now()
            },
            { new: true }
        ).populate('owner', 'firstName lastName email');

        res.status(200).json({
            success: true,
            message: "Flat updated successfully",
            data: updatedFlat
        });
    } catch (error) {
        if (req.files) {
            await Promise.all(
                req.files.map(file => deleteFromCloudinary(file.filename))
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