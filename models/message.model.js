import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    flatID: { type: mongoose.Schema.Types.ObjectId, ref: "flats", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    atCreated: {
        type: Date,
        default: Date.now
    },
    // Para respuestas a comentarios
    parentMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    // Para manejar ediciones
    isEdited: {
        type: Boolean,
        default: false
    },
    atEdited: {
        type: Date,
        default: null
    },
    // Para moderar contenido
    isHidden: {
        type: Boolean,
        default: false
    },
    // Sistema de calificación
    rating: {
        overall: { 
            type: Number, 
            min: 1, 
            max: 5,
            required: function() {
                // Solo requerido para comentarios principales
                return this.parentMessage === null;
            }
        },
        aspects: {
            cleanliness: { type: Number, min: 1, max: 5 },
            communication: { type: Number, min: 1, max: 5 },
            location: { type: Number, min: 1, max: 5 },
            accuracy: { type: Number, min: 1, max: 5 },
            value: { type: Number, min: 1, max: 5 }
        }
    },
    // Actualizado para Cloudinary
    attachment: {
        type: { type: String, enum: ['image'], default: null },
        url: { type: String },
        public_id: { type: String }, // ID de Cloudinary
        uploadDate: { type: Date, default: Date.now }
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Método para editar un comentario
messageSchema.methods.editComment = async function(newContent, attachment = null) {
    this.content = newContent;
    this.isEdited = true;
    this.atEdited = new Date();
    
    if (attachment) {
        this.attachment = {
            type: 'image',
            url: attachment.url,
            public_id: attachment.public_id,
            uploadDate: new Date()
        };
    }
    
    return this.save();
};

// Método para actualizar calificación
messageSchema.methods.updateRating = async function(ratingData) {
    if (!this.parentMessage) { // Solo para comentarios principales
        this.rating = {
            overall: ratingData.overall,
            aspects: {
                cleanliness: ratingData.aspects?.cleanliness,
                communication: ratingData.aspects?.communication,
                location: ratingData.aspects?.location,
                accuracy: ratingData.aspects?.accuracy,
                value: ratingData.aspects?.value
            }
        };
        await this.save();
        await this.updateFlatRating();
    }
    return this;
};

// Método para actualizar la calificación del flat
messageSchema.methods.updateFlatRating = async function() {
    const Flat = mongoose.model('flats');
    const messages = await this.constructor.find({
        flatID: this.flatID,
        parentMessage: null,
        isHidden: false,
        'rating.overall': { $exists: true }
    });

    const ratings = {
        overall: 0,
        aspects: {
            cleanliness: 0,
            communication: 0,
            location: 0,
            accuracy: 0,
            value: 0
        },
        totalReviews: messages.length
    };

    messages.forEach(message => {
        ratings.overall += message.rating.overall;
        if (message.rating.aspects) {
            Object.keys(ratings.aspects).forEach(aspect => {
                if (message.rating.aspects[aspect]) {
                    ratings.aspects[aspect] += message.rating.aspects[aspect];
                }
            });
        }
    });

    if (ratings.totalReviews > 0) {
        ratings.overall = parseFloat((ratings.overall / ratings.totalReviews).toFixed(1));
        Object.keys(ratings.aspects).forEach(aspect => {
            const validRatings = messages.filter(m => m.rating.aspects?.[aspect]).length;
            if (validRatings > 0) {
                ratings.aspects[aspect] = parseFloat((ratings.aspects[aspect] / validRatings).toFixed(1));
            }
        });
    }

    await Flat.findByIdAndUpdate(this.flatID, {
        $set: { 'ratings': ratings }
    });
};

// Método para ocultar/mostrar comentario (moderación)
messageSchema.methods.toggleVisibility = async function() {
    this.isHidden = !this.isHidden;
    return this.save();
};

// Método para actualizar adjunto
messageSchema.methods.updateAttachment = async function(attachmentData) {
    if (attachmentData) {
        this.attachment = {
            type: 'image',
            url: attachmentData.url,
            public_id: attachmentData.public_id,
            uploadDate: new Date()
        };
    } else {
        this.attachment = null;
    }
    return this.save();
};

// Método para eliminar adjunto
messageSchema.methods.removeAttachment = async function() {
    this.attachment = null;
    return this.save();
};

// Método estático para obtener todos los comentarios de un flat
messageSchema.statics.getCommentsByFlat = async function(flatID) {
    return this.find({ 
        flatID,
        isHidden: false,
        parentMessage: null // Solo comentarios principales
    })
    .sort({ atCreated: -1 }) // Más recientes primero
    .populate('author', 'firstName lastName profileImage')
    .populate({
        path: 'replies',
        match: { isHidden: false },
        populate: {
            path: 'author',
            select: 'firstName lastName profileImage'
        }
    });
};

// Método para obtener comentarios con archivos adjuntos
messageSchema.statics.getMessagesWithAttachments = async function(flatID) {
    return this.find({
        flatID,
        'attachment.url': { $ne: null }
    })
    .sort({ atCreated: -1 })
    .select('attachment content author atCreated rating');
};

// Virtual para obtener respuestas a un comentario
messageSchema.virtual('replies', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'parentMessage'
});

// Virtual para obtener la URL del adjunto formateada
messageSchema.virtual('attachmentUrl').get(function() {
    return this.attachment && this.attachment.url ? this.attachment.url : null;
});

// Índices para mejorar el rendimiento
messageSchema.index({ flatID: 1, parentMessage: 1 });
messageSchema.index({ 'rating.overall': -1 });
messageSchema.index({ atCreated: -1 });

export const Message = mongoose.model("Message", messageSchema);