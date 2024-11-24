import Message from "../models/message.model.js";
import { Flat } from "../models/flat.models.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

const createMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const { flatID } = req.params;
        const author = req.user.id;

        const flatExists = await Flat.findById(flatID);
        if (!flatExists) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
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
                url: req.file.cloudinary.url,
                public_id: req.file.cloudinary.public_id
            } : null
        });

        await message.save();
        await message.populate('author', 'firstName lastName profileImage');

        res.status(201).json({
            success: true,
            message: "Comment created successfully",
            data: message
        });
    } catch (error) {
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error creating comment",
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
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        if (message.author.toString() !== userId && !req.user.isAdmin) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized to edit this comment"
            });
        }

        message.content = content;
        message.isEdited = true;
        message.atEdited = new Date();

        // Si hay un nuevo archivo, eliminar el anterior y actualizar
        if (req.file) {
            if (message.attachment && message.attachment.public_id) {
                await deleteFromCloudinary(message.attachment.public_id);
            }
            message.attachment = {
                type: 'image',
                url: req.file.cloudinary.url,
                public_id: req.file.cloudinary.public_id
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
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
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

        if (message.author.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this comment"
            });
        }

        // Eliminar imagen de Cloudinary si existe
        if (message.attachment && message.attachment.public_id) {
            await deleteFromCloudinary(message.attachment.public_id);
        }

        // Si es un comentario principal, eliminar sus respuestas y sus imágenes
        if (!message.parentMessage) {
            const replies = await Message.find({ parentMessage: id });
            for (const reply of replies) {
                if (reply.attachment && reply.attachment.public_id) {
                    await deleteFromCloudinary(reply.attachment.public_id);
                }
            }
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

        const parentMessage = await Message.findById(id);
        if (!parentMessage) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(404).json({
                success: false,
                message: "Parent comment not found"
            });
        }

        const reply = new Message({
            content,
            flatID: parentMessage.flatID,
            author,
            parentMessage: id,
            attachment: req.file ? {
                type: 'image',
                url: req.file.cloudinary.url,
                public_id: req.file.cloudinary.public_id
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
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error creating reply",
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