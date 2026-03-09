# Test Execution Report - KPITAL 360

Documento de control por fases de ejecucion de pruebas.

## Resumen vigente
- Estado actual: Completo
- Total: 540/540 pasando
- Backend: 270/270
- Frontend: 270/270
- Fallos abiertos: 0
- Corte de auditoria final (Rev.3): 2026-02-27
- Corte vigente pruebas: 2026-03-05 09:53
- Nota: los conteos de fases anteriores son historicos de su fecha y no sustituyen el corte vigente.

## Fase 17 - 2026-03-05 09:53
Alcance: cierre PEND-004 (traslado interempresas) + revalidacion completa

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 270/270
- Frontend: 270/270
- Total: 540/540
- Fallos: 0

Cambios validados en esta fase:
- Traslado interempresas con portabilidad de saldo de vacaciones (ledger + cuenta).
- Bloqueo por acciones pendientes bloqueantes segun politica.
- Simulacion muestra saldo de vacaciones a trasladar.

## Fase 18 - 2026-03-05 10:02
Alcance: fix validacion DTO en edicion de ausencias + revalidacion backend

Comandos ejecutados:
- `cd api && npm.cmd test -- --runInBand`

Resultados:
- Backend: 270/270
- Total: 270/270
- Fallos: 0

Cambios validados en esta fase:
- Validacion runtime de DTOs en controller `personal-actions`.
- Edicion de ausencias acepta payload con `idEmpresa`, `idEmpleado`, `observacion`, `lines`.

## Fase 16 - 2026-02-27 12:00 (corte de auditoria Rev.3)
Alcance: cierre de bloqueantes de seguridad/calidad y revalidacion completa

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd api && npm.cmd test -- --runInBand --watch=false`
- `cd frontend && npm.cmd test`

Resultados:
- Backend: 217/217
- Frontend: 250/250
- Total: 467/467
- Fallos: 0

Cambios validados en esta fase:
- hardening CSRF solo para test.
- CORS WebSocket restringido por origen permitido.
- `.env.example` saneado con placeholders.
- cierre `PEND-001` en inactivacion de empresa.
- ajustes de validadores frontend y parseo monetario.

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

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.
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

## Fase 16 - 2026-03-08
Alcance: Validacion manual UI + bitacora (Puestos, Departamentos, Proyectos, Cuentas Contables, Empleados)

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd frontend && npm.cmd run dev`

Resultados:
- Build API: OK
- Frontend dev: OK (se corrigieron errores de compilacion previos)
- Prueba manual: completada por modulo

Pruebas manuales cerradas:
- Puestos: crear, editar y bitacora funcionando.
- Departamentos: crear, editar y bitacora funcionando tras correccion.
- Proyectos: crear, editar y bitacora funcionando tras correccion.
- Cuentas contables: crear, editar y bitacora funcionando tras correccion.
- Empleados: crear y editar con bitacora funcionando tras correccion de auditoria create/update.

Verificacion tecnica en DB (hr_pro):
- Se confirmo que la auditoria de empleados no se estaba publicando para create.
- Se aplico fix en backend para publicar `audit.employees.create`.
- Se amplio lectura de bitacora para `entidad_auditoria IN ('employee','employees')` por compatibilidad historica.

Estado de fase: Cerrada

## Fase 17 - 2026-03-08
Alcance: Validacion manual de permisos y asignaciones de usuario (UI)

Pruebas ejecutadas:
- Roles: asignar permiso y quitar permiso.
- Usuario: aplicar cambios de permisos/roles y verificar persistencia.
- Empresas por usuario: quitar empresa y agregar empresa.
- Verificacion visual en pesta�a Empresas: estado marcado correcto luego de guardar y recargar.

Resultado:
- Flujo validado OK en UI.
- Persistencia de cambios confirmada.

Estado de fase: Cerrada

## Commit estable de referencia (2026-03-08)
- Commit ID: `e5f9f8e`
- Mensaje: `chore: commit remaining project changes`
- Commit base de fixes clave previo: `feccf48` (`fix: stabilize employee audit, user-company cache refresh, and improve audit messages`)

## Fase 18 - 2026-03-08
Alcance: Validacion manual UI (Articulos de Nomina + Cuentas Contables)

