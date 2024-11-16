import mongoose from "mongoose";

const flatSchema = new mongoose.Schema({
    city: { type: String, required: true },
    streetName: { type: String, required: true },
    streetNumber: { type: String, required: true },
    areaSize: { type: Number, required: true },
    hasAC: { type: Boolean, required: true },
    yearBuilt: { type: Number, required: true },    // Corregido de yearBuililt a yearBuilt
    rentPrice: { type: Number, required: true },
    dateAvailable: { type: Date, required: true },
    // Array de imágenes del departamento
    images: [{
        url: { type: String, required: true },
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
    },
});

// Middleware para asegurar que solo una imagen sea la principal
flatSchema.pre('save', function(next) {
    const mainImages = this.images.filter(img => img.isMainImage);
    if (mainImages.length > 1) {
        // Si hay más de una imagen principal, mantener solo la primera
        for (let i = 1; i < mainImages.length; i++) {
            this.images[this.images.indexOf(mainImages[i])].isMainImage = false;
        }
    }
    next();
});

// Método para establecer una imagen como principal
flatSchema.methods.setMainImage = function(imageId) {
    this.images = this.images.map(img => {
        img.isMainImage = img._id.equals(imageId);
        return img;
    });
    return this.save();
};

export const Flat = mongoose.model("flats", flatSchema);