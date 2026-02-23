# DIRECTIVA 18 — Identity Core Enterprise (Fase 1 Completa)

## Objetivo

Cerrar el Identity Core completo: seed, autenticación real con JWT, guards, permisos dinámicos desde backend, conexión frontend↔backend, y base para SSO cross-app.

Sin este bloque, no existe multiempresa real, ni menú por permisos real, ni SSO KPITAL↔TimeWise.

---

## Componentes Implementados

### 1. Seed Inicial (Migración)

Datos base insertados en RDS:

| Dato | Detalle |
|------|---------|
| Empresa demo | KPITAL Corp (cédula 3-101-999999, prefijo KC) |
| Apps | `kpital` (KPITAL 360) + `timewise` (TimeWise) |
| 17 permisos | payroll:*, employee:*, personal-action:*, company:manage, report:view, config:* |
| Rol | ADMIN_SISTEMA (todos los permisos) |
| Usuario admin | roberto@kpital360.com / Admin2026! (bcrypt hash) |
| Asignaciones | admin → ambas apps, empresa KC, rol ADMIN_SISTEMA en KPITAL+TIMEWISE |

Archivo: `migrations/1708531600000-SeedIdentityCore.ts`

### 2. Autenticación Real (Backend)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Valida email+password (bcrypt), genera JWT, emite cookie httpOnly |
| `/api/auth/logout` | POST | Limpia cookie |
| `/api/auth/me` | GET | `@UseGuards(JwtAuthGuard)` — Retorna sesión: user+companies+enabledApps+permissions |
| `/api/auth/switch-company` | POST | `@UseGuards(JwtAuthGuard)` — Resuelve permisos para nueva empresa+app |

**AuthService** implementa:
- Login con bcrypt validation + failed attempts + account locking
- `buildSession()` — construye sesión completa (user, apps, companies, permissions)
- `resolvePermissions()` — cadena completa: usuario → roles (por empresa+app) → permisos del rol → overrides por usuario (`ALLOW/DENY`) → permisos efectivos

**JWT Payload (mínimo):**
```json
{ "sub": 1, "email": "roberto@kpital360.com", "type": "access" }
```

Permisos NO van en el JWT — se resuelven en cada request o en /me y /switch-company.

### 2.1 RBAC + Overrides (extension enterprise)

- Tabla de overrides: `sys_usuario_permiso` (scope: usuario + empresa + app + permiso).
- `ALLOW` agrega permiso puntual.
- `DENY` revoca permiso puntual aunque venga por rol.
- Regla no negociable: `DENY > ALLOW`.
- **Crítico:** Sin fila en `sys_usuario_app` para la app, `enabledApps` queda vacío y el usuario recibe "Sin acceso a esta aplicación".

Esto habilita casos como:
- rol base con `employee:create` y sin `employee:edit`,
- override `ALLOW employee:edit` para un usuario puntual,
- override `DENY employee:create` para bloquear creacion aunque el rol lo tenga.

### 3. Guards y Decoradores

| Componente | Archivo | Uso |
|-----------|---------|-----|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | `@UseGuards(JwtAuthGuard)` — valida JWT de cookie |
| `PermissionsGuard` | `common/guards/permissions.guard.ts` | Verifica permisos granulares vs `req.user.permissions` |
| `@RequirePermissions()` | `common/decorators/require-permissions.decorator.ts` | `@RequirePermissions('payroll:view')` |
| `@CurrentUser()` | `common/decorators/current-user.decorator.ts` | Extrae `{ userId, email }` del request |
| `AppAccessGuard` | `common/guards/app-access.guard.ts` | Verifica acceso a app (ya existente) |
| `@RequireApp()` | `common/decorators/require-app.decorator.ts` | Marca endpoint como exclusivo de app (ya existente) |

### 4. JWT Strategy (Passport)

- Extrae JWT de cookie httpOnly (`platform_token`)
- Valida firma, expiración, y `type: 'access'`
- Inyecta `{ userId, email }` en `request.user`

### 5. Frontend — Conexión Real

