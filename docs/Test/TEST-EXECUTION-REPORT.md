# Test Execution Report - KPITAL 360

Documento de control por fases de ejecucion de pruebas.

## Resumen vigente
- Estado actual: Completo
- Total: 518/518 pasando
- Backend: 187/187
- Frontend: 331/331
- Fallos abiertos: 0

## Fase 1 - 2026-02-24 09:42
Alcance: Suite completa inicial

Comandos ejecutados:
- `cd api && npm test`
- `cd frontend && npm test`

Resultados:
- Backend: 79/99
- Frontend: 118/131
- Total: 197/230
- Fallos: 33

Estado de fase: Cerrada (historica)

## Fase 2 - 2026-02-24 10:03
Alcance: Correccion y revalidacion completa

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 99/99
- Frontend: 131/131
- Total: 230/230
- Fallos: 0

Estado de fase: Cerrada

## Fase 3 - 2026-02-24 10:22
Alcance: Expansion P0 de cobertura + smoke transversal

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 122/122
- Frontend: 162/162
- Total: 284/284
- Fallos: 0

Cambios incorporados en Fase 3:
- Backend nuevos specs:
  - `api/src/modules/access-control/apps.service.spec.ts`
  - `api/src/modules/access-control/permissions.service.spec.ts`
  - `api/src/modules/access-control/roles.service.spec.ts`
  - `api/src/modules/payroll/payroll.service.spec.ts`
  - `api/src/modules/personal-actions/personal-actions.service.spec.ts`
  - `api/src/modules/modules.smoke.spec.ts`
- Frontend nuevos tests:
  - `frontend/src/smoke/modules.smoke.test.ts`

Estado de fase: Cerrada

## Fase 4 - 2026-02-24 10:29
Alcance: Expansion de comportamiento en backend y frontend API

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 137/137
- Frontend: 184/184
- Total: 321/321
- Fallos: 0

Cambios incorporados en Fase 4:
- Backend nuevos specs:
  - `api/src/modules/ops/ops.service.spec.ts`
  - `api/src/modules/notifications/notifications.service.spec.ts`
  - `api/src/modules/integration/domain-events.service.spec.ts`
- Frontend nuevos tests:
  - `frontend/src/api/companies.test.ts`
  - `frontend/src/api/payroll-personal-actions.test.ts`

Estado de fase: Cerrada

## Fase 5 - 2026-02-25 10:06
Alcance: Vacaciones acumuladas enterprise + revalidacion integral

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 179/179
- Frontend: 323/323
- Total: 502/502
- Fallos: 0

Cambios incorporados en Fase 5:
- Backend:
  - Cuenta y ledger de vacaciones por empleado.
  - Provision mensual por dia ancla (cierre del dia) e idempotencia por periodo.
  - Descuento de vacaciones al aplicar planilla.
  - Restricciones de negocio en empleados (dias iniciales inmutables, fecha ingreso 1..28).
- Frontend:
  - Formularios crear/editar empleados ajustados a reglas de vacaciones acumuladas.
  - Validaciones de enteros para dias de vacaciones.
- Base de datos:
  - Migracion `1708534100000-CreateEmployeeVacationLedger.ts` agregada.
  - Verificacion en `hr_pro`: migracion aun no aplicada (`tablas_vacaciones = 0`).

Estado de fase: Cerrada

## Fase 6 - 2026-02-25 10:15
Alcance: Aplicacion en hr_pro + pruebas reales de BD + rerun completo

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 179/179
- Frontend: 323/323
- Total: 502/502
- Fallos: 0

Validaciones adicionales en hr_pro:
- Migracion aplicada manualmente por SQL equivalente:
  - `sys_empleado_vacaciones_cuenta`
  - `sys_empleado_vacaciones_ledger`
  - `sys_empleado_vacaciones_provision_monto`
- Registro de migracion en tabla `migrations`:
  - `CreateEmployeeVacationLedger1708534100000`
- Prueba real controlada en BD:
  - Escenario negativo: `-4` por `VACATION_USAGE`.
  - Recuperacion por provision mensual: `-3`, `-2`, `-1`.
  - Reversa: `+4` (`REVERSAL`) validada.
  - Limpieza aplicada al final: sin residuos `QA_VALIDATION`.

