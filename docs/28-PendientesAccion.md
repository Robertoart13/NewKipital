# 28 - Pendientes de Accion (Backlog Tecnico-Funcional)

**Ultima actualizacion:** 2026-03-01  
**Objetivo:** Registrar tareas pendientes que deben implementarse en futuras iteraciones.

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## PEND-001 - Bloqueo de inactivacion de empresa con planillas en estados no permitidos

### Estado

- Completado (2026-02-27)

### Prioridad

- Alta

### Contexto del problema

Actualmente se puede intentar inactivar una empresa sin validar si existen planillas activas o pendientes de accion. Esto puede dejar procesos de nomina inconsistentes y afectar control operativo.

### Regla de negocio solicitada

Al intentar inactivar una empresa:

1. Si existe al menos una planilla de esa empresa en estado activo o pendiente de accion, la empresa **no** se puede inactivar.
2. Si la planilla no ha pasado del primer estado del flujo, la empresa **no** se puede inactivar.
3. Solo se permite inactivar cuando todas las planillas vinculadas estan en estados finales permitidos para cierre.

### Definicion funcional inicial de estados

Pendiente de confirmacion por negocio:

1. Catalogo exacto de estados "bloqueantes".
2. Catalogo exacto de estados "finales permitidos".
3. Definicion formal de "primer estado" en el workflow de planillas.

### Alcance tecnico esperado

Backend (obligatorio):

1. Validar regla antes de ejecutar la inactivacion de empresa.
2. Retornar `409 Conflict` con mensaje funcional cuando exista bloqueo.
3. Registrar evento de auditoria cuando la operacion sea rechazada por regla de negocio.

Frontend:

1. Mostrar mensaje claro al usuario con la razon del bloqueo.
2. Evitar mensaje generico de error tecnico.

Base de datos:

1. Verificar indices en columnas usadas para validar planillas por empresa y estado.
2. Confirmar que la consulta de validacion no genere degradacion de rendimiento.

### Criterios de aceptacion

1. Dado una empresa con planillas bloqueantes, cuando se intenta inactivar, entonces el API responde `409` y no cambia estado de empresa. **Cumplido**
2. Dado una empresa sin planillas bloqueantes, cuando se intenta inactivar, entonces el API responde exito y la empresa queda inactiva. **Cumplido**
3. El frontend muestra el motivo funcional del bloqueo. **Cumplido**
4. Queda registro de auditoria del intento rechazado. **Cumplido**

### QA minimo requerido

API:

1. Happy path: empresa sin planillas bloqueantes.
2. Bloqueo por planilla activa.
3. Bloqueo por planilla pendiente de accion.
4. Bloqueo por planilla en primer estado.
5. Concurrencia: dos intentos de inactivacion simultaneos.

UI:

1. Mensaje correcto cuando recibe `409`.
2. Estado visual consistente tras rechazo (sin desincronizacion de lista).

### Riesgo si no se implementa

1. Inactivacion de empresas con procesos de nomina inconclusos.
2. Riesgo de datos inconsistentes y cierre operativo incorrecto.
3. Mayor carga de soporte por correcciones manuales.

### Cierre tecnico

- Implementado en backend con respuesta `409 Conflict` para inactivacion bloqueada.
- Cubierto con test unitario en `CompaniesService`.
- Integrado en frontend para mostrar mensaje funcional (sin error generico tecnico).

---

## PEND-002 - Bloqueo de inactivacin de empleado con acciones de personal realizadas

### Estado

- Pendiente

### Prioridad

- Alta

### Contexto del problema

Actualmente se puede inactivar un empleado sin validar si tiene acciones de personal (acciones de personal) ya realizadas o en curso. Inactivar en ese caso puede dejar historial inconsistente o procesos pendientes hurfanos.

### Regla de negocio solicitada

Al intentar inactivar un empleado:

1. Si el empleado tiene **acciones de personal** hechas (registros asociados que no permitan cierre o reversin limpia), **no** se debe permitir inactivar.
2. Definir con negocio qu acciones de personal son bloqueantes (ej. solicitudes de vacaciones aprobadas no gozadas, permisos pendientes, etc.).
3. Solo permitir inactivar cuando no existan acciones de personal bloqueantes o cuando estn en estado que permita inactivacin segn catlogo acordado.

### Alcance tcnico esperado

