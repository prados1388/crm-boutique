const router = require('express').Router();
const verificarToken = require('../middlewares/auth');

// 👇 IMPORTAMOS CONTROLLER
const {
  crearCliente,
  obtenerClientes,
  actualizarCliente,
  eliminarCliente
} = require('../controllers/clientes.controller');

// CREAR
router.post('/', verificarToken, crearCliente);

// LEER
router.get('/', verificarToken, obtenerClientes);

// ACTUALIZAR
router.put('/:id', verificarToken, actualizarCliente);

// BORRAR
router.delete('/:id', verificarToken, eliminarCliente);

module.exports = router;
