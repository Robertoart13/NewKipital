# DIRECTIVA 30 - Historial Laboral de Empleado (Creacion)

**Documento:** 30  
**Fecha:** 2026-02-24  
**Objetivo:** Formalizar la logica funcional, validaciones y persistencia del bloque `Historico Laboral` al crear empleado.

---

## Alcance funcional

En la creacion de empleado se habilita el bloque `Historico Laboral` con:

1. `Vacaciones Acumuladas` (moneda, >= 0)
2. `Cesantia Acumulada` (moneda, >= 0)
3. Tabla `Provision de Aguinaldo del Empleado` con multiples filas

Campos por fila de provisiones:

- Empresa
- Monto Provisionado
- Fecha Inicio Laboral
- Fecha Fin Laboral
- Registro de Empresa
- Estado
- Acciones

---

## Reglas de negocio (frontend)

1. `Vacaciones Acumuladas`: monto, 0 o mayor.
2. `Cesantia Acumulada`: monto, 0 o mayor.
3. `Monto Provisionado`: monto, 0 o mayor.
4. Fecha inicio y fecha fin no pueden ser futuras.
5. Fecha fin (si existe) no puede ser menor a fecha inicio.
6. `Registro de Empresa` por defecto: `Traslado de empresa`.
7. `Estado` por defecto: `Pendiente`.
8. El selector de empresa en la tabla de historial no permite escoger la misma empresa seleccionada en Informacion Laboral del empleado.
9. El selector de empresa para historial carga todas las empresas, activas e inactivas.

---

## Reglas de negocio (backend)

Validaciones de seguridad en backend (fuente final):

1. Acumulados no negativos (`vacacionesAcumuladas`, `cesantiaAcumulada`).
2. Provisiones de aguinaldo:
   - Empresa requerida.
   - Monto no negativo.
   - Fecha inicio valida y no futura.
   - Fecha fin no futura.
   - Fecha fin >= fecha inicio.

Si una validacion falla, se responde `400 Bad Request`.

---

## Persistencia

### Empleado (tabla existente)

Se persiste en `sys_empleados`:

- `vacaciones_acumuladas_empleado`
- `cesantia_acumulada_empleado`

### Nueva tabla relacionada

Se crea `sys_empleado_provision_aguinaldo` para historial por fila:

- FK a `sys_empleados` (`id_empleado`)
- FK a `sys_empresas` (`id_empresa`)
- monto, fechas, comentario (`registro_empresa`), estado y auditoria

Migracion:

- `api/src/database/migrations/1708533700000-CreateEmployeeAguinaldoProvisionHistory.ts`

Entidad:

- `api/src/modules/employees/entities/employee-aguinaldo-provision.entity.ts`

---

## Flujos cubiertos

La persistencia se ejecuta en ambos caminos:

1. Creacion sin acceso digital (`EmployeesService.create`)
2. Creacion con acceso digital (`EmployeeCreationWorkflow`)

En ambos casos se guardan acumulados y provisiones si fueron enviadas.

---

## Archivos clave

Backend:

- `api/src/modules/employees/dto/create-employee.dto.ts`
- `api/src/modules/employees/dto/create-employee-aguinaldo-provision.dto.ts`
- `api/src/modules/employees/employees.service.ts`
- `api/src/workflows/employees/employee-creation.workflow.ts`
- `api/src/modules/employees/employees.module.ts`

Frontend:

- `frontend/src/pages/private/employees/components/EmployeeCreateModal.tsx`
- `frontend/src/api/employees.ts`
- `frontend/src/api/companies.ts`
- `frontend/src/queries/companies/useAllCompaniesForHistory.ts`

---

## Dependencia de estandar monetario

Este flujo debe usar el estandar definido en:

- `docs/29-EstandarFormatoMoneda.md`

**Símbolo CRC:** Se usa la abreviatura `"CRC"` en lugar del símbolo colón para evitar problemas de encoding. Formato visual: `"CRC 0.00"`.

---

## Estilos (alineados con CompaniesManagementPage)

La sección "Provisión de Aguinaldo del Empleado" usa las clases de `UsersManagementPage.module.css`:

| Clase | Uso |
|-------|-----|
| `historicoProvisionBlock` | Tarjeta blanca (sectionCard-like): fondo #fff, border-radius 12px, padding 20px 24px |
| `historicoTableWrap` | Contenedor de tabla con bordes y sombra (configTable-like) |
| `historicoTableHeader` | Encabezados: fondo #f2f4f6, uppercase, letter-spacing |
| `historicoTableRow` | Filas con bordes, filas alternadas y hover |
| `historicoAddBtn` | Botón "+ Agregar Registro" con estilo btnPrimary |
| `sectionTitle`, `sectionDescription` | Título y descripción de la sección |

