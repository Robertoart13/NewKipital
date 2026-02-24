# ⚡ BACKEND FEATURES - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 2-3 semanas
**Features documentadas no implementadas**

---

## ISSUE-044: Movimiento masivo de empleados

**Prioridad:** P1 | **Esfuerzo:** M (3-5 días)
**Documentado en:** Doc 09

### Descripción
Workflow `employee-moved.workflow.ts` existe como stub. Necesita implementación completa.

### Criterios de Aceptación
- [ ] Endpoint POST /api/employees/bulk-move
- [ ] Input: lista employeeIds + nuevoDepartamentoId
- [ ] Workflow transaccional (ACID)
- [ ] Registra histórico de movimientos
- [ ] Evento EmployeeMoved emitido
- [ ] Tests: rollback si falla 1 empleado

---

## ISSUE-045: Distribución de costos de nómina

**Prioridad:** P1 | **Esfuerzo:** L (1-2 semanas)
**Documentado en:** Doc 21

### Descripción
Planillas sin modelo de distribución de costos por departamento/centro de costo.

### Criterios de Aceptación
- [ ] Tabla: `nom_distribucion_costos`
- [ ] Endpoint GET /api/payroll/:id/cost-distribution
- [ ] Cálculo automático al aplicar planilla
- [ ] Exportar a CSV para contabilidad

---

## ISSUE-046: Integración NetSuite (Fase 3)

**Prioridad:** P2 | **Esfuerzo:** XL (3-4 semanas)
**Documentado en:** Doc 19

### Descripción
IntegrationModule es placeholder. Sincronización con NetSuite documentada pero no implementada.

### Criterios de Aceptación
- [ ] Cliente OAuth 2.0 para NetSuite API
- [ ] Sync empleados → NetSuite employees
- [ ] Sync planillas aplicadas → NetSuite journal entries
- [ ] Webhook de NetSuite para cambios
- [ ] Retry logic con exponential backoff

---

## ISSUE-047: Provisiones automáticas (aguinaldo, vacaciones)

**Prioridad:** P1 | **Esfuerzo:** L (1 semana)

### Criterios de Aceptación
- [ ] Cálculo mensual automático de provisión aguinaldo
- [ ] Cálculo acumulado de vacaciones
- [ ] Endpoint GET /api/employees/:id/provisiones
- [ ] Reportes de provisiones por empresa

---

## ISSUE-048: Workflow de aprobaciones multinivel

**Prioridad:** P1 | **Esfuerzo:** L (1 semana)

### Descripción
Acciones de personal con aprobación simple. Necesita multinivel (empleado → jefe → RRHH).

### Criterios de Aceptación
- [ ] Tabla: `sys_workflow_aprobaciones`
- [ ] Estados: PENDIENTE → EN_REVISION → APROBADA → RECHAZADA
- [ ] Notificaciones a cada aprobador
- [ ] Escalation automático si no responde en 48h

---

## 📊 Progreso Backend Features

- [ ] ISSUE-044: Movimiento masivo empleados
- [ ] ISSUE-045: Distribución de costos
- [ ] ISSUE-046: Integración NetSuite
- [ ] ISSUE-047: Provisiones automáticas
- [ ] ISSUE-048: Aprobaciones multinivel

**Total:** 0/5 completados (0%)
