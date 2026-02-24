# KPITAL 360 — Estado Actual del Proyecto

**Documento:** 09  
**Última actualización:** 2026-02-24  
**Propósito:** Registro vivo del avance. Se actualiza cada vez que se completa una directiva o se hace un cambio significativo.

---

## Resumen Ejecutivo

KPITAL 360 es un ERP multiempresa enfocado en gestión de RRHH, planillas y acciones de personal. El proyecto empezó desde cero (sin código, sin BD, sin sistema previo). Se han completado las directivas de arquitectura frontend (state management, UI framework, navegación, login) y la configuración enterprise del backend (7 módulos por bounded context, TypeORM, bus de eventos, CORS).

---

## Principio Arquitectónico Fundamental

> **sys_usuarios ≠ sys_empleados** — Son bounded contexts distintos.
>
> - `sys_usuarios` (Auth) = cuenta digital para autenticarse. No tiene datos laborales.
> - `sys_empleados` (Employee Management) = persona contratada. Salario, puesto, departamento.
> - Vinculación opcional: `sys_empleados.id_usuario` (FK nullable).
> - No todos los empleados son usuarios. No todos los usuarios son empleados.
>
> Detalle completo: [14-ModeloIdentidadEnterprise.md](./14-ModeloIdentidadEnterprise.md) y [15-ModeladoSysUsuarios.md](./15-ModeladoSysUsuarios.md).

---

## Stack Tecnológico

| Capa | Tecnología | Estado |
|------|------------|--------|
| Frontend | React 19 + Vite + TypeScript | Activo |
| State Management | Redux Toolkit + TanStack Query + Context API | Implementado |
| UI Framework | Ant Design 5 + tema corporativo | Implementado |
| Enrutamiento | React Router DOM | Implementado (guards + layouts + router) |
| API Backend | NestJS + TypeScript + TypeORM + EventEmitter + JWT + Passport | Enterprise: 7 módulos + workflows + auth real. Guards + permisos dinámicos. |
| Base de datos | MySQL en AWS RDS (HRManagementDB_produccion, utf8mb4) | 14 tablas + seed completo. 7 migraciones ejecutadas. Payroll + Personal Actions. |
| Autenticación | **LOGIN REAL**: bcrypt + JWT + cookie httpOnly + JwtAuthGuard + PermissionsGuard + /me + /switch-company. Session restore en frontend. |
| Workflows | EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven) | Infraestructura enterprise en src/workflows/ |

---

## Inventario de Archivos — Frontend (~111 archivos TS/TSX)

### Store (Redux Toolkit) — 10 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `store/store.ts` | Configuración del store Redux | Completo |
| `store/hooks.ts` | `useAppDispatch`, `useAppSelector` tipados | Completo |
| `store/index.ts` | Re-exports | Completo |
| `store/slices/authSlice.ts` | Sesión, usuario, token, login/logout | Completo |
| `store/slices/permissionsSlice.ts` | Permisos del usuario para empresa activa | Completo |
| `store/slices/activeCompanySlice.ts` | Empresa activa seleccionada | Completo |
| `store/slices/menuSlice.ts` | Configuración maestra del menú header | Completo |
| `store/selectors/permissions.selectors.ts` | Selectors: `hasPermission`, `canCreate*`, etc. | Completo |
| `store/selectors/menu.selectors.ts` | Selector: `getVisibleMenuItems` filtra menú por permisos | Completo |
| `store/middleware/companyChangeListener.ts` | Cambio empresa → recarga permisos + invalida queries | Completo |