| Componente | Cambio |
|-----------|--------|
| `httpInterceptor.ts` | Usa `API_URL` configurable, paths relativos → URL completa |
| `config/api.ts` | `VITE_API_URL` o default `http://localhost:3000/api` |
| `authSlice.ts` | Agregado: `companies[]`, `sessionLoading`, `setSessionLoaded` |
| `permissionsSlice.ts` | Permisos vacíos por defecto (NUNCA hardcoded) |
| `useSessionRestore.ts` | Hook: al cargar app → `GET /me` → restaura sesión desde cookie |
| `App.tsx` | Usa `useSessionRestore()`, muestra spinner mientras verifica |
| `LoginPage.tsx` | Login real → auto-selecciona empresa si solo 1, carga permisos |
| `CompanySelectionPage.tsx` | Empresas reales desde Redux (del login), `POST /switch-company` |
| `api/permissions.ts` | `POST /auth/switch-company` real (no mock) |
| `companyChangeListener.ts` | Pasa `appCode` al cargar permisos |

---

## Flujo Completo de Autenticación

```
1. Usuario abre app
   └── useSessionRestore → GET /auth/me
       ├── Cookie válida → setCredentials + restaurar empresa + permisos
       └── Sin cookie → sessionLoading=false → muestra login

2. Login
   └── POST /auth/login (email, password)
       ├── Backend: validateForLogin → bcrypt.compare → JWT → cookie
       └── Frontend: setCredentials + empresas
           ├── 1 empresa → auto-selecciona + POST /switch-company → dashboard
           └── N empresas → /select-company

3. Selección de empresa
   └── POST /auth/switch-company (companyId, appCode)
       └── Backend: resolvePermissions → permisos atómicos
       └── Frontend: setPermissions + setActiveCompany → dashboard

4. Cambio de empresa (desde dashboard)
   └── Middleware companyChangeListener
       └── POST /auth/switch-company → nuevos permisos
       └── invalidateQueries (TanStack)

5. Logout
   └── performLogout → POST /auth/logout (limpia cookie)
       └── dispatch logout → clearPermissions + clearCompany + queryClient.clear()
```

---

## Contrato de Permisos (API)

### GET /auth/me?companyId=X&appCode=kpital

```json
{
  "authenticated": true,
  "user": {
    "id": "1",
    "email": "roberto@kpital360.com",
    "name": "Roberto Carlos Zuniga Altamirano",
    "enabledApps": ["kpital", "timewise"],
    "companyIds": ["1"]
  },
  "companies": [{ "id": 1, "nombre": "KPITAL Corp", "codigo": "KC" }],
  "permissions": ["payroll:view", "employee:view", ...],
  "roles": ["ADMIN_SISTEMA"]
}
```

### POST /auth/switch-company

Request: `{ "companyId": 1, "appCode": "kpital" }`

Response:
```json
{
  "companyId": 1,
  "appCode": "kpital",
  "permissions": ["payroll:view", ...],
  "roles": ["ADMIN_SISTEMA"]
}
```

`permissions[]` ya viene con el resultado final de `roles + overrides`.

---

## SSO Cross-App (Base Lista)

La infraestructura soporta SSO desde ya:
- Cookie `platform_token` con `Domain=.kpital360.com` (producción)
- Mismo JWT válido para KPITAL y TimeWise
- `enabledApps` en la sesión define a qué apps tiene acceso
- `resolvePermissions()` acepta `appCode` para diferenciar permisos por app
- Botón "Ir a TimeWise" = redirect simple (la cookie ya viaja)

---

## Qué Queda Cerrado

| Área | Estado |
|------|--------|
| Multiempresa a nivel de permisos | ✅ Real (desde BD) |
| Menú dinámico "de verdad" | ✅ Backend responde permisos reales |
| Login real funcionando | ✅ bcrypt + JWT + cookie httpOnly |
| Contexto de empresa activo | ✅ switch-company + localStorage |
| Base para SSO KPITAL↔TimeWise | ✅ Cookie compartida por dominio |
| Workflows de identidad | ✅ IdentitySyncWorkflow + EmployeeCreationWorkflow |
| Guards enterprise | ✅ JwtAuthGuard + PermissionsGuard + AppAccessGuard |
| Restauración de sesión | ✅ useSessionRestore (cookie → /me) |
