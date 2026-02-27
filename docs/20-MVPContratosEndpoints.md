# DIRECTIVA 20 — Contratos del MVP (Fase 1)

## Objetivo

Definir el contrato oficial de endpoints mínimos para Fase 1 y el formato exacto del permission contract (`module:action`), para que frontend y backend estén alineados sin ambigüedad.

---

## 1. Lista Oficial de Endpoints MVP

### Auth (ya implementados)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Login (email + password). Devuelve user + companies. Cookie httpOnly. | No |
| GET | `/api/auth/me` | Sesión actual. user, enabledApps, companies, permissions (si companyId+appCode). | Cookie |
| POST | `/api/auth/switch-company` | Cambiar contexto. Body: `{ companyId, appCode }`. Devuelve permissions + roles. | Cookie |
| POST | `/api/auth/logout` | Limpiar cookie. | Cookie |
| GET | `/api/auth/permissions-stream` | SSE por usuario autenticado. Emite `permissions.changed` cuando cambia authz. | Cookie |
| GET | `/api/auth/authz-token` | Token liviano de version de autorizacion para polling de respaldo. | Cookie |

### Companies

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/companies` | Listar empresas (activas por defecto). Query: `?includeInactive=true` opcional. | Cookie | company:manage |
| GET | `/api/companies/:id` | Detalle de una empresa. | Cookie | company:manage |
| POST | `/api/companies` | Crear empresa. | Cookie | company:manage |
| PUT | `/api/companies/:id` | Actualizar empresa. | Cookie | company:manage |
| PATCH | `/api/companies/:id/inactivate` | Inactivar empresa. | Cookie | company:manage |
| PATCH | `/api/companies/:id/reactivate` | Reactivar empresa. | Cookie | company:manage |

### Employees (ya implementados)

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/employees?idEmpresa=N` | Listar empleados de empresa. Query: `?includeInactive=true` opcional. | Cookie | employee:view |
| GET | `/api/employees/:id` | Detalle empleado. | Cookie | employee:view |
| POST | `/api/employees` | Crear empleado (body: CreateEmployeeDto). | Cookie | employee:create |
| PUT | `/api/employees/:id` | Actualizar empleado. | Cookie | employee:edit |
| PATCH | `/api/employees/:id/inactivate` | Inactivar empleado. | Cookie | employee:edit |
| PATCH | `/api/employees/:id/liquidar` | Liquidar empleado. | Cookie | employee:edit |

### Catalogs (ya implementados)

| Metodo | Ruta | Descripcion | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/catalogs/departments` | Catalogo global de departamentos activos. | Cookie | employee:view |
| GET | `/api/catalogs/positions` | Catalogo global de puestos activos. | Cookie | employee:view |
| GET | `/api/catalogs/pay-periods` | Catalogo global de periodos de pago activos. | Cookie | employee:view |

### Config Access (RBAC enterprise)

| Metodo | Ruta | Descripcion | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/config/permissions` | Lista catalogo de permisos (`module:action`). Query: `modulo`, `includeInactive`. | Cookie | config:permissions |
| GET | `/api/config/roles` | Lista roles del sistema. Query: `includeInactive`. | Cookie | config:roles |
| POST | `/api/config/roles` | Crear rol. | Cookie | config:roles |
| PATCH | `/api/config/roles/:id` | Editar metadata de rol (nombre/descripcion). | Cookie | config:roles |
| PUT | `/api/config/roles/:id/permissions` | Reemplazo total de permisos del rol por codigos. Body: `{ permissions: string[] }`. | Cookie | config:roles |
| PUT | `/api/config/users/:id/roles` | Reemplazo total de roles de usuario por contexto. Body: `{ companyId, appCode, roleIds[] }`. | Cookie | config:roles |
| PUT | `/api/config/users/:id/permissions` | Reemplazo total de overrides por usuario/contexto. Body: `{ companyId, appCode, allow[], deny[] }`. | Cookie | config:permissions |
| GET | `/api/config/users/:id/permissions` | Consulta overrides activos del usuario por contexto. Query: `companyId`, `appCode`. | Cookie | config:permissions |

