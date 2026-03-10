# KPITAL 360 — Estado Actual del Proyecto

**Documento:** 09  
**Última actualización:** 2026-03-06  
**Propósito:** Registro vivo del avance. Se actualiza cada vez que se completa una directiva o se hace un cambio significativo.

---

## Resumen Ejecutivo

KPITAL 360 es un ERP multiempresa enfocado en gestión de RRHH, planillas y acciones de personal. El proyecto empezó desde cero (sin código, sin BD, sin sistema previo). Se han completado las directivas de arquitectura frontend (state management, UI framework, navegación, login) y la configuración enterprise del backend (7 módulos por bounded context, TypeORM, bus de eventos, CORS).

### Actualización de auditoría (Rev. 3 - 2026-02-27)

- Veredicto tecnico vigente: **Apto para produccion con condicion operacional**.
- Bloqueantes de codigo cerrados:
  - `E2E_DISABLE_CSRF` limitado a `NODE_ENV=test`.
  - CI corregido a `actions/checkout@v4`.
  - CORS de WebSocket restringido por `SOCKET_ALLOWED_ORIGINS` (fallback seguro por ambiente).
  - `PEND-001` implementado (bloqueo 409 al inactivar empresa con planillas activas/no finales).
  - validaciones frontend corregidas (SQL danger patterns y parseo monetario).
  - `.env.example` saneado con placeholders (sin secretos reales).
- Resultado de pruebas vigente:
  - Backend: **27/27 suites - 217/217 tests pasando**.
  - Frontend: **22/22 suites - 250/250 tests pasando**.
- Condicion operacional pendiente para go-live:
  - **rotacion de secretos en infraestructura** (RDS, Azure/SSO, JWT, Redis si aplica).

### Actualización de cache API (Rev. 4 - 2026-03-04)

- Cache backend empresarial con TTL fijo **5 minutos**.
- Invalidacion automatica por cualquier cambio (POST/PUT/PATCH/DELETE) en el mismo `scope`.
- Redis opcional: si EDIS_HOST` esta definido, cache compartido entre instancias; si no, cache local por instancia.
- Scopes activos: `personal-actions`, `companies`, `employees`, `catalogs`, `payroll*`, oles`, `permissions`, `apps`, `user-assignments`, `config`, `notifications`, `users`.
- Cache segmentado por empresa (`idEmpresa/companyId`) para evitar invalidaciones globales.
- `CACHE_STRICT_REDIS` disponible para modo enterprise estricto.
- Normalización de query + user-scope por endpoint.
- Circuit breaker y stampede protection (lock + SWR).
- Métricas internas disponibles en `GET /api/ops/queues/cache-metrics`.
- Key hashing (SHA-256) + `CACHE_KEY_VERSION` para versionar keys.
- Respuesta no cacheable si `Set-Cookie`, `Cache-Control: no-store/private` o status no-2xx.
- Pendiente infra: Redis HA + eviction policy + Prometheus/Grafana.
- Excepciones por seguridad/tiempo real: `auth`, `health`, `ops/queues`.

### Actualización planilla (Rev. 5 - 2026-03-05)

- Verificacion de planilla permite `inputs = 0` si la empresa tiene cargas sociales activas configuradas.

### Actualización artículos de nomina (Rev. 6 - 2026-03-05)

- DTOs de articulos de nomina cargan correctamente en create/update (evita errores `property ... should not exist`).
- Edicion de articulos incluye cuentas actuales aunque no esten en el listado activo (query `idsCuenta`).
- Cache `payroll-articles` reconoce `idEmpresas` y `idsReferencia`/`idsCuenta` para evitar respuestas incorrectas en filtros y cuentas.
- Validaciones y filtros usan `1=Activo / 0=Inactivo` para articulos y cuentas contables relacionadas.

### Actualización movimientos de nomina (Rev. 7 - 2026-03-05)

- Normalización defensiva en payload evita `trim` sobre valores indefinidos al crear movimientos.
- DTOs de movimientos de nomina cargan correctamente en create/update (evita errores `property ... should not exist`).
- Validaciones y filtros usan `1=Activo / 0=Inactivo` para movimientos, clases, proyectos y articulos relacionados.
- En creacion de movimientos se cargan solo articulos/proyectos activos; en edicion se permiten inactivos para ver el estado actual.
- Catalogos base (clases y tipos de accion) siguen la misma regla: activos en creacion, inactivos solo en edicion.
- UI de articulos de nomina muestra estado con `1=Activo / 0=Inactivo` y mantiene filtros consistentes.

### Normalización estado activo/inactivo (Rev. 8 - 2026-03-06)

- Regla unificada: `1 = Activo`, `0 = Inactivo` en todos los campos `es_inactivo`.
- Frontend actualizado en proyectos, clases, cuentas contables, movimientos y modales de acciones de personal.
- Backend actualizado en clases, cuentas contables, personal-actions e intercompany-transfer.
- BD normalizada (flags + defaults en 1) en:
  - `erp_cuentas_contables.es_inactivo`
  - `nom_articulos_nomina.es_inactivo`
  - `nom_calendarios_nomina.es_inactivo`
  - `nom_cargas_sociales.es_inactivo_carga_social`
  - `nom_movimientos_nomina.es_inactivo_movimiento_nomina`
  - `nom_periodos_pago.es_inactivo`
  - `nom_tipo_articulo_nomina.es_inactivo`
  - `nom_tipos_planilla.es_inactivo_tipo_planilla`
  - `org_clases.es_inactivo`
  - `org_proyectos.es_inactivo`
- Estado actual validado: **todos los registros activos** (sin inactivos residuales).

### Actualización ausencias (Rev. 9 - 2026-03-06)

- Modal de ausencias ahora recarga empleados y movimientos segun la **empresa seleccionada en el modal**, no solo por el filtro de la tabla.
- Evita listas vacias al cambiar empresa dentro del modal de creacion/edicion.
- La seleccion de empresa en el modal no se resetea al cambiar el filtro externo.

### Datos base acciones de personal (Rev. 10 - 2026-03-06)

- Empresa `id=3`: articulos y movimientos base creados para acciones de personal (monto y % para ingresos; monto para deducciones).

### Listado ausencias (Rev. 11 - 2026-03-06)

- Tabla de ausencias ahora muestra el **monto total** de la accion en la lista.

### Catalogos ausencias (Rev. 12 - 2026-03-06)

- El listado de ausencias carga catalogo de empleados segun la empresa seleccionada en la tabla, evitando mostrar "Empleado #id".

### Refrescar listas y cache buster frontend (Rev. 13 - 2026-03-06)

