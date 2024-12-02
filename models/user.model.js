import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    isAdmin: { type: Boolean, default: false },
    profileImage: { 
        type: String, 
        default: "https://res.cloudinary.com/dzerzykxk/image/upload/v1/uploads/profiles/default/default-profile.jpg"
    },
    profileImageId: {
        type: String,
        default: "uploads/profiles/default/default-profile"
    },
    atCreated: { type: Date, default: Date.now },
    atUpdated: { type: Date, default: Date.now },
    favoriteFlats: [{ type: mongoose.Schema.Types.ObjectId, ref: "flats" }],
    flatsOwned: [{ type: mongoose.Schema.Types.ObjectId, ref: "flats" }],
    atDeleted: { type: Date, default: null },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Método para actualizar la imagen de perfil
userSchema.methods.updateProfileImage = async function(imageData) {
    if (!imageData) throw new Error('Image data is required');

    this.profileImage = imageData.url;
    this.profileImageId = imageData.public_id;
    this.atUpdated = new Date();
    
    return this.save();
};

// Método para restaurar la imagen de perfil por defecto
userSchema.methods.resetProfileImage = async function() {
    this.profileImage = "https://res.cloudinary.com/dzerzykxk/image/upload/v1/uploads/profiles/default/default-profile.jpg";
    this.profileImageId = "uploads/profiles/default/default-profile";
    this.atUpdated = new Date();
    
    return this.save();
};

// Método para actualizar la contraseña
userSchema.methods.updatePassword = async function(newPassword) {
    this.password = newPassword;
    this.atUpdated = new Date();
    return this.save();
};

// Método para generar token de reseteo de contraseña
userSchema.methods.generateResetToken = function() {
    // Generar token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hashear y guardar el token
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Establecer tiempo de expiración (10 minutos)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Método para añadir un flat a flatsOwned
userSchema.methods.addOwnedFlat = async function(flatId) {
    if (!this.flatsOwned.includes(flatId)) {
        this.flatsOwned.push(flatId);
        this.atUpdated = new Date();
        await this.save();
    }
    return this;
};

// Método para remover un flat de flatsOwned
userSchema.methods.removeOwnedFlat = async function(flatId) {
    this.flatsOwned = this.flatsOwned.filter(id => id.toString() !== flatId.toString());
    this.atUpdated = new Date();
    await this.save();
    return this;
};

// Virtual para obtener el nombre completo
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual para verificar si el usuario está activo
userSchema.virtual('isActive').get(function() {
    return this.atDeleted === null;
});

// Virtual para contar los flats del usuario
userSchema.virtual('totalFlats', {
    ref: 'flats',
    localField: '_id',
    foreignField: 'owner',
    count: true
});

// Método para soft delete
userSchema.methods.softDelete = async function() {
    this.atDeleted = new Date();
    await this.resetProfileImage();
    return this.save();
};

// Índices
userSchema.index({ email: 1 });
userSchema.index({ atDeleted: 1 });
userSchema.index({ flatsOwned: 1 });

export const User = mongoose.model("users", userSchema);