//En este archivo debemos tener las configuraciones iniciales de nuestro proyecto
//1.- Creacion del servidor con express para levantarlo en un puerto especifico
//2.- La definicion de cada uno del grupo de rutas que van a manejar en el proyecto
//2.1- /users /flats /messages
//3.- Llamar a nuestro archivo de conexion a la base de datos
//4.- Podemos agregar un middleware global -> cors
//5.- E; server se comunica con la capa de ruteo
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./db/db.js";
import configs from "./configs/configs.js";
import authRouter from "./routes/auth.router.js";
import userRouter from "./routes/user.router.js";
import flatRouter from "./routes/flat.router.js";
import messageRouter from "./routes/message.router.js";
const app = express();
// Middlewares globales
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parser para JSON
app.use(morgan('dev')); // Logger de solicitudes HTTP

// Middleware para archivos estáticos (imágenes)
app.use('/uploads', express.static('uploads'));

// Conexión a la base de datos
connectDB();

// Definición de rutas base
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/flats", flatRouter);
app.use("/messages", messageRouter);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Iniciar el servidor
app.listen(configs.PORT, () => {
    console.log(`Server running on port ${configs.PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // En producción podrías querer cerrar el servidor gracefully
    // server.close(() => process.exit(1));
});
