# 24  Permisos Enterprise Operacin

**ltima actualizacin:** 2026-02-22  
**Referencia tcnica completa:** `26-SistemaPermisosReferencia.md`

## Objetivo

Operar permisos enterprise con resolucin efectiva por contexto:

- `usuario + empresa + app`
- permisos atmicos `module:action`
- enforcement real en backend (403 cuando falta permiso)

---

## Cmo Funciona el Sistema (Resumen)

1. **Usuario** se autentica.
2. **App asignada** (`sys_usuario_app`): Define a qu apps puede entrar. Sin KPITAL asignado  "Sin acceso a esta aplicacin".
3. **Empresas asignadas** (`sys_usuario_empresa`): Define en qu empresas opera. Sin empresas  no hay contexto para roles.
4. **Roles** (`sys_usuario_rol` + `sys_usuario_rol_global`): Definen los permisos base desde `sys_rol_permiso`.
5. **Excepciones** (`sys_usuario_permiso` + `sys_usuario_permiso_global`): DENY quita permisos; ALLOW aade. **DENY siempre gana.**

**Permisos efectivos** = Permisos de roles  DENY + ALLOW

Detalle tcnico de tablas, flujo y diagnstico: ver `26-SistemaPermisosReferencia.md`.

---

## KPITAL y TimeWise son Aplicaciones Distintas

| Aplicacin | Qu gestiona | Ejemplos de permisos |
|------------|--------------|----------------------|
| **KPITAL 360** | Planillas, empleados, empresas, acciones de personal, reportes, config | `payroll:view`, `employee:create`, `company:manage`, `config:roles` |
| **TimeWise** | Asistencia, tiempo, distribucin de costos | `timewise:distribucion-costo-create` |

- Ser Admin en KPITAL **no implica** ser Admin en TimeWise.
- Cada app tiene su propio conjunto de permisos.

---

## Vista de Configuracin (Usuarios > Configurar)

**Filtro de quin aparece:** Solo staff KPITAL (cualquier rol) y usuarios con rol Supervisor (o superior) en TimeWise. No aparecen empleados puros (solo TimeWise + rol Empleado). Ver [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md).

**Visibilidad de pestaas:** Las pestaas Roles, Usuarios y Permisos se muestran solo si el usuario tiene el permiso correspondiente (`config:roles`, `config:users`, `config:permissions`).

La ventana tiene **tres pestaas** y un selector de aplicacin:

**Selector de Aplicacin:** Solo muestra las apps que el usuario tiene asignadas. Si no tiene ninguna, puede asignarlas desde ah (requiere `config:users:assign-apps`). Estados de carga mientras se cargan apps y roles.

### 1. Empresas

- Solo las empresas **marcadas** se asignan al usuario. Si est desmarcada, el usuario no ve nada de esa empresa.
- **Permiso:** `config:users:assign-companies`. Sin l, se muestra mensaje y controles deshabilitados.
- **Guardar empresas**  `replaceUserCompanies`  `sys_usuario_empresa`

### 2. Roles

- **Roles globales:** Se aplican a **todas** las empresas del usuario (para la app seleccionada). Solo se muestran roles de la app seleccionada.
- **Permiso:** `config:users:assign-roles`. Sin l, controles deshabilitados.
- **Guardar roles globales**  `replaceUserGlobalRoles`  `sys_usuario_rol_global`
- Al guardar, se cambia a Excepciones y se actualiza la lista sin refrescar.
- Requiere al menos una empresa asignada; si no, los roles no tienen efecto.
- **Creacin de empleado con acceso:** si se asigna rol al crear, tambin se registra en `sys_usuario_rol_global`.

### 3. Excepciones

- Permisos que el usuario **NO** debe tener en ninguna empresa (para la app seleccionada). El selector de rol solo muestra los roles asignados al usuario.
- **Permiso:** `config:users:deny-permissions`. Sin l, controles deshabilitados.
- **Guardar**  `replaceUserGlobalPermissionDenials`  `sys_usuario_permiso_global`
- Si el rol no tiene permisos, la UI muestra El rol no tiene permisos asignados.
- La carga de permisos del rol siempre finaliza (success/error) y no deja el spinner infinito.

---

## Reglas Base

- Formato de permiso: `module:action` en minsculas.
- Seguridad administrable con permisos base: `config:permissions`, `config:roles`, `config:users`.
- **Permisos granulares** (para acciones concretas en el drawer de usuarios):
  - `config:users:assign-companies`  Asignar empresas
  - `config:users:assign-apps`  Asignar aplicaciones (KPITAL, TimeWise)
  - `config:users:assign-roles`  Asignar roles globales y por contexto
  - `config:users:deny-permissions`  Denegar permisos globalmente (excepciones)
- Con solo `config:users` se puede ver el drawer y los datos, pero no modificar; cada accin requiere su permiso especfico.
- Permisos efectivos desde: `GET /api/auth/me`, `POST /api/auth/switch-company`.
- Frontend refleja permisos; backend decide autorizacin final (403 si falta permiso).

---

## Flujo Operativo: Dar Acceso a un Usuario

1. **Empresas:** Configurar > Usuarios > Configurar > Empresas  marcar empresas  Guardar.
2. **Roles:** Seleccionar app (KPITAL o TimeWise)  Roles  marcar rol (ej. Master Administrator)  Guardar roles globales.
3. **Excepciones:** Solo marcar permisos que el usuario **no** debe tener; dejar vaco si debe tener todo lo del rol.
4. Usuario hace **logout + login** o **refresh** para que se recarguen los permisos.

---

## Cundo Se Reflejan los Cambios

- Al **volver a iniciar sesin**.
- Al **restaurar sesin** (refresh, nueva pestaa) si la cookie es vlida.
- Al **crear empleado con acceso**: Gestin de Usuarios se refresca automticamente y el cache de usuarios se invalida.

No se aplican de forma instantnea sin recargar.

---

## Problemas Comunes

| Sntoma | Causa probable | Solucin |
|---------|----------------|----------|
| "Sin acceso a esta aplicacin" | Sin fila en `sys_usuario_app` para KPITAL | Asignar app; o ejecutar `npm run script:fix-users-app` |
| Men vaco (no ve Permisos, Roles, Usuarios) | DENY activo en `sys_usuario_permiso` para config:* | Eliminar o desactivar esas excepciones; o ejecutar `npm run script:limpiar-ana` y reconfigurar |
| Men vaco | Rol sin permisos en `sys_rol_permiso` | Configuracin > Roles  asignar permisos al rol MASTER |
| Men vaco | Sin empresas asignadas | Pestaa Empresas  marcar al menos una  Guardar |
| Men vaco | Sin roles asignados | Pestaa Roles  marcar rol  Guardar roles globales |

Para diagnstico detallado: `26-SistemaPermisosReferencia.md` y scripts en `api/scripts/`.

---

## Endpoints Relevantes

- `GET /api/auth/me?appCode=`  sesin y permisos
- `PUT /api/config/users/:id/companies`  empresas
- `PUT /api/config/users/:id/global-roles`  roles globales
- `PUT /api/config/users/:id/global-permission-denials`  excepciones
- `PUT /api/config/roles/:id/permissions`  permisos del rol

Lista completa en `26-SistemaPermisosReferencia.md`.
