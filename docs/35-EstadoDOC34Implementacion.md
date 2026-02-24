# Estado DOC-34 vs implementación

**Objetivo:** Dejar claro qué existe hoy, qué se puede validar ya en código, y qué aún no tiene validación. Referencia para auditoría y para el ingeniero. **Alineado con Reporte Ejecutivo Comité DOC-34 v2.0** (docs/37-ReporteEjecutivoDOC34-ComiteTecnico.md).

---

## Resumen rápido: Lo que SÍ hay / Lo que NO hay

| Área | SÍ hay (implementado) | NO hay (pendiente) |
|------|------------------------|---------------------|
| **API / Backend** | 409 en inactivar empleado (UC-01 planillas, UC-02 acciones). 409 en inactivar empresa (UC-18). Detalle en body (planillas/acciones). | 409 en liquidar (UC-03/04). Validación id_empresa en endpoints planilla (UC-19, UC-21). Motor con historial salarial. Handlers idempotentes. Permisos payroll por empresa. |
| **Frontend** | Detalle del 409 al inactivar empleado (hook, lista planillas/acciones). Detalle del 409 al inactivar empresa (mensaje + lista planillas). | Advertencia de recálculo en formularios de acciones de personal. Estados visuales de planilla y acciones deshabilitadas por estado. Campos sensibles '--' en revisión. |
| **Empleados (SoR)** | Módulo funcional. Bloqueos 409 de inactivación (UC-01, UC-02) completados. | Validaciones en liquidar (UC-03/04). Confirmación menú. |
| **Base de datos** | Tablas `nom_calendarios_nomina`, `acc_acciones_personal`. | Tabla `emp_historial_salarios`. UNIQUE planilla operativa. Protección física planilla aplicada. Auditoría cambios estado. Historial periodo de pago. UNIQUE (id_empresa, codigo_empleado) si no existe. |
| **Lógica de negocio** | — | 5 decisiones pendientes (UC-02 Borrador, UC-11, UC-23, UC-17, UC-03). |
| **Recálculo / Cálculos CR** | — | Motor recálculo (UC-09 a UC-13). Cálculos legales CR (UC-22 a UC-27). Auditoría e idempotencia (UC-28 a UC-31). |

---

## Checklist DOC-34 (21 ítems) — Estado por ítem

- **4.1 Base de datos (6):** 0/6. Ninguno completado; `emp_historial_salarios` es prerequisito.
- **4.2 API / Backend (6):** 3/6. Completados: 409 inactivar empleado (planillas + acciones), 409 inactivar empresa, frontend muestra detalle 409. Pendientes: validación id_empresa planilla, motor con historial salarial, handlers idempotentes, permisos payroll por empresa.
- **4.3 Lógica de negocio (5):** 0/5. Todas las políticas pendientes de definición con negocio.
- **4.4 Frontend (4):** 2/4. Completados: mostrar detalle en 409 (inactivar empleado e inactivar empresa). En revisión: campos sensibles '--'. Pendientes: advertencia recálculo salarial, estados visuales planilla.

---

## Qué existe ahora (estado actual del código)

