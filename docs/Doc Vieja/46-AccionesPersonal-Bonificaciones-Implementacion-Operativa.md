# 46 - Acciones de Personal (Bonificaciones) Implementacion Operativa

Fecha de cierre: 2026-03-01  
Estado: Implementado en backend + frontend  
Relacion: Extiende `42-AccionesPersonal-Planilla-Fase0Cerrada.md` y replica el patron operativo de `43` (Ausencias), Licencias e Incapacidades.

## 1. Alcance cerrado

Queda implementado para Bonificaciones:

1. Vista propia y ruta propia (`/personal-actions/compensaciones/bonificaciones`).
2. Modal propio con encabezado + lineas de transaccion.
3. Persistencia real create/edit (header + cuotas + lineas).
4. Validaciones enterprise de planillas elegibles.
5. Calculo de monto por linea segun movimiento/cantidad.
6. Tipo de bonificacion por linea con catalogo formal.
7. Bitacora operativa en modal de bonificacion (tab dedicado).
8. Apertura de modal por click en fila en cualquier estado.

## 2. Backend implementado

### 2.1 Endpoints

1. `GET /api/personal-actions/bonificaciones/:id`
2. `GET /api/personal-actions/bonificaciones/:id/audit-trail?limit=200`
3. `POST /api/personal-actions/bonificaciones`
4. `PATCH /api/personal-actions/bonificaciones/:id`
5. `PATCH /api/personal-actions/bonificaciones/:id/advance`
6. `PATCH /api/personal-actions/bonificaciones/:id/invalidate`

Catalogos reutilizados (mismo contrato de acciones con lineas):

1. `GET /api/personal-actions/absence-employees?idEmpresa=...`
2. `GET /api/personal-actions/absence-movements?idEmpresa=...&idTipoAccionPersonal=9`
3. `GET /api/personal-actions/absence-payrolls?idEmpresa=...&idEmpleado=...`

### 2.2 Permisos utilizados

1. `hr-action-bonificaciones:view`
2. `hr-action-bonificaciones:create`
3. `hr-action-bonificaciones:edit`
4. `hr-action-bonificaciones:cancel`
5. `hr_action:approve` (advance)
6. `employee:view-sensitive` (solo visual en tarjeta de empleado)

### 2.3 Tabla y DTO

1. Tabla detalle: `acc_bonificaciones_lineas`.
2. Entidad backend: `BonusLine`.
3. DTO backend: `UpsertBonusDto`.
4. FK funcional a planilla: `id_calendario_nomina` (no se usa `consumed_run_id`).
5. Seed de UX/pruebas: migracion `1708537700000-SeedBonusPayrollArticlesAndMovements.ts` (articulo + 2 movimientos por empresa).

## 3. Frontend implementado

### 3.1 Archivos

1. `frontend/src/pages/private/personal-actions/bonificaciones/BonusesPage.tsx`
2. `frontend/src/pages/private/personal-actions/bonificaciones/BonusTransactionModal.tsx`

### 3.2 Ruta

La ruta de Bonificaciones deja de usar `PersonalActionsPage` generico y pasa a pagina dedicada:

1. `AppRouter`: `/personal-actions/compensaciones/bonificaciones -> <BonusesPage />`.
2. Export en `frontend/src/pages/private/index.ts`.

### 3.3 Campos funcionales por linea

1. Periodo de pago (Planilla)
2. Movimiento
3. Tipo de bonificacion
4. Cantidad
5. Monto (moneda del empleado)
6. Fecha efecto (auto por planilla)
7. Formula (calculada, solo lectura)

## 4. Regla de calculo de monto (Bonificaciones)

Prioridad de calculo por linea:

1. Si movimiento es monto fijo y `montoFijo > 0`: `monto = montoFijo * cantidad`.
2. Si movimiento es porcentaje y `porcentaje > 0`: `monto = basePeriodo * (porcentaje/100) * cantidad`.
3. Si no hay configuracion util: `monto = 0` y formula informativa.

Base de periodo:

1. Se usa la misma funcion homologada de Licencias/Incapacidades.
2. Incluye ajuste por tipo de periodo de pago (quincenal, mensual, etc.).

## 5. Tipo de bonificacion (catalogo final)

Valores permitidos:

1. `ordinaria_salarial`
2. `extraordinaria_habitual`
3. `extraordinaria_ocasional`
4. `no_salarial_reembolso`

## 6. QA y verificacion ejecutada

Validaciones ejecutadas:

1. `api`: `npm run build` en verde.
2. `frontend`: `npm run build` en verde.
3. `api` test de servicio: `personal-actions.service.spec.ts --runInBand` en verde.

## 6.1 Ajustes UX/seguridad aplicados despues del cierre inicial

1. Calculo interno por monto/porcentaje no depende de `employee:view-sensitive`.
2. El permiso sensible solo enmascara visualizacion de datos (`***`), no bloquea formula ni monto.
3. En modo editar, las lineas de transaccion abren colapsadas por defecto.

Nota de pruebas:

1. Se actualizo el spec para inyectar `BonusLineRepository` por nueva dependencia del servicio.
2. Se mantuvo comportamiento existente (15/15 tests pasando).

## 7. Nota operativa de migraciones

Para mantener `migration:run` estable en ambientes con historial legacy:

1. Evitar recrear indices ya existentes sin `IF NOT EXISTS`/guardas por metadata.
2. El caso observado de `Duplicate key name 'IDX_empresa_cedula'` confirma necesidad de migraciones idempotentes sobre esquemas heredados.
3. La politica se mantiene: compatibilidad incremental, sin `DROP/RENAME` destructivos en fase base.
4. Incidente resuelto (2026-02-28): `POST /api/personal-actions/bonificaciones` fallaba por tabla faltante `acc_bonificaciones_lineas` en `HRManagementDB_produccion`.
5. Correccion aplicada:
   - Creacion inmediata de la tabla con DDL idempotente (`CREATE TABLE IF NOT EXISTS`) y FKs/indices.
   - Ajuste de migracion `1708537600000` para referenciar `acc_cuotas_accion` (tabla real) en `FK_bon_linea_cuota`.

Evidencia puntual en `mysql_hr_pro` (seed manual de apoyo UX en ambiente actual):

1. Articulo creado: `nom_articulos_nomina.id_articulo_nomina = 5` (`id_tipo_accion_personal = 9`).
2. Movimientos creados:
   - `nom_movimientos_nomina.id_movimiento_nomina = 11` (`Bonificacion Fija`)
   - `nom_movimientos_nomina.id_movimiento_nomina = 12` (`Bonificacion Porcentaje`)
3. Tabla verificada: `SHOW CREATE TABLE acc_bonificaciones_lineas` retorna estructura completa con FKs:
   - `FK_bon_linea_accion -> acc_acciones_personal(id_accion)`
   - `FK_bon_linea_cuota -> acc_cuotas_accion(id_cuota)`
   - `FK_bon_linea_calendario -> nom_calendarios_nomina(id_calendario_nomina)`
   - `FK_bon_linea_movimiento -> nom_movimientos_nomina(id_movimiento_nomina)`
4. Ejecucion confirmada de `npm run migration:run` (modo seguro) con 2 migraciones aplicadas:
   - `CreateBonusLinesTable1708537600000`
   - `SeedBonusPayrollArticlesAndMovements1708537700000`
