# DIRECTIVA 18  Identity Core Enterprise (Fase 1 Completa)

## Objetivo

Cerrar el Identity Core completo: seed, autenticacin real con JWT, guards, permisos dinmicos desde backend, conexin frontendbackend, y base para SSO cross-app.

Sin este bloque, no existe multiempresa real, ni men por permisos real, ni SSO KPITALTimeWise.

---

## Componentes Implementados

### 1. Seed Inicial (Migracin)

Datos base insertados en RDS:

| Dato | Detalle |
|------|---------|
| Empresa demo | KPITAL Corp (cdula 3-101-999999, prefijo KC) |
| Apps | `kpital` (KPITAL 360) + `timewise` (TimeWise) |
| 17 permisos | payroll:*, employee:*, personal-action:*, company:manage, report:view, config:* |
| Rol | ADMIN_SISTEMA (todos los permisos) |
| Usuario admin | roberto@kpital360.com / Admin2026! (bcrypt hash) |
| Asignaciones | admin  ambas apps, empresa KC, rol ADMIN_SISTEMA en KPITAL+TIMEWISE |

Archivo: `migrations/1708531600000-SeedIdentityCore.ts`

### 2. Autenticacin Real (Backend)

| Endpoint | Mtodo | Descripcin |
|----------|--------|-------------|
| `/api/auth/login` | POST | Valida email+password (bcrypt), genera JWT, emite cookie httpOnly |
| `/api/auth/logout` | POST | Limpia cookie |
| `/api/auth/me` | GET | `@UseGuards(JwtAuthGuard)`  Retorna sesin: user+companies+enabledApps+permissions |
| `/api/auth/switch-company` | POST | `@UseGuards(JwtAuthGuard)`  Resuelve permisos para nueva empresa+app |

**AuthService** implementa:
- Login con bcrypt validation + failed attempts + account locking
- `buildSession()`  construye sesin completa (user, apps, companies, permissions)
- `resolvePermissions()`  cadena completa: usuario  roles (por empresa+app)  permisos del rol  overrides por usuario (`ALLOW/DENY`)  permisos efectivos

**JWT Payload (mnimo):**
```json
{ "sub": 1, "email": "roberto@kpital360.com", "type": "access" }
```

Permisos NO van en el JWT  se resuelven en cada request o en /me y /switch-company.

### 2.1 RBAC + Overrides (extension enterprise)

- Tabla de overrides: `sys_usuario_permiso` (scope: usuario + empresa + app + permiso).
- `ALLOW` agrega permiso puntual.
- `DENY` revoca permiso puntual aunque venga por rol.
- Regla no negociable: `DENY > ALLOW`.
- **Crtico:** Sin fila en `sys_usuario_app` para la app, `enabledApps` queda vaco y el usuario recibe "Sin acceso a esta aplicacin".

Esto habilita casos como:
- rol base con `employee:create` y sin `employee:edit`,
- override `ALLOW employee:edit` para un usuario puntual,
- override `DENY employee:create` para bloquear creacion aunque el rol lo tenga.

### 3. Guards y Decoradores

| Componente | Archivo | Uso |
|-----------|---------|-----|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | `@UseGuards(JwtAuthGuard)`  valida JWT de cookie |
| `PermissionsGuard` | `common/guards/permissions.guard.ts` | Verifica permisos granulares vs `req.user.permissions` |
| `@RequirePermissions()` | `common/decorators/require-permissions.decorator.ts` | `@RequirePermissions('payroll:view')` |
| `@CurrentUser()` | `common/decorators/current-user.decorator.ts` | Extrae `{ userId, email }` del request |
| `AppAccessGuard` | `common/guards/app-access.guard.ts` | Verifica acceso a app (ya existente) |
| `@RequireApp()` | `common/decorators/require-app.decorator.ts` | Marca endpoint como exclusivo de app (ya existente) |

### 4. JWT Strategy (Passport)

- Extrae JWT de cookie httpOnly (`platform_token`)
- Valida firma, expiracin, y `type: 'access'`
- Inyecta `{ userId, email }` en `request.user`

### 5. Frontend  Conexin Real

| Componente | Cambio |
|-----------|--------|
| `httpInterceptor.ts` | Usa `API_URL` configurable, paths relativos  URL completa |
| `config/api.ts` | `VITE_API_URL` o default `http://localhost:3000/api` |
| `authSlice.ts` | Agregado: `companies[]`, `sessionLoading`, `setSessionLoaded` |
| `permissionsSlice.ts` | Permisos vacos por defecto (NUNCA hardcoded) |
| `useSessionRestore.ts` | Hook: al cargar app  `GET /me`  restaura sesin desde cookie |
| `App.tsx` | Usa `useSessionRestore()`, muestra spinner mientras verifica |
| `LoginPage.tsx` | Login real  auto-selecciona empresa si solo 1, carga permisos |
| `CompanySelectionPage.tsx` | Empresas reales desde Redux (del login), `POST /switch-company` |
| `api/permissions.ts` | `POST /auth/switch-company` real (no mock) |
| `companyChangeListener.ts` | Pasa `appCode` al cargar permisos |

---

## Flujo Completo de Autenticacin

```
1. Usuario abre app
    useSessionRestore  GET /auth/me
        Cookie vlida  setCredentials + restaurar empresa + permisos
        Sin cookie  sessionLoading=false  muestra login

2. Login
    POST /auth/login (email, password)
        Backend: validateForLogin  bcrypt.compare  JWT  cookie
        Frontend: setCredentials + empresas
            1 empresa  auto-selecciona + POST /switch-company  dashboard
            N empresas  /select-company

3. Seleccin de empresa
    POST /auth/switch-company (companyId, appCode)
        Backend: resolvePermissions  permisos atmicos
        Frontend: setPermissions + setActiveCompany  dashboard

4. Cambio de empresa (desde dashboard)
    Middleware companyChangeListener
        POST /auth/switch-company  nuevos permisos
        invalidateQueries (TanStack)

5. Logout
    performLogout  POST /auth/logout (limpia cookie)
        dispatch logout  clearPermissions + clearCompany + queryClient.clear()
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
- Cookie `platform_token` con `Domain=.kpital360.com` (produccin)
- Mismo JWT vlido para KPITAL y TimeWise
- `enabledApps` en la sesin define a qu apps tiene acceso
- `resolvePermissions()` acepta `appCode` para diferenciar permisos por app
- Botn "Ir a TimeWise" = redirect simple (la cookie ya viaja)

---

## Qu Queda Cerrado

| rea | Estado |
|------|--------|
| Multiempresa a nivel de permisos |  Real (desde BD) |
| Men dinmico "de verdad" |  Backend responde permisos reales |
| Login real funcionando |  bcrypt + JWT + cookie httpOnly |
| Contexto de empresa activo |  switch-company + localStorage |
| Base para SSO KPITALTimeWise |  Cookie compartida por dominio |
| Workflows de identidad |  IdentitySyncWorkflow + EmployeeCreationWorkflow |
| Guards enterprise |  JwtAuthGuard + PermissionsGuard + AppAccessGuard |
| Restauracin de sesin |  useSessionRestore (cookie  /me) |
