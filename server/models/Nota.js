const mongoose = require('mongoose');

const notaSchema = new mongoose.Schema({
    contenido: { 
        type: String, 
        required: true 
    },
    // Aquí vinculamos la nota con el cliente:
    cliente: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Cliente', 
        required: true 
    },
    // Aquí vinculamos la nota con el usuario que la escribió:
    creadaPor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Staff',   
        required: true 
    }
}, { 
    timestamps: true // Esto añade la fecha exacta en la que se creó
});

module.exports = mongoose.model('Nota', notaSchema);