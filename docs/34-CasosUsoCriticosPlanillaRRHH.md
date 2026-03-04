# KPITAL 360 — DOC-34  
# Casos de Uso Críticos de Planilla y RRHH

**Catálogo de Validaciones, Riesgos y Checklist de Auditoría para Integración de Planillas**  
**Versión 1.1 | Febrero 2026 | Uso Interno**

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Propósito de este documento

Este documento cataloga todos los casos de uso críticos que deben validarse antes y durante la implementación del módulo de Planillas y Acciones de Personal en KPITAL 360. Sirve como guía de análisis para el ingeniero responsable, como referencia de riesgos arquitectónicos, y como lista de verificación permanente para futuras integraciones.

---

## 1. Contexto y alcance

KPITAL 360 opera sobre un modelo de bounded contexts donde **Employee Management** es el Sistema de Registro (SoR) del empleado. Las planillas tienen estados inmutables una vez aplicadas, y las acciones de personal pasan por flujos de aprobación antes de asociarse a una planilla. Este documento aborda los puntos de colisión entre la gestión del empleado (ya implementada) y la futura gestión de planillas y acciones de personal.

**Regla fundamental:** Una planilla en estado **APLICADA** es inmutable. Nunca se modifica. Cualquier corrección posterior se maneja como acción de personal en la siguiente planilla.

- **Estados de planilla:** Abierta → Verificada → Distribución → Aplicada (inmutable) → Inactiva  
- **Estados de acción de personal:** Borrador → Pendiente aprobación → Aprobada → Asociada a planilla → Pagada / Cancelada  

---

## 2. Catálogo de casos de uso críticos

(Ver tabla completa en versión interna. Resumen por categoría:)

- **2.1 Inactivación y liquidación de empleados:** UC-01 a UC-04 (planillas abiertas, acciones pendientes, liquidación con planilla en distribución, exclusión en planilla siguiente).
- **2.2 Cambio de empresa (traslado):** UC-05 a UC-08 (planilla abierta origen, acciones pendientes, periodo de pago distinto, provisión aguinaldo).
- **2.3 Cambio de salario y recálculo:** UC-09 a UC-13 (aumento en planilla abierta, múltiples planillas abiertas, planilla verificada, salario vigente por periodo, retroactivo).
- **2.4 Modificación de datos críticos del empleado:** UC-14 a UC-17 (periodo de pago, CCSS, cuenta bancaria, tipo contrato).
- **2.5 Integridad multiempresa y acceso:** UC-18 a UC-21 (inactivar empresa con planillas activas, acceso por empresa, supervisor cross-empresa, empleado ve solo su planilla).
- **2.6 Consistencia de cálculos legales (Costa Rica):** UC-22 a UC-27 (CCSS, renta, proporcional, aguinaldo, cesantía, vacaciones).
- **2.7 Auditoría e idempotencia:** UC-28 a UC-31 (evento duplicado, corrección planilla aplicada, auditoría aprobador, rollback planilla abierta).

---

## 3. Manejo de recálculo por cambio de salario

Cuando un empleado tiene varias planillas abiertas y se aprueba un aumento: recalcular todas las planillas en estado **Abierta** del empleado en esa empresa; planillas **Verificada** según política (devolver a Abierta con auditoría); **Aplicada** no se toca.

**Requerimiento arquitectónico:** Tabla **emp_historial_salarios** como fuente de verdad del salario vigente por fecha. El motor de planilla no debe usar solo el campo salario actual de sys_empleados.

---

## 4. Checklist de auditoría para el ingeniero

- **4.1 Base de datos:** Historial de salarios, UNIQUE codigo por empresa, UNIQUE planilla operativa, protección física planilla aplicada, auditoría de cambios de estado, historial periodo de pago.
- **4.2 API/Backend:** 409 en inactivar empleado (planillas/acciones), 409 en traslado, validación id_empresa, motor usa historial salarial, handlers idempotentes, permisos por empresa.

## 6. Resultados por empleado (reporte RRHH)

### Necesidad operativa

RRHH requiere:
- Totales por planilla (bruto, neto, cargas sociales, impuesto renta, devengado).
- Detalle por empleado con acciones de personal para auditoría.

### Lineamiento actual