- Backend: validar existencia de acciones de personal bloqueantes antes de ejecutar inactivacin; retornar `409 Conflict` con mensaje claro si aplica.
- Frontend: mostrar mensaje funcional al usuario cuando el intento de inactivar sea rechazado.
- Documentar en este pendiente la definicin final de acciones de personal bloqueantes una vez acordada con negocio.

### Criterios de aceptacin (preliminar)

1. Dado un empleado con acciones de personal bloqueantes, al intentar inactivar, el API responde `409` y el empleado no cambia de estado.
2. Dado un empleado sin acciones de personal bloqueantes, la inactivacin se ejecuta con xito.
3. El frontend muestra el motivo del bloqueo cuando corresponda.

---

## Completado / Actualizado (sesion 2026-03-04)

1. **Bloqueo por empleado verificado en planilla**
   - Si el empleado esta verificado en una planilla, no se permite crear/editar acciones que apunten a esa planilla.
   - Para permitir cambios, primero se debe desmarcar la verificacion.

2. **Calculo legal en planilla**
   - Se calcula CCSS por empresa desde `nom_cargas_sociales`.
   - Se calcula impuesto de renta con tramos CR y creditos por hijo/conyuge (quincenal solo segunda quincena).

---

## Completado / Actualizado (sesin 2026-02-24)

### Mdulo Empleados  Edicin y UX

1. **EmployeeEditModal**
   - Modal de edicin alineado al de creacin: mismas pestaas y campos (Informacin Personal, Contacto, Laboral, Financiera, Autogestin, Histrico Laboral).
   - Carga de datos del empleado con `useEmployee`; formulario se rellena con `mapEmployeeToFormValues` e `initialValues` al abrir.
   - Actualizacin va `useUpdateEmployee`; payload solo incluye campos aceptados por el backend (`UpdateEmployeePayload`).
   - Campo **Fecha de ingreso** y **Cdigo de empleado** en solo lectura en edicin (backend no permite actualizarlos).
   - **Empresa** en edicin mostrada pero no editable (por diseo actual).

2. **Activar / Inactivar en el modal de edicin**
   - Switch Activo/Inactivo habilitado segn permisos `canInactivateEmployee` y `canReactivateEmployee`.
   - Al guardar solo cambio de estado: se llama `PATCH /employees/:id/inactivate` o `PATCH /employees/:id/reactivate` segn corresponda.

3. **Correccin de avisos en consola (Ant Design / rc)**
   - **Collapse (EmployeesListPage):** uso de `items` en lugar de `children` / `Collapse.Panel` para evitar deprecacin de rc-collapse.
   - **Modal (EmployeeEditModal):** `destroyOnClose` reemplazado por `destroyOnHidden`.
   - **Spin (EmployeeEditModal):** `tip` reemplazado por `description`.
   - **Form (EmployeeEditModal):** eliminado `initialValue` en `Form.Item` para campos ya definidos en `initialValues` del Form (`cantidadHijos`, `salarioBase`, `monedaSalario`, `vacacionesAcumuladas`, `cesantiaAcumulada`) para evitar el aviso de Field can not overwrite.

4. **Documentacin**
   - Este documento (28-PendientesAccion.md) actualizado con PEND-002 (regla de inactivacin de empleado con acciones de personal) y con la seccin Completado / Actualizado de esta sesin.

---

## Notas de gestion

1. Este documento es de backlog vivo; cada pendiente nuevo debe agregarse con ID incremental `PEND-XXX`.
2. Cuando una tarea pase a implementacion, referenciar PR, commit y fecha de cierre.

---

## PEND-003 - Implementacion Fase 1 Acciones de Personal + Planilla (compatibilidad incremental)

### Estado

- En progreso (Dia 1 ejecutado en `mysql_hr_pro`)

### Prioridad

- Alta

### Referencia funcional/tecnica

- Documento rector: `docs/42-AccionesPersonal-Planilla-Fase0Cerrada.md`.
- Blueprint base: `docs/40-BlueprintPlanillaV2Compatible.md`.

### Alcance (Fase 1)

1. Alter incremental de tabla de acciones existente (sin reemplazo).
2. Agregar `consumed_run_id`, `version_lock`, metadatos de invalidacion/expiracion/cancelacion.
3. Crear indice `idx_accion_consumed`.
4. Crear/ajustar tabla hija de ausencias (si no existe equivalente).
5. Seed permisos `hr_action:*` de fase 1.
6. Implementar blindaje anti-delete (servicio + trigger).

