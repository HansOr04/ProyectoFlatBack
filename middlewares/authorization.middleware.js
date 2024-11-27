<<<<<<< HEAD

import { User } from "../models/user.model.js";
import { Flat } from "../models/flat.models.js";

// Verificar si el usuario es administrador
export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin role required"
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking admin privileges",
            error: error.message
        });
    }
};

// Verificar si el usuario es dueño de la cuenta o administrador
export const isOwnerOrAdmin = async (req, res, next) => {
    try {
        const requestedUserId = req.params.id;
        
        if (!req.user.isAdmin && req.user._id.toString() !== requestedUserId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Not authorized to perform this action"
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking user permissions",
            error: error.message
        });
    }
};

// Verificar si el usuario es dueño del departamento o administrador
export const isAdminOrOwner = async (req, res, next) => {
    try {
        const flatId = req.params.id;
        const flat = await Flat.findById(flatId);

        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        // Verificar si es admin o dueño del departamento
        if (!req.user.isAdmin && flat.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only flat owner or admin can perform this action"
            });
        }

        // Añadir el flat al request para no tener que buscarlo de nuevo en el controller
        req.flat = flat;
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking flat ownership",
            error: error.message
        });
    }
};

// Verificar permisos para comentarios
export const canModifyMessage = async (req, res, next) => {
    try {
        const messageId = req.params.id;
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        // Permitir si es admin o autor del mensaje
        if (!req.user.isAdmin && message.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only message author or admin can perform this action"
            });
        }

        req.message = message;
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking message permissions",
            error: error.message
        });
    }
};

// Verificar si el usuario puede ver contenido oculto
export const canSeeHidden = async (req, res, next) => {
    try {
        // Solo admins y moderadores pueden ver contenido oculto
        if (!req.user.isAdmin && !req.user.isModerator) {
            // Modificar la query para excluir contenido oculto
            req.query.isHidden = false;
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking visibility permissions",
            error: error.message
        });
    }
};

// Verificar límite de acciones por tiempo
export const rateLimitByUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const actionType = req.baseUrl + req.path; // Identificador de la acción

        // Obtener el último registro de acción del usuario
        const lastAction = await ActionLog.findOne({
            userId,
            actionType,
        }).sort({ createdAt: -1 });

        const timeLimit = 60 * 1000; // 1 minuto en milisegundos

        if (lastAction && Date.now() - lastAction.createdAt < timeLimit) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later"
            });
        }

        // Registrar la acción
        await new ActionLog({
            userId,
            actionType,
            createdAt: Date.now()
        }).save();

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking rate limit",
            error: error.message
        });
    }
};

// Verificar si el usuario tiene acceso a funcionalidades premium
export const isPremiumFeature = async (req, res, next) => {
    try {
        // Implementar lógica para verificar si el usuario tiene acceso a características premium
        if (!req.user.isPremium && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "This feature is only available for premium users"
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking premium status",
            error: error.message
        });
    }
};
=======
//Vamos a recibir como parametro los roles que pueden acceder a un servicio, los roles van a ser un array
const authorizationMiddleware = (roles) => {
  return (req, res, next) => {
    //Debemps obtener el rol del usuario que esta haciendo el request
    const userRole = req.user.role;

    //Verificar si el rol del usuario que esta haciendo el request tiene permiso para acceder al servicio
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

export default authorizationMiddleware;
>>>>>>> main
