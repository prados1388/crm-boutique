# CRM Boutique

App full stack para gestionar clientes de una tienda: notas, compras, alarmas y clientes VIP.

**Stack:** React (Vite) + Express + MongoDB

## Requisitos

- Node.js
- MongoDB en local

## Arranque

1. MongoDB en marcha.

2. **Servidor** (terminal 1):

   ```bash
   cd server
   npm install
   node index.js
   ```

   Crea `server/.env` con al menos:

   ```
   MONGO_URI=mongodb://127.0.0.1:27017/proyectoCRM
   JWT_SECRET=tu_clave_secreta
   ```

3. **Cliente** (terminal 2):

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Abre `http://localhost:5173` e inicia sesión.

## Usuario

Usa un usuario de la colección `staff` en MongoDB (por ejemplo `profe@crm.com`).

Si no hay ninguno, créalo con `POST http://127.0.0.1:3000/api/staff/registro` y body JSON:

```json
{ "nombre": "Admin", "email": "admin@crm.com", "password": "123456" }
```
