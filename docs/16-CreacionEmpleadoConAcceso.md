# DIRECTIVA 16 — Creación de Empleado con Acceso a TimeWise (Enterprise)

## Objetivo

Cuando RRHH crea un empleado, el sistema puede crear también su identidad de login para TimeWise (y opcionalmente KPITAL), sin mezclar dominios y sin romper integridad.

---

## Principio de Diseño

- **Empleado** (`sys_empleados`) = entidad laboral (planilla/RRHH).
- **Usuario** (`sys_usuarios`) = identidad digital (login).
- Un empleado **puede o no** tener usuario.
- El acceso a TimeWise depende de: usuario + app habilitada + empresa asignada.

---

## Regla de Negocio

En el alta de empleado se define explícitamente:

| Flag | Efecto |
|------|--------|
| `crearAccesoTimewise = true` | Crea usuario + asigna app TIMEWISE + asigna empresa |
| `crearAccesoKpital = true` | Además asigna app KPITAL (acceso administrativo) |
| Ambos `false` | Solo crea empleado, `id_usuario = NULL` |

---

## Flujo Enterprise (ACID)

### Caso A — Empleado SIN acceso digital

1. Crear registro en `sys_empleados`
2. `sys_empleados.id_usuario = NULL`
3. No se crean roles/permisos/apps

### Caso B — Empleado CON acceso (transacción única)

Todo ocurre en **UNA transacción** vía `queryRunner`:

1. Crear `sys_usuarios` (email único, estado ACTIVO, password hash con `requiresPasswordReset = 1`)
2. Crear `sys_empleados` enlazando `id_usuario`
3. Asignar app: insertar en `sys_usuario_app` (TIMEWISE y/o KPITAL)
4. Asignar empresa: insertar en `sys_usuario_empresa`
5. **COMMIT**

Si falla **cualquier paso** → **ROLLBACK total**. No puede existir empleado "a medias".

---

## Tabla sys_empleados

| Campo | Tipo | Restricción |
|-------|------|-------------|
| `id_empleado` | INT | PK, auto-increment |
| `id_usuario` | INT | **FK nullable** → sys_usuarios |
| `id_empresa` | INT | FK NOT NULL → sys_empresas |
| `codigo_empleado` | VARCHAR(20) | UNIQUE por empresa |
| `nombre_empleado` | VARCHAR(100) | NOT NULL |
| `apellido1_empleado` | VARCHAR(100) | NOT NULL |
| `apellido2_empleado` | VARCHAR(100) | NULLABLE |
| `email_empleado` | VARCHAR(150) | NOT NULL |
| `telefono_empleado` | VARCHAR(30) | NULLABLE |
| `fecha_ingreso_empleado` | DATE | NOT NULL |
| `fecha_salida_empleado` | DATE | NULLABLE |
| `puesto_empleado` | VARCHAR(150) | NULLABLE |
| `departamento_empleado` | VARCHAR(150) | NULLABLE |
| `salario_base_empleado` | DECIMAL(12,2) | NULLABLE |
| `tipo_contrato_empleado` | VARCHAR(50) | NULLABLE |
| `estado_empleado` | TINYINT(1) | DEFAULT 1 (ACTIVO) |
| Auditoría | fecha_creacion, fecha_modificacion, fecha_inactivacion, creado_por, modificado_por |

**Índices:** `id_usuario`, `id_empresa`, UNIQUE(`id_empresa`, `codigo_empleado`), `email_empleado`, `estado_empleado`

**FK:** `FK_empleado_usuario` → sys_usuarios (RESTRICT), `FK_empleado_empresa` → sys_empresas (RESTRICT)

---

## Reglas de Seguridad

- Si `sys_usuarios.estado_usuario != ACTIVO` → no login en ningún sistema
- Si `sys_usuario_app(TIMEWISE)` inactivo → no login en TimeWise aunque el usuario exista
- Acceso a KPITAL es permiso especial, no automático por ser empleado

---

## Política de Sincronización de Identidad

**Regla oficial:** `email_empleado` es fuente de verdad del login.

Si cambia el email del empleado y tiene usuario vinculado:

1. `EmployeesService.update()` detecta cambio de email + `idUsuario != null`
2. Emite evento `employee.email_changed`
3. `IdentitySyncWorkflow` escucha y:
   - Valida unicidad del nuevo email en `sys_usuarios`
   - Actualiza `sys_usuarios.email`
   - Registra auditoría (before/after)
   - Emite `identity.login_updated`

---

## Implementación

| Componente | Archivo |
|-----------|---------|
| Entity | `employees/entities/employee.entity.ts` |
| DTOs | `employees/dto/create-employee.dto.ts`, `update-employee.dto.ts` |
| Service | `employees/employees.service.ts` |
| Controller | `employees/employees.controller.ts` |
| Workflow creación | `workflows/employees/employee-creation.workflow.ts` |
| Workflow identity | `workflows/identity/identity-sync.workflow.ts` |
| Migración | `1708531500000-CreateSysEmpleados.ts` |

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/employees` | Crear (con o sin acceso digital) |
| GET | `/api/employees?idEmpresa=X` | Listar por empresa |
| GET | `/api/employees/:id` | Detalle |
| PUT | `/api/employees/:id` | Actualizar (dispara identity sync si email cambia) |
| PATCH | `/api/employees/:id/inactivate` | Inactivar |
| PATCH | `/api/employees/:id/liquidar` | Liquidar (estado=3, fecha salida) |
