//En este archivo debemos tener las configuraciones iniciales de nuestro proyecto
//1.- Creacion del servidor con express para levantarlo en un puerto especifico
//2.- La definicion de cada uno del grupo de rutas que van a manejar en el proyecto
//2.1- /users /flats /messages
//3.- Llamar a nuestro archivo de conexion a la base de datos
//4.- Podemos agregar un middleware global -> cors
//5.- E; server se comunica con la capa de ruteo
import express from "express";
import { connectDB } from "./db/db.js";
import configs from "./configs/configs.js";
//1.0- Importar Route usuarios
//2.0- Importar Route flats
import flatRoute from "./routes/flat.router.js";
//3.0- Importar Route messages
const app = express();
app.use(express.json());

connectDB();
//1.1- Rutas de usuarios
//1.2- Rutas de flats
app.use("/flats", flatRoute);
//1.3- Rutas de messages
app.listen(configs.PORT, () => {
    console.log(`Server running on port ${configs.PORT}`);
});