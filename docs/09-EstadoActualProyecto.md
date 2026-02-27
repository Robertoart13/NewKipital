# KPITAL 360 â€” Estado Actual del Proyecto

**Documento:** 09  
**Ãšltima actualizaciÃ³n:** 2026-02-27  
**PropÃ³sito:** Registro vivo del avance. Se actualiza cada vez que se completa una directiva o se hace un cambio significativo.

---

## Resumen Ejecutivo

KPITAL 360 es un ERP multiempresa enfocado en gestiÃ³n de RRHH, planillas y acciones de personal. El proyecto empezÃ³ desde cero (sin cÃ³digo, sin BD, sin sistema previo). Se han completado las directivas de arquitectura frontend (state management, UI framework, navegaciÃ³n, login) y la configuraciÃ³n enterprise del backend (7 mÃ³dulos por bounded context, TypeORM, bus de eventos, CORS).

---

## Principio ArquitectÃ³nico Fundamental

> **sys_usuarios â‰  sys_empleados** â€” Son bounded contexts distintos.
>
> - `sys_usuarios` (Auth) = cuenta digital para autenticarse. No tiene datos laborales.
> - `sys_empleados` (Employee Management) = persona contratada. Salario, puesto, departamento.
> - VinculaciÃ³n opcional: `sys_empleados.id_usuario` (FK nullable).
> - No todos los empleados son usuarios. No todos los usuarios son empleados.
>
> Detalle completo: [14-ModeloIdentidadEnterprise.md](./14-ModeloIdentidadEnterprise.md) y [15-ModeladoSysUsuarios.md](./15-ModeladoSysUsuarios.md).

---

## Stack TecnolÃ³gico

| Capa | TecnologÃ­a | Estado |
|------|------------|--------|
| Frontend | React 19 + Vite + TypeScript | Activo |
| State Management | Redux Toolkit + TanStack Query + Context API | Implementado |
| UI Framework | Ant Design 5 + tema corporativo | Implementado |
| Enrutamiento | React Router DOM | Implementado (guards + layouts + router) |
| API Backend | NestJS + TypeScript + TypeORM + EventEmitter + JWT + Passport | Enterprise: 7 mÃ³dulos + workflows + auth real. Guards + permisos dinÃ¡micos. |
| Base de datos | MySQL en AWS RDS (HRManagementDB_produccion, utf8mb4) | 14 tablas + seed completo. 7 migraciones ejecutadas. Payroll + Personal Actions. |
| AutenticaciÃ³n | **LOGIN REAL**: bcrypt + JWT + cookie httpOnly + JwtAuthGuard + PermissionsGuard + /me + /switch-company. Session restore en frontend. |
| Workflows | EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven) | Infraestructura enterprise en src/workflows/ |

---

## Inventario de Archivos â€” Frontend (~111 archivos TS/TSX)

### Store (Redux Toolkit) â€” 10 archivos

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `store/store.ts` | ConfiguraciÃ³n del store Redux | Completo |
| `store/hooks.ts` | `useAppDispatch`, `useAppSelector` tipados | Completo |
| `store/index.ts` | Re-exports | Completo |
| `store/slices/authSlice.ts` | SesiÃ³n, usuario, token, login/logout | Completo |
| `store/slices/permissionsSlice.ts` | Permisos del usuario para empresa activa | Completo |
| `store/slices/activeCompanySlice.ts` | Empresa activa seleccionada | Completo |
| `store/slices/menuSlice.ts` | ConfiguraciÃ³n maestra del menÃº header | Completo |
| `store/selectors/permissions.selectors.ts` | Selectors: `hasPermission`, `canCreate*`, etc. | Completo |
| `store/selectors/menu.selectors.ts` | Selector: `getVisibleMenuItems` filtra menÃº por permisos | Completo |
| `store/middleware/companyChangeListener.ts` | Cambio empresa â†’ recarga permisos + invalida queries | Completo |

### Queries (TanStack Query) â€” 9 archivos

| Archivo | PropÃ³sito | Estado |
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
| `queries/personal-actions/usePersonalAction.ts` | Hook detalle acciÃ³n (GET /personal-actions/:id) | Completo |
| `queries/companies/keys.ts` | Query keys empresas | Completo |
| `queries/companies/useCompanies.ts` | Hook listado empresas (GET /companies) | Completo |

### Componentes UI â€” 10 archivos

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `components/ui/AppLayout.tsx` | Layout: Header fijo + Content | Completo |
| `components/ui/AppHeader/AppHeader.tsx` | Header 2 niveles (logo+usuario / menÃº) | Completo |
| `components/ui/AppHeader/Logo.tsx` | Logo corporativo (`LogoLarge.png`, 64px) | Completo |
| `components/ui/AppHeader/HeaderActions.tsx` | Campana notificaciones + Avatar con dropdown Perfil Usuario (nombre, rol, Mi Perfil, Cerrar sesiÃ³n) | Completo |
| `components/ui/AppHeader/MainMenu.tsx` | MenÃº horizontal data-driven con submenÃºs | Completo |
| `components/ui/AppHeader/AppHeader.module.css` | Estilos del header | Completo |
| `components/ui/AppHeader/ProfileDropdown.module.css` | Estilos del dropdown Perfil Usuario | Completo |
| `components/ui/AppHeader/index.ts` | Re-exports | Completo |
| `components/ui/KpButton.tsx` | Wrapper AntD Button (extensible) | Completo |
| `components/ui/KpTable.tsx` | Wrapper AntD Table (extensible) | Completo |
| `components/ui/index.ts` | Re-exports de todos los UI components | Completo |

### ConfiguraciÃ³n â€” 2 archivos

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `config/theme.ts` | Tokens corporativos (colorPrimary `#0d6efd`, Public Sans, etc.) | Completo |
| `config/menuIcons.tsx` | Mapa de Ã­conos AntD por ID de menÃº | Completo |

