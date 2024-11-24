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
    // Actualizado para Cloudinary
    attachment: {
        type: { type: String, enum: ['image'], default: null },
        url: { type: String },
        public_id: { type: String }, // ID de Cloudinary
        uploadDate: { type: Date, default: Date.now }
    }
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
    .select('attachment content author atCreated');
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

const Message = mongoose.model("Message", messageSchema);
export default Message;