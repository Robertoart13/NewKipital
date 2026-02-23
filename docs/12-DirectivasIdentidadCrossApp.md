# KPITAL 360 — Directivas de Identidad Única y Navegación Cross-App

**Documento:** 12  
**Para:** Todo el equipo (Frontend + Backend)  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) + [11-DirectivasConfiguracionBackend.md](./11-DirectivasConfiguracionBackend.md)  
**Prioridad:** Directiva conceptual. Define el modelo de identidad de toda la plataforma.

---

## 1. Principio Rector

KPITAL 360 y TimeWise **no son dos sistemas distintos**.  
Son dos aplicaciones sobre una misma plataforma con:

- Identidad única
- Base de datos compartida
- Autenticación centralizada
- Roles y permisos scopeados por aplicación y empresa
- **El usuario existe una sola vez.**

---

## 2. Modelo Conceptual de Identidad

Separar mentalmente cinco cosas:

| Concepto | Qué es |
|----------|--------|
| **User** (Identidad) | La cuenta que se autentica. |
| **App** (Producto) | KPITAL o TimeWise. |
| **Company** (Empresa) | Contexto empresarial activo. |
| **Role** (Rol) | Definido por app y empresa. |
| **Employee** (Representación laboral) | Entidad del dominio de RRHH. |

---

## 3. Regla de Autenticación

Existe un **único servicio de autenticación**.

El usuario:
- Se autentica **una sola vez**.
- Recibe un token válido para **toda la plataforma**.
- Ese token es aceptado por **ambas aplicaciones**.

**No existen dos logins.**  
**No existen dos tokens distintos.**  

Es un modelo de **SSO interno**.

---

## 4. Cambio entre Aplicaciones (KPITAL → TimeWise)

Cuando el usuario presiona "Ir a TimeWise":

- **No** se vuelve a autenticar.
- **No** se vuelve a pedir contraseña.
- **No** se crea una nueva sesión.
- Solo se **cambia el contexto de aplicación activa**.

### Condición obligatoria:

El usuario debe tener acceso habilitado a esa aplicación.  
El token debe estar vigente.

### El sistema valida:

1. Token válido
2. Usuario activo
3. Acceso permitido a esa app

Si se cumple → **acceso directo**.

---

## 5. Control de Acceso por Aplicación

No todos los empleados pueden entrar a KPITAL.  
El acceso a una aplicación es un **permiso independiente**.

Un usuario puede:

| App | Acceso |
|-----|--------|
| KPITAL | Sí / No |
| TimeWise | Sí / No |

Eso es **independiente del rol laboral**.

---

## 6. Multiempresa

Un usuario puede:
- Estar vinculado a **múltiples empresas**.
- Tener **roles distintos por empresa y por aplicación**.
- Operar planillas en Empresa A (KPITAL).
- Ser supervisor en Empresa B (TimeWise).
- Ser solo empleado en Empresa C.
- Tener varios roles a la vez (ej: Empleado + Supervisor en TimeWise). Jerarquía completa (Supervisor Global, Supervisor, Empleado): [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md).

Los permisos siempre están definidos por:

> **User + App + Company + Role**

Nunca solo por User.

**Importante:** KPITAL y TimeWise tienen permisos independientes. Ser Admin en KPITAL no implica ser Admin en TimeWise. Ver `24-PermisosEnterpriseOperacion.md` para el detalle de configuración.

---

## 7. Token y Seguridad (Conceptual)

El token representa:
- Identidad del usuario
- Aplicaciones habilitadas
- Empresas accesibles
- Rol actual activo (o lista de roles)

El cambio de empresa o aplicación:
- **No emite un nuevo login**
- Solo actualiza el contexto
- **Siempre revalida permisos en backend**

---

## 8. Regla Enterprise Fundamental

> **La identidad es única.**  
> **La autorización es contextual.**  
> **Nunca mezclar.**

---

## 9. Separación Obligatoria

- KPITAL **no puede** asumir permisos de TimeWise.
- TimeWise **no puede** asumir permisos de KPITAL.

Cada aplicación valida:
1. App activa
2. Empresa activa
3. Permisos específicos

---

## 10. Qué Debe Entender el Ingeniero

