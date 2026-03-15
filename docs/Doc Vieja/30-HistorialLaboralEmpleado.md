# DIRECTIVA 30 - Historial Laboral de Empleado (Creacion)

**Documento:** 30  
**Fecha:** 2026-02-24  
**Objetivo:** Formalizar la logica funcional, validaciones y persistencia del bloque `Historico Laboral` al crear empleado.

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

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

**Smbolo CRC:** Se usa la abreviatura `"CRC"` en lugar del smbolo coln para evitar problemas de encoding. Formato visual: `"CRC 0.00"`.

---

## Estilos (alineados con CompaniesManagementPage)

La seccin "Provisin de Aguinaldo del Empleado" usa las clases de `UsersManagementPage.module.css`:

| Clase | Uso |
|-------|-----|
| `historicoProvisionBlock` | Tarjeta blanca (sectionCard-like): fondo #fff, border-radius 12px, padding 20px 24px |
| `historicoTableWrap` | Contenedor de tabla con bordes y sombra (configTable-like) |
| `historicoTableHeader` | Encabezados: fondo #f2f4f6, uppercase, letter-spacing |
| `historicoTableRow` | Filas con bordes, filas alternadas y hover |
| `historicoAddBtn` | Botn "+ Agregar Registro" con estilo btnPrimary |
| `sectionTitle`, `sectionDescription` | Ttulo y descripcin de la seccin |

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
## Actualizacion 2026-03-04 - Fuente de provision de aguinaldo

- La provision de aguinaldo se calcula con base en resultados de planilla por empleado (`nomina_resultados`).
- El devengado monetario se obtiene desde `salario_bruto_periodo_resultado` y acciones aplicadas (total bruto).
- El detalle por planilla queda en `nomina_planilla_snapshot_json` para auditoria.
- En traslados interempresas, el saldo a provisionar se toma del historico de planillas (no del dato manual).
- En cada planilla aplicada se registra una provision automatica por empleado:
  - `monto_provisionado = total_bruto / 12`
  - `fecha_inicio_laboral = fecha_inicio_periodo`
  - `fecha_fin_laboral = fecha_fin_periodo`
  - `registro_empresa = "Planilla aplicada #<id_planilla>"`

## Actualizacion 2026-03-04 - Traslado interempresas (continuidad)

- En traslado con continuidad se crea una fila en `sys_empleado_provision_aguinaldo` para la **empresa origen**:
  - `monto_provisionado = SUM(total_bruto_resultado) / 12` hasta `fecha_efectiva`.
  - `fecha_inicio_laboral = fecha_ingreso_empleado`.
  - `fecha_fin_laboral = fecha_efectiva`.
  - `registro_empresa = "Traslado de empresa"`.
  - `estado = Pendiente`.
