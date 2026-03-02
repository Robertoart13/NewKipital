# 49 - Acciones de Personal (Descuentos) Implementacion Operativa

Fecha de cierre: 2026-03-01  
Estado: Implementado en backend + frontend  
Relacion: Extiende `42-AccionesPersonal-Planilla-Fase0Cerrada.md`, aplica decision de `48-AccionesPersonal-ModeloPorPeriodo-Linea.md` y replica patron operativo de Retenciones.

## 1. Alcance cerrado

Queda implementado para Descuentos:

1. Vista propia y ruta propia (`/personal-actions/deducciones/descuentos`).
2. Modal propio con encabezado + lineas de transaccion.
3. Persistencia real create/edit (header + cuotas + lineas).
4. Split por periodo al guardar:
   - periodos distintos => acciones separadas
   - mismo periodo => una sola accion con multiples lineas
5. Guard de edicion mono-periodo (no mezclar periodos al editar).
6. Avance de estado e invalidacion con permisos dedicados.
7. Bitacora operativa en modal de descuento (tab dedicado).
8. Apertura de modal por click en fila en cualquier estado (lectura si no editable).

## 2. Backend implementado

### 2.1 Endpoints

1. `GET /api/personal-actions/descuentos/:id`
2. `GET /api/personal-actions/descuentos/:id/audit-trail?limit=200`
3. `POST /api/personal-actions/descuentos`
4. `PATCH /api/personal-actions/descuentos/:id`
5. `PATCH /api/personal-actions/descuentos/:id/advance`
6. `PATCH /api/personal-actions/descuentos/:id/invalidate`

Catalogos reutilizados (mismo contrato de acciones con lineas):

1. `GET /api/personal-actions/absence-employees?idEmpresa=...`
2. `GET /api/personal-actions/absence-movements?idEmpresa=...&idTipoAccionPersonal=6`
3. `GET /api/personal-actions/absence-payrolls?idEmpresa=...&idEmpleado=...`

### 2.2 Permisos utilizados

1. `hr-action-descuentos:view`
2. `hr-action-descuentos:create`
3. `hr-action-descuentos:edit`
4. `hr-action-descuentos:cancel`
5. `hr-action-descuentos:approve`
6. `employee:view-sensitive` (solo visual en tarjeta de empleado)

### 2.3 Tabla y DTO

1. Tabla detalle: `acc_descuentos_lineas`.
2. Entidad backend: `DiscountLine`.
3. DTO backend: `UpsertDiscountDto`.
4. FK funcional a planilla: `id_calendario_nomina` (no se usa `consumed_run_id`).
5. Migraciones:
   - `1708538300000-CreateDiscountLinesTable.ts`
   - `1708538400000-SeedDiscountPayrollArticlesAndMovements.ts`

## 3. Frontend implementado

### 3.1 Archivos

1. `frontend/src/pages/private/personal-actions/descuentos/DiscountsPage.tsx`
2. `frontend/src/pages/private/personal-actions/descuentos/DiscountTransactionModal.tsx`

### 3.2 Ruta

1. `AppRouter`: `/personal-actions/deducciones/descuentos -> <DiscountsPage />`.
2. Export en `frontend/src/pages/private/index.ts`.
3. Menú con permiso dedicado:
   - item `descuentos`
   - `requiredPermission: 'hr-action-descuentos:view'`

### 3.3 Campos funcionales por linea

1. Periodo de pago (Planilla)
2. Movimiento
3. Cantidad
4. Monto (moneda del empleado)
5. Fecha efecto (auto por planilla)
6. Formula (calculada, solo lectura)

Nota:

1. Descuentos no usa columna/selector de "Remunerada".

## 4. Regla de calculo de monto (Descuentos)

Prioridad de calculo por linea:

1. Si movimiento es monto fijo y `montoFijo > 0`: `monto = montoFijo * cantidad`.
2. Si movimiento es porcentaje y `porcentaje > 0`: `monto = basePeriodo * (porcentaje/100) * cantidad`.
3. Si no hay configuracion util: `monto = 0` y formula informativa.

Base de periodo:

1. Se usa la misma funcion homologada de acciones personales previas.
2. El permiso sensible (`employee:view-sensitive`) solo enmascara visualizacion, no bloquea el calculo interno.

## 5. QA y verificacion ejecutada

Validaciones ejecutadas:

1. `api`: `npm run test -- src/modules/personal-actions/personal-actions.service.spec.ts --runInBand` en verde.
2. `api`: `npm run build` en verde.
3. `frontend`: `npm run test -- src/api/payroll-personal-actions.test.ts src/store/slices/menuSlice.test.ts src/store/selectors/menu.selectors.test.ts` en verde.
4. `frontend`: `npm run build` en verde.

Casos cubiertos en tests:

1. Split por periodo al crear descuentos.
2. Bloqueo de edicion cruzando periodos.
3. Invalidacion con metadata forense.
4. Rutas API de descuentos en cliente frontend.
5. Visibilidad de menu por permiso (`hr-action-descuentos:view`).

## 6. Nota operativa de migraciones

Para evitar errores de "tabla no existe":

1. Ejecutar siempre `npm run migration:run:safe` antes de pruebas funcionales.
2. Verificacion esperada:
   - `CreateDiscountLinesTable1708538300000` aplicada
   - `SeedDiscountPayrollArticlesAndMovements1708538400000` aplicada
3. Si API estaba ya levantada, reiniciar proceso despues de migrar.

