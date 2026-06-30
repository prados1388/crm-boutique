const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require('./config/db');

const app = express();

const PORT = process.env.PORT || 3000;

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length > 0) {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
    }),
  );
} else {
  app.use(cors());
}
app.use(express.json());

connectDB();
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/staff', require('./routes/staff.routes'));
app.use('/api/notas', require('./routes/notas.routes'));
app.use('/api/compras', require('./routes/compras.routes'));

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `¡Servidor del CRM corriendo en el puerto ${PORT} y escuchando a todos! 🚀`,
  );
});