### Providers y Contexts â€” 4 archivos

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `providers/Providers.tsx` | Wrapper raÃ­z: Redux + TanStack + Theme + Locale + AntD | Completo |
| `providers/AntDConfigProvider.tsx` | ConfigProvider dinÃ¡mico (tema + locale) | Completo |
| `contexts/ThemeContext.tsx` | Light/Dark toggle | Completo |
| `contexts/LocaleContext.tsx` | ES/EN selector | Completo |

### RaÃ­z â€” 5 archivos

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `App.tsx` | Componente raÃ­z, conecta store con layout | Completo |
| `main.tsx` | Entry point, monta Providers + BrowserRouter | Completo |
| `index.css` | Reset global + tipografÃ­a Public Sans | Completo |
| `App.css` | Estilos base de App | Completo |
| `selectors/index.ts` | Re-exports centralizados de selectors | Completo |

### Otros

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `api/permissions.ts` | `fetchPermissionsForCompany()` â†’ POST /auth/switch-company real | Completo |
| `api/companies.ts` | `fetchCompanies()`, `fetchCompany()` â†’ GET /companies | Completo |
| `api/employees.ts` | `fetchEmployees()`, `fetchEmployee()` â†’ GET /employees | Completo |
| `api/payroll.ts` | `fetchPayrolls()`, `fetchPayroll()` â†’ GET /payroll | Completo |
| `api/personalActions.ts` | `fetchPersonalActions()`, `fetchPersonalAction()` â†’ GET /personal-actions | Completo |
| `config/api.ts` | API_URL configurable (VITE_API_URL o localhost:3000) | Completo |
| `hooks/useSessionRestore.ts` | Restaura sesiÃ³n desde cookie httpOnly al cargar app | Completo |
| `lib/formatDate.ts` | `formatDateTime12h()` â€” formato fecha/hora 12h obligatorio (ver Doc 05) | Completo |

---

## Inventario de Testing (vigente 2026-02-25)

| Capa | Specs/Tests | Pruebas | Estado |
|------|-------------|---------|--------|
| Backend (Jest) | 22 archivos .spec.ts + 4 E2E | 187/187 | Pasando |
| Frontend (Vitest) | 19 archivos .test.ts | 331/331 | Pasando |
| **Total** | 45 archivos | **518/518** | 100% |

Cobertura: auth, employees, companies, workflows, access-control (apps, roles, permissions), payroll, personal-actions, notifications, ops, integration (domain-events), smoke tests. Ver `docs/Test/GUIA-TESTING.md` y `docs/Test/TEST-EXECUTION-REPORT.md`.

---

## Inventario de Archivos â€” API (~176 archivos TS)

### RaÃ­z y ConfiguraciÃ³n

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `src/main.ts` | Bootstrap: CORS, ValidationPipe global, prefijo `/api`, puerto desde env, cookie-parser | Completo |
| `src/app.module.ts` | MÃ³dulo raÃ­z: ConfigModule + TypeORM + EventEmitter + 7 mÃ³dulos | Completo |
| `src/config/database.config.ts` | Config TypeORM async desde env vars | Completo |
| `src/config/jwt.config.ts` | Config JWT async desde env vars | Completo |
| `src/config/cookie.config.ts` | Config cookie httpOnly (dev/prod dinÃ¡mico) | Completo |
| `src/common/strategies/jwt.strategy.ts` | Passport JWT Strategy â€” extrae token de cookie httpOnly | Completo |
| `src/common/guards/jwt-auth.guard.ts` | JwtAuthGuard â€” valida JWT | Completo |
| `src/common/guards/permissions.guard.ts` | PermissionsGuard â€” verifica permisos granulares (module:action) | Completo |
| `src/common/decorators/require-permissions.decorator.ts` | @RequirePermissions('payroll:view') | Completo |
| `src/common/decorators/current-user.decorator.ts` | @CurrentUser() extrae userId+email del request | Completo |
| `src/typeorm.config.ts` | Config para CLI de migraciones TypeORM | Completo |
| `.env` | Variables de entorno (AWS RDS) | Completo |
| `.env.example` | Template de variables de entorno | Completo |
| `.gitignore` | Ignora .env, dist, node_modules | Completo |

### Bus de Eventos (common/events)

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `src/common/events/domain-event.interface.ts` | Contrato base de todo evento de dominio | Completo |
| `src/common/events/event-names.ts` | CatÃ¡logo centralizado de nombres de eventos | Completo |

### MÃ³dulos por Bounded Context (7 mÃ³dulos)

| MÃ³dulo | Archivos | Health Check | Eventos Definidos |
|--------|----------|-------------|-------------------|
| auth | module + auth.controller (login/logout/me/switch-company) + auth.service (buildSession/resolvePermissions) + users.controller + users.service + User entity + DTOs + JwtStrategy + JwtModule + PassportModule | `/api/auth/health` | â€” |
| companies | module + controller + service + Company entity + DTOs + events | `/api/companies/health` | CompanyCreated, CompanyUpdated |
| employees | module + controller + service + Employee entity (33 cols) + Department entity + Position entity + DTOs (enterprise) + events | `/api/employees/health` | EmployeeCreated, EmployeeMoved, EmployeeDeactivated, EmployeeEmailChanged |
| personal-actions | module + controller + service + PersonalAction entity + DTOs + endpoints (list, create, approve, reject, associate-to-payroll) | `/api/personal-actions/health` | PersonalActionCreated, PersonalActionApproved, PersonalActionRejected |
| payroll | module + controller + service + Payroll entity + PayPeriod entity (catÃ¡logo) + DTOs + endpoints (list, create, verify, apply, inactivate) | `/api/payroll/health` | PayrollOpened, PayrollVerified, PayrollApplied, PayrollDeactivated |
| access-control | module + 4 controllers + 4 services + 7 entities + 7 DTOs + events | `/api/roles/health` | RoleAssigned, PermissionsChanged |
| integration | module + events (placeholder Fase 3) | â€” | â€” (escucha payroll.applied) |