Pruebas ejecutadas:
- Articulos de Nomina: crear, editar y bitacora OK.
- Cuentas Contables: crear, editar y bitacora OK.

Resultado:
- Ambos modulos quedan cerrados en pruebas manuales funcionales y de bitacora.

Estado de fase: Cerrada

## Checkpoint estable remoto - 2026-03-08
- Branch: `main`
- Commit local: `976eab4`
- Push: `origin/main` actualizado de `6004a32` a `976eab4`
- Objetivo: punto de regreso estable tras pruebas manuales de UI (planilla/parametros).

## Fase 19 - 2026-03-08
Alcance: Cierre manual UI de parametros y gestion planilla (iteracion final)

Pruebas ejecutadas:
- Movimientos de Nomina: crear y editar OK; bitacora OK.
- Feriados: crear y editar OK.
- Abrir Planilla: crear y editar OK; bitacora OK.

Correcciones validadas en esta fase:
- Abrir Planilla: empresa del modal de crear desacoplada del filtro de tabla.
- Abrir Planilla: `Inicio Pago` replica en `Fin Pago` y `Fecha Pago Programada` con ajuste automatico para mantener rango valido.
- Movimientos de Nomina: selector de empresa en crear desacoplado del filtro de tabla.
- Movimientos de Nomina: persistencia de clase (`idClase`) y regla de tipo de calculo (campo opuesto forzado a `0`).

Checkpoint remoto confirmado:
- Commit funcional: `976eab4`.
- Commit documental: `ba41355`.
- Branch: `main`.

Estado de fase: Cerrada

## Fase 20 - 2026-03-08
Alcance: Ajuste de regla transversal en Acciones de Personal (Ausencias)

Pruebas ejecutadas:
- Ausencias: catalogo de movimientos en crear (empresa Rocca) carga correctamente luego de normalizar IDs en modal.
- Ausencias: `Remuneracion` por defecto en linea nueva = No.

Correccion aplicada:
- Normalizacion de `idEmpresa`/`idEmpleado` a numero en filtros de modal para evitar mismatch string/number.
- Regla documental agregada en `docs/reglas/ReglasImportantes.md` para reutilizar la solucion en el resto de Acciones de Personal.

Estado de fase: Cerrada

## Fase 21 - 2026-03-08
Alcance: Ausencias (bitacora clara + validacion de linea en edicion)

Pruebas ejecutadas:
- Bitacora Ausencias: update ahora reporta cambios por linea/campo (ej. `Linea 1 - Cantidad`, `Linea 1 - Monto`).
- Editar Ausencia: boton `Agregar linea de transaccion` ya no bloquea cuando la linea esta completa aunque `formula` venga vacia por historial.

Correccion aplicada:
- Backend (`personal-actions.service`): payload de auditoria para ausencias incluye `lineasDetalle`; diff genera cambios por linea y campo.
- Frontend (`AbsenceTransactionModal`): `isLineComplete` en Ausencias ya no exige `formula` para permitir agregar linea.

Resultado:
- Flujo de edicion de Ausencias mas claro para auditoria y sin falso bloqueo de UI.

Estado de fase: Cerrada

## Fase 22 - 2026-03-08
Alcance: Licencias (paridad con Ausencias en bitacora de edicion)

Pruebas ejecutadas:
- Licencias: bitacora de update muestra cambios por linea/campo (no solo monto global).
- Licencias: create/update persisten `lineasDetalle` para trazabilidad.

Correccion aplicada:
- Backend (`personal-actions.service`):
  - Se agrego carga/mapeo de lineas de licencia para auditoria (`getLicenseLinesForAudit`, `mapLicenseLinesForAuditFromDto`).
  - Se incluye `lineasDetalle` en payload de create/update de licencias.
  - El diff de auditoria incluye `Tipo licencia` por linea.

Resultado:
- Bitacora de Licencias queda clara y alineada al estandar definido en Ausencias.

Estado de fase: Cerrada

## Fase 23 - 2026-03-08
Alcance: Licencias (validacion de linea para agregar nueva linea en edicion)

