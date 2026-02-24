# 28 - Pendientes de Accion (Backlog Tecnico-Funcional)

**Ultima actualizacion:** 2026-02-24  
**Objetivo:** Registrar tareas pendientes que deben implementarse en futuras iteraciones.

---

## PEND-001 - Bloqueo de inactivacion de empresa con planillas en estados no permitidos

### Estado

- Pendiente

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

1. Dado una empresa con planillas bloqueantes, cuando se intenta inactivar, entonces el API responde `409` y no cambia estado de empresa.
2. Dado una empresa sin planillas bloqueantes, cuando se intenta inactivar, entonces el API responde exito y la empresa queda inactiva.
3. El frontend muestra el motivo funcional del bloqueo.
4. Queda registro de auditoria del intento rechazado.

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

---

## Notas de gestion

1. Este documento es de backlog vivo; cada pendiente nuevo debe agregarse con ID incremental `PEND-XXX`.
2. Cuando una tarea pase a implementacion, referenciar PR, commit y fecha de cierre.
