import Message from "../models/message.model.js";
import { Flat } from "../models/flat.models.js";

const createMessage = async (req, res) => {
    try {
        const { content, flatID } = req.body;
        const author = req.user.id;

        // Verificar si el flat existe
        const flatExists = await Flat.findById(flatID);
        if (!flatExists) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        const message = new Message({
            content,
            flatID,
            author,
            attachment: req.file ? {
                type: 'image',
                url: req.file.path
            } : null
        });

        await message.save();

        // Poblar los datos del autor para la respuesta
        await message.populate('author', 'firstName lastName profileImage');

        res.status(201).json({
            success: true,
            message: "Comment created successfully",
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error creating comment",
            error: error.message
        });
    }
};

const getMessagesByFlat = async (req, res) => {
    try {
        const { flatID } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Verificar si el flat existe
        const flatExists = await Flat.findById(flatID);
        if (!flatExists) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        const skip = (page - 1) * limit;

        // Obtener comentarios principales y sus respuestas
        const messages = await Message.find({
            flatID,
            isHidden: false,
            parentMessage: null
        })
        .sort({ atCreated: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('author', 'firstName lastName profileImage')
        .populate({
            path: 'replies',
            match: { isHidden: false },
            populate: {
                path: 'author',
                select: 'firstName lastName profileImage'
            }
        });

        const total = await Message.countDocuments({
            flatID,
            isHidden: false,
            parentMessage: null
        });

        res.status(200).json({
            success: true,
            data: messages,
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
            message: "Error fetching comments",
            error: error.message
        });
    }
};

const updateMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        // Verificar si el usuario es el autor o admin
        if (message.author.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to edit this comment"
            });
        }

        message.content = content;
        message.isEdited = true;
        message.atEdited = new Date();

        // Actualizar adjunto si se proporciona uno nuevo
        if (req.file) {
            message.attachment = {
                type: 'image',
                url: req.file.path
            };
        }

        await message.save();
        await message.populate('author', 'firstName lastName profileImage');

        res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error updating comment",
            error: error.message
        });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        // Verificar si el usuario es el autor o admin
        if (message.author.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this comment"
            });
        }

        // Si es un comentario principal, eliminar también sus respuestas
        if (!message.parentMessage) {
            await Message.deleteMany({ parentMessage: id });
        }

        await message.deleteOne();

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting comment",
            error: error.message
        });
    }
};

const replyToMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const author = req.user.id;

        // Verificar si el comentario principal existe
        const parentMessage = await Message.findById(id);
        if (!parentMessage) {
            return res.status(404).json({
                success: false,
                message: "Parent comment not found"
            });
        }

        // Crear la respuesta
        const reply = new Message({
            content,
            flatID: parentMessage.flatID,
            author,
            parentMessage: id,
            attachment: req.file ? {
                type: 'image',
                url: req.file.path
            } : null
        });

        await reply.save();
        await reply.populate('author', 'firstName lastName profileImage');

        res.status(201).json({
            success: true,
            message: "Reply created successfully",
            data: reply
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error creating reply",
            error: error.message
        });
    }
};

const toggleMessageVisibility = async (req, res) => {
    try {
        // Solo admins pueden ocultar/mostrar comentarios
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized"
            });
        }

        const { id } = req.params;
        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        message.isHidden = !message.isHidden;
        await message.save();

        res.status(200).json({
            success: true,
            message: `Comment ${message.isHidden ? 'hidden' : 'visible'} successfully`,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error toggling comment visibility",
            error: error.message
        });
    }
};

export {
    createMessage,
    getMessagesByFlat,
    updateMessage,
    deleteMessage,
    replyToMessage,
    toggleMessageVisibility
};