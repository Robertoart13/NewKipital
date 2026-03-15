# Checklist  Mdulo Empleados (doc vs implementacin)

**Objetivo:** Verificar que no falten validaciones ni comportamientos estipulados en la documentacin.  
**Docs de referencia:** 23, 19, 16, 27, 28, 29, 30, 31, 31-Cifrado, 08, 20.

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## 1. Cdigo de empleado (Doc 23)

| Estipulacin | Implementado | Dnde verificar |
|--------------|--------------|------------------|
| Usuario ingresa solo cdigo base (ej. EMP001) |  | Create: campo "Cdigo" enva `codigo` en body |
| Backend guarda como `KPid-{id}-{codigo}` |  | Backend EmployeesService/create |
| Cdigo base nico por empresa (validacin backend) |  | Backend |
| Cdigo base max ~30 caracteres recomendado (columna 45) |  | textRules max 45 en Create |
| **Edicin: cdigo inmutable (no editable)** |  | EmployeeEditModal: campo codigo con `disabled` |

---

## 2. Validacin de formularios  Doc 31 (formValidation.ts)

| Campo | Regla doc | Create | Edit |
|-------|-----------|--------|------|
| nombre | textRules, required, max 100 |  |  |
| apellido1 | textRules, required, max 100 |  |  |
| apellido2 | textRules, max 100 |  |  |
| cedula | textRules, required, max 30 |  |  |
| email | emailRules(true) |  |  |
| telefono | optionalNoSqlInjection |  |  |
| direccion | optionalNoSqlInjection |  |  |
| codigoPostal | optionalNoSqlInjection |  Create | N/A (no en edit) |
| codigo | textRules, required, max 45 |  |  (disabled) |
| numeroCcss | optionalNoSqlInjection |  |  |
| cuentaBanco | optionalNoSqlInjection |  |  |
| passwordInicial | textRules min 8, max 128 (solo crear) |  | N/A |
| registroEmpresa (historial) | textRules max 500 |  | N/A |

**Regla doc:** No duplicar validadores inline; usar solo `textRules`, `emailRules`, `optionalNoSqlInjection` desde `formValidation.ts`.

---

## 3. Moneda y montos  Doc 29 (currencyFormat.ts)

| Estipulacin | Create | Edit |
|--------------|--------|------|
| Usar `formatCurrencyInput`, `parseCurrencyInput`, `getCurrencySymbol` |  |  |
| Salario base: **mayor a 0** (doc: "al crear debe indicar error si es 0") |  validator + min 0.01 |  validator + min 0.01 |
| Vacaciones/cesanta: >= 0 |  |  |
| Monto provisionado (historial): >= 0 |  | N/A |
| Tope mximo `MAX_MONEY_AMOUNT` en inputs |  |  |
| Smbolo segn moneda (CRC / USD) |  |  |

---

## 4. Histrico laboral (Doc 30)  solo creacin

| Regla | Implementado | Dnde |
|-------|--------------|--------|
| Vacaciones acumuladas >= 0 |  | CreateModal |
| Cesanta acumulada >= 0 |  | CreateModal |
| Monto provisionado >= 0 |  | CreateModal |
| Fecha inicio/fin no futuras |  | disabledFutureDate |
| Fecha fin >= fecha inicio |  | validator en Form.Item |
| Registro de empresa por defecto "Traslado de empresa" |  | placeholder / initialValue |
| Estado por defecto "Pendiente" |  | initialValue 1 |
| **Empresa en historial  empresa laboral del empleado** |  | validator + filter en options |
| **Selector historial: todas las empresas (activas e inactivas)** |  | useAllCompaniesForHistory + includeInactive |

---

## 5. Listado (Doc 23 C.1)

| Estipulacin | Implementado |
|--------------|--------------|
| Columnas: Cdigo, Cdula, Nombre completo, Email, Departamento, Puesto, Estado, Acciones |  EmployeesTable |
| Bsqueda con debounce 400 ms |  EmployeeFilters |
| Paginacin backend |  |
| Botn "Nuevo Empleado" solo con `employee:create` |  |
| No existe ruta `/employees/new`; creacin por modal |  |

---

## 6. Supervisores (Doc 23 + regla 2026-02-24)

| Estipulacin | Implementado |
|--------------|--------------|
| GET /employees/supervisors sin idEmpresa |  |
| Lista: Supervisor / Supervisor Global / Master, todas las empresas del usuario |  Backend |
| Frontend: useSupervisors() sin companyId |  |

---

## 7. Campos inmutables en edicin (Doc 23)

| Campo | Estipulacin | Implementado |
|-------|--------------|--------------|
| id_empleado | No editable | No se muestra como input |
| id_empresa | No editable | Mostrado, no editable |
| codigo_empleado | Inmutable tras creacin |  Input disabled |
| fecha_ingreso | No se enva en PUT |  Solo lectura en form |

---

## 8. Permisos y UX (Doc 23 FASE E)

| Permiso | Efecto esperado | Verificar |
|---------|-----------------|-----------|
| employee:view | Ver listado y detalle |  |
| employee:create | Botn "+ Nuevo Empleado" (no ruta /employees/new) |  |
| employee:edit | Editar, Inactivar, Liquidar, Reactivar |  |
| Sin permiso | Men no muestra Empleados; URL directa  redirect | Revisar men y guards |

---

## 9. Datos sensibles (Doc 31-Cifrado)

| Estipulacin | Implementado | Nota |
|--------------|--------------|------|
| Backend: sin `employee:view-sensitive` devuelve null en PII |  Backend | - |
| **UI: cuando API devuelve null en sensibles, mostrar `--`** |  Revisar | Lista y detalle: si nombre/cedula/email son null, hoy se puede ver vaco o "null"; doc pide mostrar `--` |

---

## 10. Men (Doc 08)

| Estipulacin | Verificar |
|--------------|-----------|
| Empleados bajo **Configuracin  Gestin Organizacional** | Revisar `menuSlice` / estructura men |

---

## 11. Pendientes de accin (Doc 28)

| ID | Estipulacin | Estado |
|----|--------------|--------|
| PEND-002 | No permitir inactivar empleado si tiene acciones de personal bloqueantes (409 + mensaje) | Pendiente |

---

## Resumen de posibles gaps

1. **UI datos sensibles:** Si el usuario no tiene `employee:view-sensitive`, la API devuelve null en nombre, apellidos, cdula, email, etc. La doc pide que la UI muestre `--` en esos casos. Revisar en:
   - `EmployeesTable` (columnas nombre, cdula, email)
   - `EmployeeDetailPage` (Descriptions)
   - Cualquier vista que muestre esos campos

2. **PEND-002:** Validacin en backend para no inactivar si hay acciones de personal bloqueantes; frontend mostrar mensaje cuando responda 409.

3. **Men:** Confirmar que "Empleados" est bajo Configuracin  Gestin Organizacional segn doc 08.

---

*ltima revisin: 2026-02-24. Actualizar este checklist cuando se implementen gaps o cambien estipulaciones en los docs.*

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
