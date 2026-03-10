# Analisis Inicial de Duplicados

Fecha de corte: 2026-03-10 09:44:07
Total duplicados detectados (>=3 repeticiones): 11

Criterio:
- Se listan frases repetidas para consolidar en una sola fuente de verdad.
- Se priorizan reglas transversales y contratos funcionales repetidos.

## Duplicados priorizados
### 1) Repeticiones: 19
- Frase: - Consistencia de tipo: todas las fechas deben pertenecer al mismo tipo de planilla. Si no, error.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 2) Repeticiones: 19
- Frase: - Validaciones: fines de semana y feriados bloqueados; fechas ya reservadas bloqueadas; saldo disponible; fechas deben pertenecer a un periodo elegible; si una fecha coincide con m?ltiples periodos, se rechaza.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 3) Repeticiones: 19
- Frase: - Planilla: al cargar una planilla se consumen las fechas cuyo `id_calendario_nomina` coincide con la planilla y estado aprobado. No se requiere que el header tenga planilla.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 4) Repeticiones: 19
- Frase: - TimeWise: acciones de vacaciones se crean en estado Borrador sin planilla. RRHH completa fechas/movimiento en KPITAL; el sistema asigna planilla por fecha.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 5) Repeticiones: 19
- Frase: - Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 6) Repeticiones: 19
- Frase: - UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 7) Repeticiones: 19
- Frase: - KPITAL (RRHH): el usuario ya no selecciona planilla en Vacaciones. Selecciona fechas y movimiento; el sistema determina la planilla elegible por cada fecha con base en calendario de n?mina (empresa/empleado/moneda/periodo).
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 8) Repeticiones: 19
- Frase: ## Actualizaci?n 2026-03-02 ? Vacaciones sin selecci?n de planilla (ACTUALIZACION-VACACIONES-2026-03-02
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/Test/GUIA-TESTING.md
  - docs/PENDING/07-BACKEND-FEATURES.md
  - docs/GUIA_DE_USUARIO.md
  - docs/34-CasosUsoCriticosPlanillaRRHH.md
  - docs/33-ChecklistModuloEmpleados.md

### 9) Repeticiones: 3
- Frase: Estado: Implementado en backend + frontend
- Fuentes ejemplo:
  - docs/43-AccionesPersonal-Ausencias-Implementacion-Operativa.md
  - docs/46-AccionesPersonal-Bonificaciones-Implementacion-Operativa.md
  - docs/49-AccionesPersonal-Descuentos-Implementacion-Operativa.md

### 10) Repeticiones: 3
- Frase: - `docs/40-BlueprintPlanillaV2Compatible.md`
- Fuentes ejemplo:
  - docs/21-TablaMaestraPlanillasYWorkflows.md
  - docs/20-MVPContratosEndpoints.md
  - docs/41-AuditoriaEnterprise-Consolidado.md

### 11) Repeticiones: 3
- Frase: - docs/50-Handoff-TrasladoInterempresas-20260309.md
- Fuentes ejemplo:
  - docs/Test/TEST-EXECUTION-REPORT.md
  - docs/09-EstadoActualProyecto.md
  - docs/28-PendientesAccion.md

## Accion recomendada
- Consolidar estas reglas en REGLAS-MAESTRAS-CANONICAS.md y referenciarlas desde los demas docs.
- Eliminar copias textuales de handoffs y reportes historicos moviendolas a 99-historico.
