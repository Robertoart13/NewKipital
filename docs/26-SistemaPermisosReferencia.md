# 26  Sistema de Permisos: Referencia Tcnica Completa

**ltima actualizacin:** 2026-02-22  
**Objetivo:** Documentar cmo funciona el sistema de permisos de KPITAL 360, todas las tablas involucradas, el flujo de resolucin y los puntos de fallo conocidos.

Referencias: `24-PermisosEnterpriseOperacion.md`, `18-IdentityCoreEnterprise.md`, `14-ModeloIdentidadEnterprise.md`, `27-DiagramaFlujoEmpleadosYUsuarios.md` (roles TimeWise, jerarqua supervisin, filtro Config Usuarios).

---

## 1. Enfoque del Sistema

El sistema usa **RBAC (Role-Based Access Control)** con dos fuentes de roles y dos capas de excepciones:

1. **Roles por contexto** (`sys_usuario_rol`): Usuario + Empresa + App  Rol  
2. **Roles globales** (`sys_usuario_rol_global`): Usuario + App  Rol (aplica a todas las empresas del usuario)  
3. **Overrides por contexto** (`sys_usuario_permiso`): DENY/ALLOW puntual por Usuario + Empresa + App + Permiso  
4. **Denegacin global** (`sys_usuario_permiso_global`): Quitar permiso en todas las empresas para ese usuario + app  

**Regla de resolucin:**  
**Permisos efectivos** = Permisos de roles  DENY overrides  Global deny + ALLOW overrides  

**DENY siempre gana sobre ALLOW.**

---

## 2. Tablas del Sistema de Permisos

### 2.1 Cadena de Dependencias (orden crtico)

Para que un usuario **vea opciones en el men** y pueda operar, se requiere la siguiente cadena. Si falta cualquiera, el usuario no ve nada o recibe 403.

| Orden | Tabla | Propsito | Efecto si falta |
|-------|-------|-----------|-----------------|
| 1 | `sys_usuario_app` | Apps a las que tiene acceso el usuario | `enabledApps = []`  pantalla "Sin acceso a esta aplicacin" (403) |
| 2 | `sys_usuario_empresa` | Empresas en las que opera | Sin empresas  `permissions = []`, `roles = []` |
| 3 | `sys_usuario_rol` o `sys_usuario_rol_global` | Roles asignados | Sin roles  `basePermissions = []` |
| 4 | `sys_rol_permiso` | Permisos del rol | Rol sin permisos  `basePermissions = []` |
| 5 | `sys_usuario_permiso` | Overrides DENY/ALLOW por contexto | DENY activo elimina permisos del conjunto efectivo |
| 6 | `sys_usuario_permiso_global` | Denegacin global | Permiso bloqueado en todas las empresas |

### 2.2 Descripcin por Tabla

| Tabla | Alcance | Qu guarda |
|-------|---------|------------|
| `sys_usuarios` | Root | Usuario (email, nombre, password hash). No contiene permisos ni roles. |
| `sys_apps` | Catlogo | Aplicaciones: `kpital`, `timewise`. |
| `sys_usuario_app` | Usuario  App | Si el usuario puede entrar a esa app. **Crtico:** sin fila para KPITAL, `enabledApps` queda vaco. |
| `sys_usuario_empresa` | Usuario  Empresa | Empresas en las que opera el usuario. Solo las marcadas; desmarcada = no ve nada de esa empresa. |
| `sys_roles` | Catlogo | Roles: MASTER, RRHH, etc. |
| `sys_permisos` | Catlogo | Permisos atmicos: `config:permissions`, `config:roles`, `employee:create`, etc. |
| `sys_rol_permiso` | Rol  Permiso | Matriz: qu permisos tiene cada rol. Se configura en **Configuracin > Roles**. |
| `sys_usuario_rol` | Usuario  Rol  Empresa  App | Rol asignado por empresa y app. |
| `sys_usuario_rol_global` | Usuario  Rol  App | Rol que aplica a **todas** las empresas del usuario. |
| `sys_usuario_permiso` | Usuario  Empresa  App  Permiso | Override DENY o ALLOW puntual. **Estado=1** = activo. |
| `sys_usuario_permiso_global` | Usuario  App  Permiso | Denegacin global: el permiso nunca aplica para ese usuario en esa app. |

