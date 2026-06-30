const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/auth'); 

const { crearNota, obtenerNotasPorCliente, eliminarNota } = require('../controllers/notas.controller');

// Definimos la ruta POST para crear (Coincide con el fetch: /api/notas)
router.post('/', verificarToken, crearNota);

// Definimos la ruta GET para listar (Coincide con el fetch: /api/notas/cliente/:id)
router.get('/cliente/:id', verificarToken, obtenerNotasPorCliente);

// Borrar una nota específica
router.delete('/:idNota', verificarToken, eliminarNota);

module.exports = router;