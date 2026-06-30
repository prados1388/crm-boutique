const Nota = require('../models/Nota');

const crearNota = async (req, res) => {
    try {
        const { contenido, cliente } = req.body;

        // Verificamos que el frontend nos envíe lo necesario
        if (!contenido || !cliente) {
            return res.status(400).json({ mensaje: "El contenido y el id del cliente son obligatorios" });
        }

        // Preparamos la nota para la base de datos
        const nuevaNota = new Nota({
            contenido,
            cliente,
            creadaPor: req.usuario.usuarioId || req.usuario._id || req.usuario.id 
        });

        const notaGuardada = await nuevaNota.save();
        res.status(201).json(notaGuardada);

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al crear la nota en el servidor" });
    }
};

const obtenerNotasPorCliente = async (req, res) => {
    try {
        const { id } = req.params; // El ID del cliente que viene en la URL
        // Buscamos notas que tengan ese id de cliente y traemos el nombre del autor
        const notas = await Nota.find({ cliente: id })
            .populate('creadaPor', 'nombre')
            .sort({ createdAt: -1 });

        res.status(200).json(notas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener las notas" });
    }
};

const eliminarNota = async (req, res) => {
    try {
        const { idNota } = req.params;
        const borrada = await Nota.findByIdAndDelete(idNota);
        if (!borrada) {
            return res.status(404).json({ mensaje: 'Nota no encontrada' });
        }
        res.status(200).json({ mensaje: "Nota eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al eliminar la nota" });
    }
};

module.exports = { crearNota, obtenerNotasPorCliente, eliminarNota };

