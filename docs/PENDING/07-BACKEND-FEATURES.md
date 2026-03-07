#  BACKEND FEATURES - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 2-3 semanas
**Features documentadas no implementadas**

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## ISSUE-044: Movimiento masivo de empleados

**Prioridad:** P1 | **Esfuerzo:** M (3-5 das)
**Documentado en:** Doc 09

### Descripcin
Workflow `employee-moved.workflow.ts` existe como stub. Necesita implementacin completa.

### Criterios de Aceptacin
- [ ] Endpoint POST /api/employees/bulk-move
- [ ] Input: lista employeeIds + nuevoDepartamentoId
- [ ] Workflow transaccional (ACID)
- [ ] Registra histrico de movimientos
- [ ] Evento EmployeeMoved emitido
- [ ] Tests: rollback si falla 1 empleado

---

## ISSUE-045: Distribucin de costos de nmina

**Prioridad:** P1 | **Esfuerzo:** L (1-2 semanas)
**Documentado en:** Doc 21

### Descripcin
Planillas sin modelo de distribucin de costos por departamento/centro de costo.

### Criterios de Aceptacin
- [ ] Tabla: `nom_distribucion_costos`
- [ ] Endpoint GET /api/payroll/:id/cost-distribution
- [ ] Clculo automtico al aplicar planilla
- [ ] Exportar a CSV para contabilidad

---

## ISSUE-046: Integracin NetSuite (Fase 3)

**Prioridad:** P2 | **Esfuerzo:** XL (3-4 semanas)
**Documentado en:** Doc 19

### Descripcin
IntegrationModule es placeholder. Sincronizacin con NetSuite documentada pero no implementada.

### Criterios de Aceptacin
- [ ] Cliente OAuth 2.0 para NetSuite API
- [ ] Sync empleados  NetSuite employees
- [ ] Sync planillas aplicadas  NetSuite journal entries
- [ ] Webhook de NetSuite para cambios
- [ ] Retry logic con exponential backoff

---

## ISSUE-047: Provisiones automticas (aguinaldo, vacaciones)

**Prioridad:** P1 | **Esfuerzo:** L (1 semana)

### Criterios de Aceptacin
- [ ] Clculo mensual automtico de provisin aguinaldo
- [ ] Clculo acumulado de vacaciones
- [ ] Endpoint GET /api/employees/:id/provisiones
- [ ] Reportes de provisiones por empresa

---

## ISSUE-048: Workflow de aprobaciones multinivel

**Prioridad:** P1 | **Esfuerzo:** L (1 semana)

### Descripcin
Acciones de personal con aprobacin simple. Necesita multinivel (empleado  jefe  RRHH).

### Criterios de Aceptacin
- [ ] Tabla: `sys_workflow_aprobaciones`
- [ ] Estados: PENDIENTE  EN_REVISION  APROBADA  RECHAZADA
- [ ] Notificaciones a cada aprobador
- [ ] Escalation automtico si no responde en 48h

---

##  Progreso Backend Features

- [ ] ISSUE-044: Movimiento masivo empleados
- [ ] ISSUE-045: Distribucin de costos
- [ ] ISSUE-046: Integracin NetSuite
- [ ] ISSUE-047: Provisiones automticas
- [ ] ISSUE-048: Aprobaciones multinivel

**Total:** 0/5 completados (0%)

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
