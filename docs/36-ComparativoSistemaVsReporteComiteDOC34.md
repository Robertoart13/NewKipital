# Comparativo: Sistema actual vs Reporte Ejecutivo Comité Técnico DOC-34

**Referencia:** Reporte Ejecutivo de Estado DOC-34 · Módulo Planillas y RRHH · v1.0 · 24 Febrero 2026  
**Objetivo:** Ajustar el semáforo y el avance del reporte con lo que **sí está implementado** en el código a la fecha.

---

## 1. Resumen ejecutivo comparado

| Métrica | Reporte Comité (24 feb) | Sistema actual (post-implementación) |
|--------|--------------------------|--------------------------------------|
| Casos de uso totales | 31 en 7 categorías | Igual |
| Casos CRÍTICOS | 17 todos pendientes | **3 críticos ya implementados:** UC-01, UC-02, UC-18 |
| Checklist | 20/21 pendiente, 1 en revisión | **API 3/6** (409 empleado x2 + 409 empresa). **Frontend 2/4** (modales/detalle 409 para inactivar empleado e inactivar empresa). Resto igual |
| Decisiones negocio | 5 sin definir | Igual; siguen pendientes |

**Corrección de inconsistencia DOC-34:** El reporte pide corregir el checklist de 24 a **21 ítems** en 4 áreas (4.1=6, 4.2=6, 4.3=5, 4.4=4). Conviene actualizar DOC-34 v1.1 con ese conteo.

---

## 2. Semáforo por área — actualizado

Criterio: **ROJO** = bloquea avance; **AMARILLO** = en progreso o dependiente; **VERDE** = implementado y verificado.

| Área | Reporte Comité | Sistema actual | Comentario |
|------|----------------|----------------|------------|
| **Base de Datos** | 🔴 0/6 | 🔴 0/6 | Sin cambios. `emp_historial_salarios` no existe; resto del checklist DB pendiente. |
| **API / Backend** | 🔴 0/6 | 🟡 **3/6** | **Hecho:** 409 en `PATCH /employees/:id/inactivate` (UC-01, UC-02), 409 en `PATCH /companies/:id/inactivate` (UC-18). **Pendiente:** permisos multiempresa planilla (UC-19), motor por historial salarial, endpoints planilla, idempotencia eventos. |
| **Lógica de Negocio** | 🔴 0/5 | 🔴 0/5 | Las 5 políticas siguen sin definir (UC-02 Borrador, UC-11, UC-23, UC-17, UC-03). |
| **Frontend** | 🟡 1/4 | 🟡 **2/4** | **Hecho:** detalle del 409 al inactivar empleado (hook + mensaje y lista planillas/acciones); detalle del 409 al inactivar empresa (mensaje + lista planillas). **Pendiente:** advertencias de recálculo en formularios de acciones de personal; estados visuales de planilla y deshabilitar acciones por estado. |
| **Empleados (SoR)** | 🟡 "Pendiente: bloqueos 409" | 🟡 **Funcional + 409** | Módulo funcional; **bloqueos 409 de inactivación (UC-01, UC-02) implementados.** Pendiente: liquidar con validaciones UC-03/04 y confirmación de menú si aplica. |
| **Recálculo salarial** | 🔴 0% | 🔴 0% | Sin `emp_historial_salarios` y sin motor; UC-09 a UC-13 pendientes. |
| **Cálculos legales CR** | 🔴 0% | 🔴 0% | Sin cambios. |

---

## 3. Qué dice el reporte vs qué hay en código

- **"Sin validaciones 409 en inactivación"**  
  **Real:** Sí existen. Inactivar empleado devuelve 409 si hay planillas activas en la empresa o acciones pendientes/aprobadas sin asociar. Inactivar empresa devuelve 409 si hay planillas activas, con detalle en el body.

- **"UC-01, UC-02, UC-18 sin implementar"**  
  **Real:** Implementados en backend. UC-01 (planillas abiertas por empresa), UC-02 (acciones PENDIENTE/APROBADA sin `id_calendario_nomina`), UC-18 (planillas activas por empresa).

- **"Faltan modales de error 409"**  
  **Real:** El frontend muestra el motivo del 409 y, cuando viene en la respuesta, la lista de planillas o acciones bloqueantes (empleados: hook; empresas: página de configuración).

- **"PEND-001 en proceso" (inactivar empresa con planillas activas)**  
  **Real:** Completado: validación 409 en `CompaniesService.inactivate()` y mensaje/detalle en frontend.

---

## 4. Lo que sigue igual que en el reporte

- **Decisiones de negocio:** Las 5 (UC-02, UC-11, UC-23, UC-17, UC-03) siguen pendientes; impacto tal como en el reporte.
- **Riesgos críticos:** Los 4 riesgos del reporte se mantienen (historial salarial, acceso multiempresa planilla, cálculos legales actualizados, política planilla Verificada).
- **Roadmap por sprint:** Sigue siendo válido. Sprint 0 (decisiones + corrección DOC-34), Sprint 1 (historial salarial + 409 liquidar si se añade) ya tienen parte de Sprint 1 hecha (409 inactivar empleado y empresa).
- **Checklist 4.1 y 4.3:** Sin cambios. 4.2 y 4.4 avanzan según la tabla de semáforo anterior.

---

## 5. Acciones recomendadas (actualizadas)

1. **Comité:** Usar este comparativo para no duplicar esfuerzo: 409 de inactivación (UC-01, UC-02, UC-18) y detalle en frontend ya están hechos.
2. **DOC-34 v1.1:** Corregir "24 ítems" a **"21 ítems de verificación en 4 áreas"** en el resumen ejecutivo.
3. **DOC-35:** Mantenerlo como referencia de estado; la sección "Qué existe ahora" ya refleja las validaciones 409 y el manejo frontend.
4. **Siguiente prioridad técnica:** Cerrar decisiones de negocio, crear `emp_historial_salarios` y, en paralelo, auditar checklist DB y permisos multiempresa (UC-19, UC-21).

---

*Documento de comparación sistema actual vs Reporte Comité DOC-34. Actualizado a partir del estado del código y de docs/35-EstadoDOC34Implementacion.md.*