### Payroll (esqueleto MVP)

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/payroll?idEmpresa=N` | Listar planillas de empresa. | Cookie | payroll:view |
| GET | `/api/payroll/:id` | Detalle planilla. | Cookie | payroll:view |
| POST | `/api/payroll` | Abrir planilla (calendario nómina). Body: idEmpresa, idPeriodoPago, periodoInicio, periodoFin, fechaInicioPago, fechaFinPago, [tipoPlanilla], [moneda]. | Cookie | payroll:create |
| PATCH | `/api/payroll/:id/reopen` | Reabrir planilla Verificada → Abierta. Body: `{ motivo }`. | Cookie | payroll:edit |
| PATCH | `/api/payroll/:id/verify` | Verificar planilla (Abierta → Verificada). | Cookie | payroll:verify |
| PATCH | `/api/payroll/:id/apply` | Aplicar planilla (Verificada → Aplicada, inmutabilidad). | Cookie | payroll:apply |
| PATCH | `/api/payroll/:id/inactivate` | Inactivar planilla. | Cookie | payroll:cancel |

### Payroll Movements (Parametros de Planilla)

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/payroll-movements?idEmpresa=N&idEmpresas=1,2` | Listar movimientos de nomina (filtro empresa / multiempresa). | Cookie | payroll-movement:view |
| GET | `/api/payroll-movements/:id` | Detalle de movimiento de nomina. | Cookie | payroll-movement:view |
| POST | `/api/payroll-movements` | Crear movimiento de nomina. | Cookie | payroll-movement:create |
| PUT | `/api/payroll-movements/:id` | Editar movimiento de nomina. | Cookie | payroll-movement:edit |
| PATCH | `/api/payroll-movements/:id/inactivate` | Inactivar movimiento de nomina. | Cookie | payroll-movement:inactivate |
| PATCH | `/api/payroll-movements/:id/reactivate` | Reactivar movimiento de nomina. | Cookie | payroll-movement:reactivate |
| GET | `/api/payroll-movements/:id/audit-trail` | Bitacora del movimiento. | Cookie | config:payroll-movements:audit |
| GET | `/api/payroll-movements/articles?idEmpresa=N` | Articulos de nomina por empresa para formulario. | Cookie | payroll-movement:view |
| GET | `/api/payroll-movements/personal-action-types` | Catalogo tipos de accion personal. | Cookie | payroll-movement:view |
| GET | `/api/payroll-movements/classes` | Catalogo de clases. | Cookie | payroll-movement:view |
| GET | `/api/payroll-movements/projects?idEmpresa=N` | Catalogo de proyectos por empresa. | Cookie | payroll-movement:view |

### Personal Actions (esqueleto MVP)

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/personal-actions?idEmpresa=N` | Listar acciones de personal. | Cookie | personal-action:view |
| GET | `/api/personal-actions/:id` | Detalle acción. | Cookie | personal-action:view |
| POST | `/api/personal-actions` | Crear acción (pendiente). | Cookie | personal-action:create |
| PATCH | `/api/personal-actions/:id/approve` | Aprobar acción. Emite `personal-action.approved`. | Cookie | personal-action:approve |
| PATCH | `/api/personal-actions/:id/reject` | Rechazar acción. Body: `{ motivo }`. | Cookie | personal-action:approve |
| PATCH | `/api/personal-actions/:id/associate-to-payroll` | Asociar acción aprobada a planilla. Body: `{ idPlanilla }`. | Cookie | personal-action:view |

---

## 2. Permission Contract — Formato Exacto

### Estructura: `module:action`

- **Formato:** `{module}:{action}`
- **Separador:** dos puntos (`:`)
- **Case:** minúsculas, sin espacios.

### Catálogo Oficial (sys_permisos)

| Código | Módulo | Acción | Descripción |
|--------|--------|--------|-------------|
| `payroll:view` | payroll | view | Ver planillas |
| `payroll:create` | payroll | create | Crear/abrir planilla |
| `payroll:edit` | payroll | edit | Editar planilla (solo si Abierta) |
| `payroll:verify` | payroll | verify | Verificar planilla |
| `payroll:apply` | payroll | apply | Aplicar planilla (inmutabilidad) |
| `payroll:cancel` | payroll | cancel | Cancelar/inactivar planilla |
| `payroll-movement:view` | payroll-movement | view | Ver movimientos de nomina |
| `payroll-movement:create` | payroll-movement | create | Crear movimientos de nomina |
| `payroll-movement:edit` | payroll-movement | edit | Editar movimientos de nomina |
| `payroll-movement:inactivate` | payroll-movement | inactivate | Inactivar movimientos de nomina |
| `payroll-movement:reactivate` | payroll-movement | reactivate | Reactivar movimientos de nomina |
| `employee:view` | employee | view | Ver empleados |
| `employee:create` | employee | create | Crear empleado |
| `employee:edit` | employee | edit | Editar empleado |
| `personal-action:view` | personal-action | view | Ver acciones de personal |
| `personal-action:create` | personal-action | create | Crear acción |
| `personal-action:approve` | personal-action | approve | Aprobar/rechazar acción |
| `company:manage` | company | manage | Gestionar empresas |
| `report:view` | report | view | Ver reportes |
| `config:users` | config | users | Gestionar usuarios |
| `config:roles` | config | roles | Gestionar roles |
| `config:permissions` | config | permissions | Gestionar permisos |
| `config:payroll-movements:audit` | config | audit | Ver bitacora de movimientos de nomina |

### Agrupación por Empresa

Los permisos se resuelven **por contexto (User + Company + App)**:

- `POST /auth/switch-company` con `{ companyId, appCode }` devuelve el array de códigos efectivos para ese contexto.
- El frontend filtra menú con `permissions.includes(requiredPermission)`.
- Si el usuario no tiene acceso a la empresa, no recibe permisos de esa empresa.

**Regla:** Un permiso existe solo en el contexto donde el usuario tiene rol que lo incluye, para la empresa activa y la app activa.

### Excepcion controlada (sin companyId)

Para endpoints marcados explicitamente en backend con `@AllowWithoutCompany()`, el `PermissionsGuard` permite validar solo autenticacion + permiso declarado sin exigir `companyId/idEmpresa` en query/body.

Caso vigente en Fase 1: `CatalogsController` (`/api/catalogs/departments`, `/positions`, `/pay-periods`).

### RBAC + Overrides por usuario (Fase 1.1)

Modelo de resolucion:

1. Base por roles del contexto (`user + company + app`).
2. Aplicar overrides directos de usuario del mismo contexto.
3. Precedencia final: `DENY` gana sobre `ALLOW`.

Regla de persistencia:

- Roles siguen siendo la fuente principal.
- Overrides son excepciones auditables (alta granularidad por usuario).

---

## 3. Base URL

- **Desarrollo:** `http://localhost:3000/api`
- **Producción:** Variable `VITE_API_URL` (ej: `https://api.kpital360.com/api`)

