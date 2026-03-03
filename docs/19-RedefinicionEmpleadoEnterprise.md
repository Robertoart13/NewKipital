# DIRECTIVA 19 — Redefinición Enterprise de sys_empleados + Tablas Org/Nom

## Objetivo

Redefinir completamente el modelo de empleado para alinearlo con estándar enterprise:

- Separación total de identidad (sys_usuarios) vs negocio (sys_empleados).
- Campos estandarizados con sufijo `_empleado`.
- Relaciones organizacionales normalizadas (FK a catálogos).
- Creación de tablas `org_departamentos`, `org_puestos`, `nom_periodos_pago`.
- `id_usuario` gestionado por workflow, NO por DTO.

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## 1) Decisión de Dominio (NO negociable)

| Regla | Descripción |
|-------|-------------|
| **1 empresa a la vez** | Empleado pertenece a 1 sola empresa. Multiempresa simultánea aplica a sys_usuarios, no a sys_empleados |
| **Email = login** | `email_empleado` es fuente de verdad del login cuando el empleado tiene acceso |
| **FK opcional** | `id_usuario` es nullable. Un empleado puede existir sin usuario digital |
| **Separación estricta** | sys_usuarios ≠ sys_empleados. Se vinculan por FK, nunca se fusionan |

---

## 2) Modelo Definitivo — sys_empleados

Columnas ordenadas de más importante a menos importante:

### Identidad

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `id_empleado` | INT AI | PK |
| `id_empresa` | INT | FK → sys_empresas (NOT NULL) |
| `codigo_empleado` | VARCHAR(45) | UNIQUE por empresa (id_empresa + codigo_empleado) |
| `cedula_empleado` | VARCHAR(30) | UNIQUE global |
| `nombre_empleado` | VARCHAR(100) | NOT NULL |
| `apellido1_empleado` | VARCHAR(100) | NOT NULL |
| `apellido2_empleado` | VARCHAR(100) | Nullable |

### Datos Personales

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `genero_empleado` | ENUM('Masculino','Femenino','Otro') | Nullable |
| `estado_civil_empleado` | ENUM('Soltero','Casado','Divorciado','Viudo','Unión Libre') | Nullable |
| `cantidad_hijos_empleado` | INT | Default 0 |
| `telefono_empleado` | VARCHAR(30) | Nullable |
| `direccion_empleado` | TEXT | Nullable |

### Contacto / Login

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `email_empleado` | VARCHAR(150) | UNIQUE global. Source of truth para login |

### Relaciones Organizacionales

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `id_departamento` | INT | FK → org_departamentos (nullable) |
| `id_puesto` | INT | FK → org_puestos (nullable) |
| `id_supervisor_empleado` | INT | FK → sys_empleados (self-reference, nullable). **Cross-empresa permitido:** el supervisor puede ser empleado de otra empresa (ej: holdings, cuando el supervisor original renunció). Ver Doc 27. |

### Contrato / Pago

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `fecha_ingreso_empleado` | DATE | NOT NULL |
| `fecha_salida_empleado` | DATE | Nullable |
| `motivo_salida_empleado` | TEXT | Nullable |
| `tipo_contrato_empleado` | ENUM('Indefinido','Plazo Fijo','Por Servicios Profesionales') | Nullable |
| `jornada_empleado` | ENUM('Tiempo Completo','Medio Tiempo','Por Horas') | Nullable |
| `id_periodos_pago` | INT | FK → nom_periodos_pago (nullable) |
| `salario_base_empleado` | DECIMAL(12,2) | Nullable |
| `moneda_salario_empleado` | ENUM('CRC','USD') | Default 'CRC' |
| `numero_ccss_empleado` | VARCHAR(30) | Nullable |
| `cuenta_banco_empleado` | VARCHAR(50) | Nullable |

### Acumulados HR

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `vacaciones_acumuladas_empleado` | VARCHAR(200) | Nullable |
| `cesantia_acumulada_empleado` | VARCHAR(200) | Nullable |

### Vínculo Identidad (NO en DTO)

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `id_usuario` | INT | FK → sys_usuarios (nullable). Gestionado por EmployeeCreationWorkflow |

### Estado + Auditoría

