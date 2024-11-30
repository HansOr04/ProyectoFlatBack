import mongoose from "mongoose";

const flatSchema = new mongoose.Schema({
    // Información básica existente
    city: { type: String, required: true },
    streetName: { type: String, required: true },
    streetNumber: { type: String, required: true },
    areaSize: { type: Number, required: true },
    yearBuilt: { type: Number, required: true },
    rentPrice: { type: Number, required: true },
    dateAvailable: { type: Date, required: true },

    // Información detallada de la propiedad
    title: { type: String, required: true },
    description: { type: String, required: true },
    propertyType: {
        type: String,
        enum: ['apartment', 'house', 'studio', 'loft', 'room'],
        required: true
    },
    
    // Características básicas
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    maxGuests: { type: Number, required: true },
    
    // Sistema de calificaciones
    ratings: {
        overall: { 
            type: Number, 
            default: 0,
            min: 0,
            max: 5 
        },
        aspects: {
            cleanliness: { type: Number, default: 0 },
            communication: { type: Number, default: 0 },
            location: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 },
            value: { type: Number, default: 0 }
        },
        totalReviews: { 
            type: Number, 
            default: 0 
        }
    },

    // Amenidades
    amenities: {
        // Básicas
        wifi: { type: Boolean, default: false },
        tv: { type: Boolean, default: false },
        kitchen: { type: Boolean, default: false },
        washer: { type: Boolean, default: false },
        airConditioning: { type: Boolean, default: false },
        heating: { type: Boolean, default: false },
        workspace: { type: Boolean, default: false },

        // Instalaciones
        parking: {
            available: { type: Boolean, default: false },
            type: {
                type: String,
                enum: ['free', 'paid', 'street', 'none'],
                default: 'none'
            },
            details: String
        },
        
        // Seguridad
        smokeAlarm: { type: Boolean, default: false },
        firstAidKit: { type: Boolean, default: false },
        fireExtinguisher: { type: Boolean, default: false },
        securityCameras: { type: Boolean, default: false },
        
        // Extras
        pool: { type: Boolean, default: false },
        gym: { type: Boolean, default: false },
        elevator: { type: Boolean, default: false },
        petsAllowed: { type: Boolean, default: false }
    },

    // Reglas de la casa
    houseRules: {
        smokingAllowed: { type: Boolean, default: false },
        eventsAllowed: { type: Boolean, default: false },
        quietHours: {
            start: { type: String, default: "22:00" },
            end: { type: String, default: "08:00" }
        },
        additionalRules: [String]
    },

    // Ubicación
    location: {
        coordinates: {
            lat: Number,
            lng: Number
        },
        neighborhood: String,
        zipCode: String,
        publicTransport: [String],
        nearbyPlaces: [String]
    },

    // Imágenes
    images: [{
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        description: { type: String },
        isMainImage: { type: Boolean, default: false },
        uploadDate: { type: Date, default: Date.now }
    }],

    // Disponibilidad y reservas
    availability: {
        minimumStay: { type: Number, default: 1 },
        maximumStay: { type: Number, default: 365 },
        instantBooking: { type: Boolean, default: false },
        advanceNotice: { type: Number, default: 1 } // días
    },

    // Datos del propietario y timestamps
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    atCreated: { type: Date, default: Date.now },
    atUpdated: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Middleware para imagen principal
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

// Virtual para calcular promedio de calificación
flatSchema.virtual('averageRating').get(function() {
    if (!this.ratings || this.ratings.totalReviews === 0) return 0;
    return this.ratings.overall;
});

// Método para actualizar calificaciones
flatSchema.methods.updateRatings = async function(newRating) {
    const Message = mongoose.model('Message');
    const messages = await Message.find({
        flatID: this._id,
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

    this.ratings = ratings;
    return this.save();
};

// Método para establecer una imagen como principal
flatSchema.methods.setMainImage = function(imageId) {
    this.images = this.images.map(img => {
        img.isMainImage = img._id.equals(imageId);
        return img;
    });
    return this.save();
};

// Índices
flatSchema.index({ city: 1 });
flatSchema.index({ 'location.neighborhood': 1 });
flatSchema.index({ bedrooms: 1 });
flatSchema.index({ rentPrice: 1 });
flatSchema.index({ propertyType: 1 });
flatSchema.index({ 'ratings.overall': -1 });
flatSchema.index({ 'amenities.wifi': 1 });
flatSchema.index({ 'amenities.parking.available': 1 });
flatSchema.index({ dateAvailable: 1 });
flatSchema.index({ owner: 1 });
flatSchema.index({ atCreated: -1 });

export const Flat = mongoose.model("flats", flatSchema);