- Boton **Refrescar** en todas las vistas de listado agrega `cb=timestamp` a los GET (cache buster).
- Se fuerza recarga real del backend aun con cache HTTP/intermedio.
- Aplica a: Acciones de personal (todas), Planillas, Calendario de Planillas, Feriados, Movimientos de Nomina y Articulos de Nomina.
- Cache buster automatico cada 6 minutos a nivel global (frontend) para refrescar datos en background.

### Validacion de movimientos en acciones (Rev. 14 - 2026-03-06)

- Antes de guardar Ausencias y Licencias se valida que el movimiento seleccionado pertenezca a la empresa.
- Evita error backend "movimiento invalido o inactivo" cuando el movimiento no corresponde a la empresa activa.
- Catalogo de movimientos en Ausencias (id 20) y Licencias (id 23) se filtra por tipo de accion para evitar seleccionar movimientos de otro modulo.

### Cache keys payroll-movements/personal-actions (Rev. 15 - 2026-03-06)

- Cache allowlist incluye `idEmpresas`, `includeInactive`, `inactiveOnly` para payroll-movements.
- Cache allowlist incluye `idTipoAccionPersonal` para personal-actions (evita catalogos cruzados).

---

## Principio Arquitectónico Fundamental

> **sys_usuarios  sys_empleados**  Son bounded contexts distintos.
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

## Inventario de Archivos  Frontend (~111 archivos TS/TSX)

### Store (Redux Toolkit)  10 archivos

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
| `store/middleware/companyChangeListener.ts` | Cambio empresa  recarga permisos + invalida queries | Completo |

### Queries (TanStack Query)  9 archivos

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

### Componentes UI  10 archivos

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

### Configuración  2 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `config/theme.ts` | Tokens corporativos (colorPrimary `#0d6efd`, Public Sans, etc.) | Completo |
| `config/menuIcons.tsx` | Mapa de íconos AntD por ID de menú | Completo |

### Providers y Contexts  4 archivos

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `providers/Providers.tsx` | Wrapper raíz: Redux + TanStack + Theme + Locale + AntD | Completo |
| `providers/AntDConfigProvider.tsx` | ConfigProvider dinámico (tema + locale) | Completo |
| `contexts/ThemeContext.tsx` | Light/Dark toggle | Completo |
| `contexts/LocaleContext.tsx` | ES/EN selector | Completo |

### Raíz  5 archivos

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
| `api/permissions.ts` | `fetchPermissionsForCompany()`  POST /auth/switch-company real | Completo |
| `api/companies.ts` | `fetchCompanies()`, `fetchCompany()`  GET /companies | Completo |
| `api/employees.ts` | `fetchEmployees()`, `fetchEmployee()`  GET /employees | Completo |
| `api/payroll.ts` | `fetchPayrolls()`, `fetchPayroll()`  GET /payroll | Completo |
| `api/personalActions.ts` | `fetchPersonalActions()`, `fetchPersonalAction()`  GET /personal-actions | Completo |
| `config/api.ts` | API_URL configurable (VITE_API_URL o localhost:3000) | Completo |
| `hooks/useSessionRestore.ts` | Restaura sesión desde cookie httpOnly al cargar app | Completo |
| `lib/formatDate.ts` | `formatDateTime12h()`  formato fecha/hora 12h obligatorio (ver Doc 05) | Completo |

---

## Inventario de Testing (vigente 2026-02-27)

| Capa | Specs/Tests | Pruebas | Estado |
|------|-------------|---------|--------|
| Backend (Jest) | 27 suites | 217/217 | Pasando |
| Frontend (Vitest) | 22 suites | 250/250 | Pasando |
| **Total** | 49 suites | **467/467** | 100% |

Cobertura: auth, employees, companies, workflows, access-control (apps, roles, permissions), payroll, personal-actions, notifications, ops, integration (domain-events), smoke tests. Ver `docs/Test/GUIA-TESTING.md` y `docs/Test/TEST-EXECUTION-REPORT.md`.

---

## Inventario de Archivos  API (~176 archivos TS)