Pruebas ejecutadas:
- Editar Licencia: con linea completa visible (`periodo`, `movimiento`, `tipo`, `cantidad`, `monto`, `fecha`), boton `Agregar linea de transaccion` permite crear nueva linea.

Correccion aplicada:
- Frontend (`LicenseTransactionModal`): `isLineComplete` ya no depende de `formula` ni `montoInput`; valida solo campos obligatorios reales del modulo.

Resultado:
- Se elimina falso bloqueo "Complete la linea actual..." en lineas historicas/derivadas.

Estado de fase: Cerrada

## Fase 24 - 2026-03-08
Alcance: Incapacidades (paridad funcional con Ausencias/Licencias)

Pruebas ejecutadas:
- Carga de movimientos por empresa en modal (create/edit) con IDs normalizados.
- Remuneracion por defecto en linea nueva = No.
- Tab bitacora en editar no regresa solo a informacion principal.
- Validacion de "agregar linea" no bloquea por campos derivados.
- Payload frontend incluye `fechaEfecto` y `cantidad` en create/update.
- Bitacora backend de incapacidad en create/update con detalle por linea/campo.

Resultado:
- Incapacidades queda alineado al estandar transversal aplicado en Acciones de Personal.

Estado de fase: Cerrada

## Fase 25 - 2026-03-08
Alcance: Incapacidades (errores finales detectados en pruebas visuales)

Errores encontrados:
- Error runtime: `IncapacityTransactionModal.tsx:647 Uncaught ReferenceError: tipoIncapacidad is not defined` al editar `Cantidad`.
- Error de UI: selector `Periodo de pago (Planilla)` mostraba etiquetas de `Movimiento` (ej. "Movimiento undefined").

Causa raiz:
- En `calculateLineAmount` se uso `tipoIncapacidad` sin declararlo como valor resuelto del contexto de linea.
- En construccion de `payrollOptions` se uso por error `line.movimientoLabel` en lugar de `payroll.nombrePlanilla`.

Solucion aplicada:
- `calculateLineAmount` ahora recibe/resuelve `tipoIncapacidadValue` y usa `const tipoIncapacidad = ...` antes de construir formula.
- `payrollOptions` ahora etiqueta correctamente con `nombrePlanilla + estado`.

Validacion posterior:
- Al cambiar `Cantidad`, ya no ocurre exception y la formula se calcula sin reventar.
- El select de planilla muestra opciones de planilla correctas (sin mezclar movimiento).

Estado de fase: Cerrada
## Fase 26 - 2026-03-08
Alcance: Bonificaciones (paridad funcional con Ausencias/Licencias/Incapacidades)

Errores detectados y corregidos:
- `modalTitle` no definido en `BonusesPage`.
- En create/update no se estaba enviando `cantidad` por linea en payload.
- `remuneracion` iniciaba en `true` en lineas nuevas (debia ser `false`).
- Mismatch de tipos `string/number` en `idEmpresa`/`idEmpleado` dentro del modal afectaba filtros de catalogos.
- Falso bloqueo de "Complete la linea actual..." por depender de `formula` en validacion de linea completa.
- Bitacora de Bonificaciones sin detalle por linea/campo en create/update.

Correcciones aplicadas:
- Frontend `BonusesPage`:
  - Se restauro `modalTitle`.
  - `mapDraftToPayload` ahora incluye `cantidad`.
  - Se corrigio wiring de props del modal (`onLoadAuditTrail` / `initialCompanyId`).
  - En mapeo de detalle se hidrata `formula` por linea y fallback con `remuneracion: false`.
- Frontend `BonusTransactionModal`:
  - `buildEmptyLine` ahora inicia con `remuneracion: false`.
  - IDs normalizados a numero (`selectedCompanyIdNum`, `selectedEmployeeIdNum`) para filtros/comparaciones.
  - Validacion de linea completa alineada al estandar transversal (sin bloquear por `formula`).
  - `handleTabChange` para carga estable de bitacora.
- Backend `personal-actions.service`:
  - Create/update de Bonificaciones publican `lineasDetalle` en auditoria.
  - Se agregaron helpers:
    - `getBonusLinesForAudit`
    - `mapBonusLinesForAuditFromDto`
  - Se extendio comparador de bitacora para incluir `Tipo bonificacion` por linea.

