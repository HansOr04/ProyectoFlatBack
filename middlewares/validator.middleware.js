import validator from 'validator';

const validateRegister = (req, res, next) => {
    try {
        const { email, password, firstName, lastName, birthDate } = req.body;

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Validar contraseña
        if (!password || password.length < 8 || password.length > 20) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 20 characters"
            });
        }

        // Validar que tenga al menos una mayúscula, una minúscula y un número
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            });
        }

        // Validar nombres
        if (!firstName || !lastName || firstName.length < 2 || lastName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "First name and last name must be at least 2 characters long"
            });
        }

        // Validar fecha de nacimiento
        const birthDateObj = new Date(birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDateObj.getFullYear();
        
        if (isNaN(birthDateObj.getTime()) || age < 18) {
            return res.status(400).json({
                success: false,
                message: "Invalid birth date or user must be at least 18 years old"
            });
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateLogin = (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateFlatCreation = (req, res, next) => {
    try {
        const {
            city,
            streetName,
            streetNumber,
            areaSize,
            yearBuilt,
            rentPrice,
            dateAvailable,
            title,
            description,
            propertyType,
            bedrooms,
            bathrooms,
            maxGuests
        } = req.body;

        // Validar campos básicos requeridos
        if (!city || !streetName || !streetNumber || !areaSize || !yearBuilt || !rentPrice || !dateAvailable) {
            return res.status(400).json({
                success: false,
                message: "All basic fields are required"
            });
        }

        // Validar título y descripción
        if (!title || title.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "Title is required and must be at least 10 characters long"
            });
        }

        if (!description || description.trim().length < 50) {
            return res.status(400).json({
                success: false,
                message: "Description is required and must be at least 50 characters long"
            });
        }

        // Validar tipo de propiedad
        if (!propertyType || !['apartment', 'house', 'studio', 'loft', 'room'].includes(propertyType)) {
            return res.status(400).json({
                success: false,
                message: "Valid property type is required"
            });
        }

        // Validar campos numéricos
        const numericFields = {
            bedrooms,
            bathrooms,
            maxGuests,
            areaSize,
            yearBuilt,
            rentPrice
        };

        for (const [field, value] of Object.entries(numericFields)) {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `${field} must be a positive number`
                });
            }
            req.body[field] = numValue;
        }

        // Validar amenidades si se proporcionan
        if (req.body.amenities) {
            const amenities = req.body.amenities;
            
            if (amenities.parking) {
                if (amenities.parking.type && !['free', 'paid', 'street', 'none'].includes(amenities.parking.type)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid parking type"
                    });
                }
            }
        }

        // Validar ubicación si se proporciona
        if (req.body.location?.coordinates) {
            const { lat, lng } = req.body.location.coordinates;
            if (isNaN(Number(lat)) || isNaN(Number(lng))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid coordinates format"
                });
            }
        }

        // Validar disponibilidad
        if (req.body.availability) {
            const { minimumStay, maximumStay, advanceNotice } = req.body.availability;
            
            if (minimumStay && (isNaN(Number(minimumStay)) || Number(minimumStay) < 1)) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum stay must be at least 1 day"
                });
            }

            if (maximumStay && (isNaN(Number(maximumStay)) || Number(maximumStay) < Number(minimumStay))) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum stay must be greater than minimum stay"
                });
            }
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateRating = (req, res, next) => {
    try {
        const { rating } = req.body;
        console.log('Rating received:', rating); // Para debug

        // Si no hay rating, continuar (podría ser una respuesta o actualización sin rating)
        if (!rating) {
            return next();
        }

        // Convertir el overall a número si viene como string
        const overallRating = Number(rating.overall);

        // Validar calificación general
        if (!overallRating || 
            !Number.isInteger(overallRating) || 
            overallRating < 1 || 
            overallRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Overall rating must be an integer between 1 and 5"
            });
        }

        // Validar aspectos específicos si se proporcionan
        if (rating.aspects) {
            const validAspects = [
                'cleanliness',
                'communication',
                'location',
                'accuracy',
                'value'
            ];

            for (const aspect of validAspects) {
                if (rating.aspects[aspect] !== undefined) {
                    const value = Number(rating.aspects[aspect]);
                    if (!Number.isInteger(value) || value < 1 || value > 5) {
                        return res.status(400).json({
                            success: false,
                            message: `${aspect} rating must be an integer between 1 and 5`
                        });
                    }
                }
            }

            // Verificar que no haya aspectos inválidos
            const providedAspects = Object.keys(rating.aspects);
            const invalidAspects = providedAspects.filter(aspect => !validAspects.includes(aspect));
            if (invalidAspects.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid aspects provided: ${invalidAspects.join(', ')}`
                });
            }
        }

        // Si todo está bien, convertir los valores a números
        req.body.rating = {
            overall: overallRating,
            aspects: rating.aspects ? {
                cleanliness: Number(rating.aspects.cleanliness),
                communication: Number(rating.aspects.communication),
                location: Number(rating.aspects.location),
                accuracy: Number(rating.aspects.accuracy),
                value: Number(rating.aspects.value)
            } : undefined
        };

        next();
    } catch (error) {
        console.error('Rating validation error:', error); // Para debug
        res.status(400).json({
            success: false,
            message: "Error in rating validation",
            error: error.message
        });
    }
};

// También necesitamos actualizar el validateMessage
const validateMessage = (req, res, next) => {
    try {
        const { content, rating } = req.body;
        console.log('Message content:', content); // Para debug
        console.log('Rating data:', rating); // Para debug

        // Validar contenido
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
            });
        }

        // Longitud mínima más estricta para reseñas con calificación
        const minLength = rating ? 50 : 1;
        if (content.trim().length < minLength) {
            return res.status(400).json({
                success: false,
                message: rating ? 
                    "Reviews with ratings must have at least 50 characters" : 
                    "Message content cannot be empty"
            });
        }

        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot exceed 1000 characters"
            });
        }

        next();
    } catch (error) {
        console.error('Message validation error:', error); // Para debug
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};


const validateUserUpdate = (req, res, next) => {
    try {
        const { email, firstName, lastName, birthDate } = req.body;

        // Validar email si se proporciona
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format"
                });
            }
        }

        // Validar nombres si se proporcionan
        if (firstName && firstName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "First name must be at least 2 characters long"
            });
        }

        if (lastName && lastName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Last name must be at least 2 characters long"
            });
        }

        // Validar fecha de nacimiento si se proporciona
        if (birthDate) {
            const birthDateObj = new Date(birthDate);
            const today = new Date();
            const age = today.getFullYear() - birthDateObj.getFullYear();
            
            if (isNaN(birthDateObj.getTime()) || age < 18) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid birth date or user must be at least 18 years old"
                });
            }
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateChangePassword = (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 8 || newPassword.length > 20) {
            return res.status(400).json({
                success: false,
                message: "New password must be between 8 and 20 characters"
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "New password must contain at least one uppercase letter, one lowercase letter, and one number"
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password"
            });
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateFlatUpdate = (req, res, next) => {
    try {
        const updates = req.body;

        // Validar título si se proporciona
        if (updates.title !== undefined && updates.title.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "Title must be at least 10 characters long"
            });
        }

        // Validar descripción si se proporciona
        if (updates.description !== undefined && updates.description.trim().length < 50) {
            return res.status(400).json({
                success: false,
                message: "Description must be at least 50 characters long"
            });
        }

        // Validar tipo de propiedad si se proporciona
        if (updates.propertyType && !['apartment', 'house', 'studio', 'loft', 'room'].includes(updates.propertyType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property type"
            });
        }

        // Validar campos numéricos si se proporcionan
        const numericFields = ['bedrooms', 'bathrooms', 'maxGuests', 'areaSize', 'yearBuilt', 'rentPrice'];
        
        for (const field of numericFields) {
            if (updates[field] !== undefined) {
                const numValue = Number(updates[field]);
                if (isNaN(numValue) || numValue <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be a positive number`
                    });
                }
                updates[field] = numValue;
            }
        }

        // Validar amenidades si se proporcionan
        if (updates.amenities) {
            if (updates.amenities.parking) {
                if (updates.amenities.parking.type && 
                    !['free', 'paid', 'street', 'none'].includes(updates.amenities.parking.type)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid parking type"
                    });
                }
            }
        }

        // Validar ubicación si se proporciona
        if (updates.location?.coordinates) {
            const { lat, lng } = updates.location.coordinates;
            if (isNaN(Number(lat)) || isNaN(Number(lng))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid coordinates format"
                });
            }
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateForgotPassword = (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateResetPassword = (req, res, next) => {
    try {
        const { password } = req.body;
        const { token } = req.params;

        // Validar que existe el token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required"
            });
        }

        // Validar que existe la contraseña
        if (!password) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        // Validar longitud de la contraseña
        if (password.length < 8 || password.length > 20) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 20 characters"
            });
        }

        // Validar complejidad de la contraseña
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            });
        }

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

// Actualizar las exportaciones para incluir los nuevos validadores
export {
    validateRegister,
    validateLogin,
    validateFlatCreation,
    validateFlatUpdate,
    validateMessage,
    validateUserUpdate,
    validateChangePassword,
    validateRating,
    validateForgotPassword,    // Añadir esta exportación
    validateResetPassword     // Añadir esta exportación
};