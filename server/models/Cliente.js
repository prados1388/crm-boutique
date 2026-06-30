const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String },
  telefono: { type: String },
  cumpleanos: { type: String, default: "" },
  notas: { type: String, default: "" },
  ventasAcumuladas: { type: Number, default: 0 },
  alarmaCuando: { type: Date, default: null },
  alarmaDescripcion: { type: String, default: '' },
  wishlist: [{
    nombre: { type: String, trim: true, required: true },
    categoria: {
      type: String,
      enum: ['textil', 'hogar', 'cosmetica', 'otro'],
      default: 'otro',
    },
    url: { type: String, trim: true, default: '' },
  }],
});

module.exports = mongoose.model('Cliente', clienteSchema);