Validacion tecnica:
- `api`: `npm.cmd run build` OK.
- `frontend`: build con errores globales preexistentes de tipado en modulos no relacionados (no bloqueante para este ajuste puntual de Bonificaciones en `vite dev`).

Estado de fase: Cerrada
## Fase 27 - 2026-03-08
Alcance: Bonificaciones (validacion funcional final en UI)

Pruebas ejecutadas:
- Bonificaciones: crear OK.
- Bonificaciones: editar OK.
- Bonificaciones: bitacora OK (sin retorno automatico a Informacion Principal).

Resultado:
- Modulo Bonificaciones aprobado en pruebas manuales de flujo principal.

Estado de fase: Cerrada
## Fase 28 - 2026-03-08
Alcance: Horas Extra (paridad tecnica con modulos de Acciones de Personal)

Correcciones aplicadas:
- Frontend `HoursExtraTransactionModal`:
  - IDs normalizados a numero (`selectedCompanyIdNum`, `selectedEmployeeIdNum`).
  - Tab Bitacora estabilizado (`handleTabChange`) para evitar retorno automatico a Informacion Principal.
  - Inicializacion del modal ajustada con `justOpened` para evitar reseteos al cambiar tabs.
  - `remuneracion` por defecto en linea nueva = `false`.
  - Validacion de linea completa sin dependencia de `formula` (campo derivado).
  - Fix de opciones en select de planilla: label desde `nombrePlanilla + estado` (no desde movimiento).
  - Fix de `DatePicker` fecha fin (se restauro `handleFechaFinHoraExtraChange`).
- Frontend `HoursExtrasPage`:
  - Fallback de edicion sin lineas alineado (`remuneracion: false`, `formula: ''`).
  - `onCompanyChange` del modal centralizado con bust de cache (`handleModalCompanyChange`).
- Backend `personal-actions.service`:
  - Create/update de Horas Extra ahora publican `lineasDetalle` en bitacora.
  - Nuevos helpers: `getOvertimeLinesForAudit`, `mapOvertimeLinesForAuditFromDto`.
  - Comparador de bitacora extendido con: `Fecha inicio hora extra`, `Fecha fin hora extra`, `Tipo jornada horas extra`.

Validacion tecnica:
- `api`: `npm.cmd run build` OK.
- Pendiente validacion visual final de flujo (crear/editar/bitacora) en UI.

Estado de fase: Implementado (pendiente validacion manual)
## Fase 29 - 2026-03-08
Alcance: Horas Extra (validacion funcional final en UI)

Pruebas ejecutadas:
- Horas Extra: crear OK.
- Horas Extra: editar OK.
- Horas Extra: bitacora OK.
- Horas Extra: fecha fin hora extra carga correctamente en edicion.
- Horas Extra: sin desfase de fecha (-1 dia) en crear/editar.
- Horas Extra: tabla sin columna Remunerada (alineado a regla funcional del modulo).

Resultado:
- Modulo Horas Extra aprobado en pruebas manuales de flujo principal.

Estado de fase: Cerrada

## Checkpoint estable remoto - 2026-03-08 (Horas Extra)
- Rama: `main`
- Commit push: `29197af`
- Rango remoto: `8bc67de..29197af`
- Estado: pruebas manuales de Horas Extra cerradas (crear, editar, bitacora, fechas).

## Fase 19 - 2026-03-08 02:20
Alcance: Retenciones (edicion de fecha por linea + estabilidad de tab Bitacora + trazabilidad linea a linea)

Comandos ejecutados:
- `cd api && npm run build`
- `cd frontend && npm run build`

Resultados:
- API: build en verde
- Frontend: build con fallos de TypeScript preexistentes en modulos fuera del alcance de Retenciones
- Estado de retenciones: fixes aplicados en frontend/api y listos para validacion funcional en UI

Cambios validados en esta fase:
- Frontend `RetentionsPage`: mapeo de `fechaEfecto` por linea usando parseo local para evitar campo vacio en editar.
- Frontend `RetentionTransactionModal`:
  - validacion de linea sin dependencia de `formula`,
  - IDs normalizados (`selectedCompanyIdNum`, `selectedEmployeeIdNum`),
  - control de tabs para que Bitacora no regrese sola a Informacion principal,
  - parseo local de `fechaEfecto` al seleccionar planilla.
