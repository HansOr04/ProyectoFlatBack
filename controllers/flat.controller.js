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

        // Función auxiliar para parsear campos JSON y convertir strings 'true'/'false' a booleanos
        const parseJsonField = (field) => {
            try {
                if (typeof field === 'string') {
                    const parsed = JSON.parse(field);
                    return parsed;
                }
                return field || null;
            } catch (error) {
                return field;
            }
        };

        // Parsear los campos JSON del body
        const amenities = parseJsonField(req.body.amenities);
        const houseRules = parseJsonField(req.body.houseRules);
        const location = parseJsonField(req.body.location);
        const availability = parseJsonField(req.body.availability);

        // Procesar las imágenes
        const images = req.files.map((file, index) => ({
            url: file.cloudinary.url,
            public_id: file.cloudinary.public_id,
            description: file.originalname,
            isMainImage: index === 0, // Primera imagen como principal por defecto
            uploadDate: Date.now()
        }));

        // Procesar amenities asegurando valores booleanos
        const processedAmenities = {
            wifi: amenities?.wifi === true || amenities?.wifi === 'true',
            tv: amenities?.tv === true || amenities?.tv === 'true',
            kitchen: amenities?.kitchen === true || amenities?.kitchen === 'true',
            washer: amenities?.washer === true || amenities?.washer === 'true',
            airConditioning: amenities?.airConditioning === true || amenities?.airConditioning === 'true',
            heating: amenities?.heating === true || amenities?.heating === 'true',
            workspace: amenities?.workspace === true || amenities?.workspace === 'true',
            pool: amenities?.pool === true || amenities?.pool === 'true',
            gym: amenities?.gym === true || amenities?.gym === 'true',
            elevator: amenities?.elevator === true || amenities?.elevator === 'true',
            petsAllowed: amenities?.petsAllowed === true || amenities?.petsAllowed === 'true',
            smokeAlarm: amenities?.smokeAlarm === true || amenities?.smokeAlarm === 'true',
            firstAidKit: amenities?.firstAidKit === true || amenities?.firstAidKit === 'true',
            fireExtinguisher: amenities?.fireExtinguisher === true || amenities?.fireExtinguisher === 'true',
            securityCameras: amenities?.securityCameras === true || amenities?.securityCameras === 'true',
            parking: {
                available: amenities?.parking?.available === true || amenities?.parking?.available === 'true',
                type: amenities?.parking?.type || 'none',
                details: amenities?.parking?.details || ''
            }
        };

        // Procesar house rules
        const processedHouseRules = {
            smokingAllowed: houseRules?.smokingAllowed === true || houseRules?.smokingAllowed === 'true',
            eventsAllowed: houseRules?.eventsAllowed === true || houseRules?.eventsAllowed === 'true',
            quietHours: {
                start: houseRules?.quietHours?.start || '22:00',
                end: houseRules?.quietHours?.end || '08:00'
            },
            additionalRules: Array.isArray(houseRules?.additionalRules) ? 
                houseRules.additionalRules.filter(rule => rule && rule.trim() !== '') : 
                []
        };

        // Procesar location
        const processedLocation = {
            coordinates: {
                lat: parseFloat(location?.coordinates?.lat) || null,
                lng: parseFloat(location?.coordinates?.lng) || null
            },
            neighborhood: location?.neighborhood || '',
            zipCode: location?.zipCode || '',
            publicTransport: Array.isArray(location?.publicTransport) ? 
                location.publicTransport.filter(transport => transport && transport.trim() !== '') : 
                [],
            nearbyPlaces: Array.isArray(location?.nearbyPlaces) ? 
                location.nearbyPlaces.filter(place => place && place.trim() !== '') : 
                []
        };

        // Procesar availability
        const processedAvailability = {
            minimumStay: parseInt(availability?.minimumStay) || 1,
            maximumStay: parseInt(availability?.maximumStay) || 365,
            instantBooking: availability?.instantBooking === true || availability?.instantBooking === 'true',
            advanceNotice: parseInt(availability?.advanceNotice) || 1
        };

        // Validar y convertir campos numéricos requeridos
        const areaSize = Number(req.body.areaSize);
        const yearBuilt = Number(req.body.yearBuilt);
        const rentPrice = Number(req.body.rentPrice);
        const bedrooms = Number(req.body.bedrooms);
        const bathrooms = Number(req.body.bathrooms);
        const maxGuests = Number(req.body.maxGuests);

        if (isNaN(areaSize) || isNaN(yearBuilt) || isNaN(rentPrice) || 
            isNaN(bedrooms) || isNaN(bathrooms) || isNaN(maxGuests)) {
            return res.status(400).json({
                success: false,
                message: "Invalid numeric values provided"
            });
        }

        // Crear el objeto de datos del departamento
        const flatData = {
            // Información básica
            title: req.body.title,
            description: req.body.description,
            propertyType: req.body.propertyType,
            city: req.body.city,
            streetName: req.body.streetName,
            streetNumber: req.body.streetNumber,
            areaSize,
            yearBuilt,
            rentPrice,
            dateAvailable: req.body.dateAvailable,
            bedrooms,
            bathrooms,
            maxGuests,
            owner,
            images,

            // Objetos procesados
            amenities: processedAmenities,
            houseRules: processedHouseRules,
            location: processedLocation,
            availability: processedAvailability,

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
            },

            // Timestamps
            atCreated: Date.now(),
            atUpdated: Date.now()
        };

        // Validar campos requeridos
        const requiredFields = [
            'title', 'description', 'propertyType', 'city', 
            'streetName', 'streetNumber', 'areaSize', 'yearBuilt', 
            'rentPrice', 'dateAvailable', 'bedrooms', 'bathrooms', 'maxGuests'
        ];

        const missingFields = requiredFields.filter(field => !flatData[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Crear y guardar el departamento
        const flat = new Flat(flatData);
        await flat.save();

        // Actualizar el usuario
        await User.findByIdAndUpdate(
            owner,
            { 
                $push: { flatsOwned: flat._id },
                $set: { atUpdated: Date.now() }
            }
        );

        // Poblar la información del propietario
        await flat.populate('owner', 'firstName lastName email');

        res.status(201).json({
            success: true,
            message: "Flat created successfully",
            data: flat
        });

    } catch (error) {
        console.error('Error completo:', error);
        // Limpiar imágenes en caso de error
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

        // Validar y convertir parámetros numéricos
        const validatedPage = Math.max(1, parseInt(page));
        const validatedLimit = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (validatedPage - 1) * validatedLimit;

        // Construir filtros base
        const filters = {};

        // Filtro de propietario
        if (owner === 'true' && req.user) {
            filters.owner = req.user.id;
        }

        // Filtros básicos con validación de tipos
        if (city && typeof city === 'string') {
            filters.city = new RegExp(city.trim(), 'i');
        }

        // Filtro de precio con validación
        if (minPrice || maxPrice) {
            filters.rentPrice = {};
            if (minPrice && !isNaN(minPrice)) {
                filters.rentPrice.$gte = Number(minPrice);
            }
            if (maxPrice && !isNaN(maxPrice)) {
                filters.rentPrice.$lte = Number(maxPrice);
            }
        }

        // Filtros numéricos con validación
        if (propertyType && ['apartment', 'house', 'studio', 'loft', 'room'].includes(propertyType)) {
            filters.propertyType = propertyType;
        }

        if (bedrooms && !isNaN(bedrooms)) {
            filters.bedrooms = Number(bedrooms);
        }

        if (bathrooms && !isNaN(bathrooms)) {
            filters.bathrooms = Number(bathrooms);
        }

        // Filtros de área con validación
        if (minArea || maxArea) {
            filters.areaSize = {};
            if (minArea && !isNaN(minArea)) {
                filters.areaSize.$gte = Number(minArea);
            }
            if (maxArea && !isNaN(maxArea)) {
                filters.areaSize.$lte = Number(maxArea);
            }
        }

        // Filtro de disponibilidad
        if (available === 'true') {
            filters.dateAvailable = { $lte: new Date() };
        }

        // Filtro de rating mínimo
        if (minRating && !isNaN(minRating)) {
            filters['ratings.overall'] = { $gte: Number(minRating) };
        }

        // Filtros de amenidades
        if (amenities) {
            try {
                const amenityList = amenities.split(',').map(item => item.trim()).filter(Boolean);
                amenityList.forEach(amenity => {
                    // Validar que la amenidad sea válida
                    if (['wifi', 'tv', 'kitchen', 'washer', 'airConditioning', 'heating',
                         'workspace', 'pool', 'gym', 'elevator', 'petsAllowed', 'smokeAlarm',
                         'firstAidKit', 'fireExtinguisher', 'securityCameras'].includes(amenity)) {
                        filters[`amenities.${amenity}`] = true;
                    }
                });
            } catch (error) {
                console.error('Error processing amenities:', error);
            }
        }

        // Filtro de estacionamiento con validación
        if (parking) {
            filters['amenities.parking.available'] = true;
            if (parking !== 'any' && ['free', 'paid', 'street'].includes(parking)) {
                filters['amenities.parking.type'] = parking;
            }
        }

        // Filtro de mascotas
        if (petsAllowed === 'true') {
            filters['amenities.petsAllowed'] = true;
        }

        // Configuración de ordenamiento con validación
        let sortOptions = {};
        const validSortFields = {
            price: 'rentPrice',
            rating: 'ratings.overall',
            date: 'atCreated'
        };

        if (sortBy && validSortFields[sortBy]) {
            sortOptions[validSortFields[sortBy]] = order === 'asc' ? 1 : -1;
        } else {
            // Ordenamiento por defecto
            sortOptions.atCreated = -1;
        }

        // Ejecutar consulta con Promise.all para optimizar
        const [flats, total] = await Promise.all([
            Flat.find(filters)
                .populate('owner', 'firstName lastName email profileImage')
                .select('-__v')
                .skip(skip)
                .limit(validatedLimit)
                .sort(sortOptions),
            Flat.countDocuments(filters)
        ]);

        // Calcular metadatos de paginación
        const totalPages = Math.ceil(total / validatedLimit);
        const hasNextPage = validatedPage < totalPages;
        const hasPrevPage = validatedPage > 1;

        res.status(200).json({
            success: true,
            data: flats,
            pagination: {
                total,
                pages: totalPages,
                currentPage: validatedPage,
                perPage: validatedLimit,
                hasNextPage,
                hasPrevPage
            },
            filters: {
                applied: Object.keys(filters).length > 0,
                count: Object.keys(filters).length
            }
        });
    } catch (error) {
        console.error('Error in getFlats:', error);
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

        // Función auxiliar para parsear campos JSON y convertir strings 'true'/'false' a booleanos
        const parseJsonField = (field) => {
            try {
                if (typeof field === 'string') {
                    const parsed = JSON.parse(field);
                    return parsed;
                }
                return field || null;
            } catch (error) {
                return field;
            }
        };

        // Parsear los campos JSON del body
        const amenities = parseJsonField(req.body.amenities);
        const houseRules = parseJsonField(req.body.houseRules);
        const location = parseJsonField(req.body.location);
        const availability = parseJsonField(req.body.availability);

        // Procesar amenities asegurando valores booleanos
        const processedAmenities = amenities ? {
            wifi: amenities.wifi === true || amenities.wifi === 'true',
            tv: amenities.tv === true || amenities.tv === 'true',
            kitchen: amenities.kitchen === true || amenities.kitchen === 'true',
            washer: amenities.washer === true || amenities.washer === 'true',
            airConditioning: amenities.airConditioning === true || amenities.airConditioning === 'true',
            heating: amenities.heating === true || amenities.heating === 'true',
            workspace: amenities.workspace === true || amenities.workspace === 'true',
            pool: amenities.pool === true || amenities.pool === 'true',
            gym: amenities.gym === true || amenities.gym === 'true',
            elevator: amenities.elevator === true || amenities.elevator === 'true',
            petsAllowed: amenities.petsAllowed === true || amenities.petsAllowed === 'true',
            smokeAlarm: amenities.smokeAlarm === true || amenities.smokeAlarm === 'true',
            firstAidKit: amenities.firstAidKit === true || amenities.firstAidKit === 'true',
            fireExtinguisher: amenities.fireExtinguisher === true || amenities.fireExtinguisher === 'true',
            securityCameras: amenities.securityCameras === true || amenities.securityCameras === 'true',
            parking: {
                available: amenities.parking?.available === true || amenities.parking?.available === 'true',
                type: amenities.parking?.type || 'none',
                details: amenities.parking?.details || ''
            }
        } : flat.amenities;

        // Procesar house rules
        const processedHouseRules = houseRules ? {
            smokingAllowed: houseRules.smokingAllowed === true || houseRules.smokingAllowed === 'true',
            eventsAllowed: houseRules.eventsAllowed === true || houseRules.eventsAllowed === 'true',
            quietHours: {
                start: houseRules.quietHours?.start || '22:00',
                end: houseRules.quietHours?.end || '08:00'
            },
            additionalRules: Array.isArray(houseRules.additionalRules) ? 
                houseRules.additionalRules.filter(rule => rule.trim() !== '') : 
                flat.houseRules.additionalRules
        } : flat.houseRules;

        // Procesar location
        const processedLocation = location ? {
            coordinates: {
                lat: parseFloat(location.coordinates?.lat) || flat.location?.coordinates?.lat || null,
                lng: parseFloat(location.coordinates?.lng) || flat.location?.coordinates?.lng || null
            },
            neighborhood: location.neighborhood || flat.location?.neighborhood || '',
            zipCode: location.zipCode || flat.location?.zipCode || '',
            publicTransport: Array.isArray(location.publicTransport) ? 
                location.publicTransport.filter(transport => transport.trim() !== '') : 
                flat.location?.publicTransport || [],
            nearbyPlaces: Array.isArray(location.nearbyPlaces) ? 
                location.nearbyPlaces.filter(place => place.trim() !== '') : 
                flat.location?.nearbyPlaces || []
        } : flat.location;

        // Procesar availability
        const processedAvailability = availability ? {
            minimumStay: parseInt(availability.minimumStay) || 1,
            maximumStay: parseInt(availability.maximumStay) || 365,
            instantBooking: availability.instantBooking === true || availability.instantBooking === 'true',
            advanceNotice: parseInt(availability.advanceNotice) || 1
        } : flat.availability;

        // Manejar imágenes
        let currentImages = [...flat.images];
        
        // Procesar imágenes a eliminar
        const imagesToDelete = parseJsonField(req.body.imagesToDelete) || [];
        if (imagesToDelete.length > 0) {
            // Encontrar las imágenes a eliminar
            const imagesToRemove = currentImages.filter(img => 
                imagesToDelete.includes(img._id.toString())
            );
            
            // Eliminar de Cloudinary
            await Promise.all(
                imagesToRemove.map(img => deleteFromCloudinary(img.public_id))
            );

            // Actualizar array de imágenes
            currentImages = currentImages.filter(img => 
                !imagesToDelete.includes(img._id.toString())
            );
        }

        // Agregar nuevas imágenes
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname,
                isMainImage: false
            }));

            currentImages = [...currentImages, ...newImages];
        }

        // Validar que haya al menos una imagen
        if (currentImages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one image is required"
            });
        }

        // Manejar imagen principal
        const mainImageId = req.body.mainImageId;
        if (mainImageId) {
            currentImages = currentImages.map(img => ({
                ...img,
                isMainImage: img._id?.toString() === mainImageId
            }));
        } else if (!currentImages.some(img => img.isMainImage)) {
            currentImages[0].isMainImage = true;
        }

        // Preparar datos de actualización
        const updateData = {
            title: req.body.title || flat.title,
            description: req.body.description || flat.description,
            propertyType: req.body.propertyType || flat.propertyType,
            city: req.body.city || flat.city,
            streetName: req.body.streetName || flat.streetName,
            streetNumber: req.body.streetNumber || flat.streetNumber,
            areaSize: req.body.areaSize ? Number(req.body.areaSize) : flat.areaSize,
            yearBuilt: req.body.yearBuilt ? Number(req.body.yearBuilt) : flat.yearBuilt,
            rentPrice: req.body.rentPrice ? Number(req.body.rentPrice) : flat.rentPrice,
            dateAvailable: req.body.dateAvailable || flat.dateAvailable,
            bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : flat.bedrooms,
            bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : flat.bathrooms,
            maxGuests: req.body.maxGuests ? Number(req.body.maxGuests) : flat.maxGuests,
            amenities: processedAmenities,
            houseRules: processedHouseRules,
            location: processedLocation,
            availability: processedAvailability,
            images: currentImages,
            atUpdated: Date.now()
        };

        // Actualizar el documento
        const updatedFlat = await Flat.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).populate('owner', 'firstName lastName email');

        res.status(200).json({
            success: true,
            message: "Flat updated successfully",
            data: updatedFlat
        });
    } catch (error) {
        console.error('Error completo:', error);
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
        const flat = await Flat.findById(id);
        
        // Validaciones iniciales...
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

        // Obtener imágenes actuales
        let currentImages = [...flat.images];
        const mainImageId = req.body.mainImageId;

        // Si se especifica una nueva imagen principal
        if (mainImageId) {
            console.log('Actualizando imagen principal:', mainImageId);
            
            // Actualizar el estado isMainImage de todas las imágenes
            currentImages = currentImages.map(img => ({
                ...img.toObject(), // Convertir el documento de Mongoose a objeto plano
                isMainImage: img._id.toString() === mainImageId
            }));

            console.log('Imágenes actualizadas:', currentImages);
        }

        // Si hay nuevas imágenes para agregar
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.cloudinary.url,
                public_id: file.cloudinary.public_id,
                description: file.originalname,
                isMainImage: false, // Las nuevas imágenes no son principales por defecto
                uploadDate: Date.now()
            }));

            currentImages = [...currentImages, ...newImages];
        }

        // Procesar eliminación de imágenes si es necesario
        const imagesToDelete = req.body.deleteImages ? JSON.parse(req.body.deleteImages) : [];
        if (imagesToDelete.length > 0) {
            // Eliminar de Cloudinary y filtrar las imágenes
            await Promise.all(
                currentImages
                    .filter(img => imagesToDelete.includes(img._id.toString()))
                    .map(img => deleteFromCloudinary(img.public_id))
            );

            currentImages = currentImages.filter(img => !imagesToDelete.includes(img._id.toString()));
        }

        // Asegurar que haya al menos una imagen principal
        if (!currentImages.some(img => img.isMainImage)) {
            currentImages[0].isMainImage = true;
        }

        // Actualizar el documento en la base de datos
        const updatedFlat = await Flat.findByIdAndUpdate(
            id,
            { 
                $set: { 
                    images: currentImages,
                    atUpdated: Date.now()
                }
            },
            { new: true }
        ).populate('owner', 'firstName lastName email');

        console.log('Flat actualizado en DB:', {
            images: updatedFlat.images.map(img => ({
                id: img._id,
                isMain: img.isMainImage
            }))
        });

        res.status(200).json({
            success: true,
            message: "Images updated successfully",
            data: updatedFlat
        });
    } catch (error) {
        console.error('Error completo:', error);
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