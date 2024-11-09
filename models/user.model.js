//? Primer paso definir el schema de la base de datos para la coleccion de usuarios
import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    isAdmin: { type: Boolean, default: false },
    atCreated: { type: Date, default: Date.now },
    atUpdated: { type: Date, default: Date.now },
    //? Se define un atributo que  contenga los favoritos de los flats
    favoriteFlats: [{ type: mongoose.Schema.Types.ObjectId, ref: "flats" }], //! Cambiar el nombre de FLAT por si le pones otro nombre
    //? El proyecto pide hacer un borrado fisico, pero mejor hacer un borrado logico
    atDeleted: { type: Date, default: null },

});
//! Definir el modelo de datos para la coleccion de usuarios
export const User = mongoose.model("users", userSchema);