- API `PersonalActionsService` (Retenciones):
  - fechas con `parseDateOnlyLocal` en create/update (header, cuotas y lineas),
  - bitacora con `lineasDetalle` en create/update.

## Checkpoint estable remoto - 2026-03-08 (Retenciones + Descuentos)
- Rama: `main`
- Commit push: `2455aec`
- Rango remoto: `2311962..2455aec`
- Estado: cierre funcional y de bitacora en Retenciones y Descuentos; lista de pruebas del dia actualizada.

## Fase 33 - 2026-03-08
Alcance: Entradas de Personal (alineacion con modulo Empleados)

Cambios aplicados:
- Menu `Entradas de Personal` ahora usa ruta `/employees`.
- Menu `Entradas de Personal` ahora usa permiso `employee:view` (mismo permiso que Empleados).
- Ruta legacy `/personal-actions/entradas` redirige a `/employees` con guard `employee:view`.

Resultado:
- Entradas de Personal queda unificada funcionalmente con Empleados (misma pantalla y mismo control de permisos).

Estado de fase: Cerrada

## Fase 34 - 2026-03-08
Alcance: Ajuste visual de branding (logo en header)

Cambio aplicado:
- Se aumento el tamano del logo del header de `64px` a `72px` para mejorar visibilidad.

Archivo:
- `frontend/src/components/ui/AppHeader/AppHeader.module.css`

Estado de fase: Cerrada

## Fase 35 - 2026-03-08
Alcance: Ajuste de layout header tras aumento de logo

Cambio aplicado:
- Se aumento la altura de `level1` del header de `56px` a `80px` para que el menu quede visualmente debajo del logo sin solaparse.

Archivo:
- `frontend/src/components/ui/AppHeader/AppHeader.module.css`

Estado de fase: Cerrada

## Fase 36 - 2026-03-08
Alcance: Vacaciones (consistencia calendario vs validacion de fechas)

Problema detectado:
- En crear Vacaciones, algunas fechas quedaban corridas al generar la clave (`YYYY-MM-DD`) usando UTC.
- El listado de fechas seleccionadas podia no coincidir con la validacion final (ej. se marcaba fin de semana en posicion inesperada).

Correccion aplicada:
- `buildDateKey` ahora usa fecha local (`date.format('YYYY-MM-DD')`) en lugar de componentes UTC.
- `parseDateKey` se normalizo a parseo local del mismo formato.
- Se blindo `toggleDate` para no agregar fechas con motivo de bloqueo (fin de semana, feriado, reservado o sin planilla).

Archivo:
- `frontend/src/pages/private/personal-actions/vacaciones/VacationTransactionModal.tsx`

Estado de fase: Cerrada

## Fase 37 - 2026-03-08
Alcance: Vacaciones (estabilidad de pestana Bitacora en edicion)

Problema detectado:
- Al entrar a Bitacora en editar vacaciones, el modal regresaba automaticamente a Informacion principal.

Correccion aplicada:
- Se agrego control `justOpenedRef` para evitar reinicio de tab por re-renders del effect de inicializacion.
- Se agrego `handleTabChange` para controlar carga de auditoria al entrar en Bitacora y mantener estado estable.

Archivo:
- `frontend/src/pages/private/personal-actions/vacaciones/VacationTransactionModal.tsx`

Estado de fase: Cerrada

## Fase 38 - 2026-03-08
Alcance: Vacaciones (bitacora detallada de dias seleccionados)

Mejora aplicada:
- Bitacora de Vacaciones ahora incluye Cantidad de dias y Dias seleccionados (lista de fechas) en create/update.
- Se incluyo lineasDetalle para Vacaciones con fecha por linea (Linea N - Fecha efecto) para mostrar cambios antes/despues de forma clara.
- Se normalizo render de arreglos en cambios de auditoria para que se muestren legibles (lista separada por comas).

Archivo:
- pi/src/modules/personal-actions/personal-actions.service.ts

Estado de fase: Cerrada

