//Vamos a recibir como parametro los roles que pueden acceder a un servicio, los roles van a ser un array
const authorizationMiddleware = (roles) => {
  return (req, res, next) => {
    //Debemps obtener el rol del usuario que esta haciendo el request
    const userRole = req.user.role;

    //Verificar si el rol del usuario que esta haciendo el request tiene permiso para acceder al servicio
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

export default authorizationMiddleware;
