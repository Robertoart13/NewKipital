# KPITAL 360 — Comité Técnico  
# Reporte Ejecutivo de Estado  
# DOC-34 · Módulo Planillas y RRHH

**Versión 2.0 | 24 de Febrero, 2026 | Actualización post-auditoría**

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## ESTADO GLOBAL DEL PROYECTO  
### 🔴 ROJO — ACCIÓN REQUERIDA

---

## 1. Resumen Ejecutivo

Al 24 de febrero de 2026, el módulo de **Empleados** está completamente funcional incluyendo los bloqueos de integridad: **UC-01** (inactivar empleado con planillas activas), **UC-02** (inactivar empleado con acciones pendientes) y **UC-18** (inactivar empresa con planillas activas) están implementados con respuestas **409** y detalle visible en frontend. El estado global sigue en **ROJO** porque los bloqueadores críticos restantes son de mayor envergadura: `emp_historial_salarios` no existe, las 5 decisiones de negocio están abiertas, el motor de cálculos legales CR no ha iniciado, y los controles de acceso multiempresa en planillas están pendientes.

| Métrica | Valor |
|--------|--------|
| **Casos de Uso Totales** | 31 en 7 categorías |
| **Casos CRÍTICOS** | 17 (3 implementados, 14 pendientes) |
| **Checklist Pendiente** | 18/21 (2 completados, 1 en revisión) |
| **Decisiones Negocio** | 5 sin definir |

---

## 2. Semáforo por Área

Cada área se evalúa en tres dimensiones: estado de implementación, avance sobre checklist y dependencias críticas sin resolver. Los cambios respecto al reporte v1.0 del 24 Feb aparecen en **negrita** en las columnas afectadas: API/Backend pasó de 🔴 a 🟡 y Empleados confirmó bloqueos 409 como completados.

| Área | Semáforo | Avance | Descripción del estado | Bloqueador principal |
|------|----------|--------|------------------------|----------------------|
| **Base de Datos** | 🔴 ROJO | 0 / 6 | Ninguna verificación DB completada. `emp_historial_salarios` no existe. Sin restricción UNIQUE en planillas. | emp_historial_salarios crítico |
| **API / Backend** | 🟡 AMARILLO | **3 / 6** | **UC-01** (inactivar empleado con planillas), **UC-02** (inactivar empleado con acciones), **UC-18** (inactivar empresa) implementados con 409 y detalle en frontend. Pendientes: permisos multiempresa en planilla, motor de cálculos, manejo de eventos. | UC-19, UC-21, motor planilla pendientes |
| **Lógica de Negocio** | 🔴 ROJO | 0 / 5 | Cinco políticas sin definir con stakeholders. Sin cierre de UC-02, UC-11 ni UC-23 el motor de planilla no se puede diseñar. | Reunión con negocio pendiente |
| **Frontend** | 🟡 AMARILLO | **2 / 4** | **Detalle 409 implementado** para inactivar empleado e inactivar empresa (lista de planillas/acciones bloqueantes). Campo sensibles '--' en revisión. Pendientes: advertencia de recálculo salarial y estados visuales de planilla. | Dependencia de API |
| **Empleados (SoR)** | 🟡 AMARILLO | Funcional | Módulo implementado y funcional. **Bloqueos 409 de inactivación completados (UC-01 y UC-02).** Pendiente: confirmación de menú y campos sensibles. | UC-01, UC-02 completados |
| **Recálculo Salarial** | 🔴 ROJO | 0 % | Sin `emp_historial_salarios` el recálculo es imposible. UC-09 a UC-13 completamente pendientes. | Tabla historial salarial |
| **Cálculos Legales CR** | 🔴 ROJO | 0 % | CCSS, renta, cesantía, aguinaldo, vacaciones: ningún cálculo implementado ni validado. | Diseño motor planilla pendiente |

**Criterio del semáforo:** ROJO = bloquea avance o tiene dependencia crítica sin resolver. AMARILLO = en progreso con riesgos menores o dependencia de otra área. VERDE = implementado y verificado.

---

## 3. Corrección de Inconsistencia en DOC-34

El resumen ejecutivo de DOC-34 indicaba "24 ítems de checklist en 4 áreas". El conteo real por sección es **21 ítems**. Esta inconsistencia se corrige en DOC-34 v1.1.

| Sección Checklist | Indicaba DOC-34 | Conteo Real | Corrección |
|-------------------|-----------------|-------------|------------|
| 4.1 Base de Datos | 6 ítems | 6 ítems | — |
| 4.2 API / Backend | 6 ítems | 6 ítems | — |
| 4.3 Lógica de Negocio | 5 ítems | 5 ítems | — |
| 4.4 Frontend | 7 ítems (24-17) | **4 ítems** | Corregir: total 21 |
| **TOTAL** | 24 (enunciado) | **21** (suma real) | Actualizar resumen a 21 ítems / 4 áreas |

**Acción realizada:** DOC-34 actualizado a v1.1: "21 ítems de verificación en 4 áreas"; registro de cambios en Sección 7.

---

## 4. Decisiones de Negocio Pendientes

Las siguientes decisiones no pueden ser tomadas por el equipo técnico de forma unilateral. Requieren confirmación de stakeholders o responsables de negocio.