### Condiciones de entrada (obligatorias)

1. Confirmar PK real de `nom_calendarios_nomina` para FK `consumed_run_id`.
2. Confirmar mapping exacto de estados actuales de acciones.
3. Confirmar politica de prorrateo para solapes multi-periodo.

### Criterios de aceptacion

1. Migracion ejecuta sin `DROP` ni `RENAME`.
2. Endpoints legacy siguen operativos despues del `ALTER`.
3. FK de consumo y nuevos indices quedan creados.
4. No se puede eliminar fisicamente una accion en estado no permitido.
5. Permisos de fase 1 quedan sembrados y asignables por rol.

### Avance registrado (2026-02-27)

---

## PEND-004 - Traslado de empleados entre empresas con portabilidad de saldo de vacaciones

### Estado

- En progreso (backend base completo; saldo vacaciones pendiente)

### Prioridad

- Alta

### Contexto del problema

La operacion mueve empleados entre subsidiarias por decision del negocio y requieren mantener los dias disponibles de vacaciones al trasladar el empleado. El modelo actual liga vacaciones a empresa, por lo que el saldo no se porta automaticamente.

### Regla de negocio solicitada

Al trasladar un empleado de empresa origen a empresa destino:

1. El empleado cambia de empresa en su registro base.
2. El saldo de vacaciones disponible debe trasladarse a la nueva empresa (no se pierde).
3. La transferencia debe quedar auditada en el ledger con referencia trazable.
4. La provision futura de vacaciones debe quedar asociada a la empresa destino.
5. El saldo historico en empresa origen queda registrado y no se modifica luego del traslado.

### Politica acordada (2026-03-04)

1. **Bloqueo obligatorio** si no existen periodos/planillas en empresa destino.
2. Traslado **solo al inicio de periodo** (no se permite mitad de periodo).
3. **Acciones pendientes bloqueantes**: se definen por politica (ej. licencias/incapacidades/aumentos pendientes).
4. Acciones recurrentes de ley (CCSS/IVM) **no bloquean**.
5. **Politica de continuidad:** por defecto continuidad. Liquidacion solo aplica en escenarios de renuncia/despido.
5. Politica por estado (acordada):
   - **Se trasladan:** DRAFT, PENDING_SUPERVISOR, PENDING_RRHH, APPROVED.
   - **No se trasladan:** CONSUMED, INVALIDATED, CANCELLED, EXPIRED, REJECTED.
6. Si un rango cruza traslado: **recalcular por calendario destino** (solo futuros).
7. **Simulacion previa obligatoria** antes de ejecutar el traslado.
8. Auditoria: registrar traslado con origen/destino, fecha efectiva, usuario y resumen tecnico (acciones movidas/invalidas/recalculadas).

### Alcance tecnico esperado

Backend:

1. Nuevo flujo transaccional de traslado masivo de empleados entre empresas.
2. Lectura de saldo actual desde `sys_empleado_vacaciones_ledger` (ultimo `saldo_resultante_vacaciones`). **Pendiente**
3. En empresa origen: registrar ajuste negativo (tipo `ADJUSTMENT` o `REVERSAL`). **Pendiente**
4. En empresa destino: registrar ajuste positivo (tipo `ADJUSTMENT` o `INITIAL`). **Pendiente**
5. Ambos movimientos enlazados por `source_type_vacaciones = 'TRANSFER'` y `source_id_vacaciones` comun. **Pendiente**
6. Garantizar trazabilidad: saldo anterior y saldo posterior registrados en ledger. **Pendiente**

Frontend:

1. Vista dedicada para traslado masivo (empresa origen, empresa destino, seleccion de empleados).
2. Selector de **tipo de periodo de pago** (filtra empleados elegibles por periodo).
3. Opcion "Aplicar para todos los empleados": si esta activa, un solo destino; si no, select por empleado.
4. Validacion por empleado al seleccionar destino (check verde/rojo + motivos).
5. Simulacion previa obligatoria con resumen por empleado.
6. Opcion explicita de "trasladar saldo de vacaciones".
7. Mensajeria clara y resumen por empleado.

Auditoria:

1. Registrar evento de traslado en outbox.
2. Guardar metadatos de transferencia para trazabilidad.
3. Considerar tabla dedicada `sys_empleado_transferencias` (origen/destino/saldo/actor/fecha) para consulta operativa.

