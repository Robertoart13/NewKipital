# 47 - Acciones de Personal (Horas Extra) Implementacion Operativa

Fecha de cierre: 2026-03-01  
Estado: Implementado en backend + frontend + migraciones aplicadas
Relacion: Extiende `42` y replica estandar de `43` (Ausencias), `Licencias`, `Incapacidades` y `46` (Bonificaciones).

## 1. Alcance cerrado

1. Vista propia y ruta propia (`/personal-actions/compensaciones/horas-extras`).
2. Modal propio con encabezado + lineas de transaccion.
3. Persistencia real create/edit (header + cuotas + lineas).
4. Validaciones enterprise de planillas elegibles + movimiento por tipo accion 11.
5. Calculo de monto por linea con jornada (6/7/8) + porcentaje/monto fijo.
6. Fechas de rango por linea: inicio/fin hora extra.
7. Bitacora operativa por modal (tab dedicado).
8. Apertura en cualquier estado con modo lectura cuando aplica.

## 2. Backend implementado

### 2.1 Endpoints

1. `GET /api/personal-actions/horas-extras/:id`
2. `GET /api/personal-actions/horas-extras/:id/audit-trail?limit=200`
3. `POST /api/personal-actions/horas-extras`
4. `PATCH /api/personal-actions/horas-extras/:id`
5. `PATCH /api/personal-actions/horas-extras/:id/advance`
6. `PATCH /api/personal-actions/horas-extras/:id/invalidate`

### 2.2 Permisos

1. `hr-action-horas-extras:view`
2. `hr-action-horas-extras:create`
3. `hr-action-horas-extras:edit`
4. `hr-action-horas-extras:cancel`
5. `hr-action-horas-extras:approve` (flujo operativo de avance)
6. `employee:view-sensitive` (solo visual; no bloquea calculo)

### 2.3 Tabla/DTO/Entidad

1. Tabla detalle: `acc_horas_extras_lineas`.
2. Entidad backend: `OvertimeLine`.
3. DTO backend: `UpsertOvertimeDto`.
4. FK funcional de consumo sigue en `id_calendario_nomina`.

## 3. Frontend implementado

### 3.1 Archivos

1. `frontend/src/pages/private/personal-actions/horas-extras/HoursExtrasPage.tsx`
2. `frontend/src/pages/private/personal-actions/horas-extras/HoursExtraTransactionModal.tsx`

### 3.2 Ruta

1. `AppRouter`: `/personal-actions/compensaciones/horas-extras -> <HoursExtrasPage />`
2. Export en `frontend/src/pages/private/index.ts`.

### 3.3 Campos por linea

1. Periodo de pago (Planilla)
2. Movimiento
3. Fecha inicio hora extra
4. Fecha fin hora extra
5. Tipo de jornada (`6` nocturna, `7` mixta, `8` diurna)
6. Cantidad
7. Monto (moneda del empleado)
8. Fecha efecto (auto por planilla)
9. Formula (solo lectura)

Regla UX solicitada:

1. Al seleccionar fecha inicio, fecha fin se autocompleta con el mismo valor si aun estaba vacia.
2. Fecha fin permanece editable.

## 4. Regla de calculo de monto

Prioridad:

1. Si movimiento es monto fijo y `montoFijo > 0`: `monto = montoFijo * cantidad`.
2. Si movimiento es porcentaje:
3. Periodo semanal/bisemanal (`idPeriodoPago` 8/11): `salarioBase * (porcentaje/100) * cantidad`.
4. Resto de periodos: `((salarioBase/30)/horasJornada) * (porcentaje/100) * cantidad`.

Nota seguridad:

1. El calculo usa salario real internamente aunque no exista permiso sensible.
2. `employee:view-sensitive` solo enmascara valores visuales en formula/tarjeta.

## 5. Migraciones aplicadas

1. `1708537800000-CreateOvertimeLinesTable.ts`
2. `1708537900000-SeedOvertimePayrollArticlesAndMovements.ts`

Resultado en ambiente actual (`migration:run`):

1. Tabla `acc_horas_extras_lineas` creada con FKs/indices/checks.
2. Articulo de nomina seed por empresa (`id_tipo_accion_personal = 11`).
3. Movimientos semilla:
4. `Hora Extra 1.5x` (150)
5. `Hora Extra 2x` (200)

## 6. QA y evidencia

1. `api`: `npm run build` OK.
2. `frontend`: `npm run build` OK.
3. `api`: `personal-actions.service.spec.ts --runInBand` OK (17/17).
4. Tests nuevos incluidos:
5. `createOvertime rejects payload without lines`
6. `invalidateOvertime should set forensic metadata as USER`
