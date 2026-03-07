# KPITAL 360  ndice de Documentacin

**Proyecto:** KPITAL 360  ERP Multiempresa  
**Autor:** Roberto  Arquitecto Funcional / Senior Engineer  
**ltima actualizacin:** 2026-03-05 (reglas de documentacin: actualizacin transversal de docs)

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Cmo Leer Esta Documentacin

Si sos nuevo en el proyecto, le los documentos **en orden numrico**. Cada uno construye sobre el anterior. No saltes.

Si ya ests en el proyecto y necesits referencia puntual, us esta tabla para ir directo al tema.

---

## Mapa de Documentos

| # | Documento | Qu Contiene | Prerrequisito |
|---|-----------|-------------|---------------|
| 01 | [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) | Visin arquitectnica del sistema completo. Blueprint formal. Bounded contexts, fases, principios, NFRs. **Documento rector.** | Ninguno |
| 02 | [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md) | Decisin de crear dos proyectos desde cero (Frontend + API). Stack tecnolgico. Estructura base. | 01 |
| 03 | [03-ArquitecturaStateManagement.md](./03-ArquitecturaStateManagement.md) | Arquitectura detallada de estado. Redux + TanStack Query + Context. Boundaries, sincronizacin, invalidacin. | 01, 02 |
| 04 | [04-DirectivasStateManagement.md](./04-DirectivasStateManagement.md) | Directiva ejecutable paso a paso de state management. Qu implementar y en qu orden. | 03 |
| 05 | [05-IntegracionAntDesign.md](./05-IntegracionAntDesign.md) | Integracin de Ant Design. **Paleta RRHH (obligatorio)**, tema corporativo, componentes base, reglas de estilo. | 02 |
| 06 | [06-DirectivasHeaderMenu.md](./06-DirectivasHeaderMenu.md) | Header de 2 niveles (logo + usuario / men horizontal). Diseo enterprise, men data-driven. | 03, 05 |
| 08 | [08-EstructuraMenus.md](./08-EstructuraMenus.md) | Catlogo exacto de las opciones de men definidas. Los 4 mens completos. | 06 |
| 09 | [09-EstadoActualProyecto.md](./09-EstadoActualProyecto.md) | **Estado vivo del proyecto.** Inventario de archivos, directivas completadas, qu falta. | Todos |
| 10 | [10-DirectivasSeparacionLoginDashboard.md](./10-DirectivasSeparacionLoginDashboard.md) | Separacin Login/Dashboard. Layouts, guards con cascada, flujos de auth, logout, interceptor 401. | 04 |
| 11 | [11-DirectivasConfiguracionBackend.md](./11-DirectivasConfiguracionBackend.md) | Configuracin backend enterprise. TypeORM + MySQL, bus de eventos, 7 mdulos por bounded context, CORS, migraciones. | 01, 02 |
| 12 | [12-DirectivasIdentidadCrossApp.md](./12-DirectivasIdentidadCrossApp.md) | Identidad nica y navegacin cross-app (KPITAL  TimeWise). SSO por cookie httpOnly. | 01, 11 |
| 13 | [13-ModeladoSysEmpresas.md](./13-ModeladoSysEmpresas.md) | Primera tabla: sys_empresas (root aggregate). Entidad, migracin, CRUD, inactivacin lgica. | 11 |
| 14 | [14-ModeloIdentidadEnterprise.md](./14-ModeloIdentidadEnterprise.md) | Core Identity Schema completo: 7 tablas (usuarios, apps, roles, permisos, tablas puente). FK constraints, ndices, CRUD. | 11, 13 |
| 15 | [15-ModeladoSysUsuarios.md](./15-ModeladoSysUsuarios.md) | Enhance sys_usuarios: columnas enterprise (hardening, bloqueo, estados 1/2/3, password nullable). | 14 |
| 16 | [16-CreacionEmpleadoConAcceso.md](./16-CreacionEmpleadoConAcceso.md) | sys_empleados + flujo transaccional ACID de creacin con acceso a TimeWise/KPITAL. Poltica de sincronizacin de identidad. | 14, 15 |
| 17 | [17-EstandarWorkflows.md](./17-EstandarWorkflows.md) | Estndar enterprise de workflows. Carpetas, convenciones, EmployeeCreationWorkflow, IdentitySyncWorkflow. | 16 |
| 18 | [18-IdentityCoreEnterprise.md](./18-IdentityCoreEnterprise.md) | Identity Core completo: seed, JWT real, guards, permisos dinmicos, conexin frontendbackend, SSO base. | 14, 15, 17 |
| 19 | [19-RedefinicionEmpleadoEnterprise.md](./19-RedefinicionEmpleadoEnterprise.md) | Redefinicin enterprise de sys_empleados + tablas org/nom (departamentos, puestos, periodos pago). Modelo completo con ENUMs, FKs, catlogos. | 16, 17 |
| 20 | [20-MVPContratosEndpoints.md](./20-MVPContratosEndpoints.md) | Contratos MVP: lista oficial de endpoints, permission contract (module:action), Payroll Engine y Personal Actions (esqueleto). Incluye actualizacin operativa de endpoints de planilla (edit/process/snapshot-summary/audit-trail) y filtros por rango. | 18, 19 |
| 21 | [21-TablaMaestraPlanillasYWorkflows.md](./21-TablaMaestraPlanillasYWorkflows.md) | Tabla Maestra nom_calendarios_nomina, polticas workflows (P3 traslado, reopen, multi-periodo), acc_cuotas_accion. Incluye reglas operativas: bitcora obligatoria por transicin/cambio, filtro por traslape de periodo y UX de edicin. | 20 |
| 22 | [22-AuthReport.md](./22-AuthReport.md) | Auditora enterprise Auth: decisiones, matriz de flujos, checklist, evidencia, pendientes. | 18, 10, 12 |
| 23 | [23-ModuloEmpleadosReferencia.md](./23-ModuloEmpleadosReferencia.md) | Mdulo Empleados referencia end-to-end: 4 vistas, backend verificacin, encriptacin PII, frontend estructura, sprints. | 18, 19, 20 |
| 24 | [24-PermisosEnterpriseOperacion.md](./24-PermisosEnterpriseOperacion.md) | Permisos enterprise: KPITAL vs TimeWise, vista Empresas/Roles/Excepciones, flujos operativos, problemas comunes. | 18, 20, 22 |
| 25 | [25-SistemaNotificacionesEnterprise.md](./25-SistemaNotificacionesEnterprise.md) | Sistema de notificaciones en tiempo real: campanita, badge, WebSocket, modelo enterprise (notificacin global + estado por usuario). | 18, 24 |
| 26 | [26-SistemaPermisosReferencia.md](./26-SistemaPermisosReferencia.md) | **Referencia tcnica** del sistema de permisos: tablas, dependencias, flujo de resolucin, diagnstico y scripts. | 18, 24 |
| 27 | [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md) | Flujo empleados, roles por app, vista Configuracin Usuarios, jerarqua de supervisin TimeWise (Supervisor Global, Supervisor, Empleado), dropdown supervisor filtrado, cross-empresa. | 16, 19, 24 |
| 28 | [28-PendientesAccion.md](./28-PendientesAccion.md) | Pendientes abiertos y acciones por ejecutar del proyecto. | Todos |
| 29 | [29-EstandarFormatoMoneda.md](./29-EstandarFormatoMoneda.md) | Estndar nico de formato/parseo/validacin monetaria para toda la app (CRC/USD), helper compartido y reglas obligatorias. | 05, 23 |
| 30 | [30-HistorialLaboralEmpleado.md](./30-HistorialLaboralEmpleado.md) | Lgica funcional y tcnica de Historial Laboral en creacin de empleado: acumulados, provisin de aguinaldo, validaciones y persistencia. | 23, 29 |
| 31 | [31-CifradoIdentidadYProvisionamiento.md](./31-CifradoIdentidadYProvisionamiento.md) | Ejecucin operativa de cifrado, sincronizacin empleado-usuario y provisionamiento automtico TimeWise con colas/workers idempotentes. | 23, 30 |
| 32 | [31-ValidacionFormulariosFrontend.md](./31-ValidacionFormulariosFrontend.md) | Validacin unificada de formularios: anti-SQL, textRules, emailRules, optionalNoSqlInjection. Trazabilidad en EmployeeCreateModal y CompaniesManagementPage. | 05, 23, 29 |
| 33 | [32-INFORME-VALIDACION-CIFRADO-IDENTIDAD.md](./32-INFORME-VALIDACION-CIFRADO-IDENTIDAD.md) | Informe tcnico de validacin de cifrado e identidad (Directiva 31). Plan de validacin, evidencia BD, observaciones. | 31 |
| 34 | [34-CasosUsoCriticosPlanillaRRHH.md](./34-CasosUsoCriticosPlanillaRRHH.md) | **Casos de uso crticos Planilla y RRHH (DOC-34 v1.1).** Catlogo UC-01 a UC-31, checklist 21 tems en 4 reas, directivas. Registro de cambios en Seccin 7. | 21, 23, 28 |
| 35 | [35-EstadoDOC34Implementacion.md](./35-EstadoDOC34Implementacion.md) | **Estado DOC-34 vs implementacin:** qu S hay / qu NO hay, checklist 21 tems por rea. Referencia permanente para planillas y RRHH. Alineado con Reporte Comit v2.0. | 34 |
| 36 | [36-ComparativoSistemaVsReporteComiteDOC34.md](./36-ComparativoSistemaVsReporteComiteDOC34.md) | Comparativo sistema actual vs Reporte Ejecutivo Comit DOC-34 v1.0: semforos, implementado vs pendiente. | 34, 35 |
| 37 | [37-ReporteEjecutivoDOC34-ComiteTecnico.md](./37-ReporteEjecutivoDOC34-ComiteTecnico.md) | **Reporte Ejecutivo Comit Tcnico DOC-34 v2.0** (post-auditora): estado global, semforo por rea, decisiones negocio, roadmap por sprint, riesgos. Documento oficial de seguimiento. | 34, 35 |
| 38 | [38-VacacionesAcumuladasEnterprise.md](./38-VacacionesAcumuladasEnterprise.md) | Reglas oficiales enterprise de vacaciones acumuladas: saldo inicial inmutable, provisin mensual por da ancla (1..28), ledger de movimientos, descuento por planilla aplicada, saldo negativo permitido, historial de monto provisionado y control de permisos. | 23, 30, 34 |
| 40 | [40-BlueprintPlanillaV2Compatible.md](./40-BlueprintPlanillaV2Compatible.md) | Blueprint definitivo y ejecutable para Planilla v2: compatibilidad incremental, estados numericos, slot_key/is_active, RBAC payroll y fases de implementacion. Incluye reglas implementadas de bitcora funcional, filtros de rango y persistencia de id_tipo_planilla. | 20, 21, 34 |
| 41 | [41-AuditoriaEnterprise-Consolidado.md](./41-AuditoriaEnterprise-Consolidado.md) | Consolidado de auditoria Rev.1 a Rev.3: hallazgos reportados vs verificados en codigo, veredicto final y condicion operacional previa a go-live. | 09, 28, 40 |
| 42 | [42-AccionesPersonal-Planilla-Fase0Cerrada.md](./42-AccionesPersonal-Planilla-Fase0Cerrada.md) | Acta tecnica consolidada para integrar Acciones de Personal con Planilla sin ruptura: reglas, estados, solape, retroactivos, permisos, trigger anti-delete y fases ejecutables. | 40, 41 |
| 43 | [43-AccionesPersonal-Ausencias-Implementacion-Operativa.md](./43-AccionesPersonal-Ausencias-Implementacion-Operativa.md) | Cierre operativo de Ausencias: persistencia real (header+lineas), tabla `acc_ausencias_lineas`, estado inicial `PENDING_SUPERVISOR`, reglas de planilla elegible, calculo de monto, avance secuencial, invalidacion, bitacora, apertura en cualquier estado (edicion/lectura), filtros por atencion y estabilidad UI de tabs/preloads. | 42 |
| 44 | [44-ContratosAPI-Ausencias-20260228.md](./44-ContratosAPI-Ausencias-20260228.md) | Contrato operativo final de Ausencias: catalogos, create, edit, advance, invalidate y audit-trail, con permisos, reglas por estado y validaciones de payload alineadas al flujo enterprise. | 20, 43 |
| 45 | [45-Handoff-AccionesPersonal-Ausencias.md](./45-Handoff-AccionesPersonal-Ausencias.md) | Handoff operativo para retomar desde cero: estado actual, reglas vigentes, endpoints, permisos, QA minimo, pendientes y roadmap por fases (A->E) con siguiente fase explicita. | 43, 44 |
| 46 | [46-AccionesPersonal-Bonificaciones-Implementacion-Operativa.md](./46-AccionesPersonal-Bonificaciones-Implementacion-Operativa.md) | Cierre operativo de Bonificaciones: vista/modal dedicados, tabla `acc_bonificaciones_lineas`, endpoints, permisos, catlogo de tipo de bonificacin, clculo de monto y evidencia de build/tests. | 42, 43 |
| 47 | [47-AccionesPersonal-HorasExtra-Implementacion-Operativa.md](./47-AccionesPersonal-HorasExtra-Implementacion-Operativa.md) | Cierre operativo de Horas Extra: vista/modal dedicados, tabla `acc_horas_extras_lineas`, fechas inicio/fin por lnea, tipo de jornada 6/7/8, clculo de monto y evidencia de migraciones/build/tests. | 42, 46 |
| 48 | [48-AccionesPersonal-ModeloPorPeriodo-Linea.md](./48-AccionesPersonal-ModeloPorPeriodo-Linea.md) | Decision vigente de bajo riesgo: split por periodo al guardar (1 accion por periodo distinto, mismas lineas juntas por periodo), con `group_id` comun, transaccionalidad y guard de edicion mono-periodo para Ausencias, Licencias, Incapacidades, Bonificaciones, Horas Extra, Retenciones y Descuentos. | 42, 45, 46, 47 |
| 49 | [49-AccionesPersonal-Descuentos-Implementacion-Operativa.md](./49-AccionesPersonal-Descuentos-Implementacion-Operativa.md) | Cierre operativo de Descuentos: vista/modal dedicados, tabla `acc_descuentos_lineas`, split por periodo al guardar, guard de edicion mono-periodo, permisos dedicados y evidencia de migraciones/tests/build. | 42, 48 |
---

