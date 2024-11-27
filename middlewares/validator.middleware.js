// Middlewares de validación para la API de flats
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
            hasAC,
            yearBuilt,
            rentPrice,
            dateAvailable
        } = req.body;

        // Validar campos obligatorios
        if (!city || !streetName || !streetNumber || !areaSize || hasAC === undefined || !yearBuilt || !rentPrice || !dateAvailable) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Convertir y validar areaSize
        const areaSizeNum = Number(areaSize);
        if (isNaN(areaSizeNum) || areaSizeNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "Area size must be a positive number"
            });
        }
        req.body.areaSize = areaSizeNum; // Actualizar el valor convertido

        // Convertir y validar hasAC
        req.body.hasAC = String(hasAC).toLowerCase() === 'true';

        // Convertir y validar yearBuilt
        const yearBuiltNum = Number(yearBuilt);
        const currentYear = new Date().getFullYear();
        if (isNaN(yearBuiltNum) || yearBuiltNum < 1800 || yearBuiltNum > currentYear) {
            return res.status(400).json({
                success: false,
                message: `Year built must be between 1800 and ${currentYear}`
            });
        }
        req.body.yearBuilt = yearBuiltNum;

        // Convertir y validar rentPrice
        const rentPriceNum = Number(rentPrice);
        if (isNaN(rentPriceNum) || rentPriceNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "Rent price must be a positive number"
            });
        }
        req.body.rentPrice = rentPriceNum;

        // Validar fecha disponible
        const availableDate = new Date(dateAvailable);
        if (isNaN(availableDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date available format"
            });
        }
        req.body.dateAvailable = availableDate;

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error in validation",
            error: error.message
        });
    }
};

const validateMessage = (req, res, next) => {
    try {
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Message content cannot be empty"
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

        // Si se proporciona email, validar formato
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
        const {
            city,
            streetName,
            streetNumber,
            areaSize,
            hasAC,
            yearBuilt,
            rentPrice,
            dateAvailable
        } = req.body;

        // Validar campos si están presentes (validación parcial)
        if (city !== undefined && city.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "City cannot be empty"
            });
        }

        if (streetName !== undefined && streetName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Street name cannot be empty"
            });
        }

        if (streetNumber !== undefined && streetNumber.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Street number cannot be empty"
            });
        }

        // Validar y convertir areaSize
        if (areaSize !== undefined) {
            const areaSizeNum = Number(areaSize);
            if (isNaN(areaSizeNum) || areaSizeNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Area size must be a positive number"
                });
            }
            req.body.areaSize = areaSizeNum;
        }

        // Validar y convertir hasAC
        if (hasAC !== undefined) {
            req.body.hasAC = String(hasAC).toLowerCase() === 'true';
        }

        // Validar y convertir yearBuilt
        if (yearBuilt !== undefined) {
            const yearBuiltNum = Number(yearBuilt);
            const currentYear = new Date().getFullYear();
            if (isNaN(yearBuiltNum) || yearBuiltNum < 1800 || yearBuiltNum > currentYear) {
                return res.status(400).json({
                    success: false,
                    message: `Year built must be between 1800 and ${currentYear}`
                });
            }
            req.body.yearBuilt = yearBuiltNum;
        }

        // Validar y convertir rentPrice
        if (rentPrice !== undefined) {
            const rentPriceNum = Number(rentPrice);
            if (isNaN(rentPriceNum) || rentPriceNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Rent price must be a positive number",
                    received_value: rentPrice
                });
            }
            req.body.rentPrice = rentPriceNum;
        }

        // Validar y convertir dateAvailable
        if (dateAvailable !== undefined) {
            const availableDate = new Date(dateAvailable);
            if (isNaN(availableDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date available format"
                });
            }
            req.body.dateAvailable = availableDate;
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

export {
    validateRegister,
    validateLogin,
    validateFlatCreation,
    validateFlatUpdate,
    validateMessage,
    validateUserUpdate,
    validateChangePassword
};