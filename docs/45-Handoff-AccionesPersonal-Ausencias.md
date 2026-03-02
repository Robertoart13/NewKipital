# 45 - Handoff Operativo (Acciones de Personal: Ausencias)

Fecha: 2026-02-28  
Objetivo: permitir retomar el desarrollo desde cero (nuevo chat / nuevo ingeniero) sin perdida de contexto.

Etiqueta de continuidad (usar mañana):

`CONT-AP-2026-03-01-DESCUENTOS-CERRADO`

## 1. Estado actual (cerrado)

El modulo **Ausencias** ya esta operativo en flujo base:

1. Vista propia: `/personal-actions/ausencias`.
2. Listado con filtros homologados al patron del sistema.
3. Creacion real en BD (header + cuotas + lineas).
4. Edicion real en BD con validaciones por estado.
5. Avance secuencial de estado (`advance`).
6. Invalidacion sin borrado fisico (`invalidate`).
7. Bitacora visible en tab dedicado.
8. Apertura de modal por click en fila en cualquier estado.

Documentos fuente de detalle:

1. `docs/43-AccionesPersonal-Ausencias-Implementacion-Operativa.md`
2. `docs/44-ContratosAPI-Ausencias-20260228.md`
3. `docs/42-AccionesPersonal-Planilla-Fase0Cerrada.md`

Actualizacion de alcance:

1. A partir del 2026-03-01, la ejecucion operativa oficial migra a modelo por `linea/periodo` (o bloque de lineas del mismo periodo), no por header completo.
2. Ver documento rector de correccion transversal: `docs/48-AccionesPersonal-ModeloPorPeriodo-Linea.md`.

## 2. Endpoints vigentes (Ausencias)

1. `GET /api/personal-actions?idEmpresa=...&estado=1&estado=2&estado=3` (listado con filtro multiestado en backend).
2. `GET /api/personal-actions/absence-employees?idEmpresa=...`
3. `GET /api/personal-actions/absence-movements?idEmpresa=...&idTipoAccionPersonal=20`
4. `GET /api/personal-actions/absence-payrolls?idEmpresa=...&idEmpleado=...`
5. `POST /api/personal-actions/ausencias`
6. `PATCH /api/personal-actions/ausencias/:id`
7. `PATCH /api/personal-actions/ausencias/:id/advance`
8. `PATCH /api/personal-actions/ausencias/:id/invalidate`
9. `GET /api/personal-actions/ausencias/:id/audit-trail?limit=200`

## 3. Permisos usados

1. `hr_action:view` (listado general por empresa/estado).
2. `hr-action-ausencias:view`
3. `hr-action-ausencias:create`
4. `hr-action-ausencias:edit`
5. `hr-action-ausencias:approve` (advance en `2->3` y `3->4`).
6. `hr-action-ausencias:cancel` (invalidate en estados operativos).
7. `employee:view-sensitive` (solo para ver datos sensibles en card de empleado).

## 4. Reglas de estado (single source of truth)

Catalogo numerico:

1. `1 = DRAFT`
2. `2 = PENDING_SUPERVISOR`
3. `3 = PENDING_RRHH`
4. `4 = APPROVED`
5. `5 = CONSUMED`
6. `6 = CANCELLED`
7. `7 = INVALIDATED`
8. `8 = EXPIRED`
9. `9 = REJECTED`

Flujo secuencial habilitado por `advance`:

1. `1 -> 2`
2. `2 -> 3`
3. `3 -> 4`

Regla UI/edicion:

1. Editables: `1,2,3`.
2. Solo lectura (modal abre, sin guardar): `4,5,6,7,8,9`.

## 5. Reglas funcionales activas

### 5.1 Encabezado

1. En edicion, `empresa` y `empleado` bloqueados.
2. En creacion, si no hay `empresa + empleado`, no aparece seccion de lineas.

### 5.2 Lineas de transaccion

1. No se permite agregar linea nueva si la actual esta incompleta.
2. No se permite guardar con lineas incompletas.
3. `cantidad` entero `>= 1` (sin limite artificial de 9999).
4. `monto` editable manualmente, no negativo.
5. `monto` en UI se captura como texto numerico saneado (solo digitos), con agrupacion visual por miles.
6. Persistencia de `monto`: entero en BD (sin separadores).
7. Cualquier separador digitado por usuario (`,` o `.`) se limpia y se vuelve a pintar agrupado.