### Queries (TanStack Query) — 9 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `queries/queryClient.ts` | QueryClient global (staleTime 5min, retry 2, onError) | Completo |
| `queries/employees/keys.ts` | Query keys: `['employees', companyId, ...]` | Completo |
| `queries/employees/useEmployees.ts` | Hook listado empleados (GET /employees?idEmpresa=N) | Completo |
| `queries/employees/useEmployee.ts` | Hook detalle empleado (GET /employees/:id) | Completo |
| `queries/payrolls/keys.ts` | Query keys planillas | Completo |
| `queries/payrolls/usePayrolls.ts` | Hook listado planillas (GET /payroll?idEmpresa=N) | Completo |
| `queries/payrolls/usePayroll.ts` | Hook detalle planilla (GET /payroll/:id) | Completo |
| `queries/personal-actions/keys.ts` | Query keys acciones de personal | Completo |
| `queries/personal-actions/usePersonalActions.ts` | Hook listado acciones (GET /personal-actions?idEmpresa=N) | Completo |
| `queries/personal-actions/usePersonalAction.ts` | Hook detalle acción (GET /personal-actions/:id) | Completo |
| `queries/companies/keys.ts` | Query keys empresas | Completo |
| `queries/companies/useCompanies.ts` | Hook listado empresas (GET /companies) | Completo |

### Componentes UI — 10 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `components/ui/AppLayout.tsx` | Layout: Header fijo + Content | Completo |
| `components/ui/AppHeader/AppHeader.tsx` | Header 2 niveles (logo+usuario / menú) | Completo |
| `components/ui/AppHeader/Logo.tsx` | Logo corporativo (`LogoLarge.png`, 64px) | Completo |
| `components/ui/AppHeader/HeaderActions.tsx` | Campana notificaciones + Avatar con dropdown Perfil Usuario (nombre, rol, Mi Perfil, Cerrar sesión) | Completo |
| `components/ui/AppHeader/MainMenu.tsx` | Menú horizontal data-driven con submenús | Completo |
| `components/ui/AppHeader/AppHeader.module.css` | Estilos del header | Completo |
| `components/ui/AppHeader/ProfileDropdown.module.css` | Estilos del dropdown Perfil Usuario | Completo |
| `components/ui/AppHeader/index.ts` | Re-exports | Completo |
| `components/ui/KpButton.tsx` | Wrapper AntD Button (extensible) | Completo |
| `components/ui/KpTable.tsx` | Wrapper AntD Table (extensible) | Completo |
| `components/ui/index.ts` | Re-exports de todos los UI components | Completo |

### Configuración — 2 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `config/theme.ts` | Tokens corporativos (colorPrimary `#0d6efd`, Public Sans, etc.) | Completo |
| `config/menuIcons.tsx` | Mapa de íconos AntD por ID de menú | Completo |

### Providers y Contexts — 4 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `providers/Providers.tsx` | Wrapper raíz: Redux + TanStack + Theme + Locale + AntD | Completo |
| `providers/AntDConfigProvider.tsx` | ConfigProvider dinámico (tema + locale) | Completo |
| `contexts/ThemeContext.tsx` | Light/Dark toggle | Completo |
| `contexts/LocaleContext.tsx` | ES/EN selector | Completo |

### Raíz — 5 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `App.tsx` | Componente raíz, conecta store con layout | Completo |
| `main.tsx` | Entry point, monta Providers + BrowserRouter | Completo |
| `index.css` | Reset global + tipografía Public Sans | Completo |
| `App.css` | Estilos base de App | Completo |
| `selectors/index.ts` | Re-exports centralizados de selectors | Completo |

### Otros

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `api/permissions.ts` | `fetchPermissionsForCompany()` → POST /auth/switch-company real | Completo |
| `api/companies.ts` | `fetchCompanies()`, `fetchCompany()` → GET /companies | Completo |
| `api/employees.ts` | `fetchEmployees()`, `fetchEmployee()` → GET /employees | Completo |
| `api/payroll.ts` | `fetchPayrolls()`, `fetchPayroll()` → GET /payroll | Completo |
| `api/personalActions.ts` | `fetchPersonalActions()`, `fetchPersonalAction()` → GET /personal-actions | Completo |
| `config/api.ts` | API_URL configurable (VITE_API_URL o localhost:3000) | Completo |
| `hooks/useSessionRestore.ts` | Restaura sesión desde cookie httpOnly al cargar app | Completo |
| `lib/formatDate.ts` | `formatDateTime12h()` — formato fecha/hora 12h obligatorio (ver Doc 05) | Completo |

