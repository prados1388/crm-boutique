const Staff = require('../models/Staff');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// REGISTRO
exports.registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    let usuario = await Staff.findOne({ email });
    if (usuario) {
      return res.status(400).json({ mensaje: "El correo ya está en uso" });
    }

    usuario = new Staff({ nombre, email, password });
    await usuario.save();

    res.status(201).json({ mensaje: "Usuario creado" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Staff.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ mensaje: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return res.status(400).json({ mensaje: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { usuarioId: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};