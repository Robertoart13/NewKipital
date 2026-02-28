# 28 - Pendientes de Accion (Backlog Tecnico-Funcional)

**Ultima actualizacion:** 2026-02-27  
**Objetivo:** Registrar tareas pendientes que deben implementarse en futuras iteraciones.

---

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

## PEND-002 - Bloqueo de inactivación de empleado con acciones de personal realizadas

### Estado

- Pendiente

### Prioridad

- Alta

### Contexto del problema

Actualmente se puede inactivar un empleado sin validar si tiene acciones de personal (acciones de personal) ya realizadas o en curso. Inactivar en ese caso puede dejar historial inconsistente o procesos pendientes huérfanos.

### Regla de negocio solicitada

Al intentar inactivar un empleado:

1. Si el empleado tiene **acciones de personal** hechas (registros asociados que no permitan cierre o reversión limpia), **no** se debe permitir inactivar.
2. Definir con negocio qué acciones de personal son “bloqueantes” (ej. solicitudes de vacaciones aprobadas no gozadas, permisos pendientes, etc.).
3. Solo permitir inactivar cuando no existan acciones de personal bloqueantes o cuando estén en estado que permita inactivación según catálogo acordado.

### Alcance técnico esperado

- Backend: validar existencia de acciones de personal bloqueantes antes de ejecutar inactivación; retornar `409 Conflict` con mensaje claro si aplica.
- Frontend: mostrar mensaje funcional al usuario cuando el intento de inactivar sea rechazado.
- Documentar en este pendiente la definición final de “acciones de personal bloqueantes” una vez acordada con negocio.

### Criterios de aceptación (preliminar)

1. Dado un empleado con acciones de personal bloqueantes, al intentar inactivar, el API responde `409` y el empleado no cambia de estado.
2. Dado un empleado sin acciones de personal bloqueantes, la inactivación se ejecuta con éxito.
3. El frontend muestra el motivo del bloqueo cuando corresponda.

---

## Completado / Actualizado (sesión 2026-02-24)

### Módulo Empleados – Edición y UX

1. **EmployeeEditModal**
   - Modal de edición alineado al de creación: mismas pestañas y campos (Información Personal, Contacto, Laboral, Financiera, Autogestión, Histórico Laboral).
   - Carga de datos del empleado con `useEmployee`; formulario se rellena con `mapEmployeeToFormValues` e `initialValues` al abrir.
   - Actualización vía `useUpdateEmployee`; payload solo incluye campos aceptados por el backend (`UpdateEmployeePayload`).
   - Campo **Fecha de ingreso** y **Código de empleado** en solo lectura en edición (backend no permite actualizarlos).
   - **Empresa** en edición mostrada pero no editable (por diseño actual).

2. **Activar / Inactivar en el modal de edición**
   - Switch Activo/Inactivo habilitado según permisos `canInactivateEmployee` y `canReactivateEmployee`.
   - Al guardar solo cambio de estado: se llama `PATCH /employees/:id/inactivate` o `PATCH /employees/:id/reactivate` según corresponda.

3. **Corrección de avisos en consola (Ant Design / rc)**
   - **Collapse (EmployeesListPage):** uso de `items` en lugar de `children` / `Collapse.Panel` para evitar deprecación de rc-collapse.
   - **Modal (EmployeeEditModal):** `destroyOnClose` reemplazado por `destroyOnHidden`.
   - **Spin (EmployeeEditModal):** `tip` reemplazado por `description`.
   - **Form (EmployeeEditModal):** eliminado `initialValue` en `Form.Item` para campos ya definidos en `initialValues` del Form (`cantidadHijos`, `salarioBase`, `monedaSalario`, `vacacionesAcumuladas`, `cesantiaAcumulada`) para evitar el aviso de “Field can not overwrite”.

4. **Documentación**
   - Este documento (28-PendientesAccion.md) actualizado con PEND-002 (regla de inactivación de empleado con acciones de personal) y con la sección “Completado / Actualizado” de esta sesión.

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
