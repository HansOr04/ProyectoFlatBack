import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    isAdmin: { type: Boolean, default: false },
    // Campo para la imagen de perfil
    profileImage: { 
        type: String, 
        default: "default-profile.jpg" // Imagen por defecto
    },
    atCreated: { type: Date, default: Date.now },
    atUpdated: { type: Date, default: Date.now },
    favoriteFlats: [{ type: mongoose.Schema.Types.ObjectId, ref: "flats" }],
    atDeleted: { type: Date, default: null },
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    // Solo hashear la contraseña si ha sido modificada o es nueva
    if (!this.isModified('password')) return next();
    
    try {
        // Generar un salt y hashear la contraseña
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

// Método para actualizar la contraseña
userSchema.methods.updatePassword = async function(newPassword) {
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(newPassword, salt);
        await this.save();
    } catch (error) {
        throw error;
    }
};

export const User = mongoose.model("users", userSchema);