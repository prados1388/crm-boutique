const mongoose = require('mongoose');

const compraSchema = new mongoose.Schema(
  {
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      index: true,
    },
    importe: {
      type: Number,
      required: true,
      min: 0.01,
    },
    canal: {
      type: String,
      enum: ['tienda', 'online'],
      required: true,
    },
    notas: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Compra', compraSchema);