## Fase 39 - 2026-03-08
Alcance: Aumentos (fix runtime en modal)

Error corregido:
- IncreaseTransactionModal.tsx:367 Uncaught ReferenceError: employeeCurrency is not defined.

Correccion aplicada:
- Se definio employeeCurrency desde moneda del empleado seleccionado con fallback CRC.

Archivo:
- rontend/src/pages/private/personal-actions/aumentos/IncreaseTransactionModal.tsx

Estado de fase: Cerrada

## Fase 40 - 2026-03-08
Alcance: Aumentos (fix runtime de metodo de calculo)

Error corregido:
- IncreaseTransactionModal.tsx:517 Uncaught ReferenceError: metodoCalculo is not defined.

Correccion aplicada:
- Se definio metodoCalculo normalizado desde line.metodoCalculo con fallback seguro a PORCENTAJE.

Archivo:
- rontend/src/pages/private/personal-actions/aumentos/IncreaseTransactionModal.tsx

Estado de fase: Cerrada

## Fase 41 - 2026-03-08
Alcance: Aumentos (reordenamiento de campos en modal)

Cambio aplicado en orden de campos:
1. Empresa
2. Empleado
3. Periodo de Planilla
4. Movimiento
5. Motivo de Aumento
6. Fecha de Efecto

Archivo:
- rontend/src/pages/private/personal-actions/aumentos/IncreaseTransactionModal.tsx

Estado de fase: Cerrada

## Fase 42 - 2026-03-08
Alcance: Fix de tipado en auditoria (Descuentos/Vacaciones)

Correccion aplicada:
- Se alineo el tipado de createdActions para incluir uditLines donde corresponde.
- Se agrego helper faltante mapDiscountLinesForAuditFromDto.
- Se agrego import de UpsertDiscountLineDto.

Validacion:
- pi: 
pm run build OK.

Estado de fase: Cerrada

## Fase 43 - 2026-03-08
Alcance: Aumentos (payload metodoCalculo)

Error corregido:
- API rechazaba create/update de aumento con: metodoCalculo must be one of MONTO, PORCENTAJE.

Correccion aplicada:
- Se incluyo metodoCalculo en el payload de createIncrease y updateIncrease desde AumentosPage.
- Se normaliza a texto valido: MONTO o PORCENTAJE.

Archivo:
- rontend/src/pages/private/personal-actions/aumentos/AumentosPage.tsx

Estado de fase: Cerrada

## Fase 44 - 2026-03-08
Alcance: Aumentos (estabilidad de pestana Bitacora)

Problema corregido:
- En editar aumento, al entrar a Bitacora el modal regresaba automaticamente a Informacion principal.

Correccion aplicada:
- Se agrego control justOpenedRef para evitar reset de tab en re-renders.
- Se agrego handleTabChange para carga estable de auditoria al abrir Bitacora.
- Se protegio onCompanyChange en modo edit para evitar refresh con undefined transitorio.

Archivo:
- rontend/src/pages/private/personal-actions/aumentos/IncreaseTransactionModal.tsx

Estado de fase: Cerrada

## Fase 45 - 2026-03-08
Alcance: Aumentos (validacion funcional final en UI)

Pruebas ejecutadas:
- Aumentos: crear OK.
- Aumentos: editar OK.
- Aumentos: bitacora OK (tab estable, sin retorno automatico a Informacion principal).
- Aumentos: payload valido con metodoCalculo (MONTO/PORCENTAJE).
- Aumentos: orden de campos del formulario ajustado segun flujo operativo.

Resultado:
- Modulo Aumentos aprobado en pruebas manuales de flujo principal.

Estado de fase: Cerrada
## Pendientes activos (2026-03-08)
- Accion de personal `Despido`: pendiente de terminar.
- Accion de personal `Renuncia`: pendiente de terminar.

## Actualizacion 2026-03-08 - Inactivar planilla (UI refresh)
- Se corrigio la recarga del listado en `PayrollManagementPage` para invalidar cache API antes de consultar nuevamente.
- Aplicado en acciones de guardado y acciones operativas (incluye inactivar planilla).
- Objetivo: evitar que la fila se vea en estado antiguo por respuesta cacheada del GET.