---

## Inventario de Testing (vigente 2026-02-24)

| Capa | Specs/Tests | Pruebas | Estado |
|------|-------------|---------|--------|
| Backend (Jest) | 15 archivos .spec.ts + 4 E2E | 137/137 | Pasando |
| Frontend (Vitest) | 6 archivos .test.ts | 184/184 | Pasando |
| **Total** | 21 archivos | **321/321** | 100% |

Cobertura: auth, employees, companies, workflows, access-control (apps, roles, permissions), payroll, personal-actions, notifications, ops, integration (domain-events), smoke tests. Ver `docs/Test/GUIA-TESTING.md` y `docs/Test/TEST-EXECUTION-REPORT.md`.

---

## Inventario de Archivos — API (~176 archivos TS)

### Raíz y Configuración

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/main.ts` | Bootstrap: CORS, ValidationPipe global, prefijo `/api`, puerto desde env, cookie-parser | Completo |
| `src/app.module.ts` | Módulo raíz: ConfigModule + TypeORM + EventEmitter + 7 módulos | Completo |
| `src/config/database.config.ts` | Config TypeORM async desde env vars | Completo |
| `src/config/jwt.config.ts` | Config JWT async desde env vars | Completo |
| `src/config/cookie.config.ts` | Config cookie httpOnly (dev/prod dinámico) | Completo |
| `src/common/strategies/jwt.strategy.ts` | Passport JWT Strategy — extrae token de cookie httpOnly | Completo |
| `src/common/guards/jwt-auth.guard.ts` | JwtAuthGuard — valida JWT | Completo |
| `src/common/guards/permissions.guard.ts` | PermissionsGuard — verifica permisos granulares (module:action) | Completo |
| `src/common/decorators/require-permissions.decorator.ts` | @RequirePermissions('payroll:view') | Completo |
| `src/common/decorators/current-user.decorator.ts` | @CurrentUser() extrae userId+email del request | Completo |
| `src/typeorm.config.ts` | Config para CLI de migraciones TypeORM | Completo |
| `.env` | Variables de entorno (AWS RDS) | Completo |
| `.env.example` | Template de variables de entorno | Completo |
| `.gitignore` | Ignora .env, dist, node_modules | Completo |

### Bus de Eventos (common/events)

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/common/events/domain-event.interface.ts` | Contrato base de todo evento de dominio | Completo |
| `src/common/events/event-names.ts` | Catálogo centralizado de nombres de eventos | Completo |

### Módulos por Bounded Context (7 módulos)

| Módulo | Archivos | Health Check | Eventos Definidos |
|--------|----------|-------------|-------------------|
| auth | module + auth.controller (login/logout/me/switch-company) + auth.service (buildSession/resolvePermissions) + users.controller + users.service + User entity + DTOs + JwtStrategy + JwtModule + PassportModule | `/api/auth/health` | — |
| companies | module + controller + service + Company entity + DTOs + events | `/api/companies/health` | CompanyCreated, CompanyUpdated |
| employees | module + controller + service + Employee entity (33 cols) + Department entity + Position entity + DTOs (enterprise) + events | `/api/employees/health` | EmployeeCreated, EmployeeMoved, EmployeeDeactivated, EmployeeEmailChanged |
| personal-actions | module + controller + service + PersonalAction entity + DTOs + endpoints (list, create, approve, reject, associate-to-payroll) | `/api/personal-actions/health` | PersonalActionCreated, PersonalActionApproved, PersonalActionRejected |
| payroll | module + controller + service + Payroll entity + PayPeriod entity (catálogo) + DTOs + endpoints (list, create, verify, apply, inactivate) | `/api/payroll/health` | PayrollOpened, PayrollVerified, PayrollApplied, PayrollDeactivated |
| access-control | module + 4 controllers + 4 services + 7 entities + 7 DTOs + events | `/api/roles/health` | RoleAssigned, PermissionsChanged |
| integration | module + events (placeholder Fase 3) | — | — (escucha payroll.applied) |

