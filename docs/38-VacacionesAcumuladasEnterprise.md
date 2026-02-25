# 38 - Vacaciones Acumuladas Enterprise

## Objetivo
Definir reglas oficiales de vacaciones acumuladas para KPITAL 360 con trazabilidad total, sin ediciones destructivas y con provisiÃ³n mensual automÃ¡tica por empleado.

## Reglas de Negocio Aprobadas

### 1) Saldo inicial inmutable
- En crear empleado se registra `dias_iniciales` (entero, >= 0).
- Si el valor es `0`, igual se crea la cuenta de vacaciones del empleado.
- El saldo inicial no se vuelve a editar por usuarios operativos.

### 2) Fecha de ingreso y dÃ­a ancla
- Fecha de ingreso permitida solo del dÃ­a `1` al `28`.
- Esta misma regla aplica en crear y editar.
- Fecha de ingreso no editable para usuarios normales.
- ExcepciÃ³n: usuario Master puede cambiarla.
- Si Master la cambia, no se recalcula historial; solo cambia el prÃ³ximo dÃ­a de provisiÃ³n.

### 3) ProvisiÃ³n mensual de dÃ­as
- Se provisiona `+1` dÃ­a por cada mes cumplido.
- Cada empleado provisiona en su propio dÃ­a ancla mensual (derivado de fecha de ingreso).
- La provisiÃ³n se ejecuta al cierre del dÃ­a ancla (zona `America/Costa_Rica`).
- Si entrÃ³ hoy, espera al siguiente mes cumplido (sin prorrateo).

### 4) Saldo negativo permitido
- Se permite saldo negativo.
- Ejemplo: saldo `-4`; prÃ³xima provisiÃ³n lo lleva a `-3`, luego `-2`, `-1`, `0`, `1`, etc.

### 5) Sin tope de acumulaciÃ³n
- No existe lÃ­mite mÃ¡ximo de dÃ­as acumulados.

### 6) Estado laboral y salida
- Empleados inactivos no provisionan.
- Si existe fecha de salida, no provisiona mÃ¡s despuÃ©s de esa fecha.
- Si la salida cae el mismo dÃ­a ancla, sÃ­ provisiona ese dÃ­a al cierre.

### 7) Descuento por acciones de personal
- Crear/aprobar acciÃ³n no descuenta saldo.
- El descuento ocurre cuando la planilla asociada llega a estado final aplicado/listo.
- Si una acciÃ³n no llega a planilla aplicada, no impacta vacaciones.

### 8) Reversa y auditorÃ­a
- El historial es inmutable (ledger).
- Si una acciÃ³n aplicada se anula, no se borra el movimiento previo.
- Se crea un movimiento inverso para compensar y mantener trazabilidad.

### 9) Permisos especiales
- Ajustes manuales de dÃ­as requieren permiso especial.
- Sin permiso, no se puede agregar/restar por fuera del flujo normal.

## Modelo Enterprise

### A. Cuenta de vacaciones (por empleado)
- Guarda metadatos: empleado, dÃ­as iniciales, dÃ­a ancla, fecha ancla, bloqueo inicial.

### B. Ledger de vacaciones (movimientos)
- Cada cambio se registra como movimiento: inicial, provisiÃ³n, consumo, reversa, ajuste.
- Saldo disponible = suma de `dias_delta` del ledger.

### C. Historial de provisiÃ³n monetaria
- Por cada provisiÃ³n de `+1` dÃ­a se guarda monto provisionado y fÃ³rmula aplicada.

## FÃ³rmulas de monto provisionado (referencia aprobada)
- Mensual: `salario_base / 30`
- Quincenal: `(salario_base / 2) / 15`
- Semanal: `salario_base / 7`
- Bisemanal: `salario_base / 14`
- Diario: `salario_base`
- Trimestral: `salario_base / 90`
- Semestral: `salario_base / 180`
- Anual: `salario_base / 365`
- Redondeo: 2 decimales.

## Integridad y Concurrencia
- Idempotencia mensual obligatoria para no duplicar provisiones.
- Operaciones de provisiÃ³n/consumo en transacciÃ³n.
- Nunca borrar movimientos de vacaciones para corregir errores.

## Resumen operativo
- El campo de vacaciones en crear empleado define dÃ­as iniciales, no dinero.
- El sistema suma `+1` mensual por mes cumplido.
- Las vacaciones ejecutadas por planilla aplicada restan dÃ­as.
- Todo queda auditado en historial infinito por empleado.
