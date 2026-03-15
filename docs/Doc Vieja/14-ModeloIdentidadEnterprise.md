# DIRECTIVA 14 — MODELO DE IDENTIDAD ENTERPRISE

## Objetivo

Diseñar e implementar el Core Identity Model que permite:

- Un solo login para KPITAL y TimeWise
- Usuarios con acceso a múltiples empresas
- Usuarios con múltiples roles por empresa
- Permisos dinámicos y atómicos
- Cross-app SSO
- Escalabilidad sin refactor

Este modelo es la base de **todo** el sistema.

---

## Principio Arquitectónico

Separar claramente:

| Concepto | Responsabilidad |
|----------|----------------|
| **Identidad** | Quién es el usuario |
| **Aplicación** | Dónde puede entrar |
| **Empresa** | En qué contexto opera |
| **Rol** | Qué puede hacer |
| **Permiso** | Acción granular atómica |

Nada se mezcla. Nada se acopla.

---

## Modelo Relacional Definitivo

### 1. `sys_usuarios` — Root de Autenticación

Representa a la persona digital. Login, password hash, estado, datos base.

**No contiene empresa. No contiene permisos. No contiene rol. No contiene datos laborales.**

> **sys_usuarios ≠ sys_empleados** — Son entidades de bounded contexts distintos.
> `sys_usuarios` = identidad digital (quién puede autenticarse).
> `sys_empleados` = registro laboral (salario, puesto, departamento, fecha ingreso).
> Un usuario puede existir sin ser empleado (Admin TI, contador externo).
> Un empleado puede existir sin usuario (empleado sin acceso al sistema).
> Vinculación opcional: `sys_empleados.id_usuario` (FK nullable).

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_usuario` | INT | PK, auto-increment |
| `email_usuario` | VARCHAR(150) | UNIQUE, NOT NULL |
| `password_hash_usuario` | VARCHAR(255) | NOT NULL |
| `nombre_usuario` | VARCHAR(100) | NOT NULL |
| `apellido_usuario` | VARCHAR(100) | NOT NULL |
| `telefono_usuario` | VARCHAR(30) | NULLABLE |
| `avatar_url_usuario` | VARCHAR(500) | NULLABLE |
| `estado_usuario` | TINYINT(1) | DEFAULT 1 |
| `ultimo_login_usuario` | DATETIME | NULLABLE |
| `fecha_creacion_usuario` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `fecha_modificacion_usuario` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |
| `fecha_inactivacion_usuario` | DATETIME | NULLABLE |
| `creado_por_usuario` | INT | NOT NULL |
| `modificado_por_usuario` | INT | NOT NULL |

**Índices:** `email_usuario` (UNIQUE), `estado_usuario`

---

### 2. `sys_apps` — Catálogo de Aplicaciones

Aplicaciones del ecosistema: KPITAL, TIMEWISE. Permite escalar sin rediseñar.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_app` | INT | PK, auto-increment |
| `codigo_app` | VARCHAR(20) | UNIQUE, NOT NULL |
| `nombre_app` | VARCHAR(100) | NOT NULL |
| `descripcion_app` | VARCHAR(300) | NULLABLE |
| `url_app` | VARCHAR(300) | NULLABLE |
| `icono_app` | VARCHAR(100) | NULLABLE |
| `estado_app` | TINYINT(1) | DEFAULT 1 |
| `fecha_creacion_app` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `fecha_modificacion_app` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |

**Índices:** `codigo_app` (UNIQUE), `estado_app`

---

### 3. `sys_usuario_app` — Tabla Puente: Usuario ↔ App

Define si un usuario puede ingresar a una app. Aquí NO hay empresa. Solo acceso a la app.

**Crítico:** Sin fila activa para una app, `enabledApps` queda vacío y el usuario recibe "Sin acceso a esta aplicación". El backend puede auto-asignar KPITAL al guardar empresas si el usuario no tenía app (`ensureUserHasKpitalApp`).

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_usuario_app` | INT | PK, auto-increment |
| `id_usuario` | INT | FK → sys_usuarios |
| `id_app` | INT | FK → sys_apps |
| `estado_usuario_app` | TINYINT(1) | DEFAULT 1 |
| `fecha_asignacion_usuario_app` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Índices:** UNIQUE(`id_usuario`, `id_app`)

---

### 4. `sys_usuario_empresa` — Tabla Puente: Usuario ↔ Empresa

Define en qué empresas puede operar un usuario. Fundamento multiempresa.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_usuario_empresa` | INT | PK, auto-increment |
| `id_usuario` | INT | FK → sys_usuarios |
| `id_empresa` | INT | FK → sys_empresas |
| `estado_usuario_empresa` | TINYINT(1) | DEFAULT 1 |
| `fecha_asignacion_usuario_empresa` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Índices:** UNIQUE(`id_usuario`, `id_empresa`)

---

### 5. `sys_roles` — Roles Abstractos

