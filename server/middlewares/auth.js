const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const cifrado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = cifrado;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: "Token no válido o expirado" });
  }
};

module.exports = verificarToken;