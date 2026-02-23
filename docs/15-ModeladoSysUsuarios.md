# DIRECTIVA 15 — MODELADO ENTERPRISE sys_usuarios

## Objetivo

Evolucionar `sys_usuarios` de tabla básica a tabla enterprise completa que soporte:

- No borrado físico (solo inactivación)
- Auditoría desde Fase 1
- Seguridad y trazabilidad (intentos fallidos, bloqueo temporal, IP de login)
- Compatibilidad futura con O365 / OAuth (password nullable)
- Estados claros: ACTIVO / INACTIVO / BLOQUEADO

---

## Reglas No Negociables

1. **Nunca se borra un usuario** (soft-disable).
2. **Email es único global**, siempre normalizado a minúsculas sin espacios.
3. **Contraseña solo hash**, nunca plaintext. Password es **nullable** (futuro SSO-only).
4. Un usuario **puede existir sin empresa/roles** (eso vive en tablas puente).
5. **Auditoría obligatoria desde el día 1**.

---

## Estructura Definitiva — sys_usuarios

### Identidad

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_usuario` | INT | PK, auto-increment |
| `email_usuario` | VARCHAR(150) | UNIQUE, NOT NULL |
| `username_usuario` | VARCHAR(50) | UNIQUE, NULLABLE |
| `nombre_usuario` | VARCHAR(100) | NOT NULL |
| `apellido_usuario` | VARCHAR(100) | NOT NULL |
| `telefono_usuario` | VARCHAR(30) | NULLABLE |
| `avatar_url_usuario` | VARCHAR(500) | NULLABLE |

### Seguridad / Auth

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `password_hash_usuario` | VARCHAR(255) | **NULLABLE** (futuro SSO-only) |
| `password_updated_at_usuario` | DATETIME | NULLABLE |
| `requires_password_reset_usuario` | TINYINT(1) | DEFAULT 0 |

### Estado Enterprise

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `estado_usuario` | TINYINT(1) | DEFAULT 1 (ACTIVO) |
| `fecha_inactivacion_usuario` | DATETIME | NULLABLE |
| `motivo_inactivacion_usuario` | VARCHAR(300) | NULLABLE |

### Control de Acceso / Hardening

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `failed_attempts_usuario` | INT | DEFAULT 0 |
| `locked_until_usuario` | DATETIME | NULLABLE |
| `ultimo_login_usuario` | DATETIME | NULLABLE |
| `last_login_ip_usuario` | VARCHAR(45) | NULLABLE (IPv6) |

### Auditoría

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `fecha_creacion_usuario` | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| `fecha_modificacion_usuario` | DATETIME | ON UPDATE CURRENT_TIMESTAMP |
| `creado_por_usuario` | INT | **NULLABLE** |
| `modificado_por_usuario` | INT | **NULLABLE** |

---

## Índices / Constraints

| Índice | Columna(s) | Tipo |
|--------|-----------|------|
| `IDX_usuario_email` | `email_usuario` | UNIQUE |
| `IDX_usuario_username` | `username_usuario` | UNIQUE |
| `IDX_usuario_estado` | `estado_usuario` | INDEX |
| `IDX_usuario_ultimo_login` | `ultimo_login_usuario` | INDEX |

---

## Estados Permitidos (Catálogo)

| Valor | Nombre | Descripción |
|-------|--------|-------------|
| **1** | ACTIVO | Puede autenticarse y operar normalmente |
| **2** | INACTIVO | No puede autenticarse, no rompe integridad |
| **3** | BLOQUEADO | Demasiados intentos fallidos o bloqueo manual por admin |

**Reglas:**
- INACTIVO/BLOQUEADO **no eliminan** relaciones con empresas/roles. Solo impiden login.
- El enum vive en `auth/constants/user-status.enum.ts`.

---

## Contrato con Tablas Puente

`sys_usuarios` **NO tiene:**
- Empresa activa
- Roles
- Permisos
- Apps
- **Datos laborales** (salario, puesto, departamento, fecha de ingreso)

Eso vive en:
- `sys_usuario_app` — acceso a aplicaciones
- `sys_usuario_empresa` — pertenencia a empresas
- `sys_usuario_rol` — roles scoped por empresa + app

---

## Separación Fundamental: Usuario ≠ Empleado

| Concepto | Tabla | Bounded Context | Qué representa |
|----------|-------|----------------|---------------|
| **Usuario** | `sys_usuarios` | Auth / Access Control | Cuenta digital para autenticarse |
| **Empleado** | `sys_empleados` (futuro) | Employee Management | Persona contratada (datos laborales de RRHH) |

**Reglas:**
- No todos los empleados entran al sistema (empleado sin acceso digital).
- No todos los usuarios son empleados (admin TI, contador externo, auditor).
- Un usuario puede administrar múltiples empleados sin ser empleado él mismo.
- Si un empleado necesita acceso, se crea un registro en `sys_usuarios` y se vincula con `sys_empleados.id_usuario` (FK opcional, nullable).
- **Nunca se mezclan datos de identidad con datos laborales en la misma tabla.**

| Caso | sys_usuarios | sys_empleados |
|------|:----------:|:----------:|
| Admin TI | Si | No |
| RRHH con planilla | Si | Si |
| Empleado sin acceso digital | No | Si |
| Contador externo | Si | No |
| Empleado que usa TimeWise | Si | Si |

---

## Validaciones de Negocio

1. Email siempre en minúscula y sin espacios (`normalizeEmail`)
2. No permitir ACTIVO sin email válido
3. Si `locked_until_usuario > NOW()` → login denegado aunque esté ACTIVO
4. Si `estado_usuario != ACTIVO` → login denegado
5. Al superar 5 intentos fallidos → bloqueo automático por 15 minutos
6. Al reactivar → se limpian `failedAttempts`, `lockedUntil`, `motivoInactivacion`

---

## Implementación en Código

### Entity: `auth/entities/user.entity.ts`
- Todas las columnas mapeadas con TypeORM decorators
- Enum `UserStatus` importado para defaults

### DTOs
- `CreateUserDto`: email (required), password (optional para futuro SSO), username (optional), nombre, apellido
- `UpdateUserDto`: todos opcionales para patch parcial

### Service: `auth/users.service.ts`
- `create()` — normaliza email, hash bcrypt, verifica unicidad email+username
- `findAll()` — filtra por ACTIVO por defecto
- `findByEmail()` / `findByUsername()` — normalización automática
- `inactivate()` — estado=2, registra motivo y fecha
- `reactivate()` — estado=1, limpia bloqueo y motivo
- `block()` — estado=3, registra motivo
- `validateForLogin()` — verifica estado, lock temporal, retorna user con hash
- `registerFailedAttempt()` — incrementa contador, auto-bloquea a los 5 intentos
- `registerSuccessfulLogin()` — limpia contador, registra IP y timestamp

### Controller: `auth/users.controller.ts`
- `GET /api/users/health`
- `POST /api/users` — crear
- `GET /api/users` — listar (con `?includeInactive=true`)
- `GET /api/users/:id` — detalle
- `PUT /api/users/:id` — actualizar
- `PATCH /api/users/:id/inactivate` — inactivar (con motivo)
- `PATCH /api/users/:id/reactivate` — reactivar
- `PATCH /api/users/:id/block` — bloquear (con motivo)

---

## Migración

| Archivo | Propósito |
|---------|-----------|
| `1708531200000-CreateSysEmpresas` | Tabla empresas (Directiva 13) |
| `1708531300000-CreateIdentitySchema` | 7 tablas identity base (Directiva 14) |
| `1708531400000-EnhanceSysUsuarios` | ALTER TABLE: columnas enterprise (Directiva 15) |

---

## Qué NO se hace todavía

- ❌ O365, refresh tokens, SSO real
- ❌ Flujo de login completo con JWT
- ❌ Endpoints finales de autenticación
- Solo: tabla mejorada + migración + entity + DTOs + CRUD enterprise (sin delete)