### Criterios de aceptacion

1. El empleado queda asignado a la empresa destino.
2. El saldo disponible de vacaciones se conserva (mismo total, nueva cuenta).
3. La transferencia queda registrada en ledger con referencia comun.

### Implementacion base completada (2026-03-04)

1. **API de simulacion y ejecucion** (permiso `payroll:intercompany-transfer`):
   - `POST /api/payroll/intercompany-transfer/simulate`
   - `POST /api/payroll/intercompany-transfer/execute`
2. **Entidad y tabla de auditoria** `sys_empleado_transferencias` creada y migrada.
3. **Reglas aplicadas**:
   - Bloqueo si no existe periodo destino o si fecha efectiva no es inicio de periodo.
   - Bloqueo si planilla origen en estados ABIERTA/EN_PROCESO/VERIFICADA para la fecha efectiva.
   - Solo se trasladan acciones en estados DRAFT/PENDING_SUPERVISOR/PENDING_RRHH/APPROVED.
   - Acciones CONSUMED/INVALIDATED/CANCELLED/EXPIRED/REJECTED no se trasladan.
   - Acciones por rango que cruzan fecha se **recalcula** en destino; si ya estaban asociadas a planilla, se bloquea.
4. **Ajuste de datos**:
   - `acc_acciones_personal` actualiza `id_empresa` y `id_calendario_nomina`.
   - Tablas de lineas actualizan `id_empresa` y `id_calendario_nomina` por fecha.
5. **Tests**: suite completa en verde (31/31), incluyendo intercompany transfer.

- Estructura incremental aplicada en `acc_acciones_personal`.
- Indices v2 aplicados.
- Trigger anti-delete activo.
- Permisos `hr_action:*` fase 1 sembrados y asignados por rol.
- Pendiente del PEND-003:
  - consolidacion final de estados en todos los flujos (incluyendo supervisor/rrhh cuando se habilite),
  - integracion snapshot/retro/recalculo (Fase 2/3).

Actualizacion Dia 2 (backend):

- Solape por interseccion implementado en consumo de planilla.
- Dominio de acciones ampliado a catalogo objetivo con compatibilidad legacy.
- Controlador de acciones migrado a permisos `hr_action:*`.
- Pruebas API en verde (`27/27`, `217/217`).

Actualizacion Dia 3 (snapshot/retro/recalculo):

- Snapshot enriquecido de inputs de planilla (campos de movimiento, unidades, montos base/final, retro).
- Flags de recalculo agregados en planilla (`requires_recalculation`, `last_snapshot_at`).
- Marca automatica de recalculo al aprobar acciones elegibles durante corrida en proceso.
- Migracion incremental aplicada en `mysql_hr_pro` y validada.
- Pruebas API se mantienen en verde (`27/27`, `217/217`).

---

## Completado / Actualizado (sesion 2026-03-01)

### Acciones de Personal - avance consolidado por modulo

1. Se cerraron modulos operativos con patron comun:
   - Ausencias
   - Licencias y Permisos
   - Incapacidades
   - Bonificaciones
   - Horas Extra
   - Retenciones
   - Descuentos
2. Se oficializo y aplico modelo de split por periodo al guardar:
   - lineas de periodos distintos crean acciones separadas,
   - lineas del mismo periodo permanecen en una sola accion.
3. Se documentaron cierres en docs de implementacion operativa:
   - `46` Bonificaciones
   - `47` Horas Extra
   - `49` Descuentos
4. Se estabilizo corrida de migraciones con `migration:run:safe` y baseline reconcile.
5. Pendiente vigente principal:
   - extender patron a acciones restantes no migradas en menu de Acciones de Personal.

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

## Pendiente operativo agregado - 2026-03-09 01:54:09 -06:00

Tema: Traslado interempresas - validacion funcional final de refresco UI.

Pendiente:
1. Ejecutar QA manual del flujo Simular -> Ejecutar traslado -> Refrescar.
2. Confirmar que el empleado ejecutado no permanece en grilla de origen por estado stale.
3. Confirmar consistencia en resimulacion posterior.

Referencia:
- docs/50-Handoff-TrasladoInterempresas-20260309.md
- docs/Test/TEST-EXECUTION-REPORT.md (Fase 50)
