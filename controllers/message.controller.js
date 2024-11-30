import { Message } from "../models/message.model.js";
import { Flat } from "../models/flat.models.js";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";
import mongoose from "mongoose";

const createMessage = async (req, res) => {
    try {
        const { content, rating } = req.body;
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

        // Verificar si el usuario ya ha dejado una reseña
        const existingReview = await Message.findOne({
            flatID,
            author,
            parentMessage: null
        });

        if (existingReview) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this flat"
            });
        }

        const message = new Message({
            content,
            flatID,
            author,
            rating: rating ? {
                overall: rating.overall,
                aspects: rating.aspects
            } : undefined,
            attachment: req.file ? {
                type: 'image',
                url: req.file.cloudinary.url,
                public_id: req.file.cloudinary.public_id
            } : null
        });

        await message.save();
        
        // Si hay calificación, actualizar el promedio del flat
        if (rating) {
            await message.updateFlatRating();
        }

        await message.populate('author', 'firstName lastName profileImage');

        res.status(201).json({
            success: true,
            message: "Review created successfully",
            data: message
        });
    } catch (error) {
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error creating review",
            error: error.message
        });
    }
};

const updateMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, rating } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(id);

        if (!message) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        if (message.author.toString() !== userId && !req.user.isAdmin) {
            if (req.file) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(403).json({
                success: false,
                message: "Not authorized to edit this review"
            });
        }

        // Actualizar contenido y marca de edición
        message.content = content;
        message.isEdited = true;
        message.atEdited = new Date();

        // Actualizar calificación si se proporciona y es un comentario principal
        if (rating && !message.parentMessage) {
            message.rating = {
                overall: rating.overall,
                aspects: rating.aspects
            };
        }

        // Actualizar archivo adjunto si se proporciona
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

        // Actualizar calificaciones del flat si es necesario
        if (rating && !message.parentMessage) {
            await message.updateFlatRating();
        }

        await message.populate('author', 'firstName lastName profileImage');

        res.status(200).json({
            success: true,
            message: "Review updated successfully",
            data: message
        });
    } catch (error) {
        if (req.file) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error updating review",
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
                message: "Review not found"
            });
        }

        if (message.author.toString() !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this review"
            });
        }

        // Eliminar archivo adjunto de Cloudinary si existe
        if (message.attachment && message.attachment.public_id) {
            await deleteFromCloudinary(message.attachment.public_id);
        }

        // Si es un comentario principal, eliminar respuestas
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

        // Si era un comentario principal con calificación, actualizar promedios
        if (!message.parentMessage && message.rating) {
            const dummyMessage = new Message({ flatID: message.flatID });
            await dummyMessage.updateFlatRating();
        }

        res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error deleting review",
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
                message: "Parent review not found"
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
        const { page = 1, limit = 10, sortBy = 'atCreated', order = 'desc' } = req.query;

        const messages = await Message.find({
            flatID,
            isHidden: false,
            parentMessage: null
        })
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
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

        const ratings = await Message.aggregate([
            {
                $match: {
                    flatID: new mongoose.Types.ObjectId(flatID),
                    parentMessage: null,
                    isHidden: false,
                    'rating.overall': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating.overall' },
                    totalRatings: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating.overall'
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: messages,
            ratings: ratings[0] || { averageRating: 0, totalRatings: 0, ratingDistribution: [] },
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                perPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error in getMessagesByFlat:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching reviews",
            error: error.message
        });
    }
};

const toggleMessageVisibility = async (req, res) => {
    try {
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
                message: "Review not found"
            });
        }

        message.isHidden = !message.isHidden;
        await message.save();

        // Si es un comentario principal con calificación, actualizar promedios
        if (!message.parentMessage && message.rating) {
            await message.updateFlatRating();
        }

        res.status(200).json({
            success: true,
            message: `Review ${message.isHidden ? 'hidden' : 'visible'} successfully`,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error toggling review visibility",
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