### Identity Schema — Entidades y CRUD

| Tabla | Entity | DTO | Service | Controller | Migración |
|-------|--------|-----|---------|------------|-----------|
| `sys_empresas` | Company | CreateCompany, UpdateCompany | CompaniesService (CRUD + inactivate/reactivate) | CompaniesController | CreateSysEmpresas ✅ |
| `sys_usuarios` | User | CreateUser, UpdateUser | UsersService (CRUD + inactivate/reactivate/block + bcrypt + hardening) | UsersController | CreateIdentitySchema ✅ + EnhanceSysUsuarios ✅ |
| `sys_apps` | App | CreateApp | AppsService (CRUD + inactivate) | AppsController | CreateIdentitySchema ✅ |
| `sys_usuario_app` | UserApp | AssignUserApp | UserAssignmentService | UserAssignmentController | CreateIdentitySchema ✅ |
| `sys_usuario_empresa` | UserCompany | AssignUserCompany | UserAssignmentService | UserAssignmentController | CreateIdentitySchema ✅ |
| `sys_roles` | Role | CreateRole | RolesService (CRUD + assign/remove permissions) | RolesController | CreateIdentitySchema ✅ |
| `sys_permisos` | Permission | CreatePermission | PermissionsService (CRUD) | PermissionsController | CreateIdentitySchema ✅ |
| `sys_rol_permiso` | RolePermission | AssignRolePermission | RolesService | RolesController | CreateIdentitySchema ✅ |
| `sys_usuario_rol` | UserRole | AssignUserRole | UserAssignmentService | UserAssignmentController | CreateIdentitySchema ✅ |
| `sys_empleados` | Employee | CreateEmployee, UpdateEmployee | EmployeesService (CRUD + inactivate/liquidar + workflow) | EmployeesController | RedefineEmpleadoEnterprise ✅ (33 cols, ENUMs, FKs org/nom) |
| `org_departamentos` | Department | — (catálogo) | — | — | RedefineEmpleadoEnterprise ✅ |
| `org_puestos` | Position | — (catálogo) | — | — | RedefineEmpleadoEnterprise ✅ |
| `nom_periodos_pago` | PayPeriod | — (catálogo, seed: Semanal/Quincenal/Mensual) | — | — | RedefineEmpleadoEnterprise ✅ |
| `nom_calendarios_nomina` | PayrollCalendar | CreatePayrollDto | PayrollService (create, verify, apply, reopen, inactivate) | PayrollController | CreateCalendarioNominaMaestro ✅ |
| `acc_acciones_personal` | PersonalAction | CreatePersonalActionDto | PersonalActionsService (create, approve, reject, associateToCalendar) | PersonalActionsController | CreatePayrollAndPersonalActions ✅ + CreateCalendarioNominaMaestro (id_calendario_nomina) |
| `acc_cuotas_accion` | ActionQuota | — (multi-período) | — | — | CreateCalendarioNominaMaestro ✅ |

