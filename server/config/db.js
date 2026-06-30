const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI || !String(process.env.MONGO_URI).trim()) {
    console.error(
      'Falta MONGO_URI. Crea server/.env (puedes copiar server/.env.example) y define la cadena de conexión a MongoDB.',
    );
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      family: 4
    });

    console.log('¡Conectado a MongoDB!');
  } catch (error) {
    console.error('Error al conectar:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