1. Persistir resultados **normalizados** por empleado en `nomina_resultados` (campos adicionales).
2. Persistir **snapshot JSON** completo por planilla para trazabilidad.
3. Devengado real se usa como base de provisión de aguinaldo y traslados interempresas.
- **4.3 Lógica de negocio:** Definir estados bloqueantes (PEND-002), política planilla Verificada + SalaryIncreased, tramos renta configurables, rubros gravables, jornada parcial.
- **4.4 Frontend:** Mostrar detalle en 409, campos sensibles como '--', advertencia en acciones que afectan salario, estados de planilla visibles y acciones deshabilitadas según estado.

---

## 5. Directivas arquitectónicas

- **Regla 1:** Inmutabilidad de planilla aplicada.  
- **Regla 2:** Historial salarial como fuente de verdad.  
- **Regla 3:** Validación siempre en backend.  
- **Regla 4:** Idempotencia en eventos críticos.  
- **Regla 5:** Auditoría completa e inmutable.  

Transiciones prohibidas: desde APLICADA a cualquier otro estado; VERIFICADA → ABIERTA sin auditoría; saltar a APLICADA sin secuencia.

---

## 6. Resumen ejecutivo

- 31 casos de uso en 7 categorías; 17 críticos.  
- **21 ítems** de verificación en checklist de auditoría (4 áreas: 4.1 DB 6, 4.2 API 6, 4.3 Negocio 5, 4.4 Frontend 4); 5 decisiones de negocio pendientes.  
- Acciones inmediatas: crear tabla emp_historial_salarios; definir políticas con negocio; 409 en inactivar empleado/empresa ya implementados (ver DOC-35 y Reporte Comité); auditar BD; referenciar este documento en DOC-00.  

**Nota para el siguiente ingeniero:** Este documento es vivo. Cada nuevo caso de uso debe agregarse con ID correlativo (UC-32, UC-33…) antes de implementar.

---

## 7. Registro de cambios

| Versión | Fecha | Cambio |
|---------|--------|--------|
| 1.0 | Feb 2026 | Versión inicial. Catálogo UC-01 a UC-31, checklist, directivas. |
| 1.1 | 24 Feb 2026 | Corrección: resumen ejecutivo actualizado de "24 ítems" a **21 ítems** de verificación en 4 áreas (conteo real: 4.1=6, 4.2=6, 4.3=5, 4.4=4). Referencia a implementación 409 en DOC-35. |

---

*Documento completo (tablas UC-01 a UC-31 y checklist detallado) se mantiene como referencia interna. Índice general: docs/00-Indice.md. Estado de implementación: docs/35-EstadoDOC34Implementacion.md. Reporte ejecutivo Comité: docs/37-ReporteEjecutivoDOC34-ComiteTecnico.md.*

---
## Actualizaci?n 2026-03-04 ? Reglas enterprise adicionales (TimeWise + Traslados)

- TimeWise: el empleado no selecciona periodo de pago; el sistema asigna planilla por fechas + calendario + corte.
- Licencias largas generan acciones por periodo (no se reutiliza una sola acci?n).
- Aumentos: fecha efectiva definida por supervisor/RRHH; se aplica en planilla correspondiente.
- Horas extra: asignaci?n por fecha real y corte de planilla.
- Traslado masivo: validaci?n batch + revalidaci?n final; ejecuci?n por job backend; reubicaci?n de acciones futuras por fecha efectiva.
- Bloqueo obligatorio si **no existen periodos en empresa destino**.
- Traslado **solo al inicio de periodo** (no mitad de periodo).
- Acciones recurrentes de ley no bloquean.
- Politica por tipo de accion (portabilidad) definida en DOC-42 y DOC-21.
- Simulacion previa obligatoria antes de ejecutar.

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
## Actualizacion 2026-03-04 - Resultados por planilla (Implementado)

- `nomina_resultados` extendida con devengado/salario bruto periodo/cargas/impuesto.
- Tabla nueva `nomina_planilla_snapshot_json` con snapshot JSON completo por planilla.
- La base de devengado sirve para provisiones de aguinaldo y traslados interempresas.
- Bloqueo operativo: si el empleado esta verificado en una planilla, no se permiten nuevas acciones que apunten a esa planilla hasta desmarcar verificacion.
- CCSS e impuesto de renta se calculan en `process` y quedan visibles antes de verificar.
