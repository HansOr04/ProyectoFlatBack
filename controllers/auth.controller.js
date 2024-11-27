<<<<<<< HEAD
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../configs/cloudinary.config.js";

const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, birthDate } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // Si hay un archivo subido, eliminarlo
            if (req.file?.cloudinary?.public_id) {
                await deleteFromCloudinary(req.file.cloudinary.public_id);
            }
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Crear el usuario con o sin imagen de perfil
        const userData = {
            email,
            password,
            firstName,
            lastName,
            birthDate
        };

        // Si hay una imagen subida, agregar los datos de Cloudinary
        if (req.file?.cloudinary) {
            userData.profileImage = req.file.cloudinary.url;
            userData.profileImageId = req.file.cloudinary.public_id;
        }

        const user = new User(userData);
        await user.save();

        // Generar token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage
                }
            }
        });
    } catch (error) {
        // Si hay error y se subió un archivo, eliminarlo
        if (req.file?.cloudinary?.public_id) {
            await deleteFromCloudinary(req.file.cloudinary.public_id);
        }
        res.status(400).json({
            success: false,
            message: "Error registering user",
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario y verificar que no esté borrado
        const user = await User.findOne({ email, atDeleted: null });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Verificar password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Generar access token
        const token = jwt.sign(
            { id: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Generar refresh token
        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    isAdmin: user.isAdmin,
                    profileImage: user.profileImage
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error during login",
            error: error.message
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verificar contraseña actual
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Actualizar contraseña
        await user.updatePassword(newPassword);

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Error changing password",
            error: error.message
        });
    }
};

// Añadir método para refrescar token
const refreshUserToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required"
            });
        }

        try {
            // Verificar refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            // Buscar usuario
            const user = await User.findById(decoded.id).select('-password');
            if (!user || user.atDeleted) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid refresh token - User not found or deleted"
                });
            }

            // Generar nuevo access token
            const newAccessToken = jwt.sign(
                { id: user._id, email: user.email, isAdmin: user.isAdmin },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(200).json({
                success: true,
                data: {
                    token: newAccessToken
                }
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token expired"
                });
            }
            throw error;
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Error refreshing token",
            error: error.message
        });
    }
};

export { register, login, changePassword, refreshUserToken };
=======
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import configs from "../configs/configs.js";
import sendEmail from "../utils/email.js";
import crypto from "crypto";
const register = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    //1. Vamos a obtener las credenciales (username y password) del request
    const { email, password } = req.body;
    //2. Vamos a buscar el usuario en la BDD. si no existe vamos a retornar un 404
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //3. Vamos a comparar la contrasena que viene en el request con la contrasena hasehada que tenemos en la BDD
    const passwordsMatch = await user.comparePasswords(password); //utilizamos el metodo comparePasswords que creamos en el modelo de usuario user.model.js
    //4. Si las contrasenas no coinciden, retornamos un 401 (unauthorized)
    if (!passwordsMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    //5. Si las contrasenas coinciden, vamos a generar un token JWT y lo vamos a retornar en la respuesta
    //El metodo sign lo que hacce es firmar nuestro jwt (token), la firma del token sirve para poder validar
    //que el token no ha sido modificado por un tercero.
    //El primer parametro que vamos a enviar en el metodo es un objeto que contiene la informacion del usuario
    //Ejemplo: DSFADDFSADF%/(32121) -> informacion del usuario
    const token = await jwt.sign(
      { user_id: user._id, role: user.role }, //El token va a contener la informacion del usuario
      configs.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log(email);

    //1. Vamos a validar si el correo que esta enviado existe o esta almacenado en la BDD
    const user = await User.findOne({ email: email.trim() });
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //2. Vamos a generar un token unico que vamos a enviar al correo del usuario
    const resetToken = user.generateResetToken();

    console.log(resetToken); //borrar
    await user.save({ validateBeforeSave: false });

    //3. Vamos a generar la url que vamos a enviar al correo del usuario
    //http://localhost:5173/reset-password/resetTokenPassword
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    //4. Vamos a enviar el correo al usuario
    try {
      const message = `Para resetear tu contrasena, por favor haz click en el siguiente enlace: ${resetUrl}`;
      await sendEmail({
        email: user.email,
        subject: "Restablecer tu contrasena",
        message,
      });
      res.json({ message: "Correo enviado exitosamente" });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });
      res.status(500).json({ message: error.message });
    }
  } catch (error) {
    console.log(error); //borrar
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    //1. Vamos a obtener el tokem del request (query params)
    const { token } = req.params;
    //2. Vamos a obtener la nueva password que ha configurado el usuario
    const { password } = req.body;
    //3. En BDD tenemos el token pero esta hasheado y lo que lleva en el request esta en texto plano
    //Vamos a hashear el token que llega en el request para poder compararlo con le token hasheado que tenemos en la BDD
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    //4. Vamos a buscar ese usuario de acuerdo al token hasheado, ademas vamos a aplicar la condicion de tiempo de vida del token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    //5. Validar si el usuario existeque estamos buscando existe o no
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    //6. Vamos a actualizar la contrasena del usuario
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    //7. Vamos a guardar la contrasena
    await user.save();
    //8. Vamos a retornar un mensaje de exito
    res.json({ message: "Contrasena actualizada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { register, login, forgotPassword, resetPassword };
>>>>>>> main