### 2.3 Diferencia Entre Overrides

| Tabla | Alcance | Ejemplo |
|-------|---------|---------|
| `sys_usuario_permiso` | Por empresa + app | "En Empresa A, para KPITAL, denegar employee:create" |
| `sys_usuario_permiso_global` | Por app (todas las empresas) | "En KPITAL, denegar config:users en todas las empresas" |

Ambas se aplican. Si existe DENY en cualquiera de las dos, el permiso se elimina del conjunto efectivo.

---

## 3. Vista de Configuracin (Usuarios > Configurar)

La ventana de configuracin de un usuario tiene tres pestaas y un selector de aplicacin. Las pestaas **Roles**, **Usuarios** y **Permisos** del encabezado se muestran solo si el usuario tiene el permiso correspondiente (`config:roles`, `config:users`, `config:permissions`).

### 3.1 Selector de Aplicacin

- **Aplicacin:** Solo muestra las apps asignadas al usuario (`sys_usuario_app`). KPITAL 360 o TimeWise.
- Define el contexto para Roles y Excepciones.
- **Usuario sin apps:** Se muestra un formulario para asignar aplicaciones (requiere `config:users:assign-apps`). Si el usuario tiene apps, puede agregar ms desde "Agregar ms aplicaciones" (tambin requiere `config:users:assign-apps`).
- Estados de carga: Spinner mientras se cargan las apps del usuario.

### 3.2 Pestaa Empresas

- **Qu hace:** Asigna empresas (`sys_usuario_empresa`).  
- **API:** `PUT /api/config/users/:id/companies` (`replaceUserCompanies`).  
- **Permiso requerido:** `config:users:assign-companies` (adems de `config:users` para abrir el drawer).
- **Regla:** Solo las empresas marcadas. Si est desmarcada, el usuario no ve nada de esa empresa.
- Si el usuario no tiene permiso, se muestra mensaje compacto indicando el permiso requerido y los controles quedan deshabilitados.

Al guardar empresas, el backend puede auto-asignar la app KPITAL si el usuario tena empresas pero no app (`ensureUserHasKpitalApp`).

### 3.3 Pestaa Roles

- **Qu hace:** Asigna roles globales (`sys_usuario_rol_global`). Solo muestra roles de la app seleccionada.
- **API:** `PUT /api/config/users/:id/global-roles` (`replaceUserGlobalRoles`).  
- **Permiso requerido:** `config:users:assign-roles`.
- **Regla:** Los roles se aplican a **todas** las empresas del usuario (para la app seleccionada).
- **Requisito:** El usuario debe tener al menos una empresa asignada; si no, los roles no tienen efecto.
- Al guardar roles, la vista cambia automticamente a Excepciones y actualiza la lista de roles sin refrescar.

### 3.4 Pestaa Excepciones

- **Qu hace:** Denegaciones globales (`sys_usuario_permiso_global`).  
- **API:** `PUT /api/config/users/:id/global-permission-denials` (`replaceUserGlobalPermissionDenials`).  
- **Permiso requerido:** `config:users:deny-permissions`.
- **Regla:** Los permisos marcados **NO** se aplicarn en ninguna empresa para esa app. El selector de rol solo muestra los roles asignados al usuario (de la pestaa Roles).
- Si el usuario no tiene permiso, se muestra mensaje compacto indicando el permiso requerido y los controles quedan deshabilitados.

**Importante:** La pestaa Excepciones solo escribe en `sys_usuario_permiso_global`. Los registros en `sys_usuario_permiso` pueden venir de flujos anteriores u otras configuraciones; si existen DENY activos ah, tambin bloquean permisos.

---

## 4. Flujo de Resolucin de Permisos

```
1. Usuario autenticado
    GET /auth/me?appCode=kpital
        getEnabledApps()      sys_usuario_app
        getUserCompanies()    sys_usuario_empresa
        resolvePermissionsAcrossCompanies()
            Para cada empresa del usuario:
                resolvePermissions(userId, companyId, appCode)
                    userRoleRepo         sys_usuario_rol (roles por contexto)
                    userRoleGlobalRepo   sys_usuario_rol_global (roles globales)
                    rolePermRepo         sys_rol_permiso (permisos del rol)
                    userPermOverrideRepo  sys_usuario_permiso (DENY/ALLOW por contexto)
                    userPermGlobalDenyRepo  sys_usuario_permiso_global (denegacin global)
                    Permisos efectivos = base  DENY + ALLOW
```

