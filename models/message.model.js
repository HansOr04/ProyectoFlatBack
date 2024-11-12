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
    // Para adjuntos como imágenes
    attachment: {
        type: { type: String, enum: ['image'], default: null },
        url: { type: String },
    }
});

// Método para editar un comentario
messageSchema.methods.editComment = async function(newContent) {
    this.content = newContent;
    this.isEdited = true;
    this.atEdited = new Date();
    return this.save();
};

// Método para ocultar/mostrar comentario (moderación)
messageSchema.methods.toggleVisibility = async function() {
    this.isHidden = !this.isHidden;
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
        populate: {
            path: 'author',
            select: 'firstName lastName profileImage'
        }
    });
};

// Virtual para obtener respuestas a un comentario
messageSchema.virtual('replies', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'parentMessage'
});

const Message = mongoose.model("Message", messageSchema);
export default Message;