### 5.3 Planillas elegibles

Una planilla solo aparece si cumple:

1. misma empresa,
2. mismo periodo de pago del empleado,
3. misma moneda del empleado,
4. activa,
5. estado operativo (abierta/en proceso),
6. ventana vigente (`fecha_fin_pago >= hoy`).

## 6. Base de datos involucrada

Tablas core:

1. `acc_acciones_personal` (header)
2. `acc_cuotas_accion` (cuotas)
3. `acc_ausencias_lineas` (detalle por linea)

Nota operativa:

1. No hay borrado fisico de acciones en flujo normal.
2. Invalidar cambia estado y conserva trazabilidad.

## 7. Bitacora y auditoria

Eventos auditados:

1. `create`
2. `update`
3. `advance`
4. `invalidate`

## 8. Homologaciones transversales (estado actual)

Los siguientes comportamientos quedaron estandarizados en Ausencias, Licencias, Incapacidades y Bonificaciones:

1. Permiso `employee:view-sensitive` solo afecta visualizacion de datos sensibles.
2. El calculo de montos/formula siempre se ejecuta internamente con datos reales aunque el usuario no vea esos datos.
3. En `modo editar`, las lineas de transaccion cargan colapsadas por defecto.
4. En `modo crear`, las lineas mantienen comportamiento de expansion normal.

Comportamiento de carga:

1. Bitacora se carga una vez por apertura/modal para evitar loops.
2. Cambiar entre tabs no debe limpiar formulario ni lineas.

## 8. UX y filtros (estado final esperado)

Listado usa patron homologado:

1. header de registros con `entries per page`,
2. filtro de empresa,
3. filtro de estado (multiseleccion),
4. boton refrescar,
5. panel de filtros con buscar/limpiar.

Preseleccion de estado (atencion diaria):

1. `Borrador`
2. `Pendiente Supervisor`
3. `Pendiente RRHH`

Regla de performance (obligatoria):

1. Al cargar, se consulta backend solo con estados seleccionados.
2. Frontend manda query repetido `estado` (`?estado=1&estado=2&estado=3`).
3. Backend filtra en SQL por empresa + estados (`IN (...)`).

Regla UX modal (create vs edit):

1. En `create`, no se muestra la pestaña/sección `Informacion principal`.
2. En `edit`, sí se muestra `Informacion principal` y (si aplica) `Bitacora`.
3. Aplica igual para Ausencias y Licencias para mantener consistencia visual.

## 9. QA minimo para verificar al retomar

1. Crear ausencia con 1 linea valida.
2. Crear ausencia con 2 lineas (validar `group_id`/orden y persistencia).
3. Avanzar estado `1->2->3->4`.
4. Invalidar en estado operativo.
5. Abrir modal en estado final y confirmar solo lectura.
6. Abrir tab bitacora y confirmar eventos.
7. Validar que cambio de tab no borra datos.
8. Validar que `monto` mantiene agrupacion visual y persistencia entera.

## 10. Pendiente siguiente bloque (no implementado aun)

1. Aprobar flujo completo por rol (supervisor/RRHH) con enforcement mas fino por permiso.
2. Replicar este patron en las demas acciones de personal:
   - Entradas,
   - Salidas,
   - Deducciones,
   - Compensaciones,
   - Incapacidades,
   - Licencias y permisos.
3. Definir invalidacion por linea si negocio lo requiere (hoy la invalidacion es por accion completa).

## 11. Regla de continuidad para siguiente ingeniero

No romper lo ya cerrado en Ausencias.  
Cualquier extension debe cumplir:

1. compatibilidad incremental,
2. estados numericos centralizados,
3. trazabilidad en bitacora,
4. misma UX del ecosistema (modales, filtros, confirmaciones, bloqueos por estado),
5. estandar de formato monetario reutilizado por hook,
6. evitar duplicacion: primero hook/utilidad compartida, luego implementacion por accion.

## 12. Roadmap por fases (para continuar sin ambiguedad)

### Fase A - Cierre Ausencias Base (estado actual)

Estado: **COMPLETADA**  
Incluye:

