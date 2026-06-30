const Compra = require('../models/Compra');
const Cliente = require('../models/Cliente');

exports.registrarCompra = async (req, res) => {
  try {
    const { cliente, importe, canal, notas } = req.body;
    if (!cliente || importe === undefined || importe === null || !canal) {
      return res.status(400).json({ mensaje: 'Faltan cliente, importe o canal (tienda | online).' });
    }
    const imp = Number(importe);
    if (!Number.isFinite(imp) || imp <= 0) {
      return res.status(400).json({ mensaje: 'El importe debe ser un número mayor que 0.' });
    }
    if (!['tienda', 'online'].includes(canal)) {
      return res.status(400).json({ mensaje: 'Canal no válido. Use tienda u online.' });
    }

    const existeCliente = await Cliente.findById(cliente);
    if (!existeCliente) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
    }

    const compra = new Compra({
      cliente,
      importe: Math.round(imp * 100) / 100,
      canal,
      notas: (notas || '').trim(),
    });
    const guardada = await compra.save();
    res.status(201).json(guardada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: error.message || 'Error al registrar la compra.' });
  }
};

exports.listarComprasPorCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const compras = await Compra.find({ cliente: id }).sort({ createdAt: -1 });
    res.json(compras);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar compras.' });
  }
};

exports.resumenCompras = async (req, res) => {
  try {
    const ahora = new Date();
    const anio = Number(req.query.anio) || ahora.getUTCFullYear();
    const mesParam = req.query.mes;
    const mes = mesParam === undefined || mesParam === '' ? null : Number(mesParam);

    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      return res.status(400).json({ mensaje: 'Año no válido.' });
    }
    if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      return res.status(400).json({ mensaje: 'Mes no válido.' });
    }

    const inicioPeriodo = mes === null
      ? new Date(Date.UTC(anio, 0, 1))
      : new Date(Date.UTC(anio, mes - 1, 1));
    const finPeriodo = mes === null
      ? new Date(Date.UTC(anio + 1, 0, 1))
      : new Date(Date.UTC(anio, mes, 1));

    const [historicoAgg, periodoAgg, añosAgg] = await Promise.all([
      Compra.aggregate([{ $group: { _id: null, total: { $sum: '$importe' }, operaciones: { $sum: 1 } } }]),
      Compra.aggregate([
        { $match: { createdAt: { $gte: inicioPeriodo, $lt: finPeriodo } } },
        { $group: { _id: null, total: { $sum: '$importe' }, operaciones: { $sum: 1 } } },
      ]),
      Compra.aggregate([
        { $group: { _id: { $year: '$createdAt' } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    res.json({
      anio,
      mes,
      totalHistorico: historicoAgg[0]?.total || 0,
      totalPeriodo: periodoAgg[0]?.total || 0,
      operacionesPeriodo: periodoAgg[0]?.operaciones || 0,
      añosDisponibles: añosAgg.map((x) => x._id).filter(Boolean),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al calcular el resumen de compras.' });
  }
};