Roles globales del sistema. Un rol no tiene empresa, no tiene app. Es abstracto.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_rol` | INT | PK, auto-increment |
| `codigo_rol` | VARCHAR(50) | UNIQUE, NOT NULL |
| `nombre_rol` | VARCHAR(100) | NOT NULL |
| `descripcion_rol` | VARCHAR(300) | NULLABLE |
| `estado_rol` | TINYINT(1) | DEFAULT 1 |
| `fecha_creacion_rol` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `fecha_modificacion_rol` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |
| `creado_por_rol` | INT | NOT NULL |
| `modificado_por_rol` | INT | NOT NULL |

**Índices:** `codigo_rol` (UNIQUE), `estado_rol`

---

### 6. `sys_permisos` — Permisos Atómicos

Acciones puras: `employees.list`, `payroll.approve`, `company.edit`. No saben de empresa ni de usuario.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_permiso` | INT | PK, auto-increment |
| `codigo_permiso` | VARCHAR(100) | UNIQUE, NOT NULL |
| `nombre_permiso` | VARCHAR(150) | NOT NULL |
| `descripcion_permiso` | VARCHAR(300) | NULLABLE |
| `modulo_permiso` | VARCHAR(50) | NOT NULL |
| `estado_permiso` | TINYINT(1) | DEFAULT 1 |
| `fecha_creacion_permiso` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Índices:** `codigo_permiso` (UNIQUE), `modulo_permiso`, `estado_permiso`

---

### 7. `sys_rol_permiso` — Tabla Puente: Rol ↔ Permiso

Define qué puede hacer cada rol. No depende de usuario ni de empresa.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_rol_permiso` | INT | PK, auto-increment |
| `id_rol` | INT | FK → sys_roles |
| `id_permiso` | INT | FK → sys_permisos |
| `fecha_asignacion_rol_permiso` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Índices:** UNIQUE(`id_rol`, `id_permiso`)

---

### 8. `sys_usuario_rol` — **Tabla Core del Modelo**

La tabla más importante. Relación: **Usuario ↔ Rol ↔ Empresa ↔ App**. Define el scope real.

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_usuario_rol` | INT | PK, auto-increment |
| `id_usuario` | INT | FK → sys_usuarios |
| `id_rol` | INT | FK → sys_roles |
| `id_empresa` | INT | FK → sys_empresas |
| `id_app` | INT | FK → sys_apps |
| `estado_usuario_rol` | TINYINT(1) | DEFAULT 1 |
| `fecha_asignacion_usuario_rol` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `fecha_modificacion_usuario_rol` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |
| `creado_por_usuario_rol` | INT | NOT NULL |
| `modificado_por_usuario_rol` | INT | NOT NULL |

**Índices:** UNIQUE(`id_usuario`, `id_rol`, `id_empresa`, `id_app`), `id_empresa`, `id_app`

**Permite:**
- Un usuario puede ser ADMIN en KPITAL para Empresa A
- El mismo usuario puede ser EMPLEADO en TIMEWISE para Empresa B
- El mismo usuario puede tener múltiples roles en una misma empresa

**Tablas extendidas (ver `26-SistemaPermisosReferencia.md`):**
- `sys_usuario_rol_global` — roles que aplican a todas las empresas del usuario
- `sys_usuario_permiso` — overrides DENY/ALLOW por contexto
- `sys_usuario_permiso_global` — denegación global de permisos por app

---

## Flujo de Login (Conceptual — no implementado aún)

1. Usuario se autentica (email + password)
2. Se valida `estado_usuario = 1`
3. Se cargan: apps permitidas, empresas asociadas, roles por empresa
4. Frontend selecciona: app activa, empresa activa
5. Token se genera con: `userId`, `appId`, `companyId`, roles activos
6. No se recalculan permisos en cada request — se validan vía guard con token

---

## Multiempresa Real

- Un usuario puede gestionar Empresa A y Empresa B
- Tener roles distintos en cada una
- Cambiar contexto sin perder sesión
- Empresa activa en token o header
- Nunca se mezcla información entre empresas

---

## Cross-App SSO

- Login vive en dominio raíz: `kpital360.com`
- Cookie httpOnly con `Domain=.kpital360.com`
- TimeWise valida token desde backend central
- No existen dos bases de usuarios
- Identidad es única

---

## Seguridad Enterprise

- ❌ No hay DELETE físico en usuarios, roles, ni permisos
- ✅ Todo es inactivación lógica
- ✅ Auditoría obligatoria desde Fase 1
- ✅ Integridad referencial con FK constraints

---

## Orden de Implementación

1. `sys_usuarios` — root de autenticación
2. `sys_apps` — catálogo de aplicaciones
3. `sys_usuario_app` — puente usuario ↔ app
4. `sys_usuario_empresa` — puente usuario ↔ empresa
5. `sys_roles` — roles abstractos
6. `sys_permisos` — permisos atómicos
7. `sys_rol_permiso` — puente rol ↔ permiso
8. `sys_usuario_rol` — tabla core (usuario ↔ rol ↔ empresa ↔ app)

---

## Organización en Código

| Entidad | Módulo NestJS |
|---------|--------------|
| `sys_usuarios` (User) | `auth` |
| `sys_apps` (App) | `access-control` |
| `sys_usuario_app` (UserApp) | `access-control` |
| `sys_usuario_empresa` (UserCompany) | `access-control` |
| `sys_roles` (Role) | `access-control` |
| `sys_permisos` (Permission) | `access-control` |
| `sys_rol_permiso` (RolePermission) | `access-control` |
| `sys_usuario_rol` (UserRole) | `access-control` |

---

## Lo que NO se hace en esta directiva

- ❌ No se implementa JWT real
- ❌ No se implementa login real
- ❌ No se implementan guards reales
- ❌ No se conecta frontend
- ❌ No se toca employees, payroll, personal-actions

---

## Estado del Proyecto después de esto

| Componente | Estado |
|-----------|--------|
| Infraestructura | ✅ |
| Empresa root (`sys_empresas`) | ✅ |
| Identidad completa | ✅ |
| Base lista para negocio | ✅ |

Siguiente paso: Seed inicial → Login real → JWT → Guards