| UC | Pregunta para negocio | Impacto si no se define | Owner sugerido |
|----|------------------------|--------------------------|----------------|
| UC-02 | ¿Un empleado con acciones de personal en estado **Borrador** bloquea su inactivación? | Sin esta definición no se puede cerrar el 409 de inactivación (actualmente Borrador no se considera bloqueante). Riesgo de inconsistencia. | Gerente RRHH |
| UC-11 | Si llega un aumento salarial y la planilla ya está en estado **Verificada**: ¿se devuelve automáticamente a Abierta o se notifica para decisión manual? | Recalcular automático puede generar sorpresas; decisión manual genera cuellos de botella. | Gerente Finanzas |
| UC-23 | Los tramos de renta del MHCP: ¿se configuran manualmente por administrador en tabla de BD o se actualizan por integración con MHCP? | Si están hardcodeados y cambian por decreto, el sistema requiere deployment. Riesgo de cálculo incorrecto. | CTO / Legal |
| UC-17 | Al cambiar tipo de contrato (tiempo completo → medio tiempo) con planilla abierta: ¿se recalcula automáticamente o se requiere aprobación? | Afecta CCSS, renta y beneficios proporcionales. | Gerente RRHH |
| UC-03 | Planilla en estado **Distribución** con empleado a liquidar: ¿se cancela la distribución o se espera que la planilla pase a Aplicada? | La distribución puede haber iniciado proceso de pago bancario. Cancelar tiene costo operativo. | Gerente Finanzas |

---

## 5. Roadmap Recomendado por Sprint

Orden de ejecución sugerido (sprints de 2 semanas). Dependencias deben respetarse.

| # | Sprint | UC(s) | Tarea | Responsable |
|---|--------|-------|--------|-------------|
| 1 | Sprint 0 | — | Cerrar las 5 decisiones de negocio pendientes con stakeholders. | Analista + Negocio |
| 2 | Sprint 0 | — | ✅ **COMPLETADO.** DOC-34 actualizado a v1.1: conteo de checklist 24→21 ítems, registro de cambios en Sección 7. | Líder Técnico |
| 3 | Sprint 1 | UC-12 | Diseñar y crear tabla `emp_historial_salarios` con migración. Adaptar CREATE/UPDATE de empleado para registrar historial salarial. | Backend / DB |
| 4 | Sprint 1 | UC-01, UC-02 | ✅ **COMPLETADO.** Validaciones 409 en `EmployeesService.inactivate()`. Bloqueo por planillas activas y por acciones de personal pendientes. Frontend muestra detalle vía hook. | Backend |
| 5 | Sprint 1 | UC-18 | ✅ **COMPLETADO.** Validación 409 en `CompaniesService.inactivate()`. Frontend muestra motivo y lista de planillas bloqueantes en página de configuración. | Backend |
| 6 | Sprint 2 | UC-19, UC-21 | Implementar y auditar validación de `id_empresa` en todos los endpoints de planilla. Permisos `payroll:view` por empresa. | Backend / Seguridad |
| 7 | Sprint 2 | UC-05, UC-06 | Implementar validaciones de bloqueo en workflow EmployeeMoved ante planillas activas y acciones pendientes. | Backend |
| 8 | Sprint 2 | DB 4.1 | Ejecutar checklist auditoría DB completo. Documentar gaps en DOC-35. | Backend / DB |
| 9 | Sprint 3 | UC-09, UC-10 | Implementar motor de recálculo por evento SalaryIncreased sobre planillas en estado Abierta. | Backend |
| 10 | Sprint 3 | UC-22 a UC-27 | Diseñar e implementar motor de cálculos legales CR: CCSS, renta (tabla configurable), cesantía, aguinaldo, vacaciones. | Backend / Legal |
| 11 | Sprint 4 | UC-29, UC-30, UC-31 | Implementar auditoría inmutable de cambios de estado y operaciones críticas. | Backend |
| 12 | Sprint 4 | UC-28 | Implementar idempotencia en handlers de eventos críticos. | Backend |
| 13 | Sprint 4 | Frontend 4.4 | Modales 409 (ya parcial), estados visuales de planilla, advertencias de recálculo. | Frontend |

---

## 6. Riesgos Críticos sin Mitigar

| Riesgo | Nivel | Descripción |
|--------|-------|-------------|
| **Motor de planilla sin base de historial salarial** | CRÍTICO | Sin `emp_historial_salarios`, los cálculos usarían el salario actual para todos los periodos históricos. Planillas incorrectas retroactivas; costo de corrección muy alto. |
| **Acceso multiempresa sin validación backend** | CRÍTICO | Usuario de Empresa A podría acceder a planillas de Empresa B si el backend no valida contexto de empresa en cada endpoint. Riesgo de fuga de información salarial. |
| **Cálculos legales CR desactualizados** | ALTO | Tarifas CCSS y tramos de renta cambian por decreto. Hardcodeados sin mecanismo de actualización → planillas incorrectas y posible exposición a multas MHCP. |
| **Planilla Verificada sin política de recálculo** | ALTO | Aumento salarial impactando planilla ya Verificada: (a) recalcular silenciosamente altera lo revisado, (b) ignorar paga con salario incorrecto. Ambos problemáticos. |

---

*KPITAL 360 — Reporte Ejecutivo DOC-34 — v2.0 — 24 Febrero 2026 — Uso Interno Comité Técnico*

*Estado de implementación detallado: docs/35-EstadoDOC34Implementacion.md. Catálogo de casos de uso: docs/34-CasosUsoCriticosPlanillaRRHH.md.*

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
