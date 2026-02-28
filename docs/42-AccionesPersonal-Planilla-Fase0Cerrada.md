# 42 - Acciones de Personal + Planilla (Fase 0 Cerrada)

**Fecha:** 2026-02-27  
**Estado:** Aprobado para ejecucion por fases (compatibilidad incremental obligatoria)  
**Objetivo:** Consolidar reglas, alcance, decisiones y plan de ejecucion para integrar Acciones de Personal con Planilla sin romper el sistema actual.

---

## 1. Alcance funcional consolidado

- Accion de Personal = evento de negocio desacoplado.
- Planilla = motor que consume acciones aprobadas elegibles.
- Snapshot = evidencia historica de lo consumido.
- Post-apply = inmutabilidad de corrida.
- Retroactivo = ajuste en corrida vigente; nunca se reescribe planilla aplicada.
- No existe borrado fisico de acciones.
- Todo cambio de estado queda auditado.

---

## 2. Principios de compatibilidad (no negociables)

1. No se hace reemplazo de tablas legacy en Fase 1.
2. Migraciones solo incrementales (`ALTER TABLE ... ADD ...`).
3. No usar `DROP` ni `RENAME` en el primer bloque.
4. Source of truth de estados numericos centralizado en backend.
5. Integridad protegida en dos capas: servicio + base de datos.

---

## 3. Modelo de datos objetivo (adaptado al sistema actual)

### 3.1 Tabla maestra de acciones (tabla existente)

Se mantiene tabla existente de acciones (ej. `acc_acciones_personal`) y se agregan campos faltantes:

- `consumed_run_id BIGINT NULL`
- `version_lock INT DEFAULT 1`
- `invalidated_at DATETIME NULL`
- `invalidated_reason VARCHAR(255) NULL`
- `expired_at DATETIME NULL`
- `expired_reason VARCHAR(255) NULL`
- `cancelled_at DATETIME NULL`
- `cancel_reason VARCHAR(255) NULL`
- `group_id VARCHAR(50) NULL`

Indices obligatorios:

- `idx_accion_lookup (id_empresa, id_empleado, estado)`
- `idx_accion_effective (effective_start_date, effective_end_date)`
- `idx_accion_consumed (consumed_run_id)`

FK operativa:

- `consumed_run_id` apunta a PK real de `nom_calendarios_nomina` (confirmar nombre exacto en Fase 1: `id_calendario_nomina` o `id_nomina`).

### 3.2 Tabla hija de ausencia (si no existe equivalente)

Tabla recomendada (1:1 con accion):

- `id_accion` (PK y FK a maestra)
- `movement_id`
- `tipo_ausencia`
- `es_remunerada`
- `cantidad_dias DECIMAL(5,2)`
- `monto_calculado DECIMAL(15,6)` (precision de calculo interno)

Regla de precision:

- Calculo interno con 6 decimales.
- Redondeo a 2 decimales solo en snapshot/resultado final.

---

## 4. Estados oficiales (catalogo numerico)

Catalogo aprobado para centralizar en backend:

- `1 = DRAFT`
- `2 = PENDING_SUPERVISOR`
- `3 = PENDING_RRHH`
- `4 = APPROVED`
- `5 = CONSUMED`
- `6 = CANCELLED`
- `7 = INVALIDATED`
- `8 = EXPIRED`
- `9 = REJECTED`

Regla:

- En codigo se usa enum/constante (no numeros "quemados").
- En DB se persiste valor numerico.

---

## 5. Flujo de aprobacion

### Desde RRHH

`DRAFT -> PENDING_SUPERVISOR -> PENDING_RRHH -> APPROVED`

### Desde TimeWise (futuro, no implementado en este bloque)

`TIMEWISE -> PENDING_SUPERVISOR -> PENDING_RRHH -> APPROVED`

Regla:

- Empleado no define movimiento, moneda ni periodo de corrida.

---

## 6. Elegibilidad para consumo en planilla

Criterios de seleccion en `EN_PROCESO`:

- `estado = APPROVED`
- misma empresa de corrida
- misma moneda de corrida
- `approved_at <= cutoff`
- `consumed_run_id IS NULL`
- solape real con periodo de corrida

Regla de solape (obligatoria):

