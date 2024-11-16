import jwt from "jsonwebtoken";
import configs from "../configs/configs.js";

//Next nos permite continuar con la ejecucion normal una vez que se cumpla la condicion
const authenticationMiddleware = (req, res, next) => {
  //Vamos a obtener el objeto autorizacion que viene en el header de la peticion (Postman)
  const authHeader = req.header("Authorization");

  //Vamos a validar si esta llegando o no el JWT en el header
  //adicionalmente que el Header empiece por la palabra Bearer
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Invalid token" });
  }

  //Vamos a validar el token que viene en el header JWT
  try {
    // Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjcxMDVhMGEzZDdhNGZhNmRmMWJjM2YxIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MjkyOTE5NDIsImV4cCI6MTcyOTI5NTU0Mn0.Fkfheu8P-S1hJ4lZLdD0ZI0RnI8jp8P64pXZPx1vDfA
    const token = authHeader.split(" ")[1]; //["Bearer", "eyJh...."]
    console.log(token);
    //Validarlo y decodificarlo
    const decoded = jwt.verify(token, configs.JWT_SECRET);
    console.log(decoded);
    //Modificar o agregar un atributo al request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticationMiddleware;
