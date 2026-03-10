# ACTAS E INFORMES HISTORICOS

Estado: borrador de consolidacion

Objetivo del documento:
- Unificar contenido duplicado de las fuentes asignadas.
- Definir una sola fuente de verdad por categoria.

Fuentes asignadas (origen):
- docs/InformeHorasTrabajo-Semana020307.md

Secciones de consolidacion:
- Resumen ejecutivo vigente
- Reglas obligatorias vigentes
- Contratos y definiciones tecnicas
- Flujo operativo y QA minimo
- Historial movido a 99-historico (si aplica)

Nota de trabajo:
- Este archivo se completara por etapas con trazabilidad en MATRIZ-TRAZABILIDAD.md.


## Fuentes Integradas (Preservacion Completa)

Regla de consolidacion aplicada:
- Cada fuente original asignada a este maestro se preserva completa debajo de su encabezado.
- Esto garantiza trazabilidad y evita perdida de informacion durante la limpieza.

### Fuente: docs/InformeHorasTrabajo-Semana020307.md

```markdown
# Informe de Horas de Trabajo — Semana 2 al 7 de Marzo

**Período:** Lunes 2 – Viernes 6 de marzo  
**Total:** 40 horas  
**Formato:** 15 tareas por día, con nombre, apunte breve y duración  
**Alcance:** Trabajo técnico de arquitectura, flujos de negocio, reglas enterprise y módulos operativos (excluye login y tareas básicas ya realizadas)

---

## Lunes 2 de marzo (8h)

| # | Nombre de tarea | Apunte | Duración |
|---|-----------------|--------|----------|
| 1 | Revisión y alineación de flujos de trabajo enterprise | Validar cumplimiento del estándar de workflows (Doc 17): orquestación vs ejecución, separación controller/service/workflow, eventos de dominio | 0.5 h |
| 2 | Análisis de compatibilidad de planillas en reasociación | Definir regla definitiva: solo validar inicio/fin de período; no bloquear por ventana de pago ni fecha corte | 0.5 h |
| 3 | Documentar regla transversal de compatibilidad de fechas | Actualizar docs con decisión de negocio sobre comparación planilla origen/destino | 0.5 h |
| 4 | Cache backend: allowlist payroll-movements | Incluir idEmpresas, includeInactive, inactiveOnly en keys para evitar respuestas cacheadas cruzadas | 0.5 h |
| 5 | Cache allowlist personal-actions | Incluir idTipoAccionPersonal para evitar catálogos cruzados entre acciones | 0.5 h |
| 6 | Validación de movimientos en acciones de personal | Verificar que movimiento seleccionado pertenezca a la empresa antes de guardar Ausencias/Licencias | 0.5 h |
| 7 | Filtro de movimientos por tipo de acción | Catálogo de Ausencias (id 20) y Licencias (id 23) filtrado por tipo para evitar movimientos de otro módulo | 0.5 h |
| 8 | Normalización 1=Activo / 0=Inactivo en backend | Alinear intercompany-transfer, clases, cuentas contables y personal-actions a la regla unificada | 0.5 h |
| 9 | BD: normalización flags es_inactivo | Aplicar defaults y verificación en tablas: cuentas contables, artículos nómina, calendarios, cargas sociales, períodos, tipos, clases, proyectos | 0.5 h |
| 10 | Modal ausencias: carga por empresa del modal | Recargar empleados y movimientos según empresa seleccionada en el modal, no solo por filtro externo | 0.5 h |
| 11 | Datos base acciones de personal (empresa id=3) | Crear artículos y movimientos base para acciones de personal (monto y % ingresos; monto deducciones) | 0.5 h |
| 12 | Listado ausencias: columna monto total | Mostrar monto total de la acción en la tabla de ausencias | 0.5 h |
| 13 | Catálogo empleados en ausencias por empresa | Cargar empleados según empresa de la tabla para evitar "Empleado #id" | 0.5 h |
| 14 | Botón Refrescar y cache buster | Agregar cb=timestamp en GET de listados para forzar recarga real; botón en Acciones, Planillas, Feriados, Movimientos | 0.5 h |
| 15 | Cache buster automático 6 minutos | Refresco global en background para mantener datos actualizados | 0.5 h |

**Subtotal día:** 8 h

---

## Martes 3 de marzo (8h)

| # | Nombre de tarea | Apunte | Duración |
|---|-----------------|--------|----------|
| 1 | Traslado interempresas: validación DTOs | Corregir imports reales en ValidationPipe para evitar rechazo de propiedades válidas en simulación/ejecución | 0.5 h |
| 2 | Traslado: query resultados por estado_calendario_nomina | Corregir error SQL Unknown column 'p.estado' usando columna correcta | 0.5 h |
| 3 | Validación planilla destino por fechas de acciones | Usar fechas de acciones de personal (no fecha efectiva) y consolidar error con conteo de fechas faltantes | 0.5 h |
| 4 | Mensajes de bloqueo en traslado | Refinar mensajes: planillas activas, acciones bloqueantes, fechas sin planilla destino con resumen legible | 0.5 h |
| 5 | UI traslado: remover fecha efectiva del formulario | Simulación usa fecha del día para registrar traslado | 0.5 h |
| 6 | Reasociación acciones huérfanas: compatibilidad estricta | Exigir coincidencia periodo, tipo planilla, moneda, inicio/fin periodo, fechas corte y pago | 0.5 h |
| 7 | Invalidación de snapshots por traslado | Marcar INVALIDATED_BY_TRANSFER en snapshots de acciones trasladadas para evitar reprocesamiento | 0.5 h |
| 8 | Separar source en ledger vacaciones | Resolver conflicto UQ: TRANSFER_OUT (origen) y TRANSFER_IN (destino) en execute | 0.5 h |
| 9 | Remover bloqueo por tipo de acción trasladable | No bloquear traslado por licencia/incapacidad/aumento cuando acción está en estado trasladable | 0.5 h |
| 10 | E2E traslado: escenario execute exitoso | Validar con empleado id=4: simulación OK, execute OK, empleado movido, snapshots invalidados | 0.5 h |
| 11 | Regla transversal traslado y acciones pendientes | Documentar: no bloquear por tipo; bloquear solo por riesgo real (estado, incompatibilidad, conflictos) | 0.5 h |
| 12 | Worker identidad: autoLoadEntities | Corregir "No metadata for EmployeeIdentityQueue"; habilitar autoLoadEntities en database.config | 0.5 h |
| 13 | Ajuste compatibilidad fechas en reasociación | Regla final: validar solo fecha_inicio_periodo y fecha_fin_periodo; no bloquear por ventana de pago | 0.5 h |
| 14 | Pruebas unitarias intercompany-transfer | Ejecutar y validar payroll.service, intercompany-transfer.service, orphan-reassignment | 0.5 h |
| 15 | Handoff técnico traslado interempresas | Documentar corte, últimos cambios, resultado actual y pendientes en Doc 50 | **1 h** |

**Subtotal día:** 8 h

---

## Miércoles 4 de marzo (8h)

| # | Nombre de tarea | Apunte | Duración |
|---|-----------------|--------|----------|
| 1 | Refresco post-ejecución en Traslado UI | Invalidar cache tras execute; remover empleados EXECUTED del grid; recarga diferida para evitar carrera | 0.5 h |
| 2 | Invalidación explícita en botón Refrescar | bustApiCache en traslado para forzar datos frescos tras mutación | 0.5 h |
| 3 | Remoción inmediata del grid tras execute | Evitar que empleado trasladado siga visible en origen | 0.5 h |
| 4 | Regla transversal Acciones de Personal - selector empresa | Documentar: modal NO hereda empresa de filtros; catálogos solo con empresa del formulario | 0.5 h |
| 5 | Paridad modales: modalCompanyId + onCompanyChange | Estandarizar en Ausencias, Licencias, Incapacidades, Vacaciones, Bonificaciones, Horas Extra, etc. | 0.5 h |
| 6 | Validación línea completa para agregar línea | Revisar isLineComplete en módulos; no bloquear por formula (campo derivado) | 0.5 h |
| 7 | Bitácora detallada por línea | Persistir lineasDetalle en payloadBefore/After; formato "Línea N - Campo" | 0.5 h |
| 8 | Paridad Incapacidades con Ausencias/Licencias | Normalizar IDs, remuneración default false, validación sin formula | 0.5 h |
| 9 | Paridad Bonificaciones | Remuneración default, línea completa sin formula, hidratar formula en edición | 0.5 h |
| 10 | Paridad Horas Extra | IDs normalizados, bitácora, validación de línea con campos obligatorios reales | 0.5 h |
| 11 | Regla de origen en selects (Acciones Personal) | Cada Select debe usar su catálogo propio; nunca fallback con labels de otro | 0.5 h |
| 12 | Regla transversal Planillas inactivar/reactivar | Documentar: desasociación, PENDING_RRHH, snapshot, reasociación parcial | 0.5 h |
| 13 | Invalidación cache en mutaciones de planilla | Asegurar scope payroll invalidado en POST/PUT/PATCH/DELETE | 0.5 h |
| 14 | Reasignación automática de huérfanas | Ejecutar en crear/reabrir/reactivar; definir job de reintento periódico | 0.5 h |
| 15 | Regla QA robusto Planillas/Traslado | Validar SQL before/after; doble validación unit+E2E; documentar en TEST-EXECUTION-REPORT | **1 h** |

**Subtotal día:** 8 h

---

## Jueves 5 de marzo (8h)

| # | Nombre de tarea | Apunte | Duración |
|---|-----------------|--------|----------|
| 1 | PATCH /payroll/:id/reactivate | Implementar reasociación parcial desde acc_planilla_reactivation_items; fallback PENDING_RRHH | 0.5 h |
| 2 | Cache interceptor: participación de cb en key | Permitir que Refrescar fuerce datos frescos sin esperar TTL | 0.5 h |
| 3 | Cuentas contables: allowlist idEmpresa/idEmpresas | Evitar colisiones de cache entre empresas (listados vacíos al cambiar filtro) | 0.5 h |
| 4 | Artículos nómina UI: desacople filtro/modal | Empresa de formulario independiente; carga cuentas por empresa/tipo; preload nombre en edición | 0.5 h |
| 5 | Movimientos nómina UI: empresa no preseleccionada | Persistir idClase; reforzar regla monto fijo/porcentaje (campo inactivo = 0) | 0.5 h |
| 6 | Abrir planilla: no preseleccionar empresa por filtro | Autofill Inicio Pago → Fin Pago y Fecha Pago; hardening para mantener fecha dentro de ventana | 0.5 h |
| 7 | Sincronizar filtro Estados con panel filtros | Evitar doble filtro oculto en Acciones de Personal; limpiar filtro interno al cambiar Estados | 0.5 h |
| 8 | Empleados UI: Apellidos, Nombre en listas | Mostrar orden apellido+nombre; ordenar alfabéticamente en selects | 0.5 h |
| 9 | Tablas: ordenamiento por columnas | Incluir useSortableColumns en todas las tablas del sistema | 0.5 h |
| 10 | Creación Acciones: no preseleccionar empresa | Usuario debe elegir empresa para cargar empleados, planillas y movimientos | 0.5 h |
| 11 | Cache accounting-accounts: resolveCompanyKey | Interpretar idEmpresas cuando llega un solo ID | 0.5 h |
| 12 | Validación manual cerrada módulos | Verificar Puestos, Departamentos, Proyectos, Empleados, Usuarios, Cuentas, Artículos, Movimientos | 0.5 h |
| 13 | Evidencia en TEST-EXECUTION-REPORT | Registrar validación manual de todos los módulos tocados | 0.5 h |
| 14 | Actualización Doc 09 Estado Actual | Incluir todas las revisiones (Rev. 8 a Rev. 15) y changelog de la semana | **1 h** |
| 15 | Trazabilidad de reglas en ReglasImportantes | Mantener paridad entre reglas transversales y documentación | 0.5 h |

**Subtotal día:** 8 h

---

## Viernes 6 de marzo (8h)

| # | Nombre de tarea | Apunte | Duración |
|---|-----------------|--------|----------|
| 1 | UX/UI traslado interempresas | Hero card clara, parámetros en grid responsive, chips resumen visibles | 0.5 h |
| 2 | Mejora contraste y legibilidad tabla traslado | Grupo de acciones con mejor contraste; tabla más limpia | 0.5 h |
| 3 | Columna Periodo: etiqueta de catálogo | Mostrar nombre de periodo, no solo ID, en tabla de traslado | 0.5 h |
| 4 | Revisión Estándar Workflows (Doc 17) | Validar EmployeeCreationWorkflow ACID e IdentitySyncWorkflow event-driven | 0.5 h |
| 5 | Principio orquestador vs ejecutor | Verificar que workflows no contengan lógica de negocio primaria | 0.5 h |
| 6 | Event bus y workflows | Flujo: Service → evento → @OnEvent → workflow → nuevos eventos post-commit | 0.5 h |
| 7 | Reglas de seguridad en workflows | Auditoría, transaccionalidad, rollback completo, no estado inconsistente | 0.5 h |
| 8 | Clean Code: actualización transversal docs | Asegurar que cada cambio actualice todos los docs afectados (ReglasImportantes) | 0.5 h |
| 9 | Checklist pre-commit y documentación | Verificar que documentación en docs/ se actualice en mismo ciclo de trabajo | 0.5 h |
| 10 | Regla Documentación obligatoria | Revisar que reglas, procesos y decisiones queden en docs/ y sean transversales | 0.5 h |
| 11 | Consolidación evidencia E2E traslado | Escenarios A (inactivar→planilla compatible→reasociación) y B (traslado→invalidación) | 0.5 h |
| 12 | Validación build API post-cambios | npm run build en api; confirmar sin errores de metadata | 0.5 h |
| 13 | Pruebas backend: payroll + traslado + orphan | 16/16 pasando; verificación en TEST-EXECUTION-REPORT | 0.5 h |
| 14 | Cierre documental del handoff | Referencias: TEST-EXECUTION-REPORT, GUIA-TESTING, EstadoActualProyecto | **1 h** |
| 15 | Resumen semanal y pendientes declarados | Despido, Renuncia como acciones pendientes; estado de pruebas y QA manual | **1 h** |

**Subtotal día:** 8 h

---

## Resumen

| Día | Horas | Tareas |
|-----|-------|--------|
| Lunes 2 | 8 | 15 |
| Martes 3 | 8 | 15 |
| Miércoles 4 | 8 | 15 |
| Jueves 5 | 8 | 15 |
| Viernes 6 | 8 | 15 |
| **Total** | **40** | **75** |

---

## Alcance técnico cubierto

- **Flujos de trabajo:** Reasociación de acciones huérfanas, traslado interempresas, invalidación de snapshots, compatibilidad de planillas.
- **Reglas de negocio:** Compatibilidad de fechas, estado activo/inactivo, validación de movimientos por empresa/tipo, bloqueos de traslado.
- **Reglas transversales:** Acciones de Personal (selector empresa, bitácora por línea, validación línea completa), Planillas (inactivar/reactivar, cache), QA robusto.
- **Arquitectura y cache:** Allowlists por scope, invalidación dirigida, cache buster, resolveCompanyKey.
- **UI/UX:** Traslado interempresas, tablas ordenables, modales con empresa independiente, refresco post-mutación.
- **Documentación:** Handoff, reglas obligatorias, trazabilidad de pruebas, actualización transversal de docs.
```

