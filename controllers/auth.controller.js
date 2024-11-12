import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, birthDate } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        const user = new User({
            email,
            password, // Se hasheará automáticamente por el middleware del modelo
            firstName,
            lastName,
            birthDate,
            profileImage: req.file ? req.file.path : undefined
        });

        await user.save();

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
                    profileImage: user.profileImage
                }
            }
        });
    } catch (error) {
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
        const user = await User.findOne({ email, atDeleted: null });
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

        // Generar token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage
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

export { register, login, changePassword };