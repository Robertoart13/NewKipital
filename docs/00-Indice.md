# KPITAL 360 — Índice de Documentación

**Proyecto:** KPITAL 360 — ERP Multiempresa  
**Autor:** Roberto — Arquitecto Funcional / Senior Engineer  
**Última actualización:** 2026-02-22

---

## Cómo Leer Esta Documentación

Si sos nuevo en el proyecto, leé los documentos **en orden numérico**. Cada uno construye sobre el anterior. No saltes.

Si ya estás en el proyecto y necesitás referencia puntual, usá esta tabla para ir directo al tema.

---

## Mapa de Documentos

| # | Documento | Qué Contiene | Prerrequisito |
|---|-----------|-------------|---------------|
| 01 | [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) | Visión arquitectónica del sistema completo. Blueprint formal. Bounded contexts, fases, principios, NFRs. **Documento rector.** | Ninguno |
| 02 | [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md) | Decisión de crear dos proyectos desde cero (Frontend + API). Stack tecnológico. Estructura base. | 01 |
| 03 | [03-ArquitecturaStateManagement.md](./03-ArquitecturaStateManagement.md) | Arquitectura detallada de estado. Redux + TanStack Query + Context. Boundaries, sincronización, invalidación. | 01, 02 |
| 04 | [04-DirectivasStateManagement.md](./04-DirectivasStateManagement.md) | Directiva ejecutable paso a paso de state management. Qué implementar y en qué orden. | 03 |
| 05 | [05-IntegracionAntDesign.md](./05-IntegracionAntDesign.md) | Integración de Ant Design como framework UI. Tema corporativo, componentes base, reglas. | 02 |
| 06 | [06-DirectivasHeaderMenu.md](./06-DirectivasHeaderMenu.md) | Header de 2 niveles (logo + usuario / menú horizontal). Diseño enterprise, menú data-driven. | 03, 05 |
| 08 | [08-EstructuraMenus.md](./08-EstructuraMenus.md) | Catálogo exacto de las opciones de menú definidas. Los 4 menús completos. | 06 |
| 09 | [09-EstadoActualProyecto.md](./09-EstadoActualProyecto.md) | **Estado vivo del proyecto.** Inventario de archivos, directivas completadas, qué falta. | Todos |
| 10 | [10-DirectivasSeparacionLoginDashboard.md](./10-DirectivasSeparacionLoginDashboard.md) | Separación Login/Dashboard. Layouts, guards con cascada, flujos de auth, logout, interceptor 401. | 04 |
| 11 | [11-DirectivasConfiguracionBackend.md](./11-DirectivasConfiguracionBackend.md) | Configuración backend enterprise. TypeORM + MySQL, bus de eventos, 7 módulos por bounded context, CORS, migraciones. | 01, 02 |
| 12 | [12-DirectivasIdentidadCrossApp.md](./12-DirectivasIdentidadCrossApp.md) | Identidad única y navegación cross-app (KPITAL ↔ TimeWise). SSO por cookie httpOnly. | 01, 11 |
| 13 | [13-ModeladoSysEmpresas.md](./13-ModeladoSysEmpresas.md) | Primera tabla: sys_empresas (root aggregate). Entidad, migración, CRUD, inactivación lógica. | 11 |
| 14 | [14-ModeloIdentidadEnterprise.md](./14-ModeloIdentidadEnterprise.md) | Core Identity Schema completo: 7 tablas (usuarios, apps, roles, permisos, tablas puente). FK constraints, índices, CRUD. | 11, 13 |
| 15 | [15-ModeladoSysUsuarios.md](./15-ModeladoSysUsuarios.md) | Enhance sys_usuarios: columnas enterprise (hardening, bloqueo, estados 1/2/3, password nullable). | 14 |
| 16 | [16-CreacionEmpleadoConAcceso.md](./16-CreacionEmpleadoConAcceso.md) | sys_empleados + flujo transaccional ACID de creación con acceso a TimeWise/KPITAL. Política de sincronización de identidad. | 14, 15 |
| 17 | [17-EstandarWorkflows.md](./17-EstandarWorkflows.md) | Estándar enterprise de workflows. Carpetas, convenciones, EmployeeCreationWorkflow, IdentitySyncWorkflow. | 16 |
| 18 | [18-IdentityCoreEnterprise.md](./18-IdentityCoreEnterprise.md) | Identity Core completo: seed, JWT real, guards, permisos dinámicos, conexión frontend↔backend, SSO base. | 14, 15, 17 |
| 19 | [19-RedefinicionEmpleadoEnterprise.md](./19-RedefinicionEmpleadoEnterprise.md) | Redefinición enterprise de sys_empleados + tablas org/nom (departamentos, puestos, periodos pago). Modelo completo con ENUMs, FKs, catálogos. | 16, 17 |
| 20 | [20-MVPContratosEndpoints.md](./20-MVPContratosEndpoints.md) | Contratos MVP: lista oficial de endpoints, permission contract (module:action), Payroll Engine y Personal Actions (esqueleto). | 18, 19 |
| 21 | [21-TablaMaestraPlanillasYWorkflows.md](./21-TablaMaestraPlanillasYWorkflows.md) | Tabla Maestra nom_calendarios_nomina, políticas workflows (P3 traslado, reopen, multi-periodo), acc_cuotas_accion. | 20 |
| 22 | [22-AuthReport.md](./22-AuthReport.md) | Auditoría enterprise Auth: decisiones, matriz de flujos, checklist, evidencia, pendientes. | 18, 10, 12 |
| 23 | [23-ModuloEmpleadosReferencia.md](./23-ModuloEmpleadosReferencia.md) | Módulo Empleados referencia end-to-end: 4 vistas, backend verificación, encriptación PII, frontend estructura, sprints. | 18, 19, 20 |
| 24 | [24-PermisosEnterpriseOperacion.md](./24-PermisosEnterpriseOperacion.md) | Permisos enterprise: KPITAL vs TimeWise, vista Empresas/Roles/Excepciones, flujos operativos, problemas comunes. | 18, 20, 22 |
| 25 | [25-SistemaNotificacionesEnterprise.md](./25-SistemaNotificacionesEnterprise.md) | Sistema de notificaciones en tiempo real: campanita, badge, WebSocket, modelo enterprise (notificación global + estado por usuario). | 18, 24 |
| 26 | [26-SistemaPermisosReferencia.md](./26-SistemaPermisosReferencia.md) | **Referencia técnica** del sistema de permisos: tablas, dependencias, flujo de resolución, diagnóstico y scripts. | 18, 24 |