1. CRUD operativo de Ausencias (header + lineas).
2. Advance secuencial (`1->2->3->4`).
3. Invalidacion de accion completa.
4. Bitacora en modal.
5. Reglas de elegibilidad de planilla.
6. Modo lectura en estados no editables.

Criterio de salida: cumplido.

### Fase B - Gobernanza de estados y acciones UI

Estado: **COMPLETADA (2026-02-28)**  
Objetivo cerrado:

1. Permisos por transicion de estado aplicados en backend:
   - `DRAFT -> PENDING_SUPERVISOR`: requiere `hr-action-ausencias:edit`.
   - `PENDING_SUPERVISOR -> PENDING_RRHH`: requiere `hr-action-ausencias:approve`.
   - `PENDING_RRHH -> APPROVED`: requiere `hr-action-ausencias:approve`.
2. Invalidacion restringida por politica final:
   - solo estados operativos `1,2,3`,
   - permiso obligatorio `hr-action-ausencias:cancel`.
3. Mensajeria UX por accion de estado aplicada en frontend:
   - textos de confirmacion y exito por transicion,
   - mensaje explicito cuando falta permiso para accion.

Criterio de salida:

1. Matriz permiso x estado x accion cerrada y aplicada. **Cumplido**

### Fase C - Replicar patron en otras Acciones de Personal

Estado: **EN PROGRESO (alto avance)**  
Orden recomendado:

1. Deducciones
2. Compensaciones
3. Salidas
4. Entradas
5. Incapacidades
6. Licencias y Permisos

Regla:

1. Cada accion en carpeta/vista/modal propio.
2. Mismo esqueleto de Ausencias:
   - listado homologado,
   - create/edit,
   - bitacora,
   - bloqueo por estado,
   - validaciones de lineas.
3. Reuso obligatorio de hooks/utilidades compartidas:
   - `frontend/src/hooks/useMoneyFieldFormatter.ts`
   - `frontend/src/hooks/useTransactionLines.ts`
   - `frontend/src/hooks/useActionAmountStrategy.ts`
   - `frontend/src/pages/private/personal-actions/shared/coreTransactionLine.ts`
4. Campos base por linea (siempre presentes):
   - `Periodo de pago (Planilla)`,
   - `Movimiento`,
   - `Cantidad`,
   - `Monto (moneda vigente)`.
5. Lo que varia por accion: formula de calculo de monto y campos extra.

Criterio de salida:

1. Todas las acciones con comportamiento consistente y auditables.

Avance real al 2026-03-01:

1. **Completadas y operativas**:
   - Ausencias
   - Licencias y Permisos
   - Incapacidades
   - Bonificaciones
   - Horas Extra
   - Retenciones
   - Descuentos
2. Todas las anteriores ya usan:
   - split por periodo al crear (si hay periodos distintos),
   - guard de edicion mono-periodo,
   - transiciones por estado con permisos,
   - invalidacion sin borrado fisico,
   - bitacora y lectura en estados no editables.
3. Pendiente de Fase C:
   - completar restantes acciones del menu no migradas al patron operativo (si aplica por alcance funcional).

### Fase D - Integracion avanzada con motor de planilla

Estado: **PENDIENTE**  
Objetivo:

1. Trigger de recalculo en planillas abiertas al aprobar acciones elegibles.
2. Politica de retroactivos confirmada y ejecutada.
3. Reglas de consumo por corrida (`id_calendario_nomina` como vinculo oficial) cerradas para todas las acciones.

Criterio de salida:

1. Trazabilidad completa desde accion personal hasta corrida de planilla.

### Fase E - Hardening final y certificacion operativa

Estado: **PENDIENTE**  
Objetivo:

1. Matriz QA completa por accion/estado.
2. Pruebas de concurrencia.
3. Checklist de auditoria operativa (bitacora, permisos, bloqueo de edicion post-estado final).

Criterio de salida:

1. Go-live candidate para bloque Acciones de Personal.

## 13. Si manana se pregunta: "Que fase sigue?"

Respuesta estandar esperada:

1. "La siguiente fase es **Fase C - replicar patron en las demas acciones de personal**."
2. "Fase B ya quedo cerrada con gobernanza de permisos por estado e invalidacion por `cancel`."

Checklist de arranque rapido para manana:

