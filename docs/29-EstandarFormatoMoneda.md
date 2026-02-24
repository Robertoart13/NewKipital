# DIRECTIVA 29 - Estandar de Formato Moneda

**Documento:** 29  
**Fecha:** 2026-02-24  
**Objetivo:** Definir una sola fuente de verdad para formato, parseo y validacion de montos monetarios en toda la app (frontend).

---

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

**Nota de encoding:** Para CRC se usa la abreviatura `"CRC"` (en lugar del símbolo colón) para evitar problemas de codificación en distintos entornos. El formato visual es `"CRC 0.00"`.

---

## Comportamiento obligatorio

1. El simbolo visual se toma de la moneda seleccionada por el usuario.
2. `CRC` muestra `"CRC"` (abreviatura; evita problemas de encoding del símbolo colón).
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