### Identity Schema â€” Entidades y CRUD

| Tabla | Entity | DTO | Service | Controller | MigraciÃ³n |
|-------|--------|-----|---------|------------|-----------|
| `sys_empresas` | Company | CreateCompany, UpdateCompany | CompaniesService (CRUD + inactivate/reactivate) | CompaniesController | CreateSysEmpresas âœ… |
| `sys_usuarios` | User | CreateUser, UpdateUser | UsersService (CRUD + inactivate/reactivate/block + bcrypt + hardening) | UsersController | CreateIdentitySchema âœ… + EnhanceSysUsuarios âœ… |
| `sys_apps` | App | CreateApp | AppsService (CRUD + inactivate) | AppsController | CreateIdentitySchema âœ… |
| `sys_usuario_app` | UserApp | AssignUserApp | UserAssignmentService | UserAssignmentController | CreateIdentitySchema âœ… |
| `sys_usuario_empresa` | UserCompany | AssignUserCompany | UserAssignmentService | UserAssignmentController | CreateIdentitySchema âœ… |
| `sys_roles` | Role | CreateRole | RolesService (CRUD + assign/remove permissions) | RolesController | CreateIdentitySchema âœ… |
| `sys_permisos` | Permission | CreatePermission | PermissionsService (CRUD) | PermissionsController | CreateIdentitySchema âœ… |
| `sys_rol_permiso` | RolePermission | AssignRolePermission | RolesService | RolesController | CreateIdentitySchema âœ… |
| `sys_usuario_rol` | UserRole | AssignUserRole | UserAssignmentService | UserAssignmentController | CreateIdentitySchema âœ… |
| `sys_empleados` | Employee | CreateEmployee, UpdateEmployee | EmployeesService (CRUD + inactivate/liquidar + workflow) | EmployeesController | RedefineEmpleadoEnterprise âœ… (33 cols, ENUMs, FKs org/nom) |
| `org_departamentos` | Department | â€” (catÃ¡logo) | â€” | â€” | RedefineEmpleadoEnterprise âœ… |
| `org_puestos` | Position | â€” (catÃ¡logo) | â€” | â€” | RedefineEmpleadoEnterprise âœ… |
| `nom_periodos_pago` | PayPeriod | â€” (catÃ¡logo, seed: Semanal/Quincenal/Mensual) | â€” | â€” | RedefineEmpleadoEnterprise âœ… |
| `nom_calendarios_nomina` | PayrollCalendar | CreatePayrollDto | PayrollService (create, verify, apply, reopen, inactivate) | PayrollController | CreateCalendarioNominaMaestro âœ… |
| `acc_acciones_personal` | PersonalAction | CreatePersonalActionDto | PersonalActionsService (create, approve, reject, associateToCalendar) | PersonalActionsController | CreatePayrollAndPersonalActions âœ… + CreateCalendarioNominaMaestro (id_calendario_nomina) |
| `acc_cuotas_accion` | ActionQuota | â€” (multi-perÃ­odo) | â€” | â€” | CreateCalendarioNominaMaestro âœ… |

### Workflows

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `src/workflows/common/workflow.interface.ts` | Contrato base `WorkflowResult` | Completo |
| `src/workflows/employees/employee-creation.workflow.ts` | Crear empleado + usuario + asignaciones (ACID) | Completo |
| `src/workflows/identity/identity-sync.workflow.ts` | Sincronizar email empleado â†’ usuario (@OnEvent) | Completo |
| `src/workflows/employees/employee-moved.workflow.ts` | PolÃ­tica P3 traslado empleado (stub) | Stub |
| `src/workflows/payroll/payroll-applied.workflow.ts` | Efectos al aplicar planilla (stub) | Stub |
| `src/workflows/workflows.module.ts` | MÃ³dulo NestJS para todos los workflows | Completo |

### Database

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `src/database/migrations/1708531200000-CreateSysEmpresas.ts` | Tabla root aggregate sys_empresas | Ejecutada âœ… |
| `src/database/migrations/1708531300000-CreateIdentitySchema.ts` | 7 tablas identity + FK + Ã­ndices | Ejecutada âœ… |
| `src/database/migrations/1708531400000-EnhanceSysUsuarios.ts` | ALTER: columnas enterprise (hardening, bloqueo, estados) | Ejecutada âœ… |
| `src/database/migrations/1708531500000-CreateSysEmpleados.ts` | sys_empleados con FK a sys_usuarios y sys_empresas | Ejecutada âœ… |
| `src/database/migrations/1708531600000-SeedIdentityCore.ts` | Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin, asignaciones | Ejecutada âœ… |
| `src/database/migrations/1708531700000-RedefineEmpleadoEnterprise.ts` | RedefiniciÃ³n enterprise: drop sys_empleados vieja, crear org_departamentos + org_puestos + nom_periodos_pago (seed), recrear sys_empleados (33 cols, ENUMs, 10 idx, 6 FKs) | Ejecutada âœ… |
| `src/database/migrations/1708531800000-CreatePayrollAndPersonalActions.ts` | nom_planillas (estados Abiertaâ†’Verificadaâ†’Aplicadaâ†’Inactiva) + acc_acciones_personal (pendienteâ†’aprobada|rechazada, FK a empleado y planilla) | Ejecutada âœ… |
| `src/database/migrations/1708532400000-AddUserPermissionOverrides.ts` | sys_usuario_permiso: overrides ALLOW/DENY por usuario + empresa + app + permiso | Pendiente/Aplicar en DB |
| `src/database/stored-procedures/README.md` | Convenciones de SPs | Completo |

### Cross-App Identity (common)