1. Abrir `docs/45-Handoff-AccionesPersonal-Ausencias.md`.
2. Confirmar Fase A cerrada (sin regresiones).
3. Iniciar tareas de Fase C.

## 14. Estandar de formato monetario (transversal)

Implementacion vigente:

1. Hook compartido: `frontend/src/hooks/useMoneyFieldFormatter.ts`.
2. Sanitizacion/parsing centralizados: `frontend/src/lib/moneyInputSanitizer.ts`.
3. Campos ya migrados al estandar:
   - Crear Empleado: `Salario Base`, `Cesantia Acumulada`, `Monto Provisionado`.
   - Editar Empleado: `Salario Base`, `Cesantia Acumulada`.
   - Ausencias: `Monto` de linea.

Reglas:

1. UI: agrupacion por miles para lectura.
2. Dominio/API/BD: valor entero sin separadores.
3. Validacion: monto no negativo y limite maximo corporativo.

## 15. Base modal reutilizable (estado)

1. `ActionTransactionModalBase` queda como iniciativa de Fase C para reducir duplicacion estructural.
2. Alcance esperado del base:
   - encabezado comun (empresa/empleado/observacion),
   - bloque comun de lineas (periodo, movimiento, cantidad, monto),
   - pie comun (confirmaciones, guardado, estados de solo lectura).
3. Cada accion define su configuracion propia:
   - campos extra por linea,
   - reglas de calculo de monto,
   - validaciones especificas.

## 16. Cierre Audit-Ready (2026-03-01)

Decisiones consolidadas tras revision tecnica (auditoria interna):

1. Naming oficial de consumo:
   - `acc_acciones_personal.id_calendario_nomina` es el vinculo de consumo (no `consumed_run_id` nuevo).
2. Integridad de apply:
   - `APPLY` consume acciones ligadas aprobadas y las lleva a `CONSUMED (5)`.
3. Blindaje de recalculo:
   - `APPLY` se bloquea si `requires_recalculation_calendario_nomina = 1` en backend y frontend.
4. Higiene operativa:
   - job nocturno marca `EXPIRED` para acciones aprobadas no consumidas y vencidas.
5. Invalidacion automatica cerrada por politica RRHH:
   - aplica solo a `APPROVED (4)` no consumidas,
   - razones automaticas: `TERMINATION_EFFECTIVE`, `COMPANY_MISMATCH`, `CURRENCY_MISMATCH`,
   - portabilidad entre empresas: `NO` (cambio de empresa invalida la accion anterior).
6. Evidencia de cierre:
   - pruebas de backend DoD + unitarias `24/24` en verde,
   - build API/frontend en verde.

## 17. Nota operativa para manual final (permisos y menu)

Leccion aprendida documentada (2026-03-01):

1. Si una opcion del menu sigue visible despues de quitar permiso a un rol, primero validar roles adicionales del mismo usuario.
2. El sistema resuelve permisos efectivos por union de:
   - roles por contexto (`sys_usuario_rol`),
   - roles globales (`sys_usuario_rol_global`),
   y luego aplica denegaciones.
3. Caso real:
   - `GERENTE_NOMINA` sin `hr-action-incapacidades:view`,
   - pero usuario con `OPERADOR_NOMINA` activo, que si otorgaba ese permiso,
   - resultado: opcion `Incapacidades` seguia visible (comportamiento correcto del motor RBAC).
4. Checklist minimo antes de levantar bug:
   - revisar rol editado,
   - revisar todos los roles efectivos del usuario,
   - revisar overrides ALLOW/DENY,
   - forzar refresh authz o relogin.

## 18. Motor INVALIDATED automatico (2026-03-01)

Politica implementada:

1. Solo invalida acciones `APPROVED (4)` y no consumidas (`id_calendario_nomina IS NULL`).
2. No invalida automatico `DRAFT/PENDING`.
3. Nunca toca `CONSUMED`.

Triggers activos:

1. Job nocturno de higiene:
   - terminacion efectiva del empleado (`TERMINATION_EFFECTIVE`),
   - desalineacion de empresa (`COMPANY_MISMATCH`),
   - desalineacion de moneda empleado/accion (`CURRENCY_MISMATCH`).
2. Doble check en collector (`PayrollService.process`) antes de snapshot:
   - vuelve a invalidar por las mismas reglas,
   - agrega verificacion de moneda contra planilla en ejecucion.

