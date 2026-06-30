const Cliente = require('../models/Cliente');
const Compra = require('../models/Compra');
const Nota = require('../models/Nota');

/** Umbral anual (€) para considerar VIP según volumen de compras del año natural en curso. */
const UMBRAL_VIP_ANUAL_EUR = Number(process.env.VIP_UMBRAL_ANUAL_EUR) || 3000;

// CREAR
exports.crearCliente = async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.ventasAcumuladas;
    delete body.esVip;
    const nuevo = new Cliente({ ...body, ventasAcumuladas: 0 });
    const guardado = await nuevo.save();
    res.json(guardado);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// LEER (con totales desde compras reales + VIP por volumen anual)
/** Año natural en UTC: del 1 ene 00:00 UTC al 31 dic (excl.). Al cambiar de año, ventasAnioActual y VIP se recalculan solos. */
exports.obtenerClientes = async (req, res) => {
  try {
    const ahora = new Date();
    const año = ahora.getUTCFullYear();
    const mes = ahora.getUTCMonth();
    const inicioAño = new Date(Date.UTC(año, 0, 1));
    const inicioSiguienteAño = new Date(Date.UTC(año + 1, 0, 1));
    const inicioMes = new Date(Date.UTC(año, mes, 1));
    const inicioSiguienteMes = new Date(Date.UTC(año, mes + 1, 1));

    const clientes = await Cliente.aggregate([
      {
        $lookup: {
          from: 'compras',
          localField: '_id',
          foreignField: 'cliente',
          as: 'comprasArr',
        },
      },
      {
        $addFields: {
          anioContableCompras: { $literal: año },
          ventasTotal: {
            $cond: [
              { $gt: [{ $size: '$comprasArr' }, 0] },
              {
                $sum: {
                  $map: {
                    input: '$comprasArr',
                    as: 'd',
                    in: { $ifNull: ['$$d.importe', 0] },
                  },
                },
              },
              { $ifNull: ['$ventasAcumuladas', 0] },
            ],
          },
          ventasAnioActual: {
            $ifNull: [
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$comprasArr',
                        as: 'co',
                        cond: {
                          $and: [
                            { $gte: ['$$co.createdAt', inicioAño] },
                            { $lt: ['$$co.createdAt', inicioSiguienteAño] },
                          ],
                        },
                      },
                    },
                    as: 'c',
                    in: { $ifNull: ['$$c.importe', 0] },
                  },
                },
              },
              0,
            ],
          },
          ventasMesActual: {
            $ifNull: [
              {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$comprasArr',
                        as: 'co',
                        cond: {
                          $and: [
                            { $gte: ['$$co.createdAt', inicioMes] },
                            { $lt: ['$$co.createdAt', inicioSiguienteMes] },
                          ],
                        },
                      },
                    },
                    as: 'c',
                    in: { $ifNull: ['$$c.importe', 0] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          esVip: { $gte: ['$ventasAnioActual', UMBRAL_VIP_ANUAL_EUR] },
        },
      },
      { $project: { comprasArr: 0 } },
    ]);

    res.json(clientes);
  } catch (error) {
    console.error('obtenerClientes aggregate:', error);
    try {
      const raw = await Cliente.find().lean();
      const fallback = raw.map((c) => ({
        ...c,
        anioContableCompras: new Date().getUTCFullYear(),
        ventasTotal: c.ventasAcumuladas ?? 0,
        ventasAnioActual: 0,
        ventasMesActual: 0,
        esVip: false,
      }));
      res.json(fallback);
    } catch (e2) {
      console.error(e2);
      res.status(500).json({ mensaje: error.message || 'Error al obtener clientes.' });
    }
  }
};

// ACTUALIZAR
exports.actualizarCliente = async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.ventasAcumuladas;
    delete body.esVip;
    delete body.ventasTotal;
    delete body.ventasAnioActual;
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// BORRAR
exports.eliminarCliente = async (req, res) => {
  try {
    const eliminado = await Cliente.findByIdAndDelete(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }
    await Compra.deleteMany({ cliente: req.params.id });
    await Nota.deleteMany({ cliente: req.params.id });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