| Archivo | PropÃ³sito | Estado |
|---------|-----------|--------|
| `src/common/constants/apps.ts` | PlatformApp enum + ALL_APPS | Completo |
| `src/common/decorators/require-app.decorator.ts` | @RequireApp() decorator | Completo |
| `src/common/guards/app-access.guard.ts` | AppAccessGuard (verifica enabledApps) | Completo |

---

## MenÃº Definido

Solo existe el **menÃº horizontal superior** (header). No hay sidebar/menÃº lateral.

**Opciones top-level:**
1. **Acciones de Personal** â€” SubmenÃºs completos definidos (Entradas, Salidas, Deducciones, Compensaciones, Incapacidades, Licencias, Ausencias)
2. **Parametros de Planilla** â€” Activo: Calendario de NÃ³mina (Calendario, Listado de Feriados, DÃ­as de Pago), ArtÃ­culos de Nomina, Movimientos de Nomina
3. **Gestion Planilla** â€” Fuera de alcance actual (oculto en menÃº)
4. **Configuracion** â€” Definido con 2 grupos: Seguridad (Roles y Permisos, Usuarios) + Gestion Organizacional (Reglas, Empresas, Empleados, Clases, Proyectos, Cuentas Contables, Departamentos, Puestos)

### 4.x Regla de UX - Bitacora en modales de edicion
- La pestaÃ±a **Bitacora** solo debe mostrarse cuando:
  - El registro existe (modo edicion).
  - El usuario tiene el permiso de bitacora correspondiente.
- Si el permiso no existe, la pestaÃ±a **no se muestra** (no se deja tab vacio).
- El contenido de Bitacora se carga **solo al abrir la pestaÃ±a** (lazy load) para evitar peticiones innecesarias.

Permisos por modulo:
- Clases: `config:clases:audit`
- Proyectos: `config:proyectos:audit`
- Departamentos: `config:departamentos:audit`
- Puestos: `config:puestos:audit`
- Cuentas contables: `config:cuentas-contables:audit`

### 4.x Regla de UX - Selector de empresa en Proyectos
- **Crear Proyecto:** solo permite seleccionar empresas activas.
- **Editar Proyecto:**  
  - Si la empresa actual esta activa, el selector es editable.  
  - Si la empresa actual esta inactiva, se muestra el valor actual como solo lectura con badge â€œInactivaâ€ y se habilita un selector adicional para cambiar a una empresa activa.

### 4.x Cuentas Contables (ERP)
- Modulo completo: crear, listar, editar, inactivar, reactivar y bitacora.
- Permisos: `accounting-account:view`, `accounting-account:create`, `accounting-account:edit`, `accounting-account:inactivate`, `accounting-account:reactivate`, `config:cuentas-contables`, `config:cuentas-contables:audit`.
- Tablas base:
  - `erp_tipo_cuenta` (catalogo de tipos ERP)
  - `nom_tipos_accion_personal` (catalogo acciones personal)
  - `erp_cuentas_contables` (cuentas por empresa)
- Logica actual de tipo de cuenta:
  - UI muestra y selecciona el tipo por `id_externo_erp` (ej. `Gasto (ext:18)`).
  - API recibe ese valor en crear/editar y lo resuelve al `id_tipo_erp` interno activo.
  - Persistencia final en BD: `erp_cuentas_contables.id_tipo_erp` (FK interna).
- Reglas de UX:
  - Selector multi-empresa en listado (igual que Empleados).
  - Si empresa/tipo/accion queda inactivo, se muestra en solo lectura con badge y se habilita selector para cambiar a activo.
  - Preload al abrir edicion y al refrescar listado post crear/editar.

### 4.x Articulos de Nomina (Parametros de Planilla)
**Objetivo:** modulo CRUD enterprise para gestionar articulos de nomina por empresa, con reglas de cuentas contables y bitacora.

**Permisos (todos requeridos segun accion):**
- `payroll-article:view` (listar/ver).
- `payroll-article:create`.
- `payroll-article:edit`.
- `payroll-article:inactivate`.
- `payroll-article:reactivate`.
- `config:payroll-articles:audit` (bitacora).

**Campos (no existe codigo):**
- Empresa (obligatorio).
- Nombre Articulo (obligatorio).
- Tipo Accion Personal (obligatorio) -> `nom_tipos_accion_personal`.
- Tipo Articulo Nomina (obligatorio) -> `nom_tipo_articulo_nomina`.
- Cuenta Gasto (obligatoria).
- Cuenta Pasivo (opcional, solo aplica para Aporte Patronal).
- Descripcion (opcional, default `--` si viene vacia).

**Catalogos requeridos:**
- `nom_tipo_articulo_nomina` con seed:
  - `Ingreso` (id=1)
  - `Deduccion` (id=2)
  - `Gasto Empleado` (id=9)
  - `Aporte Patronal` (id=10)
- `nom_tipos_accion_personal` (existente).
- `erp_cuentas_contables` (existente).

**Reglas de cuentas contables (idsReferencia -> id_tipo_erp):**
- Ingreso -> [18, 19, 17]
- Deduccion -> [12, 13, 14]
- Gasto Empleado -> [18, 19, 12]
- Aporte Patronal -> [18, 19, 13]

**Flujo actual de carga de cuentas (Crear/Editar Articulo):**
- Frontend resuelve `idsReferencia` desde el tipo seleccionado (catalogo fijo).
- Frontend llama: `GET /payroll-articles/accounts?idEmpresa=...&idsReferencia=...`.
- Backend filtra en `erp_cuentas_contables` por:
  - `id_empresa = ?`
  - `id_tipo_erp IN (idsReferencia)`

**Etiquetas dinamicas de cuenta:**
- Ingreso: "Cuenta Gasto".
- Deduccion: "Cuenta Pasivo".
- Gasto Empleado: "Cuenta Costo".
- Aporte Patronal: "Cuenta Gasto" + "Cuenta Pasivo (opcional)".

