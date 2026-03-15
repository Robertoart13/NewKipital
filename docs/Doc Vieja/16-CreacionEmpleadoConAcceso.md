# DIRECTIVA 16  Creacin de Empleado con Acceso a TimeWise (Enterprise)

## Objetivo

Cuando RRHH crea un empleado, el sistema puede crear tambin su identidad de login para TimeWise (y opcionalmente KPITAL), sin mezclar dominios y sin romper integridad.

---

## Principio de Diseo

- **Empleado** (`sys_empleados`) = entidad laboral (planilla/RRHH).
- **Usuario** (`sys_usuarios`) = identidad digital (login).
- Un empleado **puede o no** tener usuario.
- El acceso a TimeWise depende de: usuario + app habilitada + empresa asignada.

---

## Regla de Negocio

En el alta de empleado se define explcitamente:

| Flag | Efecto |
|------|--------|
| `crearAccesoTimewise = true` | Crea usuario + asigna app TIMEWISE + asigna empresa + **asigna rol** (Empleado, Supervisor o Supervisor Global) |
| `crearAccesoKpital = true` | Adems asigna app KPITAL + **asigna rol KPITAL** (requiere permiso `employee:assign-kpital-role` del creador) |
| Ambos `false` | Solo crea empleado, `id_usuario = NULL` |

**Asignacin de roles:** Ver [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md) para el flujo completo de seleccin de roles por app.

---

## Flujo Enterprise (ACID)

### Caso A  Empleado SIN acceso digital

1. Crear registro en `sys_empleados`
2. `sys_empleados.id_usuario = NULL`
3. No se crean roles/permisos/apps

**Empleado creado manualmente en la BD:** Si se inserta solo el registro en `sys_empleados` (por script o SQL directo), el **worker de identidad** detecta el empleado y **provisiona automticamente** el acceso **TimeWise** con rol `EMPLEADO_TIMEWISE`. Esto ocurre si:
- `estado_empleado = 1`
- `id_usuario IS NULL`
- `email`, `nombre`, `apellido1` existen
- App `timewise` y rol `EMPLEADO_TIMEWISE` estn activos

El worker crea `sys_usuarios`, `sys_usuario_app`, `sys_usuario_empresa`, `sys_usuario_rol` y luego vincula `sys_empleados.id_usuario`.  
No se asigna KPITAL por esta va. KPITAL solo se asigna en el flujo de creacin con acceso (Caso B) y con permiso explcito del creador.

### Caso B  Empleado CON acceso (transaccin nica)

Todo ocurre en **UNA transaccin** va `queryRunner`:

1. Crear `sys_usuarios` (email nico, estado ACTIVO, password hash con `requiresPasswordReset = 1`)
2. Crear `sys_empleados` enlazando `id_usuario`
3. Asignar app: insertar en `sys_usuario_app` (TIMEWISE y/o KPITAL)
4. Asignar empresa: insertar en `sys_usuario_empresa`
5. **Asignar roles:** insertar en `sys_usuario_rol` por cada app (id_usuario, id_rol, id_empresa, id_app). DTO incluye `idRolTimewise` y opcionalmente `idRolKpital` (si creador tiene permiso).
6. **COMMIT**

Si falla **cualquier paso**  **ROLLBACK total**. No puede existir empleado "a medias".

---

## Tabla sys_empleados

| Campo | Tipo | Restriccin |
|-------|------|-------------|
| `id_empleado` | INT | PK, auto-increment |
| `id_usuario` | INT | **FK nullable**  sys_usuarios |
| `id_empresa` | INT | FK NOT NULL  sys_empresas |
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
| Auditora | fecha_creacion, fecha_modificacion, fecha_inactivacion, creado_por, modificado_por |

**ndices:** `id_usuario`, `id_empresa`, UNIQUE(`id_empresa`, `codigo_empleado`), `email_empleado`, `estado_empleado`

**FK:** `FK_empleado_usuario`  sys_usuarios (RESTRICT), `FK_empleado_empresa`  sys_empresas (RESTRICT)

---

## Reglas de Seguridad

- Si `sys_usuarios.estado_usuario != ACTIVO`  no login en ningn sistema
- Si `sys_usuario_app(TIMEWISE)` inactivo  no login en TimeWise aunque el usuario exista
- Acceso a KPITAL es permiso especial, no automtico por ser empleado

---

## Poltica de Sincronizacin de Identidad

**Regla oficial:** `email_empleado` es fuente de verdad del login.

Si cambia el email del empleado y tiene usuario vinculado:

1. `EmployeesService.update()` detecta cambio de email + `idUsuario != null`
2. Emite evento `employee.email_changed`
3. `IdentitySyncWorkflow` escucha y:
   - Valida unicidad del nuevo email en `sys_usuarios`
   - Actualiza `sys_usuarios.email`
   - Registra auditora (before/after)
   - Emite `identity.login_updated`

---

## DTO  Campos de Acceso Digital (CreateEmployeeDto)

- `crearAccesoTimewise`, `crearAccesoKpital`, `passwordInicial`
- `idRolTimewise` (obligatorio si crearAccesoTimewise): rol Empleado, Supervisor o Supervisor Global
- `idRolKpital` (opcional si crearAccesoKpital): requiere que el creador tenga permiso `employee:assign-kpital-role`

Ver Doc 19 y Doc 27 para detalles.

---

## Implementacin

| Componente | Archivo |
| Entity | `employees/entities/employee.entity.ts` |
| DTOs | `employees/dto/create-employee.dto.ts`, `update-employee.dto.ts` |
| Service | `employees/employees.service.ts` |
| Controller | `employees/employees.controller.ts` |
| Workflow creacin | `workflows/employees/employee-creation.workflow.ts` |
| Workflow identity | `workflows/identity/identity-sync.workflow.ts` |
| Migracin | `1708531500000-CreateSysEmpleados.ts` |

---

## Endpoints

| Mtodo | Ruta | Descripcin |
|--------|------|-------------|
| POST | `/api/employees` | Crear (con o sin acceso digital) |
| GET | `/api/employees?idEmpresa=X` | Listar por empresa |
| GET | `/api/employees/:id` | Detalle |
| PUT | `/api/employees/:id` | Actualizar (dispara identity sync si email cambia) |
| PATCH | `/api/employees/:id/inactivate` | Inactivar |
| PATCH | `/api/employees/:id/liquidar` | Liquidar (estado=3, fecha salida) |