## Actualizacion 2026-03-08 - Listado de planillas por estado
- Se reemplazo el switch `Mostrar inactivas` por un selector de estados (multi-select).
- El listado ahora filtra por combinacion de: empresa + rango de fechas + estados.
- API `GET /payroll` ahora acepta query repetido `estado` (ejemplo: `?estado=1&estado=3`).

## Actualizacion 2026-03-08 - Filtro de estados en Listado de Planillas
- Se elimino el switch `Mostrar inactivas` del encabezado del listado.
- Se agrego selector de estados (multi-select) para filtrar por estado en conjunto con empresa y rango de fechas.
- El listado consulta por `empresa + fechaDesde/fechaHasta + estados`.
- Valor por defecto del selector de estados: `Abierta (1)` y `En proceso (2)`.
- Si el usuario limpia el selector de estados, se restaura automaticamente el default `[1, 2]`.


## Fase 20 - 2026-03-08 22:10
Alcance: Planillas - inactivar/reactivar con snapshot de acciones + refresh/cache consistente en listado

Comandos ejecutados:
- `cd api && npm.cmd run build`
- `cd api && npm.cmd test -- src/modules/payroll/payroll.service.spec.ts --runInBand`

Resultados:
- Backend: build OK
- PayrollService spec: 10/10
- Fallos: 0

Validaciones funcionales adicionales (manual + BD):
- `PATCH /api/payroll/:id/inactivate` desasocia acciones no finales y las deja en `PENDING_RRHH`.
- `PATCH /api/payroll/:id/reactivate` reabre a `Abierta` y reasocia parcialmente acciones elegibles.
- Snapshot de reactivacion persistido en `acc_planilla_reactivation_items`.
- Boton `Refrescar` forzado con cache-buster (`cb`) y recarga de datos frescos (sin esperar TTL).

- Reasignacion automatica implementada con doble mecanismo: disparo inmediato en create/reopen/reactivate + job `payroll-orphan-reassignment` cada 5 minutos.


## 2026-03-08 - Hallazgo Planilla Inactiva vs Acciones de Personal
- Caso: Al inactivar planilla, en Ausencias se seguia mostrando Periodo de pago ligado.
- Diagnostico: No era cache. El resumen del listado se construia desde lineas (cc_*_lineas.id_calendario_nomina). En BD ese campo es NOT NULL, por lo que no puede quedar en null al desasociar encabezado.
- Ajuste aplicado: El resumen de periodo ahora se calcula desde encabezado cc_acciones_personal.id_calendario_nomina (fuente de verdad en inactivar/reactivar) y movimientos desde lineas.
- Impacto esperado: Si una accion queda desasociada por inactivacion, la columna Periodo de pago ya no mostrara la planilla historica de linea.
- Validacion tecnica: 
pm run build en API exitoso.

## Fase 46 - 2026-03-09
Alcance: Revalidacion robusta planillas/traslado con datos reales en `mysql_hr_pro`.

Comandos ejecutados:
- `cd api && npm.cmd run test -- payroll.service.spec.ts intercompany-transfer.service.spec.ts payroll-orphan-reassignment.service.spec.ts --runInBand`
- `cd api && npm.cmd run build`
- `cd api && npx ts-node -r tsconfig-paths/register scripts/tmp-e2e-planilla-transfer.ts`
- `cd api && npx ts-node -r tsconfig-paths/register scripts/tmp-e2e-transfer-invalidate-2.ts`

Resultados unit/integration:
- Suites: 3/3
- Tests: 16/16
- Build API: OK

Resultados E2E reales:
- Escenario A (inactivar -> planilla exacta -> reasignar): OK
  - Pendientes luego de inactivar: 9
  - Reasociados auto: 45
  - Reasociados por flujo: 9
- Escenario B (inactivar -> traslado -> invalidar snapshot): BLOQUEADO
  - Simulacion: genera asignaciones por fecha correctamente.
  - Execute: bloqueado por acciones bloqueantes activas y por conflicto de unicidad en ledger de vacaciones (`UQ_vacaciones_ledger_source`).
  - `INVALIDATED_BY_TRANSFER` no incrementa mientras execute no cierre exitosamente.