**Reglas de creacion/edicion (estilo Netsuite/Oracle):**
- Crear: solo opciones activas (empresa, tipo articulo, tipo accion, cuentas).
- Editar: si un catalogo queda inactivo, se muestra el valor actual en solo lectura con badge "Inactivo" y se habilita selector para cambiar a activo.
- Las cuentas solo cargan cuando se selecciona empresa.
- Cuentas filtradas por empresa y por regla de tipo de articulo (idsReferencia).

**Bitacora:**
- Solo se muestra en edicion y con permiso `config:payroll-articles:audit`.
- Carga lazy: solo al abrir la pestaña Bitacora.

**Listado/filtros:**
- Mismo UX de Empresas/Empleados/Cuentas Contables.
- Filtros: Empresa, Nombre, Tipo Articulo, Tipo Accion, Cuenta Principal, Cuenta Pasivo, Estado.
- Selector multi-empresa en listado.

**Pendiente tecnico (estado actual):**
- Crear vista frontend `PayrollArticlesManagementPage.tsx` con el layout estandar.
- Registrar export y ruta `/payroll-params/articulos`.
- Aplicar migracion + seed en `hr_pro`.
- Ejecutar pruebas y actualizar `docs/Test/TEST-EXECUTION-REPORT.md`.

Detalle completo en [08-EstructuraMenus.md](./08-EstructuraMenus.md).

### 4.y Modulo Movimientos de Nomina (Parametros de Planilla)

Estado: Implementado (backend + frontend + BD en `hr_pro`).

**Permisos:**
- `payroll-movement:view`
- `payroll-movement:create`
- `payroll-movement:edit`
- `payroll-movement:inactivate`
- `payroll-movement:reactivate`
- `config:payroll-movements:audit`

**Ruta frontend:**
- `/payroll-params/movimientos`

**Tabla BD:**
- `nom_movimientos_nomina`
  - empresa, articulo nomina, tipo accion personal, clase/proyecto opcionales,
  - tipo de calculo por booleano (`es_monto_fijo_movimiento_nomina`),
  - `monto_fijo_movimiento_nomina` y `porcentaje_movimiento_nomina` guardados como texto para preservar decimales exactos ingresados por usuario.

**Reglas clave:**
- Articulo de nomina se carga por empresa.
- Tipo accion personal se autocompleta desde el articulo seleccionado.
- Si monto fijo: porcentaje debe ser `0`.
- Si porcentaje: monto fijo debe ser `0`.
- Monto y porcentaje no negativos.
- Bitacora visible solo con `config:payroll-movements:audit`.
- En modal Crear/Editar, el boton guardar funciona sin abrir todas las pestañas; la validacion ocurre al submit y posiciona al usuario en la pestaña con error si aplica.

**API del modulo:**
- `GET /api/payroll-movements`
- `GET /api/payroll-movements/:id`
- `POST /api/payroll-movements`
- `PUT /api/payroll-movements/:id`
- `PATCH /api/payroll-movements/:id/inactivate`
- `PATCH /api/payroll-movements/:id/reactivate`
- `GET /api/payroll-movements/:id/audit-trail`
- `GET /api/payroll-movements/articles?idEmpresa=...`
- `GET /api/payroll-movements/personal-action-types`
- `GET /api/payroll-movements/classes`
- `GET /api/payroll-movements/projects?idEmpresa=...`

**Nota de migraciones en entorno actual:**
- La migracion del modulo fue agregada en codigo.
- En la BD `HRManagementDB_produccion` se aplico SQL idempotente directo para este modulo por desalineacion historica del historial de migraciones legacy.

### 4.x Sincronizacion de permisos en tiempo real (Enterprise)
- Objetivo: reflejar cambios de roles/permisos sin refrescar pantalla y sin afectar usuarios no involucrados.
- Backend:
  - Cache de permisos con llave versionada por usuario/contexto:
    - `perm:{userId}:{companyId}:{appCode}:{versionToken}`
  - `versionToken` proviene de `sys_authz_version` (global + usuario).
  - Cambios de permisos en roles:
    - Se detectan usuarios afectados por `id_rol` en `sys_usuario_rol` y `sys_usuario_rol_global`.
    - Se ejecuta `bumpUsers([...afectados])` (no `bumpGlobal`) para invalidacion dirigida.
    - Se emite evento SSE `permissions.changed` solo a usuarios afectados.
  - Cambios de asignaciones/permisos por usuario:
    - `UserAssignmentService` tambien emite `permissions.changed` al usuario afectado.
  - Endpoints de soporte:
    - `GET /api/auth/permissions-stream` (SSE por usuario autenticado).
    - `GET /api/auth/authz-token` (token liviano de version de autorizacion).
    - `GET /api/auth/me` y `POST /api/auth/switch-company` aceptan `refreshAuthz=true` para bypass de cache.
- Frontend:
  - Hook realtime abre SSE contra backend usando URL absoluta:
    - `new EventSource(\`${API_URL}/auth/permissions-stream\`, { withCredentials: true })`
  - `API_URL` viene de `frontend/src/config/api.ts` (`VITE_API_URL` o `http://localhost:3000/api`).
  - Al recibir `permissions.changed`:
    - Refresca permisos con bypass de cache (`refreshAuthz=true`) en `/auth/switch-company` o `/auth/me`.
    - Actualiza Redux `permissions`.
    - Menu y guards se actualizan en vivo.
  - Respaldo enterprise anti-latencia:
    - Polling liviano de `GET /auth/authz-token` cada ~2.5 segundos.
    - Si cambia el token de version, se fuerza refresh de permisos inmediatamente.
- Fallback UX:
  - Refresco al volver foco/visibilidad para pestañas inactivas.