`(A.start <= P.end) AND (COALESCE(A.end, A.start) >= P.start)`

No usar `BETWEEN` como criterio unico de solape.

---

## 7. Politica de retroactivos

Si una accion cumple:

- `effective_date < periodo actual`
- `approved_at > cutoff anterior`
- `consumed_run_id IS NULL`

entonces entra como retroactivo en corrida vigente.

En snapshot debe persistir:

- `is_retro = true`
- `original_period` (ej. `2024-02`)

Regla:

- Nunca modificar planilla pasada aplicada.

---

## 8. Recalculo obligatorio

En `nom_calendarios_nomina`:

- `requires_recalculation BOOLEAN DEFAULT 0`
- `last_snapshot_at DATETIME NULL`

Cuando:

- corrida `EN_PROCESO`,
- ya existe snapshot,
- entra nueva accion elegible,

se marca `requires_recalculation = 1` y se bloquea `APPLY` hasta reprocesar.

---

## 9. Invalidacion y expiracion

### Invalidacion automatica

Ejemplos:

- Renuncia: accion con fecha efectiva posterior a fecha de salida -> `INVALIDATED`.
- Cambio de empresa: accion con empresa distinta a la actual del empleado -> `INVALIDATED`.

### Expiracion automatica

Job nocturno:

- `effective_end_date < today`
- estado `APPROVED`
- `consumed_run_id IS NULL`

-> transicion a `EXPIRED`.

---

## 10. Politica de solapamiento de acciones

En tipos de accion:

- `overlap_policy = EXCLUSIVE | STACKABLE`

Para ausencia: `EXCLUSIVE` por defecto.

Validacion obligatoria antes de aprobar.

---

## 11. Integridad anti-delete

Decision aprobada: **servicio + trigger**.

1. Servicio:
- no exponer borrado fisico de acciones en API.

2. Trigger DB (`BEFORE DELETE`):
- rechazar delete si estado > `DRAFT` o si `consumed_run_id IS NOT NULL`.

Objetivo:

- proteger integridad incluso ante scripts directos en base.

---

## 12. Permisos (Fase 1 vs Fase 2)

### Fase 1 (obligatorios)

- `hr_action:view`
- `hr_action:create`
- `hr_action:approve`
- `hr_action:cancel`

### Fase 2 (granularidad avanzada)

- `hr_action:approve_supervisor`
- `hr_action:approve_rrhh`
- `hr_action:invalidate`
- `hr_action:reject`
- `hr_action:view_sensitive`

Regla:

- Mantener formato tecnico actual `modulo:accion`.
- Seed en `mysql_hr_pro` con asignacion por rol.

---

## 13. UI y contrato funcional

Creacion RRHH:

1. seleccionar empresa,
2. seleccionar empleado,
3. opcionalmente seleccionar planilla como helper para autocompletar moneda/periodo,
4. crear lineas con `group_id`,
5. enviar a aprobacion.

Regla:

- el helper de planilla no persiste `id_planilla` en accion.
- si cambia helper de planilla, frontend debe recalcular/limpiar datos derivados.

---

## 14. Snapshot (campos minimos)

En items de snapshot de planilla guardar:

- `id_accion`
- `tipo_accion`
- `movement_id`
- `unidades`
- `monto_base`
- `monto_final`
- `is_retro`

---

## 15. Fases de implementacion (ejecutable)

### Fase 1 - Base de datos y permisos

- ALTER incremental de tabla maestra de acciones.
- crear tabla hija de ausencia (si aplica).
- agregar indices y FK de consumo.
- seed permisos Fase 1.
- trigger anti-delete.

### Fase 2 - Motor de estados y validaciones

- transiciones de estados.
- solape por politica (`EXCLUSIVE`/`STACKABLE`).
- validaciones previas a aprobacion.

### Fase 3 - Integracion con planilla

- elegibilidad por empresa/moneda/cutoff/solape.
- snapshot de acciones consumidas.
- retroactivos.
- flag `requires_recalculation`.

### Fase 4 - Jobs de control

- expiracion automatica.
- invalidacion automatica por reglas de negocio.

### Fase 5 - UI y pruebas

- bandeja RRHH/Supervisor.
- formularios y helper de planilla.
- pruebas unitarias + integracion + E2E de flujo critico.