- **Empleados:** `PATCH /employees/:id/inactivate` valida antes de inactivar: si hay planillas activas (Abierta/En proceso/Verificada) en la empresa del empleado o acciones de personal en PENDIENTE/APROBADA sin asociar a planilla → responde **409** con `code` y detalle (`planillas` o `acciones`). `PATCH /employees/:id/liquidar` existe pero aún no aplica estas validaciones (UC-03/04 pendientes).
- **Empresas:** `PATCH /companies/:id/inactivate` valida: si la empresa tiene planillas en Abierta/En proceso/Verificada → **409** con `code: 'PLANILLAS_ACTIVAS'` y array `planillas`.
- **Tablas:** `nom_calendarios_nomina` (planillas maestras con estado), `acc_acciones_personal` (id_empleado, id_calendario_nomina, estado). No existe tabla de detalle “empleado X en planilla Y” (se asume por empresa + periodo). No existe `emp_historial_salarios`.
- **Frontend:** Al recibir 409 al inactivar empleado, el hook muestra notificación con mensaje y detalle de planillas o acciones bloqueantes. Al inactivar empresa, la página muestra el mensaje del backend y la lista de planillas activas (#id).

---

## Qué se puede validar ya (y se implementa)

| ID  | Caso | Qué validar | Dónde |
|-----|------|-------------|--------|
| UC-01 | Inactivar empleado con planilla abierta | Hay planillas en estado Abierta/En Proceso/Verificada para la **empresa del empleado**. Si sí → 409. (Hoy no hay detalle “empleado en planilla”; se usa criterio conservador: cualquier planilla activa de la empresa bloquea.) | `EmployeesService.inactivate()` |
| UC-02 | Inactivar empleado con acciones pendientes | Hay acciones de personal del empleado en estado PENDIENTE o APROBADA **sin asociar** a planilla (id_calendario_nomina null). Si sí → 409 con detalle de acciones. | `EmployeesService.inactivate()` |
| UC-18 | Inactivar empresa con planillas activas | Hay planillas en estado Abierta/En Proceso/Verificada para esa empresa. Si sí → 409 con detalle. | `CompaniesService.inactivate()` |
| Frontend | Mostrar motivo del 409 | Cuando la API devuelve 409, mostrar mensaje y, si viene en el body, detalle (planillas o acciones bloqueantes). | Pantallas/flujos de inactivar empleado e inactivar empresa |

---

## Qué no existe o no se puede validar aún

| ID  | Caso | Motivo |
|-----|------|--------|
| UC-03, UC-04 | Liquidar con planilla en distribución / exclusión en planilla siguiente | Requiere lógica de “planilla en distribución” y de generación de planilla siguiente; módulo de planillas no cerrado. |
| UC-05 a UC-08 | Traslado interempresas | Workflow EmployeeMoved y reglas de reubicación de acciones no implementados. |
| UC-09 a UC-13 | Recalculo por salario | Falta tabla `emp_historial_salarios` y motor de recálculo. Salario vigente por periodo no se puede resolver sin historial. |
| UC-14 a UC-17 | Cambio periodo de pago, CCSS, cuenta, tipo contrato con planilla abierta | Requiere consulta “planilla abierta que incluye al empleado”. Con detalle de planilla por empleado se podría bloquear o advertir. |
| UC-19 a UC-21 | Acceso planilla por empresa / supervisor / empleado solo su planilla | Endpoints de planilla y permisos por contexto aún por cerrar. |
| UC-22 a UC-27 | Cálculos legales (CCSS, renta, proporcional, aguinaldo, cesantía, vacaciones) | Motor de cálculo de planilla no implementado. |
| UC-28 a UC-31 | Idempotencia eventos, corrección planilla aplicada, auditoría, rollback | Dependen de eventos y flujos de planilla. |
| Checklist 4.1 | Historial salarial, UNIQUE planilla operativa, etc. | Varios ítems pendientes; tabla `emp_historial_salarios` es prerequisito. |

---

## Resumen

- **Implementado a partir de esta referencia:** 409 en inactivar empleado (planillas activas en empresa + acciones pendientes o aprobadas sin asociar), 409 en inactivar empresa (planillas activas), y frontend que muestre el motivo/detalle cuando la API responda 409.
- **Sigue pendiente:** Todo lo que depende de motor de planillas, historial salarial, detalle empleado–planilla, eventos de recálculo y políticas de negocio por definir (PEND-002, UC-11, tramos renta, etc.). Se irá cubriendo según avance el módulo de planillas y DOC-34.

---

*Actualizado con Reporte Ejecutivo Comité DOC-34 v2.0 (24 Feb 2026). Este documento es la referencia de "qué hay / qué no" para planillas y RRHH; debe tenerse en cuenta en todo avance del módulo. Reporte Comité: docs/37-ReporteEjecutivoDOC34-ComiteTecnico.md.*