- Nota de troubleshooting:
  - Si en consola aparece `GET http://localhost:5173/api/auth/permissions-stream 404`, el SSE esta pegando al host de Vite.
  - Solucion aplicada: usar `API_URL` absoluta al backend (no ruta relativa `/api/...`).
- Resultado:
  - Si un usuario pierde `payroll-article:view` estando en `/payroll-params/articulos`, el `PermissionGuard` cambia a 403 automaticamente sin recargar.

---

## Directivas Completadas (CronolÃ³gico)

| # | Directiva | Documento | Fecha |
|---|-----------|-----------|-------|
| 1 | Lectura y alineaciÃ³n con EnfoqueSistema.md | `01-EnfoqueSistema.md` | 2026-02-21 |
| 2 | Crear 2 proyectos desde cero (React+Vite+TS + NestJS) | `02-ScaffoldingProyecto.md` | 2026-02-21 |
| 3 | Arquitectura de State Management (Redux + TanStack + Context) | `03-ArquitecturaStateManagement.md` | 2026-02-21 |
| 4 | Directivas ejecutables de State Management | `04-DirectivasStateManagement.md` | 2026-02-21 |
| 5 | IntegraciÃ³n Ant Design con tema corporativo | `05-IntegracionAntDesign.md` | 2026-02-21 |
| 6 | Header de 2 niveles + menÃº horizontal dinÃ¡mico | `06-DirectivasHeaderMenu.md` | 2026-02-21 |
| 7 | DefiniciÃ³n submenÃºs Acciones de Personal | `08-EstructuraMenus.md` | 2026-02-21 |
| 8 | CorrecciÃ³n: eliminar sidebar (solo menÃº superior) | Este documento | 2026-02-21 |
| 9 | DefiniciÃ³n submenÃºs Parametros de Planilla | `08-EstructuraMenus.md` | 2026-02-21 |
| 10 | DefiniciÃ³n submenÃºs Gestion Planilla | `08-EstructuraMenus.md` | 2026-02-21 |
| 11 | DefiniciÃ³n submenÃºs Configuracion (Seguridad + Gestion Organizacional) | `08-EstructuraMenus.md` | 2026-02-21 |
| 12 | SeparaciÃ³n Login/Dashboard â€” layouts, guards, router, interceptor, pages | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 13 | Login visual segÃºn mockup (logo, inputs pill, Microsoft SSO, color #20638d) | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 14 | ConfiguraciÃ³n backend enterprise (TypeORM+MySQL, EventBus, 7 mÃ³dulos, CORS, migraciones) | `11-DirectivasConfiguracionBackend.md` | 2026-02-21 |
| 15 | Identidad Ãºnica y navegaciÃ³n cross-app (KPITAL â†” TimeWise). SSO interno. | `12-DirectivasIdentidadCrossApp.md` | 2026-02-21 |
| 16 | Modelado sys_empresas (root aggregate). Entidad + migraciÃ³n + CRUD + inactivaciÃ³n lÃ³gica. | `13-ModeladoSysEmpresas.md` | 2026-02-21 |
| 17 | Core Identity Schema: 7 tablas (usuarios, apps, roles, permisos, puentes). FK, Ã­ndices, CRUD completo. | `14-ModeloIdentidadEnterprise.md` | 2026-02-21 |
| 18 | Enhance sys_usuarios enterprise: username, hardening (failed_attempts, locked_until, last_login_ip), estados 1/2/3, password nullable, motivo inactivaciÃ³n. | `15-ModeladoSysUsuarios.md` | 2026-02-21 |
| 19 | sys_empleados + flujo ACID creaciÃ³n empleado con acceso TimeWise/KPITAL. PolÃ­tica sincronizaciÃ³n identidad. | `16-CreacionEmpleadoConAcceso.md` | 2026-02-21 |
| 20 | EstÃ¡ndar de workflows enterprise. EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven). | `17-EstandarWorkflows.md` | 2026-02-21 |
| 21 | Identity Core Enterprise: seed, JWT real, guards, permisos dinÃ¡micos, conexiÃ³n frontendâ†”backend, SSO base. | `18-IdentityCoreEnterprise.md` | 2026-02-21 |
| 22 | RedefiniciÃ³n enterprise sys_empleados: 33 columnas, ENUMs, FKs a org_departamentos/org_puestos/nom_periodos_pago. id_usuario fuera de DTO. | `19-RedefinicionEmpleadoEnterprise.md` | 2026-02-21 |
| 23 | MVP Contratos: Doc 20 con lista de endpoints, permission contract. Payroll Engine (nom_planillas, estados Abiertaâ†’Verificadaâ†’Aplicadaâ†’Inactiva). Personal Actions (acc_acciones_personal, approve/reject, vÃ­nculo planilla). TanStack Query conectado a /api reales (employees, companies, payrolls, personal-actions). | `20-MVPContratosEndpoints.md` | 2026-02-21 |
| 24 | Tabla Maestra Planillas (Doc 21): nom_calendarios_nomina reemplaza nom_planillas. Periodo trabajado vs ventana pago. Estados Abiertaâ†’En Procesoâ†’Verificadaâ†’Aplicadaâ†’Contabilizada. Reopen Verificadaâ†’Abierta. acc_cuotas_accion para multi-perÃ­odo. PolÃ­tica P3 (bloquear traslado si cuotas sin destino). Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow stubs. | `21-TablaMaestraPlanillasYWorkflows.md` | 2026-02-21 |

---

## QuÃ© Falta (No Construido)