### Raíz y Configuración

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/main.ts` | Bootstrap: CORS, ValidationPipe global, prefijo `/api`, puerto desde env, cookie-parser | Completo |
| `src/app.module.ts` | Módulo raíz: ConfigModule + TypeORM + EventEmitter + 7 módulos | Completo |
| `src/config/database.config.ts` | Config TypeORM async desde env vars | Completo |
| `src/config/jwt.config.ts` | Config JWT async desde env vars | Completo |
| `src/config/cookie.config.ts` | Config cookie httpOnly (dev/prod dinámico) | Completo |
| `src/common/strategies/jwt.strategy.ts` | Passport JWT Strategy  extrae token de cookie httpOnly | Completo |
| `src/common/guards/jwt-auth.guard.ts` | JwtAuthGuard  valida JWT | Completo |
| `src/common/guards/permissions.guard.ts` | PermissionsGuard  verifica permisos granulares (module:action) | Completo |
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
| auth | module + auth.controller (login/logout/me/switch-company) + auth.service (buildSession/resolvePermissions) + users.controller + users.service + User entity + DTOs + JwtStrategy + JwtModule + PassportModule | `/api/auth/health` |  |
| companies | module + controller + service + Company entity + DTOs + events | `/api/companies/health` | CompanyCreated, CompanyUpdated |
| employees | module + controller + service + Employee entity (33 cols) + Department entity + Position entity + DTOs (enterprise) + events | `/api/employees/health` | EmployeeCreated, EmployeeMoved, EmployeeDeactivated, EmployeeEmailChanged |
| personal-actions | module + controller + service + PersonalAction entity + DTOs + endpoints (list, create, approve, reject, associate-to-payroll) | `/api/personal-actions/health` | PersonalActionCreated, PersonalActionApproved, PersonalActionRejected |
| payroll | module + controller + service + Payroll entity + PayPeriod entity (catálogo) + DTOs + endpoints (list, create, verify, apply, inactivate) | `/api/payroll/health` | PayrollOpened, PayrollVerified, PayrollApplied, PayrollDeactivated |
| access-control | module + 4 controllers + 4 services + 7 entities + 7 DTOs + events | `/api/roles/health` | RoleAssigned, PermissionsChanged |
| integration | module + events (placeholder Fase 3) |  |  (escucha payroll.applied) |

### Identity Schema  Entidades y CRUD

| Tabla | Entity | DTO | Service | Controller | Migración |
|-------|--------|-----|---------|------------|-----------|
| `sys_empresas` | Company | CreateCompany, UpdateCompany | CompaniesService (CRUD + inactivate/reactivate) | CompaniesController | CreateSysEmpresas  |
| `sys_usuarios` | User | CreateUser, UpdateUser | UsersService (CRUD + inactivate/reactivate/block + bcrypt + hardening) | UsersController | CreateIdentitySchema  + EnhanceSysUsuarios  |
| `sys_apps` | App | CreateApp | AppsService (CRUD + inactivate) | AppsController | CreateIdentitySchema  |
| `sys_usuario_app` | UserApp | AssignUserApp | UserAssignmentService | UserAssignmentController | CreateIdentitySchema  |
| `sys_usuario_empresa` | UserCompany | AssignUserCompany | UserAssignmentService | UserAssignmentController | CreateIdentitySchema  |
| `sys_roles` | Role | CreateRole | RolesService (CRUD + assign/remove permissions) | RolesController | CreateIdentitySchema  |
| `sys_permisos` | Permission | CreatePermission | PermissionsService (CRUD) | PermissionsController | CreateIdentitySchema  |
| `sys_rol_permiso` | RolePermission | AssignRolePermission | RolesService | RolesController | CreateIdentitySchema  |
| `sys_usuario_rol` | UserRole | AssignUserRole | UserAssignmentService | UserAssignmentController | CreateIdentitySchema  |
| `sys_empleados` | Employee | CreateEmployee, UpdateEmployee | EmployeesService (CRUD + inactivate/liquidar + workflow) | EmployeesController | RedefineEmpleadoEnterprise  (33 cols, ENUMs, FKs org/nom) |
| `org_departamentos` | Department |  (catálogo) |  |  | RedefineEmpleadoEnterprise  |
| `org_puestos` | Position |  (catálogo) |  |  | RedefineEmpleadoEnterprise  |
| `nom_periodos_pago` | PayPeriod |  (catálogo, seed: Semanal/Quincenal/Mensual) |  |  | RedefineEmpleadoEnterprise  |
| `nom_calendarios_nomina` | PayrollCalendar | CreatePayrollDto | PayrollService (create, verify, apply, reopen, inactivate) | PayrollController | CreateCalendarioNominaMaestro  |
| `acc_acciones_personal` | PersonalAction | CreatePersonalActionDto | PersonalActionsService (create, approve, reject, associateToCalendar) | PersonalActionsController | CreatePayrollAndPersonalActions  + CreateCalendarioNominaMaestro (id_calendario_nomina) |
| `acc_cuotas_accion` | ActionQuota |  (multi-período) |  |  | CreateCalendarioNominaMaestro  |

### Workflows

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/workflows/common/workflow.interface.ts` | Contrato base `WorkflowResult` | Completo |
| `src/workflows/employees/employee-creation.workflow.ts` | Crear empleado + usuario + asignaciones (ACID) | Completo |
| `src/workflows/identity/identity-sync.workflow.ts` | Sincronizar email empleado  usuario (@OnEvent) | Completo |
| `src/workflows/employees/employee-moved.workflow.ts` | Política P3 traslado empleado (stub) | Stub |
| `src/workflows/payroll/payroll-applied.workflow.ts` | Efectos al aplicar planilla (stub) | Stub |
| `src/workflows/workflows.module.ts` | Módulo NestJS para todos los workflows | Completo |

### Database

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `src/database/migrations/1708531200000-CreateSysEmpresas.ts` | Tabla root aggregate sys_empresas | Ejecutada  |
| `src/database/migrations/1708531300000-CreateIdentitySchema.ts` | 7 tablas identity + FK + índices | Ejecutada  |
| `src/database/migrations/1708531400000-EnhanceSysUsuarios.ts` | ALTER: columnas enterprise (hardening, bloqueo, estados) | Ejecutada  |
| `src/database/migrations/1708531500000-CreateSysEmpleados.ts` | sys_empleados con FK a sys_usuarios y sys_empresas | Ejecutada  |
| `src/database/migrations/1708531600000-SeedIdentityCore.ts` | Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin, asignaciones | Ejecutada  |
| `src/database/migrations/1708531700000-RedefineEmpleadoEnterprise.ts` | Redefinición enterprise: drop sys_empleados vieja, crear org_departamentos + org_puestos + nom_periodos_pago (seed), recrear sys_empleados (33 cols, ENUMs, 10 idx, 6 FKs) | Ejecutada  |
| `src/database/migrations/1708531800000-CreatePayrollAndPersonalActions.ts` | nom_planillas (estados AbiertaVerificadaAplicadaInactiva) + acc_acciones_personal (pendienteaprobada|rechazada, FK a empleado y planilla) | Ejecutada  |
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
1. **Acciones de Personal**  Submenús completos definidos (Entradas, Salidas, Deducciones, Compensaciones, Incapacidades, Licencias, Ausencias)
2. **Parametros de Planilla**  Activo: Calendario de Nómina (Calendario, Listado de Feriados, Días de Pago), Artículos de Nomina, Movimientos de Nomina
3. **Gestion Planilla**  Fuera de alcance actual (oculto en menú)
4. **Configuracion**  Definido con 2 grupos: Seguridad (Roles y Permisos, Usuarios) + Gestion Organizacional (Reglas, Empresas, Empleados, Clases, Proyectos, Cuentas Contables, Departamentos, Puestos)

### 4.x Regla de UX - Bitacora en modales de edicion
- La pestaña **Bitacora** solo debe mostrarse cuando:
  - El registro existe (modo edicion).
  - El usuario tiene el permiso de bitacora correspondiente.
