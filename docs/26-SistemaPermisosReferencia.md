# 26 — Sistema de Permisos: Referencia Técnica Completa

**Última actualización:** 2026-02-22  
**Objetivo:** Documentar cómo funciona el sistema de permisos de KPITAL 360, todas las tablas involucradas, el flujo de resolución y los puntos de fallo conocidos.

Referencias: `24-PermisosEnterpriseOperacion.md`, `18-IdentityCoreEnterprise.md`, `14-ModeloIdentidadEnterprise.md`, `27-DiagramaFlujoEmpleadosYUsuarios.md` (roles TimeWise, jerarquía supervisión, filtro Config Usuarios).

---

## 1. Enfoque del Sistema

El sistema usa **RBAC (Role-Based Access Control)** con dos fuentes de roles y dos capas de excepciones:

1. **Roles por contexto** (`sys_usuario_rol`): Usuario + Empresa + App → Rol  
2. **Roles globales** (`sys_usuario_rol_global`): Usuario + App → Rol (aplica a todas las empresas del usuario)  
3. **Overrides por contexto** (`sys_usuario_permiso`): DENY/ALLOW puntual por Usuario + Empresa + App + Permiso  
4. **Denegación global** (`sys_usuario_permiso_global`): Quitar permiso en todas las empresas para ese usuario + app  

**Regla de resolución:**  
**Permisos efectivos** = Permisos de roles − DENY overrides − Global deny + ALLOW overrides  

**DENY siempre gana sobre ALLOW.**

---

## 2. Tablas del Sistema de Permisos

### 2.1 Cadena de Dependencias (orden crítico)

Para que un usuario **vea opciones en el menú** y pueda operar, se requiere la siguiente cadena. Si falta cualquiera, el usuario no ve nada o recibe 403.

| Orden | Tabla | Propósito | Efecto si falta |
|-------|-------|-----------|-----------------|
| 1 | `sys_usuario_app` | Apps a las que tiene acceso el usuario | `enabledApps = []` → pantalla "Sin acceso a esta aplicación" (403) |
| 2 | `sys_usuario_empresa` | Empresas en las que opera | Sin empresas → `permissions = []`, `roles = []` |
| 3 | `sys_usuario_rol` o `sys_usuario_rol_global` | Roles asignados | Sin roles → `basePermissions = []` |
| 4 | `sys_rol_permiso` | Permisos del rol | Rol sin permisos → `basePermissions = []` |
| 5 | `sys_usuario_permiso` | Overrides DENY/ALLOW por contexto | DENY activo elimina permisos del conjunto efectivo |
| 6 | `sys_usuario_permiso_global` | Denegación global | Permiso bloqueado en todas las empresas |

### 2.2 Descripción por Tabla

| Tabla | Alcance | Qué guarda |
|-------|---------|------------|
| `sys_usuarios` | Root | Usuario (email, nombre, password hash). No contiene permisos ni roles. |
| `sys_apps` | Catálogo | Aplicaciones: `kpital`, `timewise`. |
| `sys_usuario_app` | Usuario ↔ App | Si el usuario puede entrar a esa app. **Crítico:** sin fila para KPITAL, `enabledApps` queda vacío. |
| `sys_usuario_empresa` | Usuario ↔ Empresa | Empresas en las que opera el usuario. Solo las marcadas; desmarcada = no ve nada de esa empresa. |
| `sys_roles` | Catálogo | Roles: MASTER, RRHH, etc. |
| `sys_permisos` | Catálogo | Permisos atómicos: `config:permissions`, `config:roles`, `employee:create`, etc. |
| `sys_rol_permiso` | Rol ↔ Permiso | Matriz: qué permisos tiene cada rol. Se configura en **Configuración > Roles**. |
| `sys_usuario_rol` | Usuario ↔ Rol ↔ Empresa ↔ App | Rol asignado por empresa y app. |
| `sys_usuario_rol_global` | Usuario ↔ Rol ↔ App | Rol que aplica a **todas** las empresas del usuario. |
| `sys_usuario_permiso` | Usuario ↔ Empresa ↔ App ↔ Permiso | Override DENY o ALLOW puntual. **Estado=1** = activo. |
| `sys_usuario_permiso_global` | Usuario ↔ App ↔ Permiso | Denegación global: el permiso nunca aplica para ese usuario en esa app. |

### 2.3 Diferencia Entre Overrides

| Tabla | Alcance | Ejemplo |
|-------|---------|---------|
| `sys_usuario_permiso` | Por empresa + app | "En Empresa A, para KPITAL, denegar employee:create" |
| `sys_usuario_permiso_global` | Por app (todas las empresas) | "En KPITAL, denegar config:users en todas las empresas" |

Ambas se aplican. Si existe DENY en cualquiera de las dos, el permiso se elimina del conjunto efectivo.

---

## 3. Vista de Configuración (Usuarios > Configurar)

La ventana de configuración de un usuario tiene tres pestañas y un selector de aplicación. Las pestañas **Roles**, **Usuarios** y **Permisos** del encabezado se muestran solo si el usuario tiene el permiso correspondiente (`config:roles`, `config:users`, `config:permissions`).

