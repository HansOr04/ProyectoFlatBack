import { Flat } from "../models/flat.models.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

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
            url: file.cloudinary.url,
            public_id: file.cloudinary.public_id,
            description: file.originalname,
            isMainImage: index === 0
        }));

        // Parsear todos los campos JSON del body
        const parseJsonField = (field) => {
            try {
                return field ? JSON.parse(field) : {};
            } catch (error) {
                return field || {};
            }
        };

        const amenities = parseJsonField(req.body.amenities);
        const houseRules = parseJsonField(req.body.houseRules);
        const location = parseJsonField(req.body.location);
        const availability = parseJsonField(req.body.availability);

        // Crear el objeto de datos del departamento
        const flatData = {
            // Información básica
            title: req.body.title,
            description: req.body.description,
            propertyType: req.body.propertyType,
            city: req.body.city,
            streetName: req.body.streetName,
            streetNumber: req.body.streetNumber,
            areaSize: Number(req.body.areaSize),
            yearBuilt: Number(req.body.yearBuilt),
            rentPrice: Number(req.body.rentPrice),
            dateAvailable: req.body.dateAvailable,
            bedrooms: Number(req.body.bedrooms),
            bathrooms: Number(req.body.bathrooms),
            maxGuests: Number(req.body.maxGuests),
            owner,
            images,

            // Objetos complejos
            amenities: {
                wifi: amenities.wifi === 'true' || amenities.wifi === true,
                tv: amenities.tv === 'true' || amenities.tv === true,
                kitchen: amenities.kitchen === 'true' || amenities.kitchen === true,
                washer: amenities.washer === 'true' || amenities.washer === true,
                airConditioning: amenities.airConditioning === 'true' || amenities.airConditioning === true,
                heating: amenities.heating === 'true' || amenities.heating === true,
                workspace: amenities.workspace === 'true' || amenities.workspace === true,
                pool: amenities.pool === 'true' || amenities.pool === true,
                gym: amenities.gym === 'true' || amenities.gym === true,
                elevator: amenities.elevator === 'true' || amenities.elevator === true,
                petsAllowed: amenities.petsAllowed === 'true' || amenities.petsAllowed === true,
                smokeAlarm: amenities.smokeAlarm === 'true' || amenities.smokeAlarm === true,
                firstAidKit: amenities.firstAidKit === 'true' || amenities.firstAidKit === true,
                fireExtinguisher: amenities.fireExtinguisher === 'true' || amenities.fireExtinguisher === true,
                securityCameras: amenities.securityCameras === 'true' || amenities.securityCameras === true,
                parking: {
                    available: amenities.parking?.available === 'true' || amenities.parking?.available === true,
                    type: amenities.parking?.type || 'none',
                    details: amenities.parking?.details || ''
                }
            },

            houseRules: {
                smokingAllowed: houseRules.smokingAllowed === 'true' || houseRules.smokingAllowed === true,
                eventsAllowed: houseRules.eventsAllowed === 'true' || houseRules.eventsAllowed === true,
                quietHours: {
                    start: houseRules.quietHours?.start || '22:00',
                    end: houseRules.quietHours?.end || '08:00'
                },
                additionalRules: Array.isArray(houseRules.additionalRules) ? 
                    houseRules.additionalRules.filter(rule => rule !== '') : []
            },

            location: {
                coordinates: {
                    lat: location.coordinates?.lat || '',
                    lng: location.coordinates?.lng || ''
                },
                neighborhood: location.neighborhood || '',
                zipCode: location.zipCode || '',
                publicTransport: Array.isArray(location.publicTransport) ? 
                    location.publicTransport.filter(transport => transport !== '') : [],
                nearbyPlaces: Array.isArray(location.nearbyPlaces) ? 
                    location.nearbyPlaces.filter(place => place !== '') : []
            },

            availability: {
                minimumStay: Number(availability.minimumStay) || 1,
                maximumStay: Number(availability.maximumStay) || 365,
                instantBooking: availability.instantBooking === 'true' || availability.instantBooking === true,
                advanceNotice: Number(availability.advanceNotice) || 1
            },

            // Inicializar ratings
            ratings: {
                overall: 0,
                aspects: {
                    cleanliness: 0,
                    communication: 0,
                    location: 0,
                    accuracy: 0,
                    value: 0
                },
                totalReviews: 0
            }
        };

        const flat = new Flat(flatData);
        await flat.save();
        await User.findByIdAndUpdate(
            owner,
            { $push: { flatsOwned: flat._id } }
        );

        await flat.populate('owner', 'firstName lastName email');

        res.status(201).json({
            success: true,
            message: "Flat created successfully",
            data: flat
        });
    } catch (error) {
        console.error('Error completo:', error);
        if (req.files) {
            for (const file of req.files) {
                try {
                    await deleteFromCloudinary(file.cloudinary.public_id);
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
const getFlats = async (req, res) => {
    try {
        const {
            owner,
            page = 1,
            limit = 10,
            city,
            minPrice,
            maxPrice,
            propertyType,
            bedrooms,
            bathrooms,
            minArea,
            maxArea,
            amenities,
            parking,
            petsAllowed,
            available,
            minRating,
            sortBy,
            order = 'desc'
        } = req.query;
 
        const filters = {};
 
        // Filtro de propietario
        if (owner === 'true' && req.user) {
            filters.owner = req.user.id;
        }
 
        // Filtros básicos
        if (city) filters.city = new RegExp(city, 'i');
        if (minPrice) filters.rentPrice = { $gte: Number(minPrice) };
        if (maxPrice) filters.rentPrice = { ...filters.rentPrice, $lte: Number(maxPrice) };
        if (propertyType) filters.propertyType = propertyType;
        if (bedrooms) filters.bedrooms = Number(bedrooms);
        if (bathrooms) filters.bathrooms = Number(bathrooms);
        if (minArea) filters.areaSize = { $gte: Number(minArea) };
        if (maxArea) filters.areaSize = { ...filters.areaSize, $lte: Number(maxArea) };
        if (available === 'true') filters.dateAvailable = { $lte: new Date() };
        if (minRating) filters['ratings.overall'] = { $gte: Number(minRating) };
 
        // Filtros de amenidades
        if (amenities) {
            const amenityList = amenities.split(',');
            amenityList.forEach(amenity => {
                filters[`amenities.${amenity}`] = true;
            });
        }
 
        // Filtro de estacionamiento
        if (parking) {
            filters['amenities.parking.available'] = true;
            if (parking !== 'any') {
                filters['amenities.parking.type'] = parking;
            }
        }
 
        // Filtro de mascotas
        if (petsAllowed === 'true') {
            filters['amenities.petsAllowed'] = true;
        }
 
        const skip = (page - 1) * limit;
 
        // Configuración de ordenamiento
        let sortOptions = {};
        switch (sortBy) {
            case 'price':
                sortOptions.rentPrice = order === 'desc' ? -1 : 1;
                break;
            case 'rating':
                sortOptions['ratings.overall'] = order === 'desc' ? -1 : 1;
                break;
            case 'date':
                sortOptions.atCreated = order === 'desc' ? -1 : 1;
                break;
            default:
                sortOptions.atCreated = -1;
        }
 
        const [flats, total] = await Promise.all([
            Flat.find(filters)
                .populate('owner', 'firstName lastName email')
                .skip(skip)
                .limit(parseInt(limit))
                .sort(sortOptions),
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

const getFlatById = async (req, res) => {
   try {
       const [flat, reviews] = await Promise.all([
           Flat.findById(req.params.id)
               .populate('owner', 'firstName lastName email'),
           Message.find({
               flatID: req.params.id,
               parentMessage: null,
               isHidden: false
           })
           .populate('author', 'firstName lastName profileImage')
           .sort({ atCreated: -1 })
       ]);

       if (!flat) {
           return res.status(404).json({
               success: false,
               message: "Flat not found"
           });
       }

       const ratingDistribution = {
           1: 0, 2: 0, 3: 0, 4: 0, 5: 0
       };

       reviews.forEach(review => {
           if (review.rating?.overall) {
               ratingDistribution[Math.floor(review.rating.overall)]++;
           }
       });

       res.status(200).json({
           success: true,
           data: {
               ...flat.toObject(),
               reviews,
               ratingDistribution
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

        // Parsear los campos JSON del body
        const updateData = {
            ...req.body,
            amenities: req.body.amenities ? JSON.parse(req.body.amenities) : undefined,
            houseRules: req.body.houseRules ? JSON.parse(req.body.houseRules) : undefined,
            location: req.body.location ? JSON.parse(req.body.location) : undefined,
            availability: req.body.availability ? JSON.parse(req.body.availability) : undefined
        };

        // Procesar campos booleanos de amenities si existen
        if (updateData.amenities) {
            const booleanFields = [
                'wifi', 'tv', 'kitchen', 'washer', 'airConditioning', 
                'heating', 'workspace', 'pool', 'gym', 'elevator', 
                'petsAllowed', 'smokeAlarm', 'firstAidKit', 
                'fireExtinguisher', 'securityCameras'
            ];

            booleanFields.forEach(field => {
                if (updateData.amenities[field] !== undefined) {
                    updateData.amenities[field] = updateData.amenities[field] === true || 
                                                updateData.amenities[field] === 'true';
                }
            });

            // Procesar parking específicamente
            if (updateData.amenities.parking) {
                updateData.amenities.parking.available = 
                    updateData.amenities.parking.available === true || 
                    updateData.amenities.parking.available === 'true';
            }
        }

        // Manejar imágenes a eliminar
        const imagesToDelete = req.body.imagesToDelete ? JSON.parse(req.body.imagesToDelete) : [];
        if (imagesToDelete.length > 0) {
            // Encontrar las imágenes a eliminar
            const imagesToRemove = flat.images.filter(img => imagesToDelete.includes(img._id.toString()));
            
            // Eliminar de Cloudinary
            await Promise.all(
                imagesToRemove.map(img => deleteFromCloudinary(img.public_id))
            );

            // Filtrar las imágenes que se mantendrán
            updateData.images = flat.images.filter(img => !imagesToDelete.includes(img._id.toString()));
        }

        // Procesar nuevas imágenes si existen
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname,
                isMainImage: false
            }));

            // Si hay imágenes existentes, añadir las nuevas
            if (updateData.images) {
                updateData.images = [...updateData.images, ...newImages];
            } else if (imagesToDelete.length > 0) {
                // Si solo teníamos las imágenes filtradas
                updateData.images = [...flat.images.filter(img => !imagesToDelete.includes(img._id.toString())), ...newImages];
            } else {
                // Si no hay imágenes previas ni eliminaciones
                updateData.images = [...flat.images, ...newImages];
            }
        }

        // Convertir campos numéricos
        const numericFields = ['areaSize', 'yearBuilt', 'rentPrice', 'bedrooms', 'bathrooms', 'maxGuests'];
        numericFields.forEach(field => {
            if (updateData[field]) {
                updateData[field] = Number(updateData[field]);
            }
        });

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
        // Limpiar imágenes subidas en caso de error
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

       // Eliminar el flat del array flatsOwned del usuario
       await User.findByIdAndUpdate(
           flat.owner,
           { 
               $pull: { flatsOwned: flat._id },
               $set: { atUpdated: Date.now() }
           }
       );

       // Eliminar comentarios asociados
       await Message.deleteMany({ flatID: req.params.id });
       
       // Eliminar referencias en favoritos de usuarios
       await User.updateMany(
           { favoriteFlats: req.params.id },
           { $pull: { favoriteFlats: req.params.id } }
       );

       await flat.deleteOne();

       res.status(200).json({
           success: true,
           message: "Flat and associated data deleted successfully"
       });
   } catch (error) {
       res.status(400).json({
           success: false,
           message: "Error deleting flat",
           error: error.message
       });
   }
};

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

       // Eliminar imágenes seleccionadas
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
 
 const getFlatStats = async (req, res) => {
    try {
        const flatId = req.params.id;
 
        const [flat, reviews] = await Promise.all([
            Flat.findById(flatId),
            Message.find({
                flatID: flatId,
                parentMessage: null,
                isHidden: false,
                'rating.overall': { $exists: true }
            }).select('rating')
        ]);
 
        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }
 
        // Calcular distribución de calificaciones
        const ratingDistribution = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };
 
        // Calcular promedios por aspecto
        const aspectTotals = {
            cleanliness: 0,
            communication: 0,
            location: 0,
            accuracy: 0,
            value: 0
        };
 
        const aspectCounts = { ...aspectTotals };
 
        reviews.forEach(review => {
            // Contar distribución de calificaciones generales
            const overallRating = Math.floor(review.rating.overall);
            if (ratingDistribution.hasOwnProperty(overallRating)) {
                ratingDistribution[overallRating]++;
            }
 
            // Sumar calificaciones por aspecto
            if (review.rating.aspects) {
                Object.keys(aspectTotals).forEach(aspect => {
                    if (review.rating.aspects[aspect]) {
                        aspectTotals[aspect] += review.rating.aspects[aspect];
                        aspectCounts[aspect]++;
                    }
                });
            }
        });
 
        // Calcular promedios por aspecto
        const aspectAverages = {};
        Object.keys(aspectTotals).forEach(aspect => {
            aspectAverages[aspect] = aspectCounts[aspect] > 0 
                ? (aspectTotals[aspect] / aspectCounts[aspect]).toFixed(1)
                : 0;
        });
 
        res.status(200).json({
            success: true,
            data: {
                totalReviews: reviews.length,
                averageRating: flat.ratings.overall,
                ratingDistribution,
                aspectAverages
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error fetching flat statistics",
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
    updateImages,
    getFlatStats
 };