| Ãrea | Detalle | Prioridad |
|------|---------|-----------|
| ~~Seed inicial~~ | ~~apps, permisos, rol, usuario admin~~ | âœ… Completado |
| ~~AutenticaciÃ³n real (JWT)~~ | ~~Login real, JWT, cookie httpOnly, /me, /switch-company~~ | âœ… Completado |
| ~~Guards reales~~ | ~~JwtAuthGuard, PermissionsGuard, @RequirePermissions~~ | âœ… Completado |
| ~~ConexiÃ³n frontend â†’ backend~~ | ~~Login real, session restore, permisos dinÃ¡micos~~ | âœ… Completado |
| ~~Rutas/PÃ¡ginas~~ | PÃ¡ginas Empleados, Empresas, Usuarios construidas. Dashboard, Planillas en avance. | âœ… Parcial |
| ~~Queries reales~~ | ~~Hooks TanStack placeholder~~ | âœ… Conectados: employees, companies, payrolls, personal-actions |
| **Eventos de dominio** | emit() en EmployeesService y workflows. @OnEvent en IdentitySyncWorkflow. Faltan listeners en otros mÃ³dulos. | En progreso |
| ~~MÃ³dulos de negocio~~ | ~~Payroll, Personal Actions: solo health checks~~ | âœ… Payroll y Personal Actions con lÃ³gica y specs |

---

## Changelog de Este Documento