| Columna | Tipo | Restricción |
|---------|------|-------------|
| `estado_empleado` | TINYINT(1) | 1=Activo, 0=Inactivo. NO delete físico |
| `fecha_creacion_empleado` | DATETIME | Auto |
| `fecha_modificacion_empleado` | DATETIME | Auto onUpdate |
| `creado_por_empleado` | INT | Nullable |
| `modificado_por_empleado` | INT | Nullable |

---

## 3) Índices y Constraints

| Nombre | Tipo | Columnas |
|--------|------|----------|
| `UQ_empleado_codigo_empresa` | UNIQUE | (id_empresa, codigo_empleado) |
| `IDX_empleado_cedula` | UNIQUE | cedula_empleado |
| `IDX_empleado_email` | UNIQUE | email_empleado |
| `IDX_empleado_empresa` | INDEX | id_empresa |
| `IDX_empleado_usuario` | INDEX | id_usuario |
| `IDX_empleado_departamento` | INDEX | id_departamento |
| `IDX_empleado_puesto` | INDEX | id_puesto |
| `IDX_empleado_supervisor` | INDEX | id_supervisor_empleado |
| `IDX_empleado_periodo_pago` | INDEX | id_periodos_pago |
| `IDX_empleado_estado` | INDEX | estado_empleado |

### Foreign Keys

| FK | Origen | Destino | ON DELETE |
|----|--------|---------|-----------|
| `FK_empleado_empresa` | id_empresa | sys_empresas.id_empresa | RESTRICT |
| `FK_empleado_usuario` | id_usuario | sys_usuarios.id_usuario | RESTRICT |
| `FK_empleado_departamento` | id_departamento | org_departamentos.id_departamento | RESTRICT |
| `FK_empleado_puesto` | id_puesto | org_puestos.id_puesto | RESTRICT |
| `FK_empleado_supervisor` | id_supervisor_empleado | sys_empleados.id_empleado | RESTRICT |
| `FK_empleado_periodo_pago` | id_periodos_pago | nom_periodos_pago.id_periodos_pago | RESTRICT |

---

## 4) Tablas de Catálogo Creadas

### org_departamentos

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_departamento` | INT PK AI | |
| `nombre_departamento` | VARCHAR(100) | |
| `id_externo_departamento` | VARCHAR(45) | Referencia NetSuite / sistemas externos |
| `estado_departamento` | TINYINT(1) | 1=Activo, 0=Inactivo |
| `fecha_creacion_departamento` | DATETIME | Auto |
| `fecha_modificacion_departamento` | DATETIME | Auto onUpdate |
| `creado_por_departamento` | INT | Nullable |
| `modificado_por_departamento` | INT | Nullable |

### org_puestos

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_puesto` | INT PK AI | |
| `nombre_puesto` | VARCHAR(100) | |
| `descripcion_puesto` | TEXT | Nullable |
| `estado_puesto` | TINYINT(1) | 1=Activo, 0=Inactivo |
| `fecha_creacion_puesto` | DATETIME | Auto |
| `fecha_modificacion_puesto` | DATETIME | Auto onUpdate |