---

## Estado del Proyecto

| Área | Estado |
|------|--------|
| Frontend (React + Vite + TS) | Estructura completa. State management, UI, menú dinámico, login, guards, router. |
| API (NestJS) | Enterprise: 7 módulos + workflows + auth real (JWT + guards + permisos dinámicos). |
| Base de datos | 14 tablas en RDS + seed completo. 7 migraciones ejecutadas. FK + índices enterprise. |
| Autenticación | Login REAL: bcrypt + JWT + cookie httpOnly + JwtAuthGuard + PermissionsGuard. |
| Permisos | Modelo enterprise operativo: resolucion por contexto, pantallas de administracion, modo catalogo (migration/ui) y enforcement backend 403. |
| Notificaciones | Sistema enterprise: campanita con badge, notificaciones masivas por rol, estado individual (leído/eliminado), WebSocket tiempo real. |
| Empleados | sys_empleados redefinida enterprise: 33 columnas, ENUMs, FKs a org/nom catálogos, workflow ACID. |
| Workflows | Infraestructura enterprise. EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven). |
| Páginas/Módulos | Login + CompanySelection + Dashboard (placeholder). Módulos de negocio pendientes. |

---

## Navegación

La aplicación usa **un único menú horizontal en el header** (sin sidebar/menú lateral). Toda la navegación se hace desde el menú superior con dropdowns multinivel.

---

## Reglas de Documentación

1. **Cada directiva que Roberto da se documenta como un archivo separado en esta carpeta.**
2. **El orden numérico es el orden cronológico de decisiones.**
3. **Si se agrega un módulo nuevo o una directiva nueva, se agrega un documento nuevo con el siguiente número.**
4. **Nunca se modifica un documento anterior sin documentar el cambio.**
5. **Esta carpeta es la fuente de verdad del "por qué" y el "qué". El código es la fuente de verdad del "cómo".**



