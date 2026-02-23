# KPITAL 360 — Modelado Tabla sys_empresas

**Documento:** 13  
**Para:** Ingeniero Backend + DBA  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) + [11-DirectivasConfiguracionBackend.md](./11-DirectivasConfiguracionBackend.md)  
**Prioridad:** Primera tabla del sistema. Root aggregate.

---

## Principio

La empresa es el **root aggregate** del sistema.  
Sin empresa no existen: usuarios operativos, planillas, acciones de personal, roles scopeados, permisos por empresa.

- No se puede borrar físicamente
- No se puede romper integridad
- No se puede perder trazabilidad
- **Solo se puede inactivar**

---

## Estructura Definitiva — sys_empresas

### PK

- `id_empresa` — INT, auto incremental, primary key

### Campos de negocio

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `nombre_empresa` | VARCHAR(200) | NOT NULL |
| `nombre_legal_empresa` | VARCHAR(300) | NOT NULL |
| `cedula_empresa` | VARCHAR(50) | UNIQUE, NOT NULL |
| `actividad_economica_empresa` | VARCHAR(300) | NULL |
| `prefijo_empresa` | VARCHAR(10) | UNIQUE, NOT NULL |
| `id_externo_empresa` | VARCHAR(100) | UNIQUE, NULL (referencia NetSuite) |
| `direccion_exacta_empresa` | TEXT | NULL |
| `telefono_empresa` | VARCHAR(30) | NULL |
| `email_empresa` | VARCHAR(150) | NULL |
| `codigo_postal_empresa` | VARCHAR(20) | NULL |

### Estado Enterprise

| Campo | Tipo | Valor |
|-------|------|-------|
| `estado_empresa` | TINYINT(1) | 1 = Activa, 0 = Inactiva |

### Auditoría obligatoria (Fase 1)

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `fecha_creacion_empresa` | DATETIME | NOT NULL, DEFAULT NOW() |
| `fecha_modificacion_empresa` | DATETIME | NOT NULL, ON UPDATE NOW() |
| `fecha_inactivacion_empresa` | DATETIME | NULL |
| `creado_por_empresa` | INT | NOT NULL (userId) |
| `modificado_por_empresa` | INT | NOT NULL (userId) |

---

## Reglas Enterprise

- **NO** existe DELETE físico
- **NO** existe CASCADE DELETE
- **NO** existe "hard delete"
- **SÍ** inactivación lógica solamente
- **SÍ** integridad referencial siempre activa
- **SÍ** índices en: `cedula_empresa`, `prefijo_empresa`, `id_externo_empresa`, `estado_empresa`

---

## Comportamiento de Negocio

**Inactivar empresa:**
- `estado_empresa = 0`
- `fecha_inactivacion_empresa = NOW()`
- `modificado_por_empresa = userId`

**Reactivar empresa:**
- `estado_empresa = 1`
- `fecha_inactivacion_empresa = NULL`

---

## Justificación Arquitectónica

Esto permite:
- Mantener histórico de planillas pasadas
- Mantener histórico de empleados
- Mantener histórico contable
- No romper relaciones
- Evitar corrupción de datos

NetSuite, SAP, Oracle — todos funcionan así. Nadie borra empresas.

---

## Implementacion Actual (Enterprise)

### Backend en uso

- Servicio: `api/src/modules/companies/companies.service.ts`
- Controlador: `api/src/modules/companies/companies.controller.ts`
- Entidad: `api/src/modules/companies/entities/company.entity.ts`

Reglas activas:
- No existe delete fisico para empresas.
- Inactivacion y reactivacion son cambios de estado logico.
- Validaciones de unicidad para `cedula_empresa` y `prefijo_empresa`.

### Permisos de Empresas

Permisos granulares activos en diseno:
- `company:view`
- `company:create`
- `company:edit`
- `company:inactivate`
- `company:reactivate`

Compatibilidad:
- `company:manage` se mantiene como permiso legacy que cubre `company:*`.

### UI de Configuracion de Empresas

Pantalla: `frontend/src/pages/private/configuration/CompaniesManagementPage.tsx`

Capacidades implementadas:
- Listar empresas (activas y opcionalmente inactivas).
- Buscar por nombre, cedula o prefijo.
- Crear empresa.
- Editar empresa.
- Inactivar/reactivar empresa con confirmacion.

Nota:
- El logo empresarial ya esta implementado sin agregar columna en `sys_empresas`.
- Se usa storage en filesystem con flujo temporal + commit:
  - Temporal: `uploads/logoEmpresa/temp`
  - Final: `uploads/logoEmpresa/{idEmpresa}.{ext}`
- Si no existe logo de la empresa, el API entrega imagen por defecto (`imgSEO.jpg`).
- En edicion, si solo se actualizan campos de texto y no se adjunta nueva imagen, el logo actual se conserva.
- Validaciones activas de logo: solo tipo imagen, maximo 5MB.

### Endpoints de logo (implementados)

- `POST /api/companies/logo/temp` (subida temporal)
- `POST /api/companies/:id/logo/commit` (asignacion final por id de empresa)
- `GET /api/companies/:id/logo` (devuelve logo de empresa o default)

---

## Lo que NO se hace ahora

- No se crean relaciones aún
- No se crea usuario aún
- No se crea rol aún
- No se crea planilla aún
- **Primero se consolida el aggregate raíz**

---

## Qué sigue después de esta tabla

| Orden | Tabla | Propósito |
|-------|-------|-----------|
| 1 | `sys_empresas` | **Esta tabla** — root aggregate |
| 2 | `sys_usuarios` | Identidad única de la plataforma |
| 3 | `sys_apps` | Catálogo de aplicaciones (KPITAL, TimeWise) |
| 4 | `sys_usuario_empresa` | Relación M:M usuario ↔ empresa |
| 5 | `sys_roles` | Roles por app + empresa |
| 6 | `sys_permisos` | Permisos granulares |
| 7 | `sys_usuario_rol` | Asignación rol a usuario |
| 8 | `sys_rol_permiso` | Permisos por rol |

Ese es el **core identity schema**.

---

*Primer paso de modelado serio. Consolida el aggregate raíz antes de cualquier otra tabla.*

---

## Reglas enterprise activas en Empresas (nuevo)

1. Visibilidad por asignacion de empresa:
- GET /api/companies lista solo empresas asignadas al usuario autenticado (sys_usuario_empresa activa).
- GET /api/companies/:id, PUT, PATCH inactivate/reactivate, GET logo, POST logo/commit validan acceso por asignacion; si no existe retorna 403.

2. Autoasignacion de MASTER al crear empresa:
- Al crear empresa, en transaccion se asigna automaticamente la nueva empresa a usuarios con rol MASTER activo.
- Esto evita excepciones de seguridad y mantiene el mismo modelo de control para todos los usuarios.

3. Bitacora de empresas:
- Crear, editar, inactivar, reactivar y commit de logo publican eventos de auditoria udit.*.

