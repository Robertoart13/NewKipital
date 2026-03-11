# Acta de Cierre - Modulo Planilla

**Fecha:** 2026-03-11  
**Modulo:** Generacion de planillas (Regular)  
**Estado:** Cierre tecnico completado con evidencias de prueba

## 1. Alcance cerrado
- Flujo principal de planilla en UI: `Crear -> Cargar -> Marcar -> Verificar -> Aplicar`.
- Candado de mutaciones tardias sobre acciones de personal en planilla.
- Regresion de seleccion de empleados para planilla.
- Regresion de recalculo de montos tras aprobar accion.
- UX de tabla en modo acordeon (solo un empleado expandido a la vez).

## 2. Reglas de negocio confirmadas
- Solo empleados marcados entran a totales y al `apply`.
- Empleado `marcado + verificado` queda bloqueado para mutar acciones:
  - crear accion
  - aprobar accion
  - invalidar accion
- Totales de tabla se recalculan al aprobar acciones.
- En UI solo hay un detalle expandido de empleado a la vez.

## 3. Cambios implementados

### Backend
- `api/src/modules/personal-actions/personal-actions.service.ts`
  - Se agrego helper reutilizable:
    - `assertActionNotLockedForPayrollMutation(action, modulo)`
  - Se aplico candado en:
    - `invalidateAbsence`
    - `invalidateLicense`
    - `invalidateDisability`
    - `invalidateBonus`
    - `invalidateOvertime`
    - `invalidateRetention`
    - `invalidateDiscount`
    - `invalidateIncrease`
    - `invalidateVacation`

### Frontend
- `frontend/src/pages/private/payroll-management/PayrollGeneratePage.tsx`
  - Modo acordeon controlado para expansion de filas.
  - Click en toda la fila para expandir (`expandRowByClick`).

- `frontend/src/pages/private/payroll-management/payrollAccordion.ts`
  - Helpers de control de expansion:
    - `resolveAccordionExpandedKeys`
    - `sanitizeAccordionExpandedKeys`

## 4. Pruebas ejecutadas (reales)

### API E2E
1. `npm run test:e2e -- personal-actions.e2e-spec.ts`  
Resultado: **PASS**  
Casos verificados:
- flujo ausencias (crear/editar/avanzar/invalidar)
- flujo licencias (crear/editar/avanzar/invalidar)
- bloqueo `create/approve/invalidate` con empleado marcado+verificado
- recalculo exacto de monto neto tras aprobar descuento

2. `npm run test:e2e -- personal-actions.e2e-spec.ts payroll-employee-selection.e2e-spec.ts`  
Resultado: **PASS**

### API Unit
3. `npm run test -- personal-actions.service.spec.ts`  
Resultado: **PASS** (40/40)

### Frontend (regresion UI de acordeon)
4. `npm run test -- src/pages/private/payroll-management/__tests__/payrollAccordion.test.ts`  
Resultado: **PASS** (4/4)

## 5. Evidencia funcional cerrada
- Candado backend aplicado y probado en endpoints directos (no depende de bloqueo UI).
- Recalculo de montos validado por asercion numerica exacta en e2e:
  - `neto_after = neto_before - descuento_aprobado`.
- Comportamiento de expansion unica validado por pruebas de logica UI.

## 6. Riesgos residuales
- Falta e2e browser full-flow (Playwright/Cypress) de interfaz completa de planilla sobre entorno UI real.
- No se incluye en esta acta una corrida formal de performance p95 de `load-table`/`approve`/`create*`.

## 7. Conclusion
El modulo de Planilla queda con cierre tecnico consistente para reglas criticas de produccion (candado duro + regresion funcional clave), con pruebas automatizadas ejecutadas y en verde.
