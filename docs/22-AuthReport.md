# KPITAL 360 - Auth Report (Enterprise) - Cierre de Hardening

**Documento:** 22  
**Fecha:** 2026-02-23  
**Objetivo:** Registrar el hardening ejecutado para llevar Auth/Core a nivel enterprise operativo (guards globales, refresh rotatorio, CSRF, rate-limit, auditoria, locking en payroll y outbox de eventos).

---

## 0) Resumen Ejecutivo

Implementado en esta fase:

1. Guardrails globales de seguridad en API (`JWT + CSRF + Permissions`).
2. Refresh token rotatorio con revocacion y persistencia hash en DB.
3. Proteccion CSRF por header/cookie (double submit).
4. Rate limit por IP en endpoints de autenticacion.
5. Auditoria de auth con eventos estructurados.
6. Locking optimista en `payroll apply`.
7. Outbox base (`sys_domain_events`) con persistencia de eventos clave.

Build status:

1. `api` compila OK.
2. `frontend` compila OK.

---

## 1) Cambios Implementados (Codigo)

## 1.1 Seguridad transversal global

1. `APP_GUARD` global en `AppModule`:
   - `JwtAuthGuard`
   - `CsrfGuard`
   - `PermissionsGuard`
2. Decoradores nuevos:
   - `@Public()`
   - `@SkipCsrf()`
3. Endpoints publicos definidos explicitamente (auth/login, auth/validate, auth/microsoft/exchange, health).

## 1.2 Permisos backend obligatorios

Se agrego `@RequirePermissions(...)` en controladores sensibles:

1. `employees`
2. `payroll`
3. `personal-actions`
4. `companies`
5. `users`
6. `roles`
7. `permissions`
8. `apps`
9. `user-assignments`

Se reemplazo `userId=1` hardcoded por `@CurrentUser()` en operaciones mutantes.

## 1.3 Sesion enterprise (refresh rotatorio)

1. Nueva entidad: `RefreshSession` (`sys_refresh_sessions`).
2. `AuthService` ahora emite:
   - access token (cookie `platform_token`)
   - refresh token (cookie `platform_refresh_token`)
   - csrf token (cookie `platform_csrf_token`)
3. Endpoint nuevo: `POST /api/auth/refresh`.
4. Rotacion implementada por `jti` + hash bcrypt de refresh en DB.
5. Logout revoca refresh activo y limpia cookies de access/refresh/csrf.

## 1.4 CSRF posture

1. Guard CSRF activo para `POST/PUT/PATCH/DELETE`.
2. Validacion de `x-csrf-token` contra cookie `platform_csrf_token`.
3. Frontend envia header CSRF automatico en mutaciones (`httpInterceptor`).
4. `performLogout` actualizado para enviar header CSRF.

## 1.5 Rate limit en auth

Throttle en memoria por IP para:

1. `POST /auth/login`
2. `POST /auth/validate`
3. `POST /auth/microsoft/exchange`
4. `POST /auth/refresh`

## 1.6 Auditoria de seguridad

1. Servicio `AuthAuditService` para eventos:
   - `login_success`
   - `login_failed`
   - `refresh_used`
   - `logout`
   - `switch_company`
   - `microsoft_validate_failed`
2. Registro estructurado en logs + persistencia en outbox (`sys_domain_events`).

## 1.7 Payroll: concurrencia y eventos

1. `nom_calendarios_nomina` ahora tiene `version_lock_calendario_nomina`.
2. `apply` usa control optimista (`WHERE version` + update atomico).
3. Conflicto concurrente retorna `409`.
4. Eventos de payroll se registran en outbox con `idempotency_key`.

## 1.8 Outbox base

1. Tabla `sys_domain_events` creada.
2. Servicio `DomainEventsService` para persistir eventos de dominio.
3. Integrado en auth y payroll.

## 1.9 RBAC + Overrides por usuario (hardening de autorizacion)

1. Nueva tabla `sys_usuario_permiso` para overrides por contexto (`user + company + app`).
2. `resolvePermissions()` actualizado:
   - base por roles del contexto,
   - aplica overrides de usuario,
   - `DENY` tiene precedencia sobre `ALLOW`.
3. Endpoints administrativos enterprise agregados bajo `/api/config/*`:
   - gestion de roles,
   - reemplazo de permisos por rol,
   - reemplazo de roles por usuario/contexto,
   - reemplazo y consulta de overrides por usuario/contexto.

## 1.10 Robustez de sesion ante fallas transientes (frontend + backend)

1. Frontend:
   - `httpInterceptor` ahora usa timeout en requests (`fetchWithTimeout`).
   - `tryRefreshSession()` maneja timeout/error de red y responde `false` sin colgar la app.
   - Resultado: evita quedarse indefinidamente en "Verificando sesion...".
