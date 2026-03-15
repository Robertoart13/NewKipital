# DIRECTIVA 29 - Estandar de Formato Moneda

**Documento:** 29  
**Fecha:** 2026-02-24  
**Objetivo:** Definir una sola fuente de verdad para formato, parseo y validacion de montos monetarios en toda la app (frontend).

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Regla principal

Todo monto monetario en inputs de UI debe usar el helper compartido:

- `frontend/src/lib/currencyFormat.ts`

No se permite duplicar formatter/parser en componentes.

---

## Helper oficial

Archivo: `frontend/src/lib/currencyFormat.ts`

Funciones oficiales:

- `MAX_MONEY_AMOUNT = 999999999999.99`
- `getCurrencySymbol(currency)` -> `CRC => "CRC"`, `USD => "$"`
- `formatCurrencyInput(value, currencyOrSymbol)`
- `parseCurrencyInput(value)`
- `isMoneyOverMax(value)`

**Nota de encoding:** Para CRC se usa la abreviatura `"CRC"` (en lugar del smbolo coln) para evitar problemas de codificacin en distintos entornos. El formato visual es `"CRC 0.00"`.

---

## Comportamiento obligatorio

1. El simbolo visual se toma de la moneda seleccionada por el usuario.
2. `CRC` muestra `"CRC"` (abreviatura; evita problemas de encoding del smbolo coln).
3. `USD` muestra `$`.
4. El formato visual usa separadores y 2 decimales.
5. El parser limpia simbolos y separadores sin inflar ceros al blur/focus.
6. Todo input monetario aplica tope maximo `MAX_MONEY_AMOUNT`.

---

## Validaciones estandar

Reglas base:

- Montos no numericos -> invalidos.
- Montos negativos -> invalidos.
- Montos mayores a `MAX_MONEY_AMOUNT` -> invalidos.

Reglas de negocio por campo:

- `salarioBase`: debe ser mayor a 0.
- `vacacionesAcumuladas`: 0 o mayor.
- `cesantiaAcumulada`: 0 o mayor.
- `montoProvisionado`: 0 o mayor.

---

## Uso actual (referencia)

Implementado en:

- `frontend/src/pages/private/employees/components/EmployeeCreateModal.tsx`
- `frontend/src/pages/private/employees/components/EmployeeForm.tsx`

---

## Checklist para nuevos desarrollos

Si agregas un nuevo campo monetario:

1. Importar funciones desde `currencyFormat.ts`.
2. No escribir formatter/parser inline nuevo.
3. Aplicar `max={MAX_MONEY_AMOUNT}`.
4. Aplicar validacion de negocio (>= 0 o > 0 segun el caso).
5. Confirmar simbolo dinamico por moneda del formulario.

---

## Nota de arquitectura

Esta directiva normaliza el formato monetario en frontend. El backend sigue siendo la fuente final de validacion y debe mantener sus propias reglas de integridad.

---
## Actualizaci?n 2026-03-02 ? Vacaciones sin selecci?n de planilla (ACTUALIZACION-VACACIONES-2026-03-02
UI-PLANILLAS-REMOVIDA-2026-03-02
SOLAPE-PLANILLAS-2026-03-02)
- KPITAL (RRHH): el usuario ya no selecciona planilla en Vacaciones. Selecciona fechas y movimiento; el sistema determina la planilla elegible por cada fecha con base en calendario de n?mina (empresa/empleado/moneda/periodo).
- Validaciones: fines de semana y feriados bloqueados; fechas ya reservadas bloqueadas; saldo disponible; fechas deben pertenecer a un periodo elegible; si una fecha coincide con m?ltiples periodos, se rechaza.
- Consistencia de tipo: todas las fechas deben pertenecer al mismo tipo de planilla. Si no, error.
- Split autom?tico en creaci?n: si las fechas caen en m?s de un periodo del mismo tipo, se crean acciones separadas por periodo. En edici?n, solo se permite un periodo.
- Persistencia: `acc_vacaciones_fechas` y `acc_cuotas_accion` guardan `id_calendario_nomina` por fecha; el header de acci?n puede quedar con `id_calendario_nomina = NULL`.
- TimeWise: acciones de vacaciones se crean en estado Borrador sin planilla. RRHH completa fechas/movimiento en KPITAL; el sistema asigna planilla por fecha.
- Planilla: al cargar una planilla se consumen las fechas cuyo `id_calendario_nomina` coincide con la planilla y estado aprobado. No se requiere que el header tenga planilla.
---
