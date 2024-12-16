import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";
import sendEmail from "../utils/email.js";
import crypto from "crypto";
import { Flat } from "../models/flat.models.js"; 
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, birthDate } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Si hay un archivo subido, eliminarlo
            if (req.file?.cloudinary?.public_id) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Crear el usuario con o sin imagen de perfil
        const userData = {
            email,
            password,
            firstName,
            lastName,
            birthDate,
            flatsOwned: [] // Inicializar el array de flats
        };

        // Si hay una imagen subida, agregar los datos de Cloudinary
        if (req.file?.cloudinary) {
            userData.profileImage = req.file.cloudinary.url;
            userData.profileImageId = req.file.cloudinary.public_id;
        }

        const user = new User(userData);
        await user.save();

        // Obtener el usuario con sus flats
        const populatedUser = await User.findById(user._id)
            .select('-password')
            .populate('flatsOwned');

        // Generar token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage,
                    flatsOwned: populatedUser.flatsOwned || [],
                    totalFlats: populatedUser.flatsOwned?.length || 0
                }
            }
        });
    } catch (error) {
        if (req.file?.cloudinary?.public_id) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error registering user",
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario y verificar que no esté borrado
        const user = await User.findOne({ email, atDeleted: null })
            .populate('flatsOwned');
            
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Verificar password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Generar access token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Generar refresh token
        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage,
                    flatsOwned: user.flatsOwned || [],
                    totalFlats: user.flatsOwned?.length || 0
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error during login",
            error: error.message
        });
    }
};
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verificar contraseña actual
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Actualizar contraseña
        await user.updatePassword(newPassword);

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error changing password",
            error: error.message
        });
    }
};

const refreshUserToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required"
            });
        }

        try {
            // Verificar refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            // Buscar usuario
            const user = await User.findById(decoded.id).select('-password');
            if (!user || user.atDeleted) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid refresh token - User not found or deleted"
                });
            }

            // Generar nuevo access token
            const newAccessToken = jwt.sign(
                { id: user._id, email: user.email, isAdmin: user.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                data: {
                    token: newAccessToken
                }
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token expired"
                });
            }
            throw error;
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Error refreshing token",
            error: error.message
        });
    }
};

const forgotPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;

        // Validar si el correo existe en la BDD
        const user = await User.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generar token único para enviar al correo
        const resetToken = user.generateResetToken();
        await user.save({ validateBeforeSave: false });

        // Generar URL para resetear contraseña
        const resetUrl = `https://proyectoflatback.onrender.com/reset-password/${resetToken}`;

        // Enviar correo al usuario
        try {
            const message = `Para resetear tu contraseña, por favor haz click en el siguiente enlace: ${resetUrl}`;
            await sendEmail({
                email: user.email,
                subject: "Restablecer tu contraseña",
                message,
            });

            res.status(200).json({
                success: true,
                message: "Reset password email sent successfully"
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            res.status(500).json({
                success: false,
                message: "Error sending email",
                error: error.message
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error processing forgot password request",
            error: error.message
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Hashear el token para comparar con el almacenado
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Buscar usuario con token válido
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Actualizar contraseña
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error resetting password",
            error: error.message
        });
    }
};
//Metodo de logout
const logout = async (req, res) => {
    try {
        req.logout();
        req.session.destroy();
        res.clearCookie('connect.sid');
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error logging out",
            error: error.message
        });
    }
};

export {
    register,
    login,
    changePassword,
    refreshUserToken,
    forgotPasswordRequest,
    resetPassword
};