Estado de fase: Cerrada

## Fase 7 - 2026-02-25 10:30
Alcance: Fix corrimiento de fechas DATE + validacion E2E de vacaciones

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 179/179
- Frontend: 323/323
- Total: 502/502
- Fallos: 0

Validacion E2E adicional:
- Creacion real de empleado por API con usuario master (`rzuniga@roccacr.com`).
- Verificacion en BD `hr_pro`:
  - `sys_empleados.fecha_ingreso_empleado` sin corrimiento.
  - `sys_empleado_vacaciones_cuenta.fecha_ingreso_ancla_vacaciones` y `dia_ancla_vacaciones` consistentes.
  - `sys_empleado_vacaciones_ledger` con provisiones mensuales en dia ancla esperado (26).
- Bloqueo de edicion de vacaciones iniciales sigue vigente (400 esperado).

Estado de fase: Cerrada

## Fase 8 - 2026-02-25 10:39
Alcance: E2E empresas (crear/editar/inactivar/reactivar) + validacion BD

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 179/179
- Frontend: 323/323
- Total: 502/502
- Fallos: 0

Validacion E2E adicional:
- Creacion real de empresa por API con usuario master.
- Edicion real de empresa (nombre, telefono, actividad, direccion, codigo postal).
- Validacion de conflicto de prefijo duplicado (409 esperado).
- Inactivacion y reactivacion por API (estado 0 -> 1), luego limpieza dejando empresas QA inactivas.
- Verificacion en `hr_pro`:
  - Persistencia en `sys_empresas`.
  - Autoasignacion en `sys_usuario_empresa`.
  - Trazas de auditoria en `sys_auditoria_acciones`.

Estado de fase: Cerrada

## Tabla comparativa de fases
| Fase | Backend | Frontend | Total | Fallos |
|---|---:|---:|---:|---:|
| Fase 1 | 79/99 | 118/131 | 197/230 | 33 |
| Fase 2 | 99/99 | 131/131 | 230/230 | 0 |
| Fase 3 | 122/122 | 162/162 | 284/284 | 0 |
| Fase 4 | 137/137 | 184/184 | 321/321 | 0 |
| Fase 5 | 179/179 | 323/323 | 502/502 | 0 |
| Fase 6 | 179/179 | 323/323 | 502/502 | 0 |
| Fase 7 | 179/179 | 323/323 | 502/502 | 0 |
| Fase 8 | 179/179 | 323/323 | 502/502 | 0 |
| Fase 9 | 184/184 | 331/331 | 515/515 | 0 |
| Fase 10 | 186/186 | 331/331 | 517/517 | 0 |
| Fase 11 | 186/186 | 331/331 | 517/517 | 0 |
| Fase 12 | 187/187 | 331/331 | 518/518 | 0 |
| Fase 13 | 187/187 | 331/331 | 518/518 | 0 |
| Fase 14 | 187/187 | 331/331 | 518/518 | 0 |
| Fase 15 | 187/187 | 331/331 | 518/518 | 0 |

## Fase 9 - 2026-02-25 10:52
Alcance: Modulo Clases (create/list/update/inactivate/reactivate) + permisos + validacion real

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 184/184
- Frontend: 331/331
- Total: 515/515
- Fallos: 0

Validacion E2E adicional:
- Migracion aplicada en `hr_pro`:
  - Tabla `org_clases`
  - Permisos `config:clases`, `class:create`, `class:edit`, `class:inactivate`, `class:reactivate`
- Flujo real por API con usuario master:
  - Crear clase
  - Editar clase
  - Validar conflicto por codigo duplicado (409)
  - Inactivar/reactivar clase
- Verificacion en BD:
  - Persistencia de `org_clases` correcta
  - Permisos y asignacion a roles administrativos creados

Estado de fase: Cerrada

## Fase 10 - 2026-02-25
Alcance: Modulo Proyectos (create/list/update/inactivate/reactivate) + permisos + bitacora

Comandos ejecutados:
- `cd api && npm.cmd test`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 186/186
- Frontend: 331/331
- Total: 517/517
- Fallos: 0

