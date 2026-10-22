# CRM Boutique

CRM full stack para una tienda: clientes, notas, compras, alarmas y clientes VIP.

**Stack:** React (Vite) · Node.js · Express · MongoDB · JWT

## Qué incluye

- Login de personal
- Fichas de cliente y seguimiento
- Notas, compras y avisos
- Marcado de clientes VIP
- API REST con autenticación

## Requisitos

- Node.js
- MongoDB en local

## Arranque

1. MongoDB en marcha.
2. **Servidor** (terminal 1):

```bash
cd server
npm install
```

Crea `server/.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/proyectoCRM
JWT_SECRET=tu_clave_secreta
```

```bash
node index.js
```

3. **Cliente** (terminal 2):

```bash
cd client
npm install
npm run dev
```

4. Abre `http://localhost:5173` e inicia sesión.

## Usuario de prueba

Crea uno con `POST http://127.0.0.1:3000/api/staff/registro`:

```json
{ "nombre": "Admin", "email": "admin@crm.com", "password": "123456" }
```

---

Proyecto de [Ana Prados](https://github.com/prados1388)