Auditoria de invalidacion automatica:

1. `invalidated_at_accion`
2. `invalidated_reason_code_accion`
3. `invalidated_reason_accion`
4. `invalidated_meta_accion` (JSON)

## 19. Cierre Forense (scope bloqueante para 100% auditor-ready)

Se estipula oficialmente este cierre final:

1. Identidad de invalidez obligatoria:
   - `invalidated_by_type_accion` (varchar, valores permitidos en codigo: `SYSTEM | USER`).
   - `invalidated_by_user_id_accion` (nullable).
2. Reglas de consistencia:
   - si `invalidated_by_type_accion = SYSTEM` -> `invalidated_by_user_id_accion = NULL`.
   - si `invalidated_by_type_accion = USER` -> `invalidated_by_user_id_accion` requerido.
3. Trigger por evento de empleado (tiempo real):
   - disparar invalidacion automatica al cambiar `fecha_salida`, `id_empresa` o `moneda_salario`.

## 20. Estado consolidado del bloque (corte 2026-03-01 madrugada)

Resumen ejecutivo de trazabilidad:

1. Motor base Acciones + Planilla: operativo y audit-ready en reglas nucleares (consume/apply, invalidacion, higiene, anti-delete, permisos).
2. Modelo de ejecucion vigente:
   - no se migro a cuota como unidad UI,
   - se aplica split por periodo al guardar (documento 48).
3. Modulos cerrados en esta ola:
   - Ausencias (doc 43)
   - Bonificaciones (doc 46)
   - Horas Extra (doc 47)
   - Descuentos (doc 49)
   - Licencias, Incapacidades y Retenciones documentadas en este handoff + servicio/tests.
4. Verificaciones tecnicas recientes:
   - API personal-actions service spec en verde.
   - Build backend y frontend en verde.
   - migracion segura ejecutada sin pendientes en `HRManagementDB_produccion`.
5. Nota operativa:
   - si aparece error "table ... does not exist" luego de migrar, reiniciar proceso API para recargar metadata/conexion activa.
   - aplica solo a acciones `APPROVED (4)` no consumidas.
4. Defensa en profundidad se mantiene:
   - hook por evento de empleado,
   - job nocturno,
   - collector antes de snapshot.
5. Logging de collector:
   - log estructurado por corrida (sin spam por accion): `payrollId`, `total_invalidated`, `breakdown` por `reason_code`, `sample_action_ids` (max 10).
6. Evidencia obligatoria para declarar 100%:
   - F1 termination invalida approved futura,
   - F2 company mismatch invalida,
   - F3 currency mismatch invalida,
   - F4 pending no se invalida,
   - F5 consumed nunca cambia,
   - test de idempotencia (doble corrida sin cambios extra),
   - CI verde con DoD de payroll intacto.

## 20. Runbook migraciones legacy (estabilidad `migration:run`)

Incidente real documentado (2026-03-01):

1. Error al correr migraciones:
   - `Duplicate key name 'IDX_empresa_cedula'` en `CreateSysEmpresas1708531200000`.
2. Causa raiz:
   - BD con objetos legacy ya existentes,
   - tabla `migrations` desalineada (faltaban migraciones historicas marcadas como aplicadas),
   - TypeORM intento ejecutar migraciones base sobre estructuras ya creadas.

Correccion aplicada:

1. Script de reconciliacion creado:
   - `api/scripts/run-reconcile-migration-baseline.ts`
2. Regla de reconciliacion (segura):
   - solo marca como aplicadas migraciones faltantes con `timestamp <= max(timestamp)` ya aplicado en esa BD.
   - no modifica datos de negocio.
3. Scripts npm oficiales:
   - `migration:run:raw` -> corre TypeORM directo.
   - `migration:baseline:check` -> dry-run de baseline.
   - `migration:baseline:reconcile` -> aplica baseline faltante.
   - `migration:run:safe` -> reconcile + run raw.
   - `migration:run` -> apunta a `migration:run:safe` (default seguro).

Resultado verificado en `mysql_hr_pro` (2026-03-01):

1. Tabla `migrations` alineada a `59` filas (igual a migraciones detectadas en codigo).
2. La migracion `1708537300000 (CreateLicenseLinesTable)` aparece registrada.
3. `npm run migration:run` finaliza en `No migrations are pending`.