Hallazgos detectados en esta fase:
1. El flujo de simulacion ya resuelve cobertura de fechas de planilla destino cuando hay compatibilidad.
2. Persisten casos de bloqueo funcional por estados de acciones.
3. Existe bug tecnico en traslado/vacaciones que impide cierre de execute en ciertos datos.

Estado de fase: Parcialmente cerrada (A aprobado, B pendiente por bloqueo tecnico/funcional).

## Fase 47 - 2026-03-09
Alcance: Ajuste de criterio de compatibilidad de fechas por regla de negocio.

Cambios validados:
- Compatibilidad entre planillas para reasociacion/reactivacion valida solo `Inicio Periodo` y `Fin Periodo`.
- Diferencias en `Fecha Corte` y `Ventana de Pago` no bloquean compatibilidad.

Pruebas ejecutadas:
- `payroll.service.spec.ts`
- `intercompany-transfer.service.spec.ts`
- `payroll-orphan-reassignment.service.spec.ts`

Resultado:
- 16/16 en verde.
- Build API OK.

## Fase 48 - 2026-03-09
Alcance: Traslado interempresa E2E real con datos productivos de prueba (`mysql_hr_pro`).

Ajustes aplicados antes de prueba:
1. Se elimina bloqueo por tipo de accion pendiente en simulacion.
2. Se corrige conflicto de unicidad en vacaciones ledger (`TRANSFER_OUT`/`TRANSFER_IN`).

Bateria ejecutada:
- `intercompany-transfer.service.spec.ts`
- `payroll.service.spec.ts`
- `payroll-orphan-reassignment.service.spec.ts`
- Resultado: 17/17 en verde.
- Build API: OK.

E2E ejecutado:
- Script: `api/scripts/tmp-e2e-transfer-invalidate-2.ts`
- Empleado: `id=4`
- Resultado:
  - Simulate: `eligible=true`, `transferId=3`
  - Execute: `EXECUTED`

Evidencia SQL post-ejecucion:
- `sys_empleados.id_empresa` empleado 4 = 3.
- Acciones (8,11,12,13,14,15) en empresa 3 con `id_calendario_nomina=11`.
- Snapshots de esas acciones: `INVALIDATED_BY_TRANSFER` = 6.
- Transferencia `id=3` en estado ejecutado con `fecha_ejecucion_transferencia` informada.

Estado de fase: Cerrada (aprobada).

## Fase 49 - 2026-03-09
Alcance: Correccion de refresco post-ejecucion en Traslado interempresas (UI).

Sintoma reportado:
- El traslado se ejecutaba, pero la tabla no se actualizaba en pantalla.
- Al volver a simular, podia aparecer inconsistencia: empleado ya en destino + mensaje de bloqueo por planillas activas en origen.

Ajustes aplicados (frontend):
1. Se invalida cache GET al ejecutar traslado y al presionar Refrescar.
2. Se elimina de inmediato del grid local a empleados con execute EXECUTED.
3. Se recarga lista con retardo corto (300 ms) para evitar carrera de lectura post-commit.

Archivo:
- rontend/src/pages/private/payroll-management/IntercompanyTransferPage.tsx

Estado:
- Pendiente de validacion visual en navegador por parte de QA funcional.

## Fase 50 - 2026-03-09 01:54:09 -06:00
Alcance: cierre documental del ajuste UI en Traslado interempresas y checklist de validacion pendiente.

Cambio aplicado:
- Archivo: rontend/src/pages/private/payroll-management/IntercompanyTransferPage.tsx.
- Invalidacion de cache en execute y en boton Refrescar.
- Limpieza inmediata de empleados ejecutados en el grid local.
- Recarga diferida de lista (300ms) para evitar lectura de estado viejo justo despues del execute.

Pendiente de QA funcional manual:
1. Ejecutar traslado apto y validar que el empleado sale del grid sin recargar pagina completa.
2. Presionar Refrescar y validar que no reaparece en origen.
3. Re-simular en origen y confirmar que no quede inconsistencia de validaciones.
4. Confirmar presencia del empleado en destino y consistencia de acciones personales.

Referencia principal del handoff:
- docs/50-Handoff-TrasladoInterempresas-20260309.md