- Si el permiso no existe, la pestaña **no se muestra** (no se deja tab vacio).
- El contenido de Bitacora se carga **solo al abrir la pestaña** (lazy load) para evitar peticiones innecesarias.

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
  - Si la empresa actual esta inactiva, se muestra el valor actual como solo lectura con badge Inactiva y se habilita un selector adicional para cambiar a una empresa activa.

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
- Carga lazy: solo al abrir la pestaa Bitacora.

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
- En modal Crear/Editar, el boton guardar funciona sin abrir todas las pestaas; la validacion ocurre al submit y posiciona al usuario en la pestaa con error si aplica.

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
    - `GET /api/auth/me` y `POST /api/auth/switch-company` aceptan efreshAuthz=true` para bypass de cache.
- Frontend:
  - Hook realtime abre SSE contra backend usando URL absoluta:
    - `new EventSource(\`${API_URL}/auth/permissions-stream\`, { withCredentials: true })`
  - `API_URL` viene de `frontend/src/config/api.ts` (`VITE_API_URL` o `http://localhost:3000/api`).
  - Al recibir `permissions.changed`:
    - Refresca permisos con bypass de cache (efreshAuthz=true`) en `/auth/switch-company` o `/auth/me`.
    - Actualiza Redux `permissions`.
    - Menu y guards se actualizan en vivo.
  - Respaldo enterprise anti-latencia:
    - Polling liviano de `GET /auth/authz-token` cada ~2.5 segundos.
    - Si cambia el token de version, se fuerza refresh de permisos inmediatamente.
- Fallback UX:
  - Refresco al volver foco/visibilidad para pestaas inactivas.
- Nota de troubleshooting:
  - Si en consola aparece `GET http://localhost:5173/api/auth/permissions-stream 404`, el SSE esta pegando al host de Vite.
  - Solucion aplicada: usar `API_URL` absoluta al backend (no ruta relativa `/api/...`).
- Resultado:
  - Si un usuario pierde `payroll-article:view` estando en `/payroll-params/articulos`, el `PermissionGuard` cambia a 403 automaticamente sin recargar.

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
| 12 | Separación Login/Dashboard  layouts, guards, router, interceptor, pages | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 13 | Login visual según mockup (logo, inputs pill, Microsoft SSO, color #20638d) | `10-DirectivasSeparacionLoginDashboard.md` | 2026-02-21 |
| 14 | Configuración backend enterprise (TypeORM+MySQL, EventBus, 7 módulos, CORS, migraciones) | `11-DirectivasConfiguracionBackend.md` | 2026-02-21 |
| 15 | Identidad única y navegación cross-app (KPITAL  TimeWise). SSO interno. | `12-DirectivasIdentidadCrossApp.md` | 2026-02-21 |
| 16 | Modelado sys_empresas (root aggregate). Entidad + migración + CRUD + inactivación lógica. | `13-ModeladoSysEmpresas.md` | 2026-02-21 |
| 17 | Core Identity Schema: 7 tablas (usuarios, apps, roles, permisos, puentes). FK, índices, CRUD completo. | `14-ModeloIdentidadEnterprise.md` | 2026-02-21 |
| 18 | Enhance sys_usuarios enterprise: username, hardening (failed_attempts, locked_until, last_login_ip), estados 1/2/3, password nullable, motivo inactivación. | `15-ModeladoSysUsuarios.md` | 2026-02-21 |
| 19 | sys_empleados + flujo ACID creación empleado con acceso TimeWise/KPITAL. Política sincronización identidad. | `16-CreacionEmpleadoConAcceso.md` | 2026-02-21 |
| 20 | Estándar de workflows enterprise. EmployeeCreationWorkflow (ACID) + IdentitySyncWorkflow (event-driven). | `17-EstandarWorkflows.md` | 2026-02-21 |
| 21 | Identity Core Enterprise: seed, JWT real, guards, permisos dinámicos, conexión frontendbackend, SSO base. | `18-IdentityCoreEnterprise.md` | 2026-02-21 |
| 22 | Redefinición enterprise sys_empleados: 33 columnas, ENUMs, FKs a org_departamentos/org_puestos/nom_periodos_pago. id_usuario fuera de DTO. | `19-RedefinicionEmpleadoEnterprise.md` | 2026-02-21 |
| 23 | MVP Contratos: Doc 20 con lista de endpoints, permission contract. Payroll Engine (nom_planillas, estados AbiertaVerificadaAplicadaInactiva). Personal Actions (acc_acciones_personal, approve/reject, vínculo planilla). TanStack Query conectado a /api reales (employees, companies, payrolls, personal-actions). | `20-MVPContratosEndpoints.md` | 2026-02-21 |
| 24 | Tabla Maestra Planillas (Doc 21): nom_calendarios_nomina reemplaza nom_planillas. Periodo trabajado vs ventana pago. Estados AbiertaEn ProcesoVerificadaAplicadaContabilizada. Reopen VerificadaAbierta. acc_cuotas_accion para multi-período. Política P3 (bloquear traslado si cuotas sin destino). Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow stubs. | `21-TablaMaestraPlanillasYWorkflows.md` | 2026-02-21 |

---

## Qué Falta (No Construido)

| Área | Detalle | Prioridad |
|------|---------|-----------|
| ~~Seed inicial~~ | ~~apps, permisos, rol, usuario admin~~ |  Completado |
| ~~Autenticación real (JWT)~~ | ~~Login real, JWT, cookie httpOnly, /me, /switch-company~~ |  Completado |
| ~~Guards reales~~ | ~~JwtAuthGuard, PermissionsGuard, @RequirePermissions~~ |  Completado |
| ~~Conexión frontend  backend~~ | ~~Login real, session restore, permisos dinámicos~~ |  Completado |
| ~~Rutas/Páginas~~ | Páginas Empleados, Empresas, Usuarios construidas. Dashboard, Planillas en avance. |  Parcial |
| ~~Queries reales~~ | ~~Hooks TanStack placeholder~~ |  Conectados: employees, companies, payrolls, personal-actions |
| **Eventos de dominio** | emit() en EmployeesService y workflows. @OnEvent en IdentitySyncWorkflow. Faltan listeners en otros módulos. | En progreso |
| ~~Módulos de negocio~~ | ~~Payroll, Personal Actions: solo health checks~~ |  Payroll y Personal Actions con lógica y specs |

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
| 2026-02-21 | Configuración backend enterprise (Doc 11)  7 módulos, TypeORM, EventBus, CORS |
| 2026-02-21 | Directiva identidad cross-app (Doc 12)  KPITAL  TimeWise, SSO interno |
| 2026-02-21 | Implementado cross-app en código: activeAppSlice, AppAccessGuard, TokenPayload, app switcher |
| 2026-02-21 | SSO por cookie httpOnly: eliminado token de localStorage/Redux, credentials:'include', backend emite cookie, logout limpia cookie |
| 2026-02-21 | Modelado sys_empresas (Doc 13)  entidad, migración, DTOs, CRUD completo, inactivación lógica |
| 2026-02-21 | Core Identity Schema (Doc 14)  7 tablas identity: sys_usuarios, sys_apps, sys_usuario_app, sys_usuario_empresa, sys_roles, sys_permisos, sys_rol_permiso, sys_usuario_rol. FK constraints, índices, entities, DTOs, services, controllers. Migración ejecutada en RDS. |
| 2026-02-21 | Enhance sys_usuarios (Doc 15)  ALTER TABLE: username, password_updated_at, requires_password_reset, motivo_inactivacion, failed_attempts, locked_until, last_login_ip. Columnas nullable (password_hash, creado_por, modificado_por). Estados 1/2/3. UserStatus enum. Validaciones de negocio enterprise. Migración ejecutada en RDS. |
| 2026-02-21 | Creación empleado con acceso (Doc 16)  sys_empleados con FK a sys_usuarios (nullable) y sys_empresas. Flujo ACID: crear user + employee + app + company en una transacción. Política sync identidad (email change  identity.login_updated). Migración ejecutada en RDS. |
| 2026-02-21 | Estándar workflows (Doc 17)  Infraestructura enterprise: src/workflows/ con WorkflowResult interface, EmployeeCreationWorkflow (ACID, queryRunner), IdentitySyncWorkflow (@OnEvent employee.email_changed). Módulo WorkflowsModule. |
| 2026-02-21 | Identity Core Enterprise (Doc 18)  Seed: empresa demo, 2 apps, 17 permisos, rol ADMIN_SISTEMA, usuario admin. Auth real: bcrypt + JWT + cookie httpOnly + /me + /switch-company. Guards: JwtAuthGuard + PermissionsGuard + @RequirePermissions + @CurrentUser. JWT Strategy. Frontend: useSessionRestore, login real, permisos dinámicos, company selection real. |
| 2026-02-21 | Redefinición Enterprise sys_empleados (Doc 19)  Drop + recrear sys_empleados con 33 columnas enterprise (ENUMs: género, estado civil, contrato, jornada, moneda). Creadas org_departamentos, org_puestos, nom_periodos_pago (seed: Semanal/Quincenal/Mensual). 10 índices + 6 FKs (empresa, usuario, departamento, puesto, supervisor, periodo pago). DTOs sin idUsuario. Employee entity + service + workflow actualizados. |
| 2026-02-21 | MVP Contratos (Doc 20)  Lista oficial endpoints MVP. Permission contract (module:action). Payroll Engine: nom_planillas, estados AbiertaVerificadaAplicadaInactiva. Personal Actions: acc_acciones_personal, approve/reject, associate-to-payroll. TanStack Query conectado a /api reales. |
| 2026-02-21 | Tabla Maestra Planillas (Doc 21)  nom_calendarios_nomina reemplaza nom_planillas. Ventanas periodo trabajado vs pago. Estados: Abierta, En Proceso, Verificada, Aplicada, Contabilizada, Inactiva. Reopen (VerificadaAbierta). acc_cuotas_accion para acciones multi-período. Política P3 traslado empleado. Workflows: EmployeeMovedWorkflow, PayrollAppliedWorkflow. |
| 2026-02-21 | Dropdown Perfil Usuario en header  Avatar con menú: título "Perfil Usuario", nombre, rol (p. ej. Administrador de TI), enlace Mi Perfil (/profile), Cerrar sesión. performLogout usa API_URL. Página ProfilePage. |
| 2026-02-21 | Auth Report (Doc 22)  Auditoría enterprise de autenticación: decisiones (JWT cookie, logout global), matriz de flujos, checklist, evidencia requerida, pendientes (401 vs 404, PermissionsGuard, CSRF, rate-limit). |
| 2026-02-22 | Directiva 23  Módulo Empleados referencia end-to-end. 4 vistas (listado, crear, detalle, modals). Encriptación PII en reposo, desencriptación solo si employee:view. Backend verificación, catálogos, paginación. Sprints 1-5. |
| 2026-02-22 | Ajuste de contratos catálogos: `/api/catalogs/departments`, `/positions`, `/pay-periods` quedan globales (sin `idEmpresa`). Se documenta `@AllowWithoutCompany()` en `PermissionsGuard` para evitar 403 por contexto de empresa en carga de formularios. |
| 2026-02-22 | RBAC + Overrides por usuario: nueva tabla `sys_usuario_permiso`, resolucion oles + overrides` con precedencia `DENY > ALLOW`, endpoints admin bajo `/api/config/*` y vista frontend para listar permisos administrativos. |
| 2026-02-23 | Hardening de sesión/refresh: frontend con timeout en `httpInterceptor` y `tryRefreshSession` para evitar bloqueo en "Verificando sesión..."; backend `AuthService.refreshSession` maneja errores transientes de DB (`ECONNRESET`, etc.) y responde `401` controlado para forzar relogin seguro. |
| 2026-02-23 | Corrección flujo Microsoft popup: se evita race condition en callback OAuth (`/auth/login?code=...`) que abría `/dashboard` dentro de la ventana emergente. Se agregó detección de callback para saltar `session restore` y redirección de `PublicGuard` durante el handshake `postMessage + close`. |
| 2026-02-23 | **Convenciones UI y bitácora:** Formato de fecha 12h (AM/PM) documentado en Doc 05  `formatDateTime12h()` en `src/lib/formatDate.ts`. Estándar de mensajes de bitácora documentado en Doc 11  mensajes autosuficientes con antes/después, lenguaje humano, payloadBefore/After. |
| 2026-02-24 | **Empresas  UX y permisos:** Switch unificado para inactivar/reactivar (sin botones separados). Permisos agregados al entrar a página Empresas. Validación de permisos en formulario (crear, editar, inactivar, reactivar). API `GET /companies?inactiveOnly=true` para traer solo inactivas (evitar carga completa). Tabla refresca tras mutaciones. Modales de confirmación con estilo corporativo. Filtros colapsados por defecto. |
| 2026-02-24 | **Menú y paleta:** Opciones de menú requieren permiso; se ocultan si no existe en BD o no está asignado al usuario (Doc 08, 26). Color corporativo `#20638d` reemplaza celeste en tema, menú, dropdown hover (Doc 05). |
| 2026-02-24 | **Inventario de testing:** Agregada seccion Testing vigente: 321/321 pruebas (Backend 137, Frontend 184), 15 specs + 4 E2E backend, 6 test files frontend. Actualizado conteo API (~176 TS) y Frontend (~111 TS/TSX). |
| 2026-02-25 | **ERP Cuentas Contables:** Modulo completo (CRUD + bitacora), permisos nuevos, selector multi-empresa en listado, reglas de inactivos y preload en edicion. Testing actualizado a 518/518. |
| 2026-02-27 | **Planilla v2 compatible (Directiva 40):** Se oficializa blueprint ejecutable incremental (sin renames destructivos), estados numericos centralizados, unicidad operativa `slot_key + is_active`, seed RBAC `payroll:*` en `hr_pro` como prerequisito, y fases de implementacion con compatibilidad total. |
| 2026-02-27 | **Planilla Fase 1+2 (sin NetSuite):** Implementadas tablas de snapshot/resultados (`nomina_empleados_snapshot`, `nomina_inputs_snapshot`, `nomina_resultados`), endpoint `PATCH /payroll/:id/process`, resumen `GET /payroll/:id/snapshot-summary`, enforcement de `verify` con precondiciones de snapshot y resultados, y seed operativo de `payroll:*` en `hr_pro`. |
| 2026-02-27 | **RBAC Planilla enterprise (3 roles):** Se agrega `payroll:process` independiente de `payroll:edit`, nuevos permisos `view_sensitive/export/calendar/type/pay_period/netsuite:view_log` y matriz aplicada para `OPERADOR_NOMINA`, `GERENTE_NOMINA`, `MASTER` en `mysql_hr_pro`. |
| 2026-02-27 | **Calendario de Planilla (UI):** Se habilita ruta `/payroll-params/calendario/ver` con filtros operativos (empresa, moneda, tipo, estado, periodo), modo `Mensual` y `Timeline`, indicadores de riesgo y panel lateral de detalle con acciones por permisos/estado. |
| 2026-02-27 | **Reglas UX Planilla:** Confirmacion obligatoria antes de `Procesar/Verificar/Aplicar`; bloqueo de `Verificar` cuando no hay movimientos procesados (snapshot de inputs = 0) con mensaje funcional para usuario final. |
| 2026-02-27 | **Modulo Feriados de Planilla:** Se habilita `Listado de Feriados` en menu de Calendario de Nomina con permisos `payroll-holiday:view/create/edit/delete`, tabla `nom_feriados_planilla` y API CRUD (`/api/payroll-holidays`). |
| 2026-02-27 | **Auditoria consolidada (Doc 41):** Se consolida analisis Rev.1->Rev.3 con verificacion en codigo, cierre de bloqueantes de codigo y condicion operacional de rotacion de secretos previa a go-live. |
| 2026-02-27 | **Acta Fase 0 Acciones+Planilla (Doc 42):** Se congela alcance ejecutable con compatibilidad incremental, estados oficiales, regla de solape, politica de retroactivos, blindaje anti-delete y plan por fases para implementacion sin ruptura. |
| 2026-02-27 | **Validacion real Fase 0 (Doc 42.17.1):** Confirmada PK `id_calendario_nomina`, uso actual de `id_calendario_nomina` como consumo en acciones, estados actuales 1..3, ausencia de `hr_action:*` en permisos y decision de no crear `consumed_run_id` en Fase 1. |
| 2026-03-04 | **Traslado interempresas (backend base):** API de simulacion/ejecucion (`/api/payroll/intercompany-transfer`), tabla `sys_empleado_transferencias`, validaciones enterprise (periodo destino obligatorio, inicio de periodo, planilla activa origen) y reasignacion de acciones/lineas por fecha. **Politica:** continuidad por defecto; liquidacion solo en renuncia/despido. **Pendiente:** UI de traslado masivo con simulacion y portabilidad de saldo de vacaciones. |
| 2026-03-04 | **Planilla - resultados extendidos:** `nomina_resultados` con devengado/salario bruto periodo/cargas/impuesto y snapshot JSON completo en `nomina_planilla_snapshot_json` para reportes RRHH y provision de aguinaldo. |
| 2026-03-05 | **Acciones de Personal (UI):** Se sincroniza el filtro superior de Estados con el panel de filtros para evitar doble filtro oculto; al cambiar Estados se limpia el filtro interno de Estado en todas las vistas (Ausencias, Licencias, Incapacidades, Vacaciones, Bonificaciones, Horas Extra, Retenciones, Descuentos, Aumentos). |
| 2026-03-05 | **Configuracin de Usuarios (Excepciones):** Se corrige validacin de DTOs en `/api/config/users/*` (imports reales para ValidationPipe) y se habilita acceso a oles-catalog` con permisos de asignacin de roles de empleados; frontend evita error 403 devolviendo lista vaca cuando el usuario no puede asignar roles. |
| 2026-03-05 | **Traslado interempresas:** Se corrige la validacin de DTOs en `/api/payroll/intercompany-transfer/*` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas en simulacin/ejecucin. |
| 2026-03-05 | **Traslado interempresas:** Se corrige query de resultados de planilla para usar `estado_calendario_nomina` (evita error SQL `Unknown column 'p.estado'`). |
| 2026-03-05 | **Traslado interempresas:** Validacin de planilla destino ahora usa fechas de acciones de personal (no fecha efectiva) y se consolida el error con conteo de fechas faltantes. |
| 2026-03-05 | **Traslado interempresas:** Mensajes de bloqueo refinados (planillas activas, acciones bloqueantes y fechas sin planilla destino con resumen legible). |
| 2026-03-05 | **Traslado interempresas (UI):** Se elimina la fecha efectiva del formulario; la simulacin usa fecha del da para registrar el traslado. |
| 2026-03-05 | **Reset de datos (HR_PRO):** Limpieza total de datos operativos (empleados, empresas, acciones, planillas, usuarios y colas) preservando catlogos base (`sys_roles`, `sys_permisos`, `sys_apps`, `nom_periodos_pago`, `nom_tipos_*`, `erp_tipo_cuenta`, `nom_cargas_sociales`, `nom_feriados_planilla`). |
| 2026-03-05 | **Identidad:** Se crea usuario maestro de TI (no empleado) con rol `MASTER` global para administracin del sistema. Credenciales entregadas fuera de la documentacin. |
| 2026-03-05 | **RBAC:** Se asegura que el rol `MASTER` tenga todos los permisos activos asignados en `sys_rol_permiso`. |
| 2026-03-05 | **Usuarios:** Al crear un usuario, se asigna automticamente una empresa activa por defecto para contexto de trabajo (no altera permisos). |
| 2026-03-05 | **Empresas:** Se crea empresa inicial (Rocca Desarrollos Residenciales) y se asigna al usuario maestro para contexto de trabajo. |
| 2026-03-05 | **Empresas:** Se corrige validacin de DTOs en `/api/companies` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Clases:** Se corrige validacin de DTOs en `/api/classes` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Clases (UI):** Se evita el loop de carga al abrir edición (normalizacin de ID y carga nica por modal). |
| 2026-03-05 | **Proyectos:** Se corrige validacin de DTOs en `/api/projects` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Proyectos (UI):** Se evita el loop de carga al abrir edición (normalizacin de ID y carga nica por modal). |
| 2026-03-05 | **Proyectos (UI):** Listado carga todos los proyectos por defecto; se agrega filtro opcional por empresa sin bloquear la carga inicial. |
| 2026-03-05 | **Proyectos (UI):** El filtro por empresa dispara la recarga inmediata para evitar estados vacos al cambiar de empresa. |
| 2026-03-05 | **Cache:** Las mutaciones invalidan cache por empresa y global para evitar listados vacos cuando se consulta sin filtro de empresa. |
| 2026-03-05 | **Proyectos:** Se alinea la convencin de estado a `1=Activo / 0=Inactivo` en backend y UI. |
| 2026-03-05 | **Departamentos:** Se corrige validacin de DTOs en `/api/departments` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Departamentos (UI):** Se evita recarga infinita del detalle al editar para no sobrescribir cambios en el formulario. |
| 2026-03-05 | **Puestos:** Se corrige validacin de DTOs en `/api/positions` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Puestos (UI):** Se evita recarga infinita del detalle al editar para no sobrescribir cambios en el formulario. |
| 2026-03-05 | **Cuentas Contables:** Se corrige validacin de DTOs en `/api/accounting-accounts` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Empleados:** Se corrige validacin de DTOs en `/api/employees` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al crear/editar. |
| 2026-03-05 | **Empleados (UI):** El botn de guardar se habilita al abrir el modal usando valores iniciales del empleado (sin requerir interaccin con tabs). |
| 2026-03-05 | **Documentacin:** Se actualiza regla para exigir cambios transversales en todos los docs relevantes cuando se modifique una regla/proceso/decisin. |
| 2026-03-05 | **Empleados (Doc 23):** Se documenta el flujo de creacin con acceso a KPITAL y la visibilidad en Gestin de Usuarios (cache TTL). |
| 2026-03-05 | **Usuarios:** Se invalida el cache de `/api/users` cuando se crea un empleado con acceso y se fuerza refresh en frontend al cerrar el modal. |
| 2026-03-05 | **Usuarios (UI):** Se normalizan IDs de empresas en Gestin de Usuarios para evitar desmarques al asignar mltiples empresas. |
| 2026-03-05 | **Permisos (Doc 24):** Se documenta el refresco automtico de Gestin de Usuarios tras crear empleado con acceso. |
| 2026-03-05 | **Empleados:** El rol asignado al crear empleado con acceso se guarda tambin como rol global para reflejarse en Gestin de Usuarios. |
| 2026-03-05 | **Usuarios (UI):** Se agrega estado de carga real en Excepciones y mensaje claro cuando el rol no tiene permisos. |
| 2026-03-05 | **Empleados (Doc 16/31):** Se actualiza el flujo de insercin manual en BD para reflejar el provisionamiento automtico de acceso TimeWise (identity worker) y sus precondiciones. |
| 2026-03-05 | **Usuarios (UI):** Se corrige el estado de carga en Excepciones para evitar spinner infinito al cargar permisos de rol. |
| 2026-03-05 | **Planillas:** Se corrige validacin de DTOs en `/api/payroll` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas al abrir planilla. |
| 2026-03-05 | **Planillas (API):** Se normalizan fechas a `YYYY-MM-DD` en respuestas de `/api/payroll` para evitar desfases por zona horaria en la UI. |
| 2026-03-05 | **Planillas:** Se alinea `es_inactivo` a la regla global `1=Activo / 0=Inactivo` y se ajustan filtros/validaciones. |
| 2026-03-05 | **Cache (Planillas):** Se agrega `fechaDesde/fechaHasta/includeInactive/inactiveOnly` a la allowlist del scope `payroll` para evitar respuestas cacheadas desactualizadas. |
| 2026-03-05 | **Cache (Invalidacin):** Se usa `idEmpresa` desde body para invalidar cache de endpoints POST/PUT/PATCH/DELETE que no llevan query. |
| 2026-03-05 | **Planillas (API):** Se expone DTO de respuesta para planillas con fechas normalizadas `YYYY-MM-DD`. |
| 2026-03-05 | **Fechas (TZ):** Se normaliza parseo/serialización de fechas a hora local (date-only) en planillas y acciones personales para evitar desfases de zona horaria. |
| 2026-03-05 | **Planillas:** Se asegura compatibilidad de fechas `DATE` con TypeORM (strings) en procesos internos como clculo quincenal. |
| 2026-03-05 | **Planillas (UI):** Tooltip de Procesar en tabla ahora describe el flujo operativo (prepara la planilla y genera movimientos a pagar). |
| 2026-03-05 | **Planillas (UI):** Tooltip de Inactivar en tabla aclara que retira la planilla del flujo operativo. |
| 2026-03-05 | **Feriados Planilla:** Se corrige validacin de DTOs en `/api/payroll-holidays` (imports reales para ValidationPipe) para evitar rechazo de propiedades vlidas. |
| 2026-03-06 | **Empleados (UI):** Nombres se muestran como **Apellidos  Nombre** en listas, selects y cards. Adems, los selects/listados de empleados se ordenan alfabticamente por apellido. |
| 2026-03-06 | **Tablas (UI):** Todas las tablas del sistema incluyen ordenamiento por columnas usando `useSortableColumns`. |




| 2026-03-06 | **Acciones de Personal (UI):** En creacin no se preselecciona empresa en modales; el usuario debe elegirla para cargar empleados, planillas y movimientos. |
| 2026-03-06 | **Acciones de Personal (UI - modales):** Se estandariza `modalCompanyId` + `onCompanyChange` en Ausencias, Licencias, Incapacidades, Vacaciones, Bonificaciones, Horas Extra, Retenciones, Descuentos y Aumentos. Al cambiar empresa dentro del modal se recargan catálogos y no se resetea la selección por cambios en filtros externos. |
| 2026-03-08 | **Cuentas Contables (Cache):** Se corrige la allowlist del scope accounting-accounts para incluir idEmpresa e idEmpresas, evitando colisiones de cache entre empresas que podian mostrar listados vacios al cambiar filtro. Tambien se mejora resolveCompanyKey para interpretar idEmpresas cuando llega un solo ID. |
| 2026-03-08 | **Articulos de Nomina (UI):** Se corrige desacople entre filtro de listado y modal (empresa de formulario independiente), carga de cuentas por empresa/tipo, preload de nombre en edicion y normalizacion de etiquetas de cuenta para evitar fallback `Cuenta #id` en primera carga. |
| 2026-03-08 | **Movimientos de Nomina (UI):** Se corrige desacople entre filtro de listado y modal de crear (empresa no preseleccionada por filtro externo), se persiste `idClase` en payload, y se refuerza regla de calculo (`Monto Fijo`/`Porcentaje`) forzando el campo no activo a `0` al cambiar el tipo. |
| 2026-03-08 | **Gestion Planilla (UI - Abrir Planilla):** En crear planilla, empresa ya no se preselecciona desde filtro de tabla (solo en escenario de empresa unica). Se agrega autofill de `Inicio Pago` -> `Fin Pago` y `Fecha Pago Programada` con hardening para mantener `Fecha Pago Programada` dentro de la ventana de pago. |
| 2026-03-08 | **Validacion manual cerrada:** Modulos validados en UI: Puestos, Departamentos, Proyectos, Empleados, Configuracion de Usuario, Cuentas Contables, Articulos de Nomina, Movimientos de Nomina, Feriados y Abrir Planilla (crear/editar/bitacora segun corresponda). Evidencia en `docs/Test/TEST-EXECUTION-REPORT.md`. |
| 2026-03-08 | **Checkpoint remoto estable:** Push en `main` con commits `976eab4` (checkpoint funcional) y `ba41355` (registro documental del checkpoint). |
| 2026-03-08 | **Planillas (Inactivar/Reactivar + Cache):** Se implementa `PATCH /api/payroll/:id/reactivate` con reasociacion parcial de acciones desde snapshot (`acc_planilla_reactivation_items`) y fallback a `PENDING_RRHH` cuando una accion no es elegible. Se ajusta cache interceptor para que `cb` participe en la key y efrescar` fuerce datos frescos sin esperar TTL. |

### Actualizacion worker de identidad (Rev. 9 - 2026-03-09)

- Se corrige error de runtime en worker de automatizacion de empleados: `No metadata for "EmployeeIdentityQueue" was found`.
- Ajuste aplicado en TypeORM: `autoLoadEntities: true` en `api/src/config/database.config.ts`.
- Objetivo: asegurar que entidades registradas en `TypeOrmModule.forFeature(...)` queden cargadas en el datasource activo y evitar fallos de metadata en repositorios de colas.
- Validacion tecnica: `npm run build` en `api` ejecutado correctamente.

### Actualizacion planillas/traslado (Rev. 10 - 2026-03-09)

- Reasociacion automatica de acciones huerfanas ahora exige compatibilidad estricta entre planilla origen del snapshot y planilla candidata: periodo de pago, tipo planilla (id/texto), moneda, inicio/fin de periodo, fecha corte, inicio/fin pago y pago programado.
- Ejecucion de traslado interempresas invalida snapshots pendientes vinculados a acciones trasladadas (esultado_reactivacion = INVALIDATED_BY_TRANSFER) para evitar reprocesamiento posterior por reactivacion/cron.
- Pruebas backend ejecutadas: payroll.service, intercompany-transfer.service y payroll-orphan-reassignment (16/16).

### Actualizacion E2E controlado planillas/traslado (Rev. 11 - 2026-03-09)

- Se ejecuto validacion robusta con datos reales en `mysql_hr_pro` para dos escenarios enterprise:
  - Escenario A: inactivar planilla -> crear planilla exacta compatible -> reasignacion automatica.
  - Escenario B: inactivar planilla -> traslado interempresa -> invalidacion de snapshots por traslado.
- Evidencia Escenario A (real):
  - Snapshot pendiente despues de inactivar: 9.
  - Reasociados automaticamente (EASSOCIATED_AUTO`): 45.
  - Reasociados por flujo de reactivacion (EASSOCIATED`): 9.
- Evidencia Escenario B (real):
  - La simulacion de traslado ya construye asignaciones de calendario por fecha correctamente.
  - El execute quedo bloqueado por dos causas de negocio/tecnica detectadas:
    1) acciones bloqueantes activas (licencia/incapacidad/aumento);
    2) conflicto de unicidad en ledger de vacaciones (`UQ_vacaciones_ledger_source`) durante traslado.
- Pruebas de modulo ejecutadas y pasando:
  - `payroll.service.spec.ts`
  - `intercompany-transfer.service.spec.ts`
  - `payroll-orphan-reassignment.service.spec.ts`
  - Resultado: 16/16.
- Build API validado en verde.

### Actualizacion compatibilidad de fechas (Rev. 12 - 2026-03-09)

- Regla ajustada por negocio para compatibilidad de planillas en reasociacion/reactivacion:
  - Se valida solo `fecha_inicio_periodo` y `fecha_fin_periodo`.
  - No se bloquea por diferencias en `fecha_corte`, `fecha_inicio_pago`, `fecha_fin_pago`, `fecha_pago_programada`.
- Se mantuvo validacion de empresa/perido de pago/tipo/moneda.
- Prueba de modulo actualizada y ejecutada en verde.

### Actualizacion traslado interempresa (Rev. 13 - 2026-03-09)

- Se removio bloqueo por tipo de accion pendiente en simulacion de traslado (`licencia/incapacidad/aumento`) cuando la accion esta en estado trasladable.
- Se corrigio conflicto tecnico en ledger de vacaciones durante execute de traslado separando source de movimiento:
  - `TRANSFER_OUT` (origen)
  - `TRANSFER_IN` (destino)
- E2E real ejecutado sobre empleado `id=4`:
  - Simulacion: elegible (sin bloqueos)
  - Execute: exitoso (`transferId=3`, estado EXECUTED)
  - Resultado en BD: empleado movido de empresa 1 -> 3, acciones movidas a empresa 3 con calendario 11, snapshots marcados `INVALIDATED_BY_TRANSFER` (6).

### Actualizacion traslado interempresas UI (Rev. 14 - 2026-03-09 01:54:09 -06:00)

- Se corrige refresco post-ejecucion en Traslado interempresas para evitar grilla desactualizada despues de mover empleado.
- Ajustes: invalidacion de cache en execute y en boton Refrescar, remocion inmediata local de empleados ejecutados, recarga diferida para evitar carrera de lectura.
- Archivo tocado: rontend/src/pages/private/payroll-management/IntercompanyTransferPage.tsx.
- Estado de pruebas:
  - Backend/E2E de traslado: documentado y validado en fases previas.
  - QA funcional UI de este ajuste: pendiente de corrida manual final.
- Handoff detallado de este corte: docs/50-Handoff-TrasladoInterempresas-20260309.md.

### Actualizacion UX/UI traslado interempresas (Rev. 15 - 2026-03-09)

- Se mejora la experiencia visual de Traslado interempresas con jerarquia moderna sin romper el design system RRHH.
- Cambios: hero card mas clara, parametros en grid responsive, chips de resumen siempre visibles, grupo de acciones con mejor contraste y tabla con lectura mas limpia.
- Archivos: rontend/src/pages/private/payroll-management/IntercompanyTransferPage.tsx, rontend/src/pages/private/payroll-management/IntercompanyTransferPage.module.css.



- Ajuste UX puntual: en tabla de traslado, columna Periodo muestra etiqueta de catalogo (no solo ID).