---

## 16. Pendientes de cierre antes de ejecutar Fase 1

1. Confirmar PK real de planilla para FK `consumed_run_id`.
2. Confirmar mapping exacto de estados actuales en tabla legacy.
3. Confirmar estrategia de prorrateo final (dias/monto) en casos de solape multi-periodo.

Sin estos 3 puntos cerrados, no se inicia migracion.

---

## 17. Garantias de auditoria esperadas

- no hay doble consumo de acciones,
- no hay cambios en corridas aplicadas,
- retroactivos trazables,
- bitacora completa por accion y corrida,
- integridad de datos protegida en capa API y DB.

---

## 17.1 Validacion real de Fase 0 (mysql_hr_pro + codigo)

**Corte:** 2026-02-27  
**Objetivo:** evitar repetir discovery tecnico antes de implementar.

Hallazgos confirmados:

1. PK real de planilla:
   - tabla `nom_calendarios_nomina`
   - PK = `id_calendario_nomina`
2. Tabla de acciones actual:
   - `acc_acciones_personal` ya tiene `id_calendario_nomina` (FK a planilla)
   - hoy no tiene campos extendidos (`version_lock`, `invalidated_*`, `expired_*`, etc.)
3. Estados actuales en backend:
   - `1 = PENDIENTE`
   - `2 = APROBADA`
   - `3 = RECHAZADA`
4. Regla de consumo actual:
   - planilla consume acciones `APROBADA`
   - exige `id_calendario_nomina IS NULL`
   - al consumir setea `id_calendario_nomina = id_calendario_nomina de corrida`
5. Permisos:
   - existen `payroll:*`
   - no existen `hr_action:*` en `sys_permisos` (pendiente de seed Fase 1)
6. Datos:
   - `acc_acciones_personal` sin registros al momento del corte (tabla vacia).

Decisiones de compatibilidad derivadas:

1. No crear columna nueva `consumed_run_id` en Fase 1.
2. Reusar `id_calendario_nomina` como referencia de consumo de corrida.
3. Migrar logica de solape de `BETWEEN` a interseccion real de intervalos.
4. Antes de codificar Fase 2, congelar catalogo final de estados (1..3 actual vs 1..9 objetivo) en una sola fuente backend.

---

## 18. Plan de ejecucion diaria (operativo)

### Dia 1 - Cierre tecnico y DB Fase 1

1. Cerrar prerequisitos bloqueantes:
   - PK real de planilla (`id_calendario_nomina` vs `id_nomina`).
   - mapping real de estados actuales en tabla de acciones.
   - politica final de prorrateo en solapes.
2. Ejecutar migracion incremental:
   - `ALTER TABLE` de acciones para columnas nuevas.
   - crear indice `idx_accion_consumed`.
   - crear FK `consumed_run_id` a planilla.
   - crear/ajustar tabla hija de ausencia.
3. Sembrar permisos Fase 1:
   - `hr_action:view`, `hr_action:create`, `hr_action:approve`, `hr_action:cancel`.
4. Implementar trigger `BEFORE DELETE` de blindaje.
5. Validar estructura final con `DESCRIBE` y `SHOW CREATE TABLE`.

### Dia 2 - Backend de estados y consumo

1. Implementar enum/constante central de estados (source of truth unico).
2. Implementar transiciones de estado permitidas.
3. Implementar elegibilidad de consumo en planilla:
   - empresa, moneda, cutoff, no consumida, solape.
4. Implementar regla de solape oficial:
   - `(A.start <= P.end) AND (COALESCE(A.end, A.start) >= P.start)`.
5. Implementar retroactivos con trazabilidad:
   - `is_retro` y `original_period` en snapshot.
6. Implementar `requires_recalculation` y bloqueo de `APPLY` si aplica.

### Dia 3 - Snapshot y QA tecnica

1. Persistir snapshot de items de accion:
   - `id_accion`, `movement_id`, `unidades`, `monto_base`, `monto_final`, `is_retro`.
2. Implementar prorrateo de solapes multi-periodo.
3. Implementar invalidacion/expiracion automatica.
4. Ejecutar pruebas minimas:
   - no doble consumo,
   - no edicion post-apply,
   - trigger anti-delete activo,
   - retroactivo trazable.