| Fecha | Cambio |
|-------|--------|
| 2026-02-21 | CreaciÃ³n inicial con estado completo del proyecto |
| 2026-02-21 | Agregado Parametros de Planilla al menÃº definido |
| 2026-02-21 | Agregado Gestion Planilla y Configuracion al menÃº |
| 2026-02-21 | Implementada separaciÃ³n Login/Dashboard completa |
| 2026-02-21 | Login visual ajustado segÃºn mockup de Roberto |
| 2026-02-21 | Renombrados todos los docs con prefijo numÃ©rico consistente |
| 2026-02-21 | ConfiguraciÃ³n backend enterprise (Doc 11) â€” 7 mÃ³dulos, TypeORM, EventBus, CORS |
| 2026-02-21 | Directiva identidad cross-app (Doc 12) â€” KPITAL â†” TimeWise, SSO interno |
| 2026-02-21 | Implementado cross-app en cÃ³digo: activeAppSlice, AppAccessGuard, TokenPayload, app switcher |
| 2026-02-21 | SSO por cookie httpOnly: eliminado token de localStorage/Redux, credentials:'include', backend emite cookie, logout limpia cookie |
| 2026-02-21 | Modelado sys_empresas (Doc 13) â€” entidad, migraciÃ³n, DTOs, CRUD completo, inactivaciÃ³n lÃ³gica |
| 2026-02-21 | Core Identity Schema (Doc 14) â€” 7 tablas identity: sys_usuarios, sys_apps, sys_usuario_app, sys_usuario_empresa, sys_roles, sys_permisos, sys_rol_permiso, sys_usuario_rol. FK constraints, Ã­ndices, entities, DTOs, services, controllers. MigraciÃ³n ejecutada en RDS. |
| 2026-02-21 | Enhance sys_usuarios (Doc 15) â€” ALTER TABLE: username, password_updated_at, requires_password_reset, motivo_inactivacion, failed_attempts, locked_until, last_login_ip. Columnas nullable (password_hash, creado_por, modificado_por). Estados 1/2/3. UserStatus enum. Validaciones de negocio enterprise. MigraciÃ³n ejecutada en RDS. |
| 2026-02-21 | CreaciÃ³n empleado con acceso (Doc 16) â€” sys_empleados con FK a sys_usuarios (nullable) y sys_empresas. Flujo ACID: crear user + employee + app + company en una transacciÃ³n. PolÃ­tica sync identidad (email change â†’ identity.login_updated). MigraciÃ³n ejecutada en RDS. |
| 2026-02-21 | EstÃ¡ndar workflows (Doc 17) â€” Infraestructura enterprise: src/workflows/ con WorkflowResult interface, EmployeeCreationWorkflow (ACID, queryRunner), IdentitySyncWorkflow (@OnEvent employee.email_changed). MÃ³dulo WorkflowsModule. |
| 2026-02-21 | Identity Core Enterprise (Doc 18) â€” Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin. Auth real: bcrypt + JWT + cookie httpOnly + /me + /switch-company. Guards: JwtAuthGuard + PermissionsGuard + @RequirePermissions + @CurrentUser. JWT Strategy. Frontend: useSessionRestore, login real, permisos dinÃ¡micos, company selection real. |
| 2026-02-21 | RedefiniciÃ³n Enterprise sys_empleados (Doc 19) â€” Drop + recrear sys_empleados con 33 columnas enterprise (ENUMs: gÃ©nero, estado civil, contrato, jornada, moneda). Creadas org_departamentos, org_puestos, nom_periodos_pago (seed: Semanal/Quincenal/Mensual). 10 Ã­ndices + 6 FKs (empresa, usuario, departamento, puesto, supervisor, periodo pago). DTOs sin idUsuario. Employee entity + service + workflow actualizados. |
| 2026-02-21 | MVP Contratos (Doc 20) â€” Lista oficial endpoints MVP. Permission contract (module:action). Payroll Engine: nom_planillas, estados Abiertaâ†’Verificadaâ†’Aplicadaâ†’Inactiva. Personal Actions: acc_acciones_personal, approve/reject, associate-to-payroll. TanStack Query conectado a /api reales. |
| 2026-02-21 | Tabla Maestra Planillas (Doc 21) â€” nom_calendarios_nomina reemplaza nom_planillas. Ventanas periodo trabajado vs pago. Estados: Abierta, En Proceso, Verificada, Aplicada, Contabilizada, Inactiva. Reopen (Verificadaâ†’Abierta). acc_cuotas_accion para acciones multi-perÃ­odo. PolÃ­tica P3 traslado empleado. Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow. |
| 2026-02-21 | Dropdown Perfil Usuario en header â€” Avatar con menÃº: tÃ­tulo "Perfil Usuario", nombre, rol (p. ej. Administrador de TI), enlace Mi Perfil (/profile), Cerrar sesiÃ³n. performLogout usa API_URL. PÃ¡gina ProfilePage. |
| 2026-02-21 | Auth Report (Doc 22) â€” AuditorÃ­a enterprise de autenticaciÃ³n: decisiones (JWT cookie, logout global), matriz de flujos, checklist, evidencia requerida, pendientes (401 vs 404, PermissionsGuard, CSRF, rate-limit). |
| 2026-02-22 | Directiva 23 â€” MÃ³dulo Empleados referencia end-to-end. 4 vistas (listado, crear, detalle, modals). EncriptaciÃ³n PII en reposo, desencriptaciÃ³n solo si employee:view. Backend verificaciÃ³n, catÃ¡logos, paginaciÃ³n. Sprints 1-5. |
| 2026-02-22 | Ajuste de contratos catÃ¡logos: `/api/catalogs/departments`, `/positions`, `/pay-periods` quedan globales (sin `idEmpresa`). Se documenta `@AllowWithoutCompany()` en `PermissionsGuard` para evitar 403 por contexto de empresa en carga de formularios. |
| 2026-02-22 | RBAC + Overrides por usuario: nueva tabla `sys_usuario_permiso`, resolucion `roles + overrides` con precedencia `DENY > ALLOW`, endpoints admin bajo `/api/config/*` y vista frontend para listar permisos administrativos. |
| 2026-02-23 | Hardening de sesiÃ³n/refresh: frontend con timeout en `httpInterceptor` y `tryRefreshSession` para evitar bloqueo en "Verificando sesiÃ³n..."; backend `AuthService.refreshSession` maneja errores transientes de DB (`ECONNRESET`, etc.) y responde `401` controlado para forzar relogin seguro. |
| 2026-02-23 | CorrecciÃ³n flujo Microsoft popup: se evita race condition en callback OAuth (`/auth/login?code=...`) que abrÃ­a `/dashboard` dentro de la ventana emergente. Se agregÃ³ detecciÃ³n de callback para saltar `session restore` y redirecciÃ³n de `PublicGuard` durante el handshake `postMessage + close`. |
| 2026-02-23 | **Convenciones UI y bitÃ¡cora:** Formato de fecha 12h (AM/PM) documentado en Doc 05 â€” `formatDateTime12h()` en `src/lib/formatDate.ts`. EstÃ¡ndar de mensajes de bitÃ¡cora documentado en Doc 11 â€” mensajes autosuficientes con antes/despuÃ©s, lenguaje humano, payloadBefore/After. |
| 2026-02-24 | **Empresas â€” UX y permisos:** Switch unificado para inactivar/reactivar (sin botones separados). Permisos agregados al entrar a pÃ¡gina Empresas. ValidaciÃ³n de permisos en formulario (crear, editar, inactivar, reactivar). API `GET /companies?inactiveOnly=true` para traer solo inactivas (evitar carga completa). Tabla refresca tras mutaciones. Modales de confirmaciÃ³n con estilo corporativo. Filtros colapsados por defecto. |
| 2026-02-24 | **MenÃº y paleta:** Opciones de menÃº requieren permiso; se ocultan si no existe en BD o no estÃ¡ asignado al usuario (Doc 08, 26). Color corporativo `#20638d` reemplaza celeste en tema, menÃº, dropdown hover (Doc 05). |
| 2026-02-24 | **Inventario de testing:** Agregada seccion Testing vigente: 321/321 pruebas (Backend 137, Frontend 184), 15 specs + 4 E2E backend, 6 test files frontend. Actualizado conteo API (~176 TS) y Frontend (~111 TS/TSX). |
| 2026-02-25 | **ERP Cuentas Contables:** Modulo completo (CRUD + bitacora), permisos nuevos, selector multi-empresa en listado, reglas de inactivos y preload en edicion. Testing actualizado a 518/518. |
| 2026-02-27 | **Planilla v2 compatible (Directiva 40):** Se oficializa blueprint ejecutable incremental (sin renames destructivos), estados numericos centralizados, unicidad operativa `slot_key + is_active`, seed RBAC `payroll:*` en `hr_pro` como prerequisito, y fases de implementacion con compatibilidad total. |
| 2026-02-27 | **Planilla Fase 1+2 (sin NetSuite):** Implementadas tablas de snapshot/resultados (`nomina_empleados_snapshot`, `nomina_inputs_snapshot`, `nomina_resultados`), endpoint `PATCH /payroll/:id/process`, resumen `GET /payroll/:id/snapshot-summary`, enforcement de `verify` con precondiciones de snapshot y resultados, y seed operativo de `payroll:*` en `hr_pro`. |
| 2026-02-27 | **RBAC Planilla enterprise (3 roles):** Se agrega `payroll:process` independiente de `payroll:edit`, nuevos permisos `view_sensitive/export/calendar/type/pay_period/netsuite:view_log` y matriz aplicada para `OPERADOR_NOMINA`, `GERENTE_NOMINA`, `MASTER` en `mysql_hr_pro`. |
| 2026-02-27 | **Calendario de Planilla (UI):** Se habilita ruta `/payroll-params/calendario/ver` con filtros operativos (empresa, moneda, tipo, estado, periodo), modo `Mensual` y `Timeline`, indicadores de riesgo y panel lateral de detalle con acciones por permisos/estado. |
| 2026-02-27 | **Reglas UX Planilla:** Confirmacion obligatoria antes de `Procesar/Verificar/Aplicar`; bloqueo de `Verificar` cuando no hay movimientos procesados (snapshot de inputs = 0) con mensaje funcional para usuario final. |
| 2026-02-27 | **Modulo Feriados de Planilla:** Se habilita `Listado de Feriados` en menu de Calendario de Nomina con permisos `payroll-holiday:view/create/edit/delete`, tabla `nom_feriados_planilla` y API CRUD (`/api/payroll-holidays`). |