2. Backend:
   - `AuthService.refreshSession()` captura errores transientes de DB/driver (`ECONNRESET`, `PROTOCOL_CONNECTION_LOST`, `ETIMEDOUT`, etc.).
   - En esos casos responde `401` controlado (`Sesion expirada o no valida`) en lugar de error no controlado.
3. Efecto operativo:
   - Si hay corte transiente contra MySQL/RDS durante refresh, el cliente fuerza relogin seguro (`/auth/login?expired=true&from=...`).
   - Se prioriza fail-closed para acceso enterprise.

## 1.11 Correccion de flujo Microsoft popup (callback race condition)

1. Problema:
   - En callback OAuth (`/auth/login?code=...`), `useSessionRestore`/`PublicGuard` podian redirigir a `/dashboard` dentro del popup antes de ejecutar `postMessage + window.close`.
   - Resultado: popup quedaba abierto y la ventana principal quedaba en "Validando con Microsoft...".
2. Ajuste aplicado:
   - Deteccion explicita de callback Microsoft en frontend (`isMicrosoftOAuthCallbackInProgress`).
   - `App.tsx`: no bloquea router con spinner en callback OAuth.
   - `useSessionRestore`: omite restore para callback OAuth y libera `sessionLoading`.
   - `PublicGuard`: no redirige a dashboard durante callback OAuth.
3. Resultado:
   - El popup completa handshake (`postMessage`) y se cierra como comportamiento esperado.

---

## 2) Migraciones Nuevas

Agregar al despliegue:

1. `1708532200000-AddSecurityAndOutboxTables.ts`
2. `1708532400000-AddUserPermissionOverrides.ts`

Esta migracion crea:

1. `sys_refresh_sessions`
2. `sys_domain_events`
3. `version_lock_calendario_nomina` en `nom_calendarios_nomina`

Y adicionalmente:

1. `sys_usuario_permiso` (overrides ALLOW/DENY por usuario/contexto)

---

## 3) Auditoria Final de Seguridad (Estado)

| Control | Estado | Evidencia |
|---|---|---|
| Guards globales por defecto | Cumple | `APP_GUARD` en `AppModule` |
| Endpoints sensibles con permisos | Cumple (fase 1) | `@RequirePermissions` aplicado en modulos de negocio/config |
| Refresh token rotatorio | Cumple | `sys_refresh_sessions` + `/auth/refresh` + rotacion jti |
| Revocacion de sesion | Cumple | `logout` revoca refresh y limpia cookies |
| CSRF formal | Cumple | `CsrfGuard` + header `x-csrf-token` |
| Rate limit auth | Cumple (fase 1) | `AuthRateLimitService` por IP |
| Auditoria eventos auth | Cumple (fase 1) | `AuthAuditService` + logs + outbox |
| Locking optimista payroll apply | Cumple | `version_lock` + `409` en conflicto |
| Outbox persistente | Cumple (base) | `sys_domain_events` + `DomainEventsService` |

---

## 4) Riesgo Residual (Para Fase 2)

1. Rate limit actual es en memoria (recomendado migrar a Redis distribuido).
2. `PermissionsGuard` requiere `companyId` explicito para permisos contextuales, excepto endpoints marcados con `@AllowWithoutCompany()` (catalogos globales en Fase 1).
3. Outbox esta persistido, pero falta publicador asincrono (worker) para dispatch externo.
4. Falta paquete de evidencia QA visual final (capturas Network/cookies/matriz de respuestas) para cierre documental completo.

---

## 5) Evidencia Tecnica Minima Ejecutada

1. Build API: OK.
2. Build Frontend: OK.
3. Flujo de login Microsoft y avatar persistente previamente validado.
4. Interceptor frontend actualizado para CSRF + refresh automatico ante `401`.
5. Interceptor frontend actualizado con timeout en request y refresh.
6. Refresh backend actualizado para mapear errores transientes de DB a `401` controlado.

---

## 6) Conclusion

Con esta implementacion, el nucleo de hardening solicitado quedo aplicado en codigo y documentado. El sistema pasa de arquitectura enterprise conceptual a una postura de seguridad enterprise operativa de fase 1.

## 1.12 Correccion de estabilidad en restauracion de permisos (2026-02-24)

1. Problema detectado:
   - En restauracion de sesion, acciones de contexto podian disparar recargas redundantes de permisos.
   - Si una llamada fallaba o llegaba tarde, podia sobrescribir el estado con permisos vacios y provocar 403 falso positivo.
2. Correccion aplicada en frontend:
   - Middleware de contexto ignora eventos sin cambio real (`app` y `company`).
   - Fallos transitorios en recarga de permisos ya no pisan permisos vigentes.
3. Validacion de seguridad:
   - No se agrego persistencia sensible en navegador.
   - JWT continua en cookie `httpOnly`.
   - Autorizacion final permanece en backend con guards.
4. Resultado esperado:
   - El usuario no pierde acceso visual por condiciones de carrera cuando la sesion sigue siendo valida.
