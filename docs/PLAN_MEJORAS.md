# Plan de mejoras CRM (nota / entrega)

Marcar con `[x]` lo completado. Orden sugerido: 1 → 2 → 3 → 4.

## 1. Pulir lo existente (UX + fiabilidad)

- [x] Estados vacíos y errores visibles (sin depender solo de `alert`)
- [x] Feedback al guardar: deshabilitar botones + texto “Guardando…” / toasts de éxito-error
- [x] Responsive básico (tarjetas, botones, espaciado)
- [x] Accesibilidad básica: `role="dialog"`, `aria-labelledby`, cierre con Escape

## 2. Una funcionalidad “de producto”

- [x] Historial de compras por cliente **o**
- [x] Búsqueda / filtro de clientes **o**
- [x] Dashboard mínimo (totales)

## 3. Calidad técnica

- [x] API base desde `.env` (Vite `VITE_API_URL` + server)
- [x] README con arranque, variables y decisiones (VIP anual, compras…)
- [ ] (Opcional) Despliegue demo — guía breve en README, sin pipeline automatizado

## 4. Defensa / memoria

- [ ] Guión corto: problema → solución (compras, VIP, alarmas…)
- [ ] Límites explícitos (ej.: sin pasarela; registro manual de venta)

---

*Última actualización: punto 3 (env + README + CORS opcional); despliegue demo sigue siendo opcional manual.*
