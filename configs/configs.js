import dotenv from "dotenv";

dotenv.config();

export default {
  MONGODB_USER: process.env.MONGODB_USER,
  MONGODB_PASSWORD: process.env.MONGODB_PASSWORD,
  MONGODB_CLUSTER: process.env.MONGODB_CLUSTER,
  MONGODB_DB: process.env.MONGODB_DB,
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  MAILTRAP_USER: process.env.MAILTRAP_USER,
  MAILTRAP_PASS: process.env.MAILTRAP_PASS,
  RESEND_API_KEY: process.env.RRESEND_API_KEY,
};