### Workflows

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/workflows/common/workflow.interface.ts` | Contrato base `WorkflowResult` | Completo |
| `src/workflows/employees/employee-creation.workflow.ts` | Crear empleado + usuario + asignaciones (ACID) | Completo |
| `src/workflows/identity/identity-sync.workflow.ts` | Sincronizar email empleado → usuario (@OnEvent) | Completo |
| `src/workflows/employees/employee-moved.workflow.ts` | Política P3 traslado empleado (stub) | Stub |
| `src/workflows/payroll/payroll-applied.workflow.ts` | Efectos al aplicar planilla (stub) | Stub |
| `src/workflows/workflows.module.ts` | Módulo NestJS para todos los workflows | Completo |

### Database

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/database/migrations/1708531200000-CreateSysEmpresas.ts` | Tabla root aggregate sys_empresas | Ejecutada ✅ |
| `src/database/migrations/1708531300000-CreateIdentitySchema.ts` | 7 tablas identity + FK + índices | Ejecutada ✅ |
| `src/database/migrations/1708531400000-EnhanceSysUsuarios.ts` | ALTER: columnas enterprise (hardening, bloqueo, estados) | Ejecutada ✅ |
| `src/database/migrations/1708531500000-CreateSysEmpleados.ts` | sys_empleados con FK a sys_usuarios y sys_empresas | Ejecutada ✅ |
| `src/database/migrations/1708531600000-SeedIdentityCore.ts` | Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin, asignaciones | Ejecutada ✅ |
| `src/database/migrations/1708531700000-RedefineEmpleadoEnterprise.ts` | Redefinición enterprise: drop sys_empleados vieja, crear org_departamentos + org_puestos + nom_periodos_pago (seed), recrear sys_empleados (33 cols, ENUMs, 10 idx, 6 FKs) | Ejecutada ✅ |
| `src/database/migrations/1708531800000-CreatePayrollAndPersonalActions.ts` | nom_planillas (estados Abierta→Verificada→Aplicada→Inactiva) + acc_acciones_personal (pendiente→aprobada|rechazada, FK a empleado y planilla) | Ejecutada ✅ |
| `src/database/migrations/1708532400000-AddUserPermissionOverrides.ts` | sys_usuario_permiso: overrides ALLOW/DENY por usuario + empresa + app + permiso | Pendiente/Aplicar en DB |
| `src/database/stored-procedures/README.md` | Convenciones de SPs | Completo |