## Estado del Proyecto

| rea | Estado |
|------|--------|
| Frontend (React + Vite + TS) | Estructura completa. State management, UI, men dinmico, login, guards, router. |
| API (NestJS) | Enterprise: 7 modulos + workflows + auth real (JWT + guards + permisos dinamicos) + hardening Rev.3 (helmet, health, CORS WS restringido). |
| Base de datos | Esquema enterprise en evolucion con migraciones versionadas, FK e indices operativos. PEND-001 ya implementado en regla de inactivacion de empresas. |
| Autenticacin | Login REAL: bcrypt + JWT + cookie httpOnly + JwtAuthGuard + PermissionsGuard. |
| Permisos | Modelo enterprise operativo con resolucion por contexto, catalogo de permisos `payroll:*` y enforcement backend 403 en rutas protegidas. |
| Notificaciones | Sistema enterprise: campanita con badge, notificaciones masivas por rol, estado individual (ledo/eliminado), WebSocket tiempo real. |
| Empleados | sys_empleados redefinida enterprise: 33 columnas, ENUMs, FKs a org/nom catlogos, workflow ACID. |
| Workflows | Infraestructura enterprise. EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven). |
| Pginas/Mdulos | Login + CompanySelection + Dashboard (placeholder). Mdulos de negocio pendientes. |

