import mongoose from "mongoose";

const flatSchema = new mongoose.Schema({
    city: { type: String, required: true },
    streetName: { type: String, required: true },
    streetNumber: { type: String, required: true },
    areaSize: { type: Number, required: true },
    hasAC: { type: Boolean, required: true },
    yearBuilt: { type: Number, required: true },
    rentPrice: { type: Number, required: true },
    dateAvailable: { type: Date, required: true },
    images: [{
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        description: { type: String },
        isMainImage: { type: Boolean, default: false },
        uploadDate: { type: Date, default: Date.now }
    }],
    atCreated: {
        type: Date,
        default: Date.now
    },
    atUpdated: {
        type: Date,
        default: Date.now
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    }
}, {
    // Habilitar virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Middleware para asegurar que solo una imagen sea la principal
flatSchema.pre('save', function(next) {
    const mainImages = this.images.filter(img => img.isMainImage);
    if (mainImages.length > 1) {
        for (let i = 1; i < mainImages.length; i++) {
            this.images[this.images.indexOf(mainImages[i])].isMainImage = false;
        }
    }
    if (mainImages.length === 0 && this.images.length > 0) {
        this.images[0].isMainImage = true;
    }
    next();
});

// Virtual para obtener los mensajes asociados
flatSchema.virtual('messages', {
    ref: 'Message',
    localField: '_id',
    foreignField: 'flatID'
});

// Método para establecer una imagen como principal
flatSchema.methods.setMainImage = function(imageId) {
    this.images = this.images.map(img => {
        img.isMainImage = img._id.equals(imageId);
        return img;
    });
    return this.save();
};

// Método para eliminar una imagen
flatSchema.methods.removeImage = async function(imageId) {
    const imageToRemove = this.images.find(img => img._id.equals(imageId));
    if (!imageToRemove) {
        throw new Error('Image not found');
    }

    if (imageToRemove.isMainImage && this.images.length > 1) {
        const nextImage = this.images.find(img => !img._id.equals(imageId));
        if (nextImage) {
            nextImage.isMainImage = true;
        }
    }

    this.images = this.images.filter(img => !img._id.equals(imageId));
    return this.save();
};

// Método para añadir una imagen
flatSchema.methods.addImage = function(imageData) {
    if (this.images.length === 0) {
        imageData.isMainImage = true;
    }
    this.images.push(imageData);
    return this.save();
};

// Virtual para obtener la imagen principal
flatSchema.virtual('mainImage').get(function() {
    return this.images.find(img => img.isMainImage) || this.images[0];
});

// Índices para mejorar el rendimiento
flatSchema.index({ city: 1 });
flatSchema.index({ rentPrice: 1 });
flatSchema.index({ dateAvailable: 1 });
flatSchema.index({ owner: 1 });
flatSchema.index({ atCreated: -1 });

export const Flat = mongoose.model("flats", flatSchema);