### Cross-App Identity (common)

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/common/constants/apps.ts` | PlatformApp enum + ALL_APPS | Completo |
| `src/common/decorators/require-app.decorator.ts` | @RequireApp() decorator | Completo |
| `src/common/guards/app-access.guard.ts` | AppAccessGuard (verifica enabledApps) | Completo |

---

## Menú Definido

Solo existe el **menú horizontal superior** (header). No hay sidebar/menú lateral.

**Opciones top-level:**
1. **Acciones de Personal** — Submenús completos definidos (Entradas, Salidas, Deducciones, Compensaciones, Incapacidades, Licencias, Ausencias)
2. **Parametros de Planilla** — Definido: Calendario de Nómina (Calendario, Feriados, Días de Pago), Artículos de Nomina, Movimientos de Nomina
3. **Gestion Planilla** — Definido: Planillas (Generar, Listado, Aplicadas, Carga Masiva), Traslado Interempresas
4. **Configuracion** — Definido con 2 grupos: Seguridad (Roles y Permisos, Usuarios) + Gestion Organizacional (Reglas, Empresas, Empleados, Clases, Proyectos, Cuentas Contables, Departamentos, Puestos)

Detalle completo en [08-EstructuraMenus.md](./08-EstructuraMenus.md).

---

## Directivas Completadas (Cronológico)

| # | Directiva | Documento | Fecha |
|---|-----------|-----------|-------|
| 1 | Lectura y alineación con EnfoqueSistema.md | `01-EnfoqueSistema.md` | 2026-02-21 |
| 2 | Crear 2 proyectos desde cero (React+Vite+TS + NestJS) | `02-ScaffoldingProyecto.md` | 2026-02-21 |
| 3 | Arquitectura de State Management (Redux + TanStack + Context) | `03-ArquitecturaStateManagement.md` | 2026-02-21 |
| 4 | Directivas ejecutables de State Management | `04-DirectivasStateManagement.md` | 2026-02-21 |
| 5 | Integración Ant Design con tema corporativo | `05-IntegracionAntDesign.md` | 2026-02-21 |
| 6 | Header de 2 niveles + menú horizontal dinámico | `06-DirectivasHeaderMenu.md` | 2026-02-21 |
| 7 | Definición submenús Acciones de Personal | `08-EstructuraMenus.md` | 2026-02-21 |
| 8 | Corrección: eliminar sidebar (solo menú superior) | Este documento | 2026-02-21 |
| 9 | Definición submenús Parametros de Planilla | `08-EstructuraMenus.md` | 2026-02-21 |
| 10 | Definición submenús Gestion Planilla | `08-EstructuraMenus.md` | 2026-02-21 |
| 11 | Definición submenús Configuracion (Seguridad + Gestion Organizacional) | `08-EstructuraMenus.md` | 2026-02-21 |
| 12 | Separación Login/Dashboard — layouts, guards, router, interceptor, pages | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 13 | Login visual según mockup (logo, inputs pill, Microsoft SSO, color #20638d) | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 14 | Configuración backend enterprise (TypeORM+MySQL, EventBus, 7 módulos, CORS, migraciones) | `11-DirectivasConfiguracionBackend.md` | 2026-02-21 |
| 15 | Identidad única y navegación cross-app (KPITAL ↔ TimeWise). SSO interno. | `12-DirectivasIdentidadCrossApp.md` | 2026-02-21 |
| 16 | Modelado sys_empresas (root aggregate). Entidad + migración + CRUD + inactivación lógica. | `13-ModeladoSysEmpresas.md` | 2026-02-21 |
| 17 | Core Identity Schema: 7 tablas (usuarios, apps, roles, permisos, puentes). FK, índices, CRUD completo. | `14-ModeloIdentidadEnterprise.md` | 2026-02-21 |
| 18 | Enhance sys_usuarios enterprise: username, hardening (failed_attempts, locked_until, last_login_ip), estados 1/2/3, password nullable, motivo inactivación. | `15-ModeladoSysUsuarios.md` | 2026-02-21 |
| 19 | sys_empleados + flujo ACID creación empleado con acceso TimeWise/KPITAL. Política sincronización identidad. | `16-CreacionEmpleadoConAcceso.md` | 2026-02-21 |
| 20 | Estándar de workflows enterprise. EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven). | `17-EstandarWorkflows.md` | 2026-02-21 |
| 21 | Identity Core Enterprise: seed, JWT real, guards, permisos dinámicos, conexión frontend↔backend, SSO base. | `18-IdentityCoreEnterprise.md` | 2026-02-21 |
| 22 | Redefinición enterprise sys_empleados: 33 columnas, ENUMs, FKs a org_departamentos/org_puestos/nom_periodos_pago. id_usuario fuera de DTO. | `19-RedefinicionEmpleadoEnterprise.md` | 2026-02-21 |
| 23 | MVP Contratos: Doc 20 con lista de endpoints, permission contract. Payroll Engine (nom_planillas, estados Abierta→Verificada→Aplicada→Inactiva). Personal Actions (acc_acciones_personal, approve/reject, vínculo planilla). TanStack Query conectado a /api reales (employees, companies, payrolls, personal-actions). | `20-MVPContratosEndpoints.md` | 2026-02-21 |
| 24 | Tabla Maestra Planillas (Doc 21): nom_calendarios_nomina reemplaza nom_planillas. Periodo trabajado vs ventana pago. Estados Abierta→En Proceso→Verificada→Aplicada→Contabilizada. Reopen Verificada→Abierta. acc_cuotas_accion para multi-período. Política P3 (bloquear traslado si cuotas sin destino). Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow stubs. | `21-TablaMaestraPlanillasYWorkflows.md` | 2026-02-21 |

---

## Qué Falta (No Construido)

| Área | Detalle | Prioridad |
|------|---------|-----------|
| ~~Seed inicial~~ | ~~apps, permisos, rol, usuario admin~~ | ✅ Completado |
| ~~Autenticación real (JWT)~~ | ~~Login real, JWT, cookie httpOnly, /me, /switch-company~~ | ✅ Completado |
| ~~Guards reales~~ | ~~JwtAuthGuard, PermissionsGuard, @RequirePermissions~~ | ✅ Completado |
| ~~Conexión frontend → backend~~ | ~~Login real, session restore, permisos dinámicos~~ | ✅ Completado |
| ~~Rutas/Páginas~~ | Páginas Empleados, Empresas, Usuarios construidas. Dashboard, Planillas en avance. | ✅ Parcial |
| ~~Queries reales~~ | ~~Hooks TanStack placeholder~~ | ✅ Conectados: employees, companies, payrolls, personal-actions |
| **Eventos de dominio** | emit() en EmployeesService y workflows. @OnEvent en IdentitySyncWorkflow. Faltan listeners en otros módulos. | En progreso |
| ~~Módulos de negocio~~ | ~~Payroll, Personal Actions: solo health checks~~ | ✅ Payroll y Personal Actions con lógica y specs |

---

## Changelog de Este Documento

| Fecha | Cambio |
|-------|--------|
| 2026-02-21 | Creación inicial con estado completo del proyecto |
| 2026-02-21 | Agregado Parametros de Planilla al menú definido |
| 2026-02-21 | Agregado Gestion Planilla y Configuracion al menú |
| 2026-02-21 | Implementada separación Login/Dashboard completa |
| 2026-02-21 | Login visual ajustado según mockup de Roberto |
| 2026-02-21 | Renombrados todos los docs con prefijo numérico consistente |
| 2026-02-21 | Configuración backend enterprise (Doc 11) — 7 módulos, TypeORM, EventBus, CORS |
| 2026-02-21 | Directiva identidad cross-app (Doc 12) — KPITAL ↔ TimeWise, SSO interno |
| 2026-02-21 | Implementado cross-app en código: activeAppSlice, AppAccessGuard, TokenPayload, app switcher |
| 2026-02-21 | SSO por cookie httpOnly: eliminado token de localStorage/Redux, credentials:'include', backend emite cookie, logout limpia cookie |
| 2026-02-21 | Modelado sys_empresas (Doc 13) — entidad, migración, DTOs, CRUD completo, inactivación lógica |
| 2026-02-21 | Core Identity Schema (Doc 14) — 7 tablas identity: sys_usuarios, sys_apps, sys_usuario_app, sys_usuario_empresa, sys_roles, sys_permisos, sys_rol_permiso, sys_usuario_rol. FK constraints, índices, entities, DTOs, services, controllers. Migración ejecutada en RDS. |
| 2026-02-21 | Enhance sys_usuarios (Doc 15) — ALTER TABLE: username, password_updated_at, requires_password_reset, motivo_inactivacion, failed_attempts, locked_until, last_login_ip. Columnas nullable (password_hash, creado_por, modificado_por). Estados 1/2/3. UserStatus enum. Validaciones de negocio enterprise. Migración ejecutada en RDS. |
| 2026-02-21 | Creación empleado con acceso (Doc 16) — sys_empleados con FK a sys_usuarios (nullable) y sys_empresas. Flujo ACID: crear user + employee + app + company en una transacción. Política sync identidad (email change → identity.login_updated). Migración ejecutada en RDS. |
| 2026-02-21 | Estándar workflows (Doc 17) — Infraestructura enterprise: src/workflows/ con WorkflowResult interface, EmployeeCreationWorkflow (ACID, queryRunner), IdentitySyncWorkflow (@OnEvent employee.email_changed). Módulo WorkflowsModule. |
| 2026-02-21 | Identity Core Enterprise (Doc 18) — Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin. Auth real: bcrypt + JWT + cookie httpOnly + /me + /switch-company. Guards: JwtAuthGuard + PermissionsGuard + @RequirePermissions + @CurrentUser. JWT Strategy. Frontend: useSessionRestore, login real, permisos dinámicos, company selection real. |
| 2026-02-21 | Redefinición Enterprise sys_empleados (Doc 19) — Drop + recrear sys_empleados con 33 columnas enterprise (ENUMs: género, estado civil, contrato, jornada, moneda). Creadas org_departamentos, org_puestos, nom_periodos_pago (seed: Semanal/Quincenal/Mensual). 10 índices + 6 FKs (empresa, usuario, departamento, puesto, supervisor, periodo pago). DTOs sin idUsuario. Employee entity + service + workflow actualizados. |
| 2026-02-21 | MVP Contratos (Doc 20) — Lista oficial endpoints MVP. Permission contract (module:action). Payroll Engine: nom_planillas, estados Abierta→Verificada→Aplicada→Inactiva. Personal Actions: acc_acciones_personal, approve/reject, associate-to-payroll. TanStack Query conectado a /api reales. |
| 2026-02-21 | Tabla Maestra Planillas (Doc 21) — nom_calendarios_nomina reemplaza nom_planillas. Ventanas periodo trabajado vs pago. Estados: Abierta, En Proceso, Verificada, Aplicada, Contabilizada, Inactiva. Reopen (Verificada→Abierta). acc_cuotas_accion para acciones multi-período. Política P3 traslado empleado. Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow. |
| 2026-02-21 | Dropdown Perfil Usuario en header — Avatar con menú: título "Perfil Usuario", nombre, rol (p. ej. Administrador de TI), enlace Mi Perfil (/profile), Cerrar sesión. performLogout usa API_URL. Página ProfilePage. |
| 2026-02-21 | Auth Report (Doc 22) — Auditoría enterprise de autenticación: decisiones (JWT cookie, logout global), matriz de flujos, checklist, evidencia requerida, pendientes (401 vs 404, PermissionsGuard, CSRF, rate-limit). |
| 2026-02-22 | Directiva 23 — Módulo Empleados referencia end-to-end. 4 vistas (listado, crear, detalle, modals). Encriptación PII en reposo, desencriptación solo si employee:view. Backend verificación, catálogos, paginación. Sprints 1-5. |
| 2026-02-22 | Ajuste de contratos catálogos: `/api/catalogs/departments`, `/positions`, `/pay-periods` quedan globales (sin `idEmpresa`). Se documenta `@AllowWithoutCompany()` en `PermissionsGuard` para evitar 403 por contexto de empresa en carga de formularios. |
| 2026-02-22 | RBAC + Overrides por usuario: nueva tabla `sys_usuario_permiso`, resolucion `roles + overrides` con precedencia `DENY > ALLOW`, endpoints admin bajo `/api/config/*` y vista frontend para listar permisos administrativos. |
| 2026-02-23 | Hardening de sesión/refresh: frontend con timeout en `httpInterceptor` y `tryRefreshSession` para evitar bloqueo en "Verificando sesión..."; backend `AuthService.refreshSession` maneja errores transientes de DB (`ECONNRESET`, etc.) y responde `401` controlado para forzar relogin seguro. |
| 2026-02-23 | Corrección flujo Microsoft popup: se evita race condition en callback OAuth (`/auth/login?code=...`) que abría `/dashboard` dentro de la ventana emergente. Se agregó detección de callback para saltar `session restore` y redirección de `PublicGuard` durante el handshake `postMessage + close`. |
| 2026-02-23 | **Convenciones UI y bitácora:** Formato de fecha 12h (AM/PM) documentado en Doc 05 — `formatDateTime12h()` en `src/lib/formatDate.ts`. Estándar de mensajes de bitácora documentado en Doc 11 — mensajes autosuficientes con antes/después, lenguaje humano, payloadBefore/After. |
| 2026-02-24 | **Empresas — UX y permisos:** Switch unificado para inactivar/reactivar (sin botones separados). Permisos agregados al entrar a página Empresas. Validación de permisos en formulario (crear, editar, inactivar, reactivar). API `GET /companies?inactiveOnly=true` para traer solo inactivas (evitar carga completa). Tabla refresca tras mutaciones. Modales de confirmación con estilo corporativo. Filtros colapsados por defecto. |
| 2026-02-24 | **Menú y paleta:** Opciones de menú requieren permiso; se ocultan si no existe en BD o no está asignado al usuario (Doc 08, 26). Color corporativo `#20638d` reemplaza celeste en tema, menú, dropdown hover (Doc 05). |
| 2026-02-24 | **Inventario de testing:** Agregada sección Testing vigente: 321/321 pruebas (Backend 137, Frontend 184), 15 specs + 4 E2E backend, 6 test files frontend. Actualizado conteo API (~176 TS) y Frontend (~111 TS/TSX). |