Politica operativa a futuro:

1. Usar siempre `npm run migration:run` (ya seguro por defecto).
2. Si aparece choque legacy similar:
   - ejecutar `npm run migration:baseline:check`,
   - validar plan generado,
   - ejecutar `npm run migration:baseline:reconcile`,
   - reintentar `npm run migration:run`.
3. Prohibido borrar/recrear indices manualmente en produccion para "forzar" migraciones; primero reconciliar baseline.

## 21. Blueprint inicial Licencias y Permisos (2026-03-01)

Implementacion base iniciada con el mismo patron de Ausencias (sin reutilizar codigo legacy directo).

Alcance funcional definido:

1. Encabezado transaccional:
   - Empresa,
   - Empleado,
   - Observacion.
2. Lineas de transaccion (por cada item):
   - Periodo de pago (planilla),
   - Movimiento,
   - Tipo de licencia (catalogo funcional),
   - Cantidad,
   - Monto (formato monetario estandar),
   - Remuneracion,
   - Fecha efecto,
   - Formula (derivada de reglas de movimiento).
3. Politica de monto:
   - prioridad 1: movimiento con monto fijo,
   - prioridad 2: movimiento con porcentaje sobre salario base ajustado por periodo de pago,
   - fallback: sin configuracion de calculo.

Backend agregado:

1. Nueva tabla de lineas:
   - `acc_licencias_lineas` (migracion `1708537300000-CreateLicenseLinesTable`).
2. Nueva entidad:
   - `LicenseLine`.
3. Nuevos DTO:
   - `UpsertLicenseDto`,
   - `UpsertLicenseLineDto`.
4. Nuevos endpoints:
   - `GET /personal-actions/licencias/:id`,
   - `GET /personal-actions/licencias/:id/audit-trail`,
   - `POST /personal-actions/licencias`,
   - `PATCH /personal-actions/licencias/:id`,
   - `PATCH /personal-actions/licencias/:id/advance`,
   - `PATCH /personal-actions/licencias/:id/invalidate`.
5. Reglas operativas:
   - mismo flujo de estados que Ausencias (`DRAFT -> PENDING_SUPERVISOR -> PENDING_RRHH -> APPROVED`),
   - mismas restricciones de edicion/invalidacion por estado,
   - invalidacion manual con metadata forense (`USER`).

Frontend agregado:

1. Nueva pagina:
   - `LicensesPage` en ruta `/personal-actions/licencias`.
2. Nuevo modal transaccional:
   - `LicenseTransactionModal`.
3. API client extendido:
   - contratos y funciones `fetch/create/update/advance/invalidate/audit` para licencias.
4. Ruta actualizada:
   - `AppRouter` ahora usa `LicensesPage` (ya no `PersonalActionsPage` generica) para ese modulo.

Permisos:

1. Se mantiene la matriz actual:
   - `hr-action-licencias:view|create|edit|approve|cancel`.
2. El menu y la ruta dependen de `hr-action-licencias:view`.

Nota de catalogo:

1. Para movimientos de Licencias se usa `id_tipo_accion_personal = 23 (LIC)` en frontend.
2. En backend la validacion de movimientos acepta licencias/permisos relacionados (`17, 18, 19, 23`) para compatibilidad operativa.

QA y datos de prueba (Licencias):

1. Seed idempotente agregado:
   - `api/scripts/seed-licencias-ux.sql`.
2. Datos sembrados en `mysql_hr_pro` para `id_empresa = 1`:
   - Articulo: `QA Articulo Nomina Licencias UX` (tipo accion `23`),
   - Movimiento activo monto fijo: `QA Licencia Monto Fijo 30000`,
   - Movimiento activo porcentaje: `QA Licencia Porcentaje 12.5`,
   - Movimiento inactivo de control: `QA Licencia Movimiento Inactivo`.
3. Evidencia de pruebas maliciosas backend:
   - payload sin lineas en create -> rechazado (`BadRequest`),
   - escalamiento de privilegio en avance sin permiso `approve` -> rechazado (`Forbidden`),
   - invalidacion manual licencia -> metadata forense `USER` obligatoria.

## 22. Evidencia tecnica de cierre (Licencias + migraciones)