### 4.1 Orden de Aplicacin en `resolvePermissions`

1. Obtener roles: `sys_usuario_rol`  `sys_usuario_rol_global` (menos exclusions).  
2. Obtener permisos base: `sys_rol_permiso` para esos roles.  
3. Aplicar DENY de `sys_usuario_permiso` (por contexto).  
4. Aplicar ALLOW de `sys_usuario_permiso`.  
5. Aplicar DENY de `sys_usuario_permiso_global`.  

---

## 5. Cundo Se Reflejan los Cambios

Los permisos efectivos se recargan al:

1. **Volver a iniciar sesin** (logout + login).  
2. **Restaurar sesin** (refresh, nueva pestaa) si se usa cookie vlida y `GET /auth/me`.  

No se aplican de forma instantnea sin recargar; la sesin actual conserva los permisos anteriores hasta uno de estos eventos.

---

## 6. Diagnstico y Solucin de Problemas

### 6.1 El usuario no ve opciones del men (Permisos, Roles, Usuarios, etc.)

| Causa | Tabla | Solucin |
|-------|-------|----------|
| Sin app asignada | `sys_usuario_app` | Asignar KPITAL en la vista o ejecutar `npm run script:fix-users-app` |
| Sin empresas | `sys_usuario_empresa` | Marcar empresas en pestaa Empresas y guardar |
| Sin roles | `sys_usuario_rol` o `sys_usuario_rol_global` | Asignar rol MASTER u otro en pestaa Roles |
| Rol sin permisos | `sys_rol_permiso` | En Configuracin > Roles, asignar permisos al rol |
| DENY activo bloqueando config | `sys_usuario_permiso` | Desactivar o eliminar filas con `estado=1` y permisos 19,20,21 (config:*) |
| Denegacin global | `sys_usuario_permiso_global` | Revisar pestaa Excepciones y desmarcar permisos de config |

### 6.2 Scripts de Diagnstico

- `api/scripts/diagnostico-asignaciones-usuario.sql`  Consultas para revisar asignaciones.  
- `api/scripts/diagnose-user-permissions.sql`  Diagnstico por email de usuario.  
- `api/scripts/limpiar-ana-reset-config.sql` / `npm run script:limpiar-ana`  Limpiar configuracin de un usuario para reconfigurar desde cero.  

### 6.3 Permisos de Configuracin

**Permisos base** (para ver pestaas y acceder a las secciones):

- `config:permissions`  Ver y gestionar catlogo de permisos  
- `config:roles`  Ver y gestionar roles  
- `config:users`  Ver y gestionar usuarios (abrir drawer, ver datos)

**Permisos granulares** (para realizar acciones concretas en el drawer de usuarios):

| Permiso | Accin | Endpoints |
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

**Visibilidad de pestaas:** Las pestaas Roles, Usuarios y Permisos en las pginas de Configuracin se muestran solo si el usuario tiene el permiso correspondiente (`config:roles`, `config:users`, `config:permissions`).

**Visibilidad de opciones de men:** Cada opcin del men (Configuracin > Seguridad, Configuracin > Gestin Organizacional, etc.) tiene un `requiredPermission`. Si el permiso **no existe en la BD** o **no est asignado al usuario autenticado**, la opcin se **oculta**. Ej.: Reglas de Distribucin usa `config:reglas-distribucion`; si ese permiso no existe en `sys_permisos` o no est asignado al rol del usuario, la opcin no aparece. Ver doc 08 (Estructura de Mens).

---

## 7. Endpoints Relevantes

| Endpoint | Descripcin |
|----------|-------------|
| `GET /api/auth/me?appCode=` | Sesin completa: user, companies, enabledApps, permissions, roles |
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
     sys_usuario_app           enabledApps (acceso a la app)
     sys_usuario_empresa       companies (en qu empresas opera)
     sys_usuario_rol           roles por empresa+app
     sys_usuario_rol_global    roles globales por app
     sys_usuario_permiso       overrides DENY/ALLOW por contexto
     sys_usuario_permiso_global  denegaciones globales

sys_roles  sys_rol_permiso  sys_permisos
                
                 permisos base que otorgan los roles