---

## Navegacin

La aplicacin usa **un nico men horizontal en el header** (sin sidebar/men lateral). Toda la navegacin se hace desde el men superior con dropdowns multinivel.

---

## Reglas de Documentacin

1. **Cada directiva que Roberto da se documenta como un archivo separado en esta carpeta.**
2. **El orden numrico es el orden cronolgico de decisiones.**
3. **Si se agrega un mdulo nuevo o una directiva nueva, se agrega un documento nuevo con el siguiente nmero.**
4. **Nunca se modifica un documento anterior sin documentar el cambio.**
5. **Esta carpeta es la fuente de verdad del "por qu" y el "qu". El cdigo es la fuente de verdad del "cmo".**
6. **Si se establece o cambia una regla, proceso o decisin, actualizar todos los documentos en `docs/` donde esa informacin deba reflejarse (ndices, resmenes, guas, reglas, APIs, etc.).**




---

## Bloque - Testing (corte vigente)

Documentacion de pruebas en `docs/Test/`:
- Estado actual consolidado: Backend `217/217` y Frontend `250/250` (100% en verde).
- `GUIA-TESTING.md`  Guia general e historial por fases
- `TEST-EXECUTION-REPORT.md`  Reporte por fases de ejecucion
- `MANUAL-PRUEBAS.md`  Procedimiento operativo
- `ANALISIS-ESTADO-PROYECTO-FASE4.md`  Calificacion por dimension (10/10)

---

## Nuevo Bloque - Automatizaciones

Se agrego documentacion formal de transferencia en la carpeta `docs/automatizaciones`:

- `01-vision-general.md`
- `02-arquitectura.md`
- `03-modelo-datos.md`
- `04-worker.md`
- `05-reglas-negocio.md`
- `06-monitoreo.md`
- `07-semaforo.md`
- `08-pruebas.md`
- `09-operacion.md`
- `10-seguridad.md`
- `11-limpieza-operativa-db.md`

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