### 3.1 Selector de Aplicación

- **Aplicación:** Solo muestra las apps asignadas al usuario (`sys_usuario_app`). KPITAL 360 o TimeWise.
- Define el contexto para Roles y Excepciones.
- **Usuario sin apps:** Se muestra un formulario para asignar aplicaciones (requiere `config:users:assign-apps`). Si el usuario tiene apps, puede agregar más desde "Agregar más aplicaciones" (también requiere `config:users:assign-apps`).
- Estados de carga: Spinner mientras se cargan las apps del usuario.

### 3.2 Pestaña Empresas

- **Qué hace:** Asigna empresas (`sys_usuario_empresa`).  
- **API:** `PUT /api/config/users/:id/companies` (`replaceUserCompanies`).  
- **Permiso requerido:** `config:users:assign-companies` (además de `config:users` para abrir el drawer).
- **Regla:** Solo las empresas marcadas. Si está desmarcada, el usuario no ve nada de esa empresa.
- Si el usuario no tiene permiso, se muestra mensaje compacto indicando el permiso requerido y los controles quedan deshabilitados.

Al guardar empresas, el backend puede auto-asignar la app KPITAL si el usuario tenía empresas pero no app (`ensureUserHasKpitalApp`).

### 3.3 Pestaña Roles

- **Qué hace:** Asigna roles globales (`sys_usuario_rol_global`). Solo muestra roles de la app seleccionada.
- **API:** `PUT /api/config/users/:id/global-roles` (`replaceUserGlobalRoles`).  
- **Permiso requerido:** `config:users:assign-roles`.
- **Regla:** Los roles se aplican a **todas** las empresas del usuario (para la app seleccionada).
- **Requisito:** El usuario debe tener al menos una empresa asignada; si no, los roles no tienen efecto.
- Al guardar roles, la vista cambia automáticamente a Excepciones y actualiza la lista de roles sin refrescar.

### 3.4 Pestaña Excepciones

- **Qué hace:** Denegaciones globales (`sys_usuario_permiso_global`).  
- **API:** `PUT /api/config/users/:id/global-permission-denials` (`replaceUserGlobalPermissionDenials`).  
- **Permiso requerido:** `config:users:deny-permissions`.
- **Regla:** Los permisos marcados **NO** se aplicarán en ninguna empresa para esa app. El selector de rol solo muestra los roles asignados al usuario (de la pestaña Roles).
- Si el usuario no tiene permiso, se muestra mensaje compacto indicando el permiso requerido y los controles quedan deshabilitados.

**Importante:** La pestaña Excepciones solo escribe en `sys_usuario_permiso_global`. Los registros en `sys_usuario_permiso` pueden venir de flujos anteriores u otras configuraciones; si existen DENY activos ahí, también bloquean permisos.

---

## 4. Flujo de Resolución de Permisos

```
1. Usuario autenticado
   └── GET /auth/me?appCode=kpital
       ├── getEnabledApps()     → sys_usuario_app
       ├── getUserCompanies()   → sys_usuario_empresa
       └── resolvePermissionsAcrossCompanies()
           └── Para cada empresa del usuario:
               └── resolvePermissions(userId, companyId, appCode)
                   ├── userRoleRepo        → sys_usuario_rol (roles por contexto)
                   ├── userRoleGlobalRepo  → sys_usuario_rol_global (roles globales)
                   ├── rolePermRepo        → sys_rol_permiso (permisos del rol)
                   ├── userPermOverrideRepo → sys_usuario_permiso (DENY/ALLOW por contexto)
                   └── userPermGlobalDenyRepo → sys_usuario_permiso_global (denegación global)
                   └── Permisos efectivos = base − DENY + ALLOW
```

### 4.1 Orden de Aplicación en `resolvePermissions`

1. Obtener roles: `sys_usuario_rol` ∪ `sys_usuario_rol_global` (menos exclusions).  
2. Obtener permisos base: `sys_rol_permiso` para esos roles.  
3. Aplicar DENY de `sys_usuario_permiso` (por contexto).  
4. Aplicar ALLOW de `sys_usuario_permiso`.  
5. Aplicar DENY de `sys_usuario_permiso_global`.  

---

## 5. Cuándo Se Reflejan los Cambios

Los permisos efectivos se recargan al:

1. **Volver a iniciar sesión** (logout + login).  
2. **Restaurar sesión** (refresh, nueva pestaña) si se usa cookie válida y `GET /auth/me`.  

No se aplican de forma instantánea sin recargar; la sesión actual conserva los permisos anteriores hasta uno de estos eventos.

---

## 6. Diagnóstico y Solución de Problemas

### 6.1 El usuario no ve opciones del menú (Permisos, Roles, Usuarios, etc.)