- Está construyendo una **plataforma multi-app**, no un sistema único.
- La autenticación es **centralizada**.
- La autorización es **distribuida por contexto**.
- El cambio de app es un **cambio de contexto**, no un nuevo login.
- La seguridad **nunca depende del frontend**.
- **Todo se valida en backend.**

---

## 11. Frase Clave

> Un usuario autentica una sola vez.  
> Las aplicaciones habilitan acceso.  
> Las empresas delimitan contexto.  
> Los roles conceden capacidades.  
> Los permisos autorizan acciones.

---

## 12. Arquitectura de SSO por Cookie Compartida

### Dominios de la plataforma

| Entorno | KPITAL 360 | TimeWise |
|---------|------------|----------|
| Producción | `https://kpital360.com` | `https://timewise.kpital360.com` |
| Desarrollo | `http://localhost:5173` | `http://localhost:5174` |

**Dominio raíz común:** `kpital360.com` → SSO limpio con cookies compartidas.

### Cómo funciona

El backend emite el JWT como cookie httpOnly:

```
Set-Cookie: platform_token=<jwt>
  Domain=.kpital360.com
  HttpOnly
  Secure
  SameSite=None
  Path=/
```

`kpital360.com` y `timewise.kpital360.com` comparten la misma cookie automáticamente.

### Flujo real

1. Usuario entra a `https://kpital360.com` → hace login
2. Backend responde con cookie httpOnly válida para `.kpital360.com`
3. Usuario hace click en "Ir a TimeWise"
4. Se abre `https://timewise.kpital360.com`
5. El navegador envía la misma cookie automáticamente
6. Backend valida cookie → usuario autenticado. Sin segundo login.

### Seguridad

- Cookie **HttpOnly** → JavaScript no puede leerla
- Cookie **Secure** → solo HTTPS en producción
- Cookie **firmada** con JWT_SECRET
- **Nunca guardar JWT en localStorage** → rompe seguridad enterprise

### Desarrollo local

En dev: cookies con `Domain=localhost`, `SameSite=Lax`, `Secure=false`. Frontend usa `credentials: 'include'` en todas las peticiones.

### Consecuencias en código

| Capa | Cambio |
|------|--------|
| **Backend** | CORS con `credentials: true`. Emite cookie httpOnly en login. Lee cookie en cada request. |
| **Frontend** | `fetch` con `credentials: 'include'`. No guarda token en localStorage ni Redux. |
| **authSlice** | Mantiene `user` e `isAuthenticated`, pero NO el token (es httpOnly). |
| **Interceptor** | `credentials: 'include'` en vez de header Authorization. |
| **"Ir a TimeWise"** | Simple redirect al subdominio. La cookie viaja sola. |

---

## Impacto en Arquitectura (Implementado)

| Área | Estado |
|------|--------|
| **authSlice (Redux)** | `enabledApps` + `companyIds` en User. Token no se expone a JS. |
| **activeAppSlice (Redux)** | Nuevo slice para app activa (KPITAL/TIMEWISE). |
| **permissionsSlice** | Scoped por `appId + companyId`. |
| **PrivateGuard** | Cascada: auth → app access → permisos → empresa. |
| **Middleware** | Reacciona a `setActiveApp` (limpia permisos, invalida queries). |
| **AppAccessGuard (Backend)** | `@RequireApp()` decorador + guard que valida `enabledApps`. |
| **TokenPayload (Backend)** | JWT lleva `enabledApps[]` + `companyIds[]`. |
| **Cookie SSO** | Backend emite cookie httpOnly. Frontend usa `credentials: 'include'`. |
| **App Switcher** | Botón en header para cambiar entre KPITAL ↔ TimeWise. |

---

## Conexión con Documentos Anteriores

| Documento | Conexión |
|-----------|----------|
| **01-EnfoqueSistema** | Define bounded contexts dentro de KPITAL; esta directiva eleva la visión a plataforma multi-app |
| **10-SeparacionLoginDashboard** | El login se evoluciona a SSO por cookie compartida |
| **11-ConfiguracionBackend** | El módulo auth emite cookie httpOnly + valida en cada request |

---

*Directiva implementada en código. SSO por cookie httpOnly activo en frontend y backend.*