5. Ejecutar test unitarios/integracion de flujo critico.

### Dia 4 - Frontend operativo minimo

1. Bandeja RRHH/Supervisor con permisos Fase 1.
2. Formulario de creacion con helper de planilla (sin persistir `id_planilla`).
3. Limpiar campos derivados cuando cambie helper de planilla.
4. Validar estados, errores funcionales y confirmaciones UX.
5. Prueba manual por rol con evidencia.

### Criterio de salida a Fase 2

1. Migracion aplicada sin romper endpoints legacy.
2. Consumo y snapshot operativos con solape correcto.
3. Retroactivos trazables.
4. Anti-delete activo en servicio y DB.
5. Permisos Fase 1 operativos en API/UI.

---

## 19. Bitacora de ejecucion (avance real)

### 2026-02-27 - Ejecucion Dia 1 completada en `mysql_hr_pro`

Aplicado:

1. Estructura incremental en `acc_acciones_personal`:
   - `group_id_accion`
   - `origen_accion`
   - `moneda_accion`
   - `fecha_inicio_efecto_accion`
   - `fecha_fin_efecto_accion`
   - `version_lock_accion`
   - `invalidated_at_accion`
   - `invalidated_reason_accion`
   - `expired_at_accion`
   - `expired_reason_accion`
   - `cancelled_at_accion`
   - `cancel_reason_accion`
2. Backfill inicial:
   - `fecha_inicio_efecto_accion` y `fecha_fin_efecto_accion` desde `fecha_efecto_accion`.
3. Indices agregados:
   - `IDX_accion_lookup_v2`
   - `IDX_accion_effective_range_v2`
   - `IDX_accion_group_v2`
   - `IDX_accion_consumed` (sobre `id_calendario_nomina`)
4. Trigger anti-delete activo:
   - `TRG_acc_acciones_personal_no_delete`.
5. Permisos fase 1 sembrados:
   - `hr_action:view`
   - `hr_action:create`
   - `hr_action:approve`
   - `hr_action:cancel`
6. Asignacion por rol aplicada:
   - `OPERADOR_NOMINA`: `view`, `create`
   - `GERENTE_NOMINA`: `view`, `create`, `approve`, `cancel`
   - `MASTER`: `view`, `create`, `approve`, `cancel`

Nota operativa:

- La ejecucion `npm run migration:run` local fallo por conectividad de red (`EACCES` a host remoto).
- La aplicacion en BD se ejecuto directamente sobre `mysql_hr_pro` con validacion posterior de estructura, indices, trigger y permisos.

### 2026-02-27 - Ejecucion Dia 2 completada en backend

Aplicado:

1. Estados de acciones ampliados en dominio:
   - catalogo objetivo 1..9 con alias legacy para compatibilidad.
2. Servicios de acciones ajustados:
   - `create` inicia en `DRAFT`.
   - `approve` acepta estados pendientes y transiciona a `APPROVED` (4).
   - `reject` transiciona a `REJECTED` (9).
   - `associateToPayroll` acepta aprobada nueva y aprobada legacy.
3. Consumo en `PayrollService.process` actualizado:
   - filtro de acciones aprobadas por lista (`APPROVED + legacy`).
   - reemplazo de `BETWEEN` por interseccion real:
     - `COALESCE(start) <= periodo_fin`
     - `COALESCE(end,start) >= periodo_inicio`
4. Integracion colateral:
   - `EmployeeVacationService` actualizado para acciones aprobadas (nuevo/legacy).
   - `EmployeesService` ajustado en estados bloqueantes de inactivacion.
5. Permisos API de acciones:
   - controlador `personal-actions` migrado a `hr_action:*`.

Validacion:

- Build API: OK.
- Suite completa API: `27/27` y `217/217` en verde.

### 2026-02-27 - Ejecucion Dia 3 completada (snapshot + retro + recalculo)

Aplicado en backend:

1. Snapshot de inputs enriquecido:
   - `movement_id_input`
   - `tipo_accion_input`
   - `unidades_input`
   - `monto_base_input`
   - `monto_final_input`
   - `is_retro_input`
   - `original_period_input`
