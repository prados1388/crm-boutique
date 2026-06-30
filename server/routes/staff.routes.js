const router = require('express').Router();

const { registro, login } = require('../controllers/staff.controller');

// REGISTRO
router.post('/registro', registro);

// LOGIN
router.post('/login', login);

module.exports = router;