Validaciones realizadas:

1. Estructura de tabla `acc_licencias_lineas` validada con `SHOW CREATE TABLE`:
   - FKs correctas a:
   - `acc_acciones_personal(id_accion)`,
   - `acc_cuotas_accion(id_cuota)`,
   - `sys_empresas(id_empresa)`,
   - `sys_empleados(id_empleado)`,
   - `nom_calendarios_nomina(id_calendario_nomina)`,
   - `nom_movimientos_nomina(id_movimiento_nomina)`.
2. Se corrigio el incidente de FK legacy:
   - referencia antigua incorrecta `acc_accion_cuotas`,
   - referencia vigente correcta `acc_cuotas_accion`.
3. Seed UX confirmado en tablas reales:
   - `nom_articulos_nomina.nombre_articulo_nomina = 'QA Articulo Nomina Licencias UX'`,
   - `nom_movimientos_nomina.nombre_movimiento_nomina` con 3 registros QA (2 activos + 1 inactivo).
4. Tests ejecutados:
   - backend: `personal-actions.service.spec.ts` -> `13/13 PASS`,
   - frontend: `moneyInputSanitizer.test.ts` + `payroll-personal-actions.test.ts` -> `16/16 PASS`.

Comando operativo recomendado para entornos nuevos:

1. `cd api && npm run migration:run`
2. (opcional QA UX) ejecutar `api/scripts/seed-licencias-ux.sql`
3. verificar en UI de Licencias:
   - movimiento monto fijo visible,
   - movimiento porcentaje visible,
   - movimiento inactivo no seleccionable (segun filtro de activos).

## 23. Suite E2E API (Ausencias + Licencias)

Se agrego prueba e2e de flujo completo real (sin mocks) para ambos modulos:

1. Archivo:
   - `api/test/personal-actions.e2e-spec.ts`
2. Flujos cubiertos:
   - Ausencias: `crear -> editar -> avanzar -> invalidar`
   - Licencias: `crear -> editar -> avanzar -> invalidar`
3. Caracteristicas de la prueba:
   - Seleccion de contexto elegible via SQL real (`DataSource`):
     - empresa accesible por sesion,
     - empleado activo,
     - planilla elegible (`ABIERTA|EN_PROCESO`, misma moneda/periodo, `fecha_fin_pago >= hoy`),
     - movimiento activo por tipo de accion (`20` ausencias, `23` licencias).
   - Autenticacion real:
     - token emitido con `AuthService.login`.
   - Entorno e2e:
     - `NODE_ENV=test`
     - `E2E_DISABLE_CSRF=true` (solo para suite e2e).
4. Ejecucion:
   - `cd api && npm run test:e2e -- personal-actions.e2e-spec.ts --runInBand`
5. Resultado validado:
   - `PASS 2/2` tests.

## 24. Implementacion operativa Incapacidades (2026-03-01)

Se implemento el modulo de Incapacidades con el mismo patron cerrado en Ausencias/Licencias (header + lineas + flujo de estado + bitacora).

Backend:

1. Tabla de lineas de incapacidad:
   - `acc_incapacidades_lineas` (migracion `1708537400000-CreateDisabilityLinesTable`).
   - version idempotente y compatible:
     - crea tabla si no existe,
     - agrega columnas faltantes si ya existe,
     - asegura indices/FKs sin duplicar.
2. Campos de linea implementados:
   - base comun: `periodo_pago`, `movimiento`, `cantidad`, `monto`, `remuneracion`, `fecha_efecto`, `formula`.
   - especificos incapacidad:
     - `tipo_incapacidad_linea`,
     - `tipo_institucion_linea (CCSS|INS)`,
     - `monto_ins_linea`,
     - `monto_patrono_linea`,
     - `subsidio_ccss_linea`,
     - `total_incapacidad_linea`.
3. Endpoints operativos agregados:
   - `GET /personal-actions/incapacidades/:id`
   - `GET /personal-actions/incapacidades/:id/audit-trail`
   - `POST /personal-actions/incapacidades`
   - `PATCH /personal-actions/incapacidades/:id`
   - `PATCH /personal-actions/incapacidades/:id/advance`
   - `PATCH /personal-actions/incapacidades/:id/invalidate`
