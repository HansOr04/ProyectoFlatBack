import mongoose from "mongoose";
import bcrypt from "bcrypt";
<<<<<<< HEAD

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    isAdmin: { type: Boolean, default: false },
    // Campo actualizado para la imagen de perfil con Cloudinary
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
    atDeleted: { type: Date, default: null },
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

// Virtual para obtener el nombre completo
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual para verificar si el usuario está activo
userSchema.virtual('isActive').get(function() {
    return this.atDeleted === null;
});

// Método para soft delete
userSchema.methods.softDelete = async function() {
    this.atDeleted = new Date();
    // Restaurar imagen de perfil por defecto al eliminar
    await this.resetProfileImage();
    return this.save();
};

// Índices
userSchema.index({ email: 1 });
userSchema.index({ atDeleted: 1 });

export const User = mongoose.model("users", userSchema);
=======
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: "Por favor ingrese un email válido",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    validate: {
      validator: function (v) {
        return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(
          v
        );
      },
      message:
        "La contraseña debe contener letras, números y al menos un carácter especial",
    },
  },
  firstName: {
    type: String,
    required: true,
    minlength: [2, "El nombre debe tener al menos 2 caracteres"],
  },
  lastName: {
    type: String,
    required: true,
    minlength: [2, "El apellido debe tener al menos 2 caracteres"],
  },
  birthDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        const age = new Date().getFullYear() - v.getFullYear();
        return age >= 18 && age <= 120;
      },
      message: "La edad debe estar entre 18 y 120 años",
    },
  },
  isAdmin: { type: Boolean, default: false },
  atCreated: { type: Date, default: Date.now },
  atUpdated: { type: Date, default: Date.now },
  resetPasswordToken: String, //Generar un identificador unico que vamos a enviar al usuario (correo)
  resetPasswordExpires: Date, //Definir la fecha de expiracion del token
  //? Se define un atributo que  contenga los favoritos de los flats
  favoriteFlats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Flat" }], //! Cambiar el nombre de FLAT por si le pones otro nombre
  //? El proyecto pide hacer un borrado fisico, pero mejor hacer un borrado logico
  atDeleted: { type: Date, default: null },
});

//Pre book (proceso que se va a ejecutar antes de guardarse el usuario en la base de datos BDD)
//El primer parametro de nuestro pre hook, es la operacion a la cual  vamos a aplicar el hook
userSchema.pre("save", async function (next) {
  const user = this; //this -> es el objeto que estamos guardando en la base de datos

  //Solo si se esta modificando el atributo password vamos a proceder a hashear la contrasena
  if (user.isModified("password")) {
    try {
      //Primer paso: para hashear la contrasena, generar un salt (va a ser generado de manera randomica)
      const salt = await bcrypt.genSalt(10);

      //segundo paso: hashear la contrasena
      //1234 -> %$&&&^%$78965423
      const hash = await bcrypt.hash(user.password, salt);

      //tercer paso: asignar la contrasena hasheada al atributo password
      user.password = hash;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

//Vamos a crear un hook que se encargue de eliminar la contrasena del objeto que se va a devolver al cliente
userSchema.post("find", function (docs, next) {
  //docs es un arreglo de objetos que se han devuelto de la base de datos
  docs.forEach((doc) => {
    doc.password = undefined; //le quitamos la contrasena del objeto
  });

  next();
});

//Vamos a extender la funcionalidad de nuestro schema, de manera que tenga un metodo
//que nos permita comparar la contrasena que el usuario esta enviado con la contrasena hasheada en la base de datos
//Recibe como parametro el password que envia el cliente para autenticarse
userSchema.methods.comparePasswords = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//Vamos a agregar un metodo a nuestro schema que nos permita generar un token de reseteo de contrasena
userSchema.methods.generateResetToken = function () {
  //Generamos la cadena randomica en formato hexadecimal (formato que se usa para representar cualquier cadena en nuestro computador)
  const resetTolken = crypto.randomBytes(20).toString("hex");

  //Vamos a guardar el token hasheado, para que sea seguro
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetTolken)
    .digest("hex");

  //Vamos a definir la fecha de expiracion del token
  this.resetPasswordExpires = Date.now() + 3600000; //1 hora

  return resetTolken;
};

//! Definir el modelo de datos para la coleccion de usuarios
const User = mongoose.model("User", userSchema);
export default User;
>>>>>>> main
