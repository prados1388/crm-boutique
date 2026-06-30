const router = require('express').Router();
const verificarToken = require('../middlewares/auth');
const { registrarCompra, listarComprasPorCliente, resumenCompras } = require('../controllers/compras.controller');

router.post('/', verificarToken, registrarCompra);
router.get('/resumen', verificarToken, resumenCompras);
router.get('/cliente/:id', verificarToken, listarComprasPorCliente);

module.exports = router;