Validacion E2E adicional:
- Migracion aplicada en `hr_pro`:
  - Tabla `org_proyectos`
  - Permisos `config:proyectos`, `project:create`, `project:edit`, `project:inactivate`, `project:reactivate`, `config:proyectos:audit`
- Flujo real por API: Pendiente
- Verificacion en BD: Pendiente

Estado de fase: Cerrada

## Fase 11 - 2026-02-25
Alcance: Modulo Departamentos (create/list/update/inactivate/reactivate) + permisos + bitacora

Comandos ejecutados:
- `cd api && npm.cmd test`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 186/186
- Frontend: 331/331
- Total: 517/517
- Fallos: 0

Validacion E2E adicional:
- Migracion aplicada en `hr_pro`:
  - Tabla `org_departamentos`
  - Permisos `config:departamentos`, `department:create`, `department:edit`, `department:inactivate`, `department:reactivate`, `config:departamentos:audit`, `department:view`
- Flujo real por API: Pendiente
- Verificacion en BD: Pendiente

Estado de fase: Cerrada

## Fase 12 - 2026-02-25
Alcance: Modulo Puestos (create/list/update/inactivate/reactivate) + permisos + bitacora

Comandos ejecutados:
- `cd api && npm.cmd test`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 187/187
- Frontend: 331/331
- Total: 518/518
- Fallos: 0

Validacion E2E adicional:
- Migracion aplicada en `hr_pro`:
  - Tabla `org_puestos`
  - Permisos `position:view`, `position:create`, `position:edit`, `position:inactivate`, `position:reactivate`, `config:puestos:audit`
- Flujo real por API:
  - Crear puesto: `QA Puesto 20260225-152707`
  - Editar descripcion, inactivar, reactivar y dejar inactivo al final
- Verificacion en BD:
  - `org_puestos`: registro id=14, estado=0, descripcion actualizada
  - `sys_domain_events`: eventos audit.positions.* en estado processed
  - `sys_auditoria_acciones`: create/update/inactivate/reactivate presentes

Estado de fase: Cerrada

## Fase 13 - 2026-02-25
Alcance: Modulo Cuentas Contables (create/list/update/inactivate/reactivate) + permisos + tipos ERP + acciones personal

Comandos ejecutados:
- `cd api && npm.cmd test`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 187/187
- Frontend: 331/331
- Total: 518/518
- Fallos: 0

Validacion en hr_pro:
- Migracion aplicada manualmente por SQL equivalente:
  - `erp_tipo_cuenta`
  - `nom_tipos_accion_personal`
  - `erp_cuentas_contables`
- Permisos creados:
  - `accounting-account:view`
  - `config:cuentas-contables`
  - `accounting-account:create`
  - `accounting-account:edit`
  - `accounting-account:inactivate`
  - `accounting-account:reactivate`
  - `config:cuentas-contables:audit`
- Registro de migraciones:
  - `CreateErpCuentasContablesAndPermissions1708535800000`
  - `AddAccountingAccountViewPermission1708535900000`
- Prueba real en BD:
  - Cuenta creada: `CT-TEST-001` en empresa `Rocca Master Company`.

Estado de fase: Cerrada

## Fase 14 - 2026-02-25
Alcance: Ajustes UX (preload) en editar/crear Cuentas Contables + validacion frontend

Comandos ejecutados:
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 187/187
- Frontend: 331/331
- Total: 518/518
- Fallos: 0

Cambios incorporados:
- Preload al cargar detalle de edicion y durante el refresh del listado al crear/editar.

Estado de fase: Cerrada

## Fase 15 - 2026-02-25
Alcance: Filtro multi-empresa en Cuentas Contables + validacion completa

Comandos ejecutados:
- `cd api && npm.cmd test`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 187/187
- Frontend: 331/331
- Total: 518/518
- Fallos: 0

Cambios incorporados:
- Selector multi-empresa en listado de Cuentas Contables.
- Backend soporta `idEmpresas` para filtrar por multiples empresas.

Estado de fase: Cerrada

## Lectura operativa
- Si se requiere validacion integral rapida, ejecutar los comandos de Fase 9.
- Si se requiere auditoria historica, revisar evolucion por fases en este archivo.
- Analisis completo del proyecto: `docs/Test/ANALISIS-ESTADO-PROYECTO-FASE4.md`