```

---

## 9. Conclusin

El sistema de permisos est alineado con un modelo RBAC enterprise estilo NetSuite:

- Roles globales y por contexto.  
- Overrides por usuario (DENY/ALLOW) por contexto.  
- Denegacin global por app.  

La documentacin operativa de flujos y pantallas est en `24-PermisosEnterpriseOperacion.md`. Este documento (26) es la referencia tcnica para implementacin y diagnstico.

---

## Regla operativa de acceso a empresas (nuevo)

- El acceso efectivo a empresas se resuelve por sys_usuario_empresa.
- No se debe exponer ni permitir mutacion de empresas fuera del set asignado al usuario autenticado.
- Esta validacion se aplica en backend (fuente de verdad), no solo en frontend.

---

## 10. Incidente Documentado (2026-02-24) - 403 Intermitente en Configuracion

Escenario observado:

1. Usuario con sesion previa entra a `/configuration/users`.
2. La pantalla carga inicialmente con datos correctos.
3. Segundos despues aparece `Acceso denegado` para `config:users`.
4. Re-login corrige temporalmente.

Causa raiz:

- Requests concurrentes de restauracion/cambio de contexto podian resolver en distinto orden.
- Una respuesta tardia o fallo transitorio podia pisar permisos efectivos a `[]` en frontend.

Decision de arquitectura:

1. No ejecutar recargas de permisos cuando no hay cambio real de contexto.
2. No vaciar permisos en frontend por fallos transitorios.
3. Mantener backend como fuente unica de autorizacion.

Implicacion para futuros sistemas:

- El flujo de sesion/permisos debe disenarse como "last valid state wins" ante errores transitorios.
- Las politicas fail-closed aplican a backend; en frontend se evita degradacion falsa de UI por condiciones de carrera.

---

## 11. Incidente Documentado (2026-03-01) - Opcion visible por rol adicional

Escenario observado:

1. Se removio `hr-action-incapacidades:view` del rol `GERENTE_NOMINA`.
2. En UI, la opcion `Incapacidades` seguia visible.

Causa raiz confirmada:

1. El usuario tenia otro rol global activo (`OPERADOR_NOMINA`) que si incluia `hr-action-incapacidades:view`.
2. La resolucion de permisos usa union de roles efectivos (contextuales + globales), luego aplica denies.

Regla operativa obligatoria:

1. Antes de reportar "menu muestra opcion sin permiso", validar todos los roles efectivos del usuario.
2. Quitar permiso de un solo rol no implica ocultar menu si otro rol aun lo otorga.

Checklist de revision previa (manual de usuario tecnico):

1. Revisar `sys_rol_permiso` del rol editado.
2. Revisar `sys_usuario_rol` del usuario (empresa + app).
3. Revisar `sys_usuario_rol_global` del usuario (global por app).
4. Revisar `sys_usuario_permiso` (ALLOW/DENY por contexto).
5. Revisar `sys_usuario_permiso_global` (DENY global por app).
6. Forzar refresco de permisos (`refreshAuthz=true`) o relogin para validar estado real.

SQL rapido recomendado:

```sql
-- Roles globales del usuario
SELECT urg.id_usuario, urg.id_app, a.codigo_app, urg.id_rol, r.codigo_rol, r.nombre_rol
FROM sys_usuario_rol_global urg
JOIN sys_roles r ON r.id_rol = urg.id_rol
JOIN sys_apps a ON a.id_app = urg.id_app
WHERE urg.id_usuario = :userId AND urg.estado_usuario_rol_global = 1;

-- Roles por contexto del usuario
SELECT ur.id_usuario, ur.id_empresa, ur.id_app, ur.id_rol, r.codigo_rol, r.nombre_rol
FROM sys_usuario_rol ur
JOIN sys_roles r ON r.id_rol = ur.id_rol
WHERE ur.id_usuario = :userId AND ur.estado_usuario_rol = 1;

-- Permisos potenciales por roles globales para incapacidades
SELECT DISTINCT p.codigo_permiso
FROM sys_usuario_rol_global urg
JOIN sys_rol_permiso rp ON rp.id_rol = urg.id_rol
JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
WHERE urg.id_usuario = :userId
  AND urg.id_app = :appId
  AND urg.estado_usuario_rol_global = 1
  AND p.codigo_permiso LIKE 'hr-action-incapacidades:%';
```

