import mongoose from "mongoose";
import configs from "../configs/configs.js";

export const connectDB = async () => {
    try {
        await mongoose.connect(
            `mongodb+srv://${configs.MONGODB_USER}:${configs.MONGODB_PASSWORD}@${configs.MONGODB_CLUSTER}/${configs.MONGODB_DB}?retryWrites=true&w=majority&appName=Krugerback`
        );
        console.log("Conectado a la base de datos");
    } catch (error) {
        console.error("Error al conectar la base de datos", error);
    }
};