Todas las rutas son relativas al prefijo `/api`.

---

## Actualizacion 2026-02-27 - Planilla v2 Compatible

- Este documento mantiene el contrato MVP vigente.
- La definicion oficial para evolucion enterprise compatible de planilla queda en:
  - `docs/40-BlueprintPlanillaV2Compatible.md`
- Para implementacion inmediata de permisos y operacion en `hr_pro`, se debe aplicar seed RBAC de:
  - `payroll:view`
  - `payroll:create`
  - `payroll:verify`
  - `payroll:apply`
  - `payroll:cancel`
- Permisos planificados para integracion NetSuite en Fase 4:
  - `payroll:send_netsuite`
  - `payroll:retry_netsuite`

### Avance implementado sin NetSuite (2026-02-27)

Endpoints agregados en modulo `payroll`:
- `PATCH /api/payroll/:id/process`
  - Transicion `Abierta -> En Proceso`.
  - Genera snapshots (`nomina_empleados_snapshot`, `nomina_inputs_snapshot`).
  - Liga acciones aprobadas al run.
  - Calcula resultados base por empleado (`nomina_resultados`).
- `GET /api/payroll/:id/snapshot-summary`
  - Retorna conteos y sumatorias de corrida.

Permisos usados:
- `payroll:process` para `process`.
- `payroll:view` para `snapshot-summary`.

Nota:
- Integracion NetSuite queda explicitamente fuera de este avance.

### Actualizacion operativa adicional (2026-02-27)

Endpoints de planilla activos en API:
- `GET /api/payroll?idEmpresa=N&includeInactive=bool&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD`
- `GET /api/payroll/:id`
- `POST /api/payroll`
- `PATCH /api/payroll/:id` (editar)
- `PATCH /api/payroll/:id/process`
- `PATCH /api/payroll/:id/verify`
- `PATCH /api/payroll/:id/apply`
- `PATCH /api/payroll/:id/reopen`
- `PATCH /api/payroll/:id/inactivate`
- `GET /api/payroll/:id/snapshot-summary`
- `GET /api/payroll/:id/audit-trail`

Reglas adicionales documentadas:
- Filtro de fechas de listado por traslape de periodo (no solo por inicio o fin exacto).
- Bitacora de planilla con diffs de negocio (`payload_before/payload_after`) en `sys_auditoria_acciones`.
- `id_tipo_planilla` debe persistirse; frontend envia `idTipoPlanilla` y backend resuelve fallback por `tipoPlanilla`.
- `verify` responde `400` si la planilla no tiene snapshot de inputs/resultados (regla de negocio, no error tecnico).

Frontend (rutas operativas de planilla):
- `/payroll-params/calendario/dias-pago` (listado y operacion de planillas)
- `/payroll-params/calendario/ver` (calendario operativo mensual/timeline)