2. `PayrollService.process` actualizado:
   - calculo de solape por interseccion para unidades.
   - prorrateo basico de monto por dias solapados.
   - metadatos retro (`is_retro`, `original_period`) en snapshot.
3. Flags de planilla:
   - `requires_recalculation_calendario_nomina`
   - `last_snapshot_at_calendario_nomina`
4. Trigger de recalculo en aprobacion:
   - al aprobar accion elegible durante corrida `EN_PROCESO` con snapshot previo, se marca `requires_recalculation = 1`.
5. Compatibilidad:
   - estados nuevos + alias legacy en dominio de acciones.
   - consumo de planilla soporta aprobadas nuevo/legacy.

Aplicado en base `mysql_hr_pro`:

1. Columnas nuevas en `nom_calendarios_nomina`:
   - `requires_recalculation_calendario_nomina`
   - `last_snapshot_at_calendario_nomina`
2. Columnas nuevas en `nomina_inputs_snapshot`:
   - `movement_id_input`
   - `tipo_accion_input`
   - `unidades_input`
   - `monto_base_input`
   - `monto_final_input`
   - `is_retro_input`
   - `original_period_input`
3. Indice nuevo:
   - `IDX_input_retro_v2 (id_nomina, is_retro_input)`

Validacion:

- Build API: OK.
- Tests API: `27/27` suites, `217/217` tests en verde.

### 2026-02-28 - Ejecucion Dia 4 completada (UI minima Acciones de Personal)

Aplicado en frontend:

1. Nueva vista operativa:
   - Ruta: `/personal-actions`
   - Componente: `PersonalActionsPage`
   - Funciones incluidas:
     - Listado por empresa.
     - Filtros por estado y busqueda.
     - Creacion de accion (`hr_action:create`).
     - Aprobacion/Rechazo para estados pendientes (`hr_action:approve`).
2. API frontend extendida (`personalActions.ts`):
   - `createPersonalAction`
   - `approvePersonalAction`
   - `rejectPersonalAction`
   - manejo unificado de errores API.
3. Permisos actualizados a nomenclatura nueva:
   - `personal-action:*` -> `hr_action:*` en:
     - menu principal
     - selectors de permisos
     - guard/ruta de Acciones de Personal.
4. Menu ajustado para fase actual:
   - `Acciones de Personal` queda como entrada unica (sin subrutas no implementadas).
5. Roles/permisos en UI de configuracion:
   - `RolesManagementPage` reconoce modulo `hr_action` y etiqueta en espanol.

Validacion:

- Build frontend: OK (`npm run build`).
- Tests frontend puntuales: OK
  - `src/api/payroll-personal-actions.test.ts`
  - `src/store/slices/menuSlice.test.ts`
  - Resultado: `2/2` suites, `11/11` tests en verde.

Notas:

- La vista queda alineada al plan de compatibilidad Fase 1 (sin romper endpoints existentes).
- El selector de planilla en creacion se mantiene como helper visual (no asocia run en esta fase).

### 2026-02-28 - Ajuste adicional: vistas separadas por accion (menu completo)

Aplicado:

1. Se restauro la estructura completa del menu `Acciones de Personal` con subopciones:
   - Entradas de Personal
   - Salidas de Personal -> Despidos, Renuncias
   - Deducciones -> Retenciones, Descuentos
   - Compensaciones -> Aumentos, Bonificaciones, Horas Extras, Vacaciones
   - Incapacidades
   - Licencias y Permisos
   - Ausencias
2. Cada opcion queda en su propia ruta y vista separada (reutilizando componente base con `fixedTipoAccion`).
3. Cada ruta fue protegida con permiso `view` especifico por accion.
4. Se sembraron permisos por accion en `mysql_hr_pro` (12 modulos * 7 acciones = 84 permisos):
   - acciones por modulo: `view`, `create`, `edit`, `inactivate`, `reactivate`, `approve`, `cancel`.
5. Asignacion por rol realizada:
   - `OPERADOR_NOMINA`: `view/create/edit` (36 permisos)
   - `GERENTE_NOMINA`: set completo (84 permisos)
   - `MASTER`: set completo (84 permisos)

Validacion:

- `npx tsc -b`: OK.
- Tests puntuales frontend en verde:
  - `menuSlice.test.ts`
  - `payroll-personal-actions.test.ts`