4. Validaciones backend:
   - empresa/empleado accesible,
   - al menos una linea,
   - planilla elegible por empresa+empleado+moneda+periodo,
   - movimiento activo de incapacidad (`id_tipo_accion_personal_movimiento_nomina = 22`),
   - consistencia `tipo_incapacidad` vs `tipo_institucion` (CCSS/INS).
5. Flujo de estados:
   - `DRAFT -> PENDING_SUPERVISOR -> PENDING_RRHH -> APPROVED`,
   - invalidacion manual con metadata forense (`invalidated_by_type = USER`).

Frontend:

1. Nueva pagina dedicada:
   - `IncapacitiesPage` en ruta `/personal-actions/incapacidades`.
2. Nuevo modal dedicado:
   - `IncapacityTransactionModal`.
3. Calculo de monto replicado de legacy (sin copiar codigo legacy):
   - `INS`: monto directo por valor unitario x cantidad,
   - `CCSS`:
     - 1..3 dias: 50% patrono / 50% CCSS,
     - >3 dias: patrono 50% de primeros 3 dias y resto CCSS.
4. Campos visuales en linea:
   - Tipo de incapacidad,
   - Institucion (CCSS/INS),
   - Cantidad,
   - Monto,
   - Monto patrono,
   - Subsidio CCSS,
   - Monto INS,
   - Total incapacidad,
   - Remuneracion,
   - Fecha efecto y formula.

Datos reales de prueba UX (sin mocks):

1. Nueva migracion de seed idempotente:
   - `1708537500000-SeedDisabilityPayrollArticlesAndMovements`.
2. Crea por empresa (si no existe):
   - Articulo:
     - `Articulo de nomina Incapacidad` (`id_tipo_accion_personal = 22`).
   - Movimientos:
     - `Incapacidad CCSS`,
     - `Incapacidad INS`.

Validacion tecnica ejecutada:

1. Backend build: `PASS`.
2. Frontend build: `PASS`.
3. Unit tests servicio (`personal-actions.service.spec.ts`): `15/15 PASS`.

## 25. Cierre final Incapacidades (2026-03-01, noche)

Se ejecutaron ajustes de cierre para dejar Incapacidades lista para operacion continua y evitar regresiones detectadas en QA funcional:

1. Calculo con rol sin permiso sensible:
   - regla aplicada: `employee:view-sensitive` solo afecta visualizacion (`***`), no calculo operativo.
   - backend ajustado para catalogo de empleados de acciones personales:
     - cuando `EmployeesService` oculta salario, se recupera `salario_base_empleado` (decrypt server-side) para calculo interno.
   - impacto: ausencia/licencia/incapacidad ya no quedan en `0` por falta de permiso visual.

2. Parseo robusto de salarios y montos:
   - frontend ajustado para aceptar valores tipo `1.520,00` y convertirlos correctamente a numero.
   - aplicado en:
     - `AbsenceTransactionModal`,
     - `LicenseTransactionModal`,
     - `IncapacityTransactionModal`.

3. Coherencia Tipo/Incapacidad vs Institucion:
   - se mantiene validacion backend estricta.
   - frontend ahora auto-alinea la linea al seleccionar movimiento/institucion para no enviar combinaciones invalidas.
   - ejemplo: `Movimiento Incapacidad INS` alinea institucion/tipo a `INS` antes de submit.

4. UX de carga del modal Incapacidades:
   - se elimino superposicion de spinners (overlay + loaders internos simultaneos).
   - se usa un solo loader principal en carga inicial del detalle.

5. Fix de DI en Nest:
   - `EmployeeSensitiveDataService` exportado desde `EmployeesModule`.
   - evitado error: `UnknownDependenciesException` en `PersonalActionsService`.

Evidencia tecnica de cierre:

1. Backend:
   - `npm run build` -> `PASS`.
   - `npm run test -- src/modules/personal-actions/personal-actions.service.spec.ts --runInBand` -> `15/15 PASS`.
   - `npm run test -- src/modules/payroll/payroll-dod.spec.ts --runInBand` -> `5/5 PASS`.
2. Frontend:
   - `npm run build` -> `PASS`.
3. Nota de entorno:
   - ejecucion de `vitest` en este entorno fallo por `spawn EPERM` (restriccion del host), no por fallo funcional del modulo.
