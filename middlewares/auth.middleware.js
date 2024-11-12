import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Verificar el token JWT
export const verifyToken = async (req, res, next) => {
    try {
        // Obtener el token del header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        // Verificar formato del token
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        // Extraer el token
        const token = authHeader.split(' ')[1];

        try {
            // Verificar y decodificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscar el usuario y verificar que no esté borrado
            const user = await User.findOne({ 
                _id: decoded.id,
                atDeleted: null
            }).select('-password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token - User not found or deleted"
                });
            }

            // Agregar el usuario al request
            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Token expired"
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token"
                });
            }

            throw error;
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error verifying token",
            error: error.message
        });
    }
};

// Verificar si el usuario es admin
export const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error verifying admin status",
            error: error.message
        });
    }
};

// Verificar si es el propietario del recurso o admin
export const verifyOwnerOrAdmin = async (req, res, next) => {
    try {
        const userId = req.params.id || req.body.userId;
        
        if (!req.user.isAdmin && req.user._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized - Owner or admin access required"
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error verifying ownership",
            error: error.message
        });
    }
};

// Refrescar token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required"
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            
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
        res.status(500).json({
            success: false,
            message: "Error refreshing token",
            error: error.message
        });
    }
};