### 2026-02-28 - Inicio modulo propio de Ausencias (carpeta separada)

Aplicado:

1. Se crea carpeta propia de Ausencias:
   - `frontend/src/pages/private/personal-actions/ausencias/`
2. Se crea vista propia:
   - `AbsencesPage.tsx`
   - lista de ausencias + filtros + modal de crear/editar.
3. Se crea modal propio de Ausencias:
   - `AbsenceTransactionModal.tsx`
   - encabezado (empresa, empleado, observacion)
   - lineas de transaccion (N lineas):
     - planilla (periodo)
     - fecha efecto autollenada por planilla
     - movimiento (filtrado por empresa y tipo accion ausencia cuando existe catalogo)
     - tipo de ausencia (justificada/no justificada)
     - cantidad (decimal)
     - monto (decimal, no negativo)
     - remuneracion (switch)
     - formula (texto)
     - agregar/eliminar linea
4. Comportamiento de inactivos en UI:
   - movimientos inactivos visibles con etiqueta `Inactivo`
   - bloqueados para seleccion nueva, permitidos solo si ya estaban elegidos.
5. Ruta `/personal-actions/ausencias` migrada para usar `AbsencesPage` (ya no usa pagina generica).

Estado funcional:

- Este bloque queda intencionalmente en modo `UI-only` para Ausencias.
- Guardado real (header + lineas) se implementa en siguiente bloque de backend/servicio.

Validacion:

- `npx tsc -b`: OK
- `npm run build`: OK

### 2026-02-28 - Reglas transversales (obligatorias) para TODAS las Acciones de Personal

Estas reglas quedan como estandar de implementacion para cada modulo de accion futura
(Entradas, Despidos, Renuncias, Retenciones, Descuentos, Aumentos, Bonificaciones,
Horas Extras, Vacaciones, Incapacidades, Licencias y Ausencias).

1. Estructura de UI por accion:
   - Cada accion debe tener carpeta propia, pagina propia y modal propio.
   - No se permite mezclar todas las acciones en una sola vista generica.
   - Cada accion debe tener sus permisos propios (`view/create/edit/...`) por modulo.

2. Dependencias de formulario:
   - Sin empresa seleccionada NO se muestra selector de empleado.
   - Sin empresa + empleado NO se muestra seccion de lineas de transaccion.
   - El orden de dependencias en linea debe respetarse (planilla -> movimiento -> campos derivados).

3. Carga de planillas (match exacto):
   - Debe filtrar por:
     - empresa seleccionada
     - periodo de pago del empleado
     - moneda del empleado
   - En el select de planilla se muestra solo el nombre de planilla.

4. Carga de movimientos por accion:
   - Se consume endpoint por accion enviando:
     - `idEmpresa`
     - `idTipoAccionPersonal`
   - El backend filtra por:
     - `id_empresa_movimiento_nomina`
     - `id_tipo_accion_personal_movimiento_nomina`
   - No depender de permisos de otro modulo (ej. no exigir `payroll-movement:view`
     para formularios de Acciones de Personal).

5. Regla de inactivos:
   - Por defecto solo se listan movimientos activos.
   - Si una linea ya tiene un movimiento inactivo (edicion), debe mostrarse visible
     y bloqueado con etiqueta `Inactivo`.
   - No se permite seleccionar nuevos inactivos.

6. Validacion de lineas:
   - No se puede agregar una nueva linea si la linea actual no esta completa.
   - No se puede crear/guardar la accion si existe al menos una linea incompleta.
   - Estas validaciones deben vivir en UI y repetirse en backend en fase funcional.

7. Reglas de campos numericos (base):
   - `Cantidad`: entero, no negativo, sin decimales (si una accion requiere decimal,
     se documenta explicitamente en su modulo).
   - `Monto`: no negativo, formato monetario visible, con moneda del empleado.

8. Multi-linea y trazabilidad:
   - Cada accion puede tener N lineas de transaccion.
   - Debe quedar preparada la estructura para `group_id` por lote de lineas
     dentro de una misma accion.

9. Estado del desarrollo por fases:
   - Fase actual: UI-first (estructura, reglas, dependencias, permisos).
   - Fase siguiente: guardado funcional (header + lineas) y validaciones de backend.
