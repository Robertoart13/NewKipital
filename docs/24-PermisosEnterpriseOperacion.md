# 24 — Permisos Enterprise Operación

**Última actualización:** 2026-02-22  
**Referencia técnica completa:** `26-SistemaPermisosReferencia.md`

## Objetivo

Operar permisos enterprise con resolución efectiva por contexto:

- `usuario + empresa + app`
- permisos atómicos `module:action`
- enforcement real en backend (403 cuando falta permiso)

---

## Cómo Funciona el Sistema (Resumen)

1. **Usuario** se autentica.
2. **App asignada** (`sys_usuario_app`): Define a qué apps puede entrar. Sin KPITAL asignado → "Sin acceso a esta aplicación".
3. **Empresas asignadas** (`sys_usuario_empresa`): Define en qué empresas opera. Sin empresas → no hay contexto para roles.
4. **Roles** (`sys_usuario_rol` + `sys_usuario_rol_global`): Definen los permisos base desde `sys_rol_permiso`.
5. **Excepciones** (`sys_usuario_permiso` + `sys_usuario_permiso_global`): DENY quita permisos; ALLOW añade. **DENY siempre gana.**

**Permisos efectivos** = Permisos de roles − DENY + ALLOW

Detalle técnico de tablas, flujo y diagnóstico: ver `26-SistemaPermisosReferencia.md`.

---

## KPITAL y TimeWise son Aplicaciones Distintas

| Aplicación | Qué gestiona | Ejemplos de permisos |
|------------|--------------|----------------------|
| **KPITAL 360** | Planillas, empleados, empresas, acciones de personal, reportes, config | `payroll:view`, `employee:create`, `company:manage`, `config:roles` |
| **TimeWise** | Asistencia, tiempo, distribución de costos | `timewise:distribucion-costo-create` |

- Ser Admin en KPITAL **no implica** ser Admin en TimeWise.
- Cada app tiene su propio conjunto de permisos.

---

## Vista de Configuración (Usuarios > Configurar)

La ventana tiene **tres pestañas** y un selector de aplicación:

### 1. Empresas

- Solo las empresas **marcadas** se asignan al usuario.
- Si está desmarcada, el usuario no ve nada de esa empresa.
- **Guardar empresas** → `replaceUserCompanies` → `sys_usuario_empresa`

### 2. Roles

- **Roles globales:** Se aplican a **todas** las empresas del usuario (para la app seleccionada).
- **Guardar roles globales** → `replaceUserGlobalRoles` → `sys_usuario_rol_global`
- Requiere al menos una empresa asignada; si no, los roles no tienen efecto.

### 3. Excepciones

- Permisos que el usuario **NO** debe tener en ninguna empresa (para la app seleccionada).
- **Guardar** → `replaceUserGlobalPermissionDenials` → `sys_usuario_permiso_global`

---

## Reglas Base

- Formato de permiso: `module:action` en minúsculas.
- Seguridad administrable solo con: `config:permissions`, `config:roles`, `config:users`.
- Permisos efectivos desde: `GET /api/auth/me`, `POST /api/auth/switch-company`.
- Frontend refleja permisos; backend decide autorización final (403 si falta permiso).

---

## Flujo Operativo: Dar Acceso a un Usuario

1. **Empresas:** Configurar > Usuarios > Configurar > Empresas → marcar empresas → Guardar.
2. **Roles:** Seleccionar app (KPITAL o TimeWise) → Roles → marcar rol (ej. Master Administrator) → Guardar roles globales.
3. **Excepciones:** Solo marcar permisos que el usuario **no** debe tener; dejar vacío si debe tener todo lo del rol.
4. Usuario hace **logout + login** o **refresh** para que se recarguen los permisos.

---

## Cuándo Se Reflejan los Cambios

- Al **volver a iniciar sesión**.
- Al **restaurar sesión** (refresh, nueva pestaña) si la cookie es válida.

No se aplican de forma instantánea sin recargar.

---

## Problemas Comunes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| "Sin acceso a esta aplicación" | Sin fila en `sys_usuario_app` para KPITAL | Asignar app; o ejecutar `npm run script:fix-users-app` |
| Menú vacío (no ve Permisos, Roles, Usuarios) | DENY activo en `sys_usuario_permiso` para config:* | Eliminar o desactivar esas excepciones; o ejecutar `npm run script:limpiar-ana` y reconfigurar |
| Menú vacío | Rol sin permisos en `sys_rol_permiso` | Configuración > Roles → asignar permisos al rol MASTER |
| Menú vacío | Sin empresas asignadas | Pestaña Empresas → marcar al menos una → Guardar |
| Menú vacío | Sin roles asignados | Pestaña Roles → marcar rol → Guardar roles globales |

Para diagnóstico detallado: `26-SistemaPermisosReferencia.md` y scripts en `api/scripts/`.

---

## Endpoints Relevantes

- `GET /api/auth/me?appCode=` — sesión y permisos
- `PUT /api/config/users/:id/companies` — empresas
- `PUT /api/config/users/:id/global-roles` — roles globales
- `PUT /api/config/users/:id/global-permission-denials` — excepciones
- `PUT /api/config/roles/:id/permissions` — permisos del rol

Lista completa en `26-SistemaPermisosReferencia.md`.