| Causa | Tabla | Solución |
|-------|-------|----------|
| Sin app asignada | `sys_usuario_app` | Asignar KPITAL en la vista o ejecutar `npm run script:fix-users-app` |
| Sin empresas | `sys_usuario_empresa` | Marcar empresas en pestaña Empresas y guardar |
| Sin roles | `sys_usuario_rol` o `sys_usuario_rol_global` | Asignar rol MASTER u otro en pestaña Roles |
| Rol sin permisos | `sys_rol_permiso` | En Configuración > Roles, asignar permisos al rol |
| DENY activo bloqueando config | `sys_usuario_permiso` | Desactivar o eliminar filas con `estado=1` y permisos 19,20,21 (config:*) |
| Denegación global | `sys_usuario_permiso_global` | Revisar pestaña Excepciones y desmarcar permisos de config |

### 6.2 Scripts de Diagnóstico

- `api/scripts/diagnostico-asignaciones-usuario.sql` — Consultas para revisar asignaciones.  
- `api/scripts/diagnose-user-permissions.sql` — Diagnóstico por email de usuario.  
- `api/scripts/limpiar-ana-reset-config.sql` / `npm run script:limpiar-ana` — Limpiar configuración de un usuario para reconfigurar desde cero.  

### 6.3 Permisos de Configuración

**Permisos base** (para ver pestañas y acceder a las secciones):

- `config:permissions` — Ver y gestionar catálogo de permisos  
- `config:roles` — Ver y gestionar roles  
- `config:users` — Ver y gestionar usuarios (abrir drawer, ver datos)

**Permisos granulares** (para realizar acciones concretas en el drawer de usuarios):

| Permiso | Acción | Endpoints |
|---------|--------|-----------|
| `config:users:assign-companies` | Asignar/desasignar empresas | `PUT /config/users/:id/companies`, POST/PATCH companies |
| `config:users:assign-apps` | Asignar/revocar apps (KPITAL, TimeWise) | `POST /user-assignments/apps`, PATCH revoke |
| `config:users:assign-roles` | Asignar roles globales y por contexto | `PUT /config/users/:id/global-roles`, PUT roles, PUT role-exclusions |
| `config:users:deny-permissions` | Denegar permisos globalmente (excepciones) | `PUT /config/users/:id/global-permission-denials` |

Permisos granulares adicionales (configuracion de empresas):

| Permiso | Accion | Endpoints |
|---------|--------|-----------|
| `config:companies:audit` | Ver bitacora de empresa en modal Editar Empresa | `GET /companies/:id/audit-trail` |

Si un usuario tiene `config:users` pero no `config:users:assign-companies`, puede abrir el drawer y ver empresas, pero no modificarlas. El frontend muestra mensaje compacto con el permiso requerido y deshabilita los controles.

**Visibilidad de pestañas:** Las pestañas Roles, Usuarios y Permisos en las páginas de Configuración se muestran solo si el usuario tiene el permiso correspondiente (`config:roles`, `config:users`, `config:permissions`).

Si el rol MASTER no tiene estos permisos en `sys_rol_permiso`, el menú de Configuración no se mostrará.

---

## 7. Endpoints Relevantes

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/auth/me?appCode=` | Sesión completa: user, companies, enabledApps, permissions, roles |
| `POST /api/auth/switch-company` | Cambia empresa activa y devuelve permisos para nuevo contexto |
| `GET /api/config/users/:id/roles-summary?appCode=` | Resumen: globales, contexto, exclusions, overrides |
| `PUT /api/config/users/:id/companies` | Reemplazo total de empresas |
| `PUT /api/config/users/:id/global-roles` | Reemplazo total de roles globales |
| `PUT /api/config/users/:id/global-permission-denials` | Reemplazo total de denegaciones globales |
| `PUT /api/config/roles/:id/permissions` | Reemplazo total de permisos del rol |
| `GET /api/config/users/:id/audit-trail` | Bitacora de cambios de configuracion por usuario |
| `GET /api/companies/:id/audit-trail` | Bitacora de cambios por empresa (incluye diff de campos cuando aplica) |

---

## 8. Diagrama de Dependencias

```
sys_usuarios
    ├── sys_usuario_app          → enabledApps (acceso a la app)
    ├── sys_usuario_empresa      → companies (en qué empresas opera)
    ├── sys_usuario_rol          → roles por empresa+app
    ├── sys_usuario_rol_global   → roles globales por app
    ├── sys_usuario_permiso      → overrides DENY/ALLOW por contexto
    └── sys_usuario_permiso_global → denegaciones globales

sys_roles ── sys_rol_permiso ── sys_permisos
                ↑
                └── permisos base que otorgan los roles
```

---

## 9. Conclusión

El sistema de permisos está alineado con un modelo RBAC enterprise estilo NetSuite:

- Roles globales y por contexto.  
- Overrides por usuario (DENY/ALLOW) por contexto.  
- Denegación global por app.  

La documentación operativa de flujos y pantallas está en `24-PermisosEnterpriseOperacion.md`. Este documento (26) es la referencia técnica para implementación y diagnóstico.

---

## Regla operativa de acceso a empresas (nuevo)

- El acceso efectivo a empresas se resuelve por sys_usuario_empresa.
- No se debe exponer ni permitir mutacion de empresas fuera del set asignado al usuario autenticado.
- Esta validacion se aplica en backend (fuente de verdad), no solo en frontend.