### nom_periodos_pago

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_periodos_pago` | INT PK AI | |
| `nombre_periodo_pago` | VARCHAR(50) | Semanal, Quincenal, Mensual |
| `dias_periodo_pago` | INT | 7, 15, 30 |
| `es_inactivo` | TINYINT(1) | 0=Activo, 1=Inactivo |
| `fecha_creacion_periodo_pago` | DATETIME | Auto |
| `fecha_modificacion_periodo_pago` | DATETIME | Auto onUpdate |

**Seed incluido:** Semanal (7), Quincenal (15), Mensual (30).

---

## 5) Regla Multi-moneda

- Por ahora: 1 moneda base por empleado (`moneda_salario_empleado`).
- Si un empleado necesita cálculos en distintas monedas, eso se modela en tabla hija `nom_empleado_salarios` (futuro, cuando se implemente Payroll Engine).
- Decisión postergada: no mezclar en sys_empleados.

---

## 6) DTO — Lo que cambió

### CreateEmployeeDto

- **NO incluye** `idUsuario` (gestionado por workflow).
- **Incluye flags**: `crearAccesoTimewise`, `crearAccesoKpital`, `passwordInicial`.
- **Incluye roles** (cuando hay acceso): `idRolTimewise` (si crearAccesoTimewise), `idRolKpital` (si crearAccesoKpital y creador tiene permiso `employee:assign-kpital-role`).
- **idSupervisor:** dropdown filtrado a empleados con rol Supervisor o Supervisor Global en TimeWise (ver Doc 27). Cross-empresa permitido.
- Todos los campos enterprise alineados al modelo de tabla.
- Enums tipados: `GeneroEmpleado`, `EstadoCivilEmpleado`, `TipoContratoEmpleado`, `JornadaEmpleado`, `MonedaSalarioEmpleado`.

### UpdateEmployeeDto

- **NO incluye** `idUsuario`, `idEmpresa`, `codigo` (inmutables post-creación).
- Todos los campos opcionales.

---

## 7) Eventos / Workflows

| Evento | Cuándo | Workflow |
|--------|--------|----------|
| `employee.created` | Al crear empleado | EmployeeCreationWorkflow (si hay acceso digital) |
| `employee.email_changed` | Al actualizar email de empleado con usuario vinculado | IdentitySyncWorkflow |

---

## 8) Archivos Implementados

| Archivo | Descripción |
|---------|-------------|
| `api/src/modules/employees/entities/employee.entity.ts` | Entidad redefinida con modelo enterprise completo |
| `api/src/modules/employees/entities/department.entity.ts` | Entidad org_departamentos |
| `api/src/modules/employees/entities/position.entity.ts` | Entidad org_puestos |
| `api/src/modules/employees/entities/index.ts` | Barrel exports |
| `api/src/modules/payroll/entities/pay-period.entity.ts` | Entidad nom_periodos_pago |
| `api/src/modules/employees/dto/create-employee.dto.ts` | DTO enterprise sin idUsuario |
| `api/src/modules/employees/dto/update-employee.dto.ts` | DTO update enterprise |
| `api/src/modules/employees/employees.service.ts` | Service con validaciones enterprise |
| `api/src/modules/employees/employees.controller.ts` | Controller CRUD + inactivar + liquidar |
| `api/src/modules/employees/employees.module.ts` | Module con Department, Position |
| `api/src/modules/payroll/payroll.module.ts` | Module con PayPeriod |
| `api/src/workflows/employees/employee-creation.workflow.ts` | Workflow actualizado al nuevo modelo |
| `api/src/database/migrations/1708531700000-RedefineEmpleadoEnterprise.ts` | Migración: drop + recreate + tablas org/nom + seed |

---

## 9) Migración Ejecutada

- **Nombre:** `RedefineEmpleadoEnterprise1708531700000`
- **Estado:** Ejecutada en RDS ✔
- **Acciones:**
  1. Creó `org_departamentos` con índices
  2. Creó `org_puestos` con índices
  3. Creó `nom_periodos_pago` con seed (Semanal, Quincenal, Mensual)
  4. Drop `sys_empleados` vieja
  5. Recreó `sys_empleados` con 33 columnas enterprise
  6. 10 índices + 6 foreign keys

---
## Actualizaci?n 2026-03-02 ? Vacaciones sin selecci?n de planilla (ACTUALIZACION-VACACIONES-2026-03-02
UI-PLANILLAS-REMOVIDA-2026-03-02
SOLAPE-PLANILLAS-2026-03-02)
- KPITAL (RRHH): el usuario ya no selecciona planilla en Vacaciones. Selecciona fechas y movimiento; el sistema determina la planilla elegible por cada fecha con base en calendario de n?mina (empresa/empleado/moneda/periodo).
- Validaciones: fines de semana y feriados bloqueados; fechas ya reservadas bloqueadas; saldo disponible; fechas deben pertenecer a un periodo elegible; si una fecha coincide con m?ltiples periodos, se rechaza.
- Consistencia de tipo: todas las fechas deben pertenecer al mismo tipo de planilla. Si no, error.
- Split autom?tico en creaci?n: si las fechas caen en m?s de un periodo del mismo tipo, se crean acciones separadas por periodo. En edici?n, solo se permite un periodo.
- Persistencia: `acc_vacaciones_fechas` y `acc_cuotas_accion` guardan `id_calendario_nomina` por fecha; el header de acci?n puede quedar con `id_calendario_nomina = NULL`.
- TimeWise: acciones de vacaciones se crean en estado Borrador sin planilla. RRHH completa fechas/movimiento en KPITAL; el sistema asigna planilla por fecha.
- Planilla: al cargar una planilla se consumen las fechas cuyo `id_calendario_nomina` coincide con la planilla y estado aprobado. No se requiere que el header tenga planilla.
---
