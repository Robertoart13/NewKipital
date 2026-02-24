# Checklist — Módulo Empleados (doc vs implementación)

**Objetivo:** Verificar que no falten validaciones ni comportamientos estipulados en la documentación.  
**Docs de referencia:** 23, 19, 16, 27, 28, 29, 30, 31, 31-Cifrado, 08, 20.

---

## 1. Código de empleado (Doc 23)

| Estipulación | Implementado | Dónde verificar |
|--------------|--------------|------------------|
| Usuario ingresa solo código base (ej. EMP001) | ✅ | Create: campo "Código" envía `codigo` en body |
| Backend guarda como `KPid-{id}-{codigo}` | ✅ | Backend EmployeesService/create |
| Código base único por empresa (validación backend) | ✅ | Backend |
| Código base max ~30 caracteres recomendado (columna 45) | ✅ | textRules max 45 en Create |
| **Edición: código inmutable (no editable)** | ✅ | EmployeeEditModal: campo codigo con `disabled` |

---

## 2. Validación de formularios — Doc 31 (formValidation.ts)

| Campo | Regla doc | Create | Edit |
|-------|-----------|--------|------|
| nombre | textRules, required, max 100 | ✅ | ✅ |
| apellido1 | textRules, required, max 100 | ✅ | ✅ |
| apellido2 | textRules, max 100 | ✅ | ✅ |
| cedula | textRules, required, max 30 | ✅ | ✅ |
| email | emailRules(true) | ✅ | ✅ |
| telefono | optionalNoSqlInjection | ✅ | ✅ |
| direccion | optionalNoSqlInjection | ✅ | ✅ |
| codigoPostal | optionalNoSqlInjection | ✅ Create | N/A (no en edit) |
| codigo | textRules, required, max 45 | ✅ | ✅ (disabled) |
| numeroCcss | optionalNoSqlInjection | ✅ | ✅ |
| cuentaBanco | optionalNoSqlInjection | ✅ | ✅ |
| passwordInicial | textRules min 8, max 128 (solo crear) | ✅ | N/A |
| registroEmpresa (historial) | textRules max 500 | ✅ | N/A |

**Regla doc:** No duplicar validadores inline; usar solo `textRules`, `emailRules`, `optionalNoSqlInjection` desde `formValidation.ts`.

---

## 3. Moneda y montos — Doc 29 (currencyFormat.ts)

| Estipulación | Create | Edit |
|--------------|--------|------|
| Usar `formatCurrencyInput`, `parseCurrencyInput`, `getCurrencySymbol` | ✅ | ✅ |
| Salario base: **mayor a 0** (doc: "al crear debe indicar error si es 0") | ✅ validator + min 0.01 | ✅ validator + min 0.01 |
| Vacaciones/cesantía: >= 0 | ✅ | ✅ |
| Monto provisionado (historial): >= 0 | ✅ | N/A |
| Tope máximo `MAX_MONEY_AMOUNT` en inputs | ✅ | ✅ |
| Símbolo según moneda (CRC / USD) | ✅ | ✅ |

---

## 4. Histórico laboral (Doc 30) — solo creación

| Regla | Implementado | Dónde |
|-------|--------------|--------|
| Vacaciones acumuladas >= 0 | ✅ | CreateModal |
| Cesantía acumulada >= 0 | ✅ | CreateModal |
| Monto provisionado >= 0 | ✅ | CreateModal |
| Fecha inicio/fin no futuras | ✅ | disabledFutureDate |
| Fecha fin >= fecha inicio | ✅ | validator en Form.Item |
| Registro de empresa por defecto "Traslado de empresa" | ✅ | placeholder / initialValue |
| Estado por defecto "Pendiente" | ✅ | initialValue 1 |
| **Empresa en historial ≠ empresa laboral del empleado** | ✅ | validator + filter en options |
| **Selector historial: todas las empresas (activas e inactivas)** | ✅ | useAllCompaniesForHistory + includeInactive |

---

## 5. Listado (Doc 23 C.1)

| Estipulación | Implementado |
|--------------|--------------|
| Columnas: Código, Cédula, Nombre completo, Email, Departamento, Puesto, Estado, Acciones | ✅ EmployeesTable |
| Búsqueda con debounce 400 ms | ✅ EmployeeFilters |
| Paginación backend | ✅ |
| Botón "Nuevo Empleado" solo con `employee:create` | ✅ |
| No existe ruta `/employees/new`; creación por modal | ✅ |

---

## 6. Supervisores (Doc 23 + regla 2026-02-24)

| Estipulación | Implementado |
|--------------|--------------|
| GET /employees/supervisors sin idEmpresa | ✅ |
| Lista: Supervisor / Supervisor Global / Master, todas las empresas del usuario | ✅ Backend |
| Frontend: useSupervisors() sin companyId | ✅ |

---

## 7. Campos inmutables en edición (Doc 23)

| Campo | Estipulación | Implementado |
|-------|--------------|--------------|
| id_empleado | No editable | No se muestra como input |
| id_empresa | No editable | Mostrado, no editable |
| codigo_empleado | Inmutable tras creación | ✅ Input disabled |
| fecha_ingreso | No se envía en PUT | ✅ Solo lectura en form |

---

## 8. Permisos y UX (Doc 23 FASE E)

| Permiso | Efecto esperado | Verificar |
|---------|-----------------|-----------|
| employee:view | Ver listado y detalle | ✅ |
| employee:create | Botón "+ Nuevo Empleado" (no ruta /employees/new) | ✅ |
| employee:edit | Editar, Inactivar, Liquidar, Reactivar | ✅ |
| Sin permiso | Menú no muestra Empleados; URL directa → redirect | Revisar menú y guards |

---

## 9. Datos sensibles (Doc 31-Cifrado)

| Estipulación | Implementado | Nota |
|--------------|--------------|------|
| Backend: sin `employee:view-sensitive` devuelve null en PII | ✅ Backend | - |
| **UI: cuando API devuelve null en sensibles, mostrar `--`** | ⚠️ Revisar | Lista y detalle: si nombre/cedula/email son null, hoy se puede ver vacío o "null"; doc pide mostrar `--` |

---

## 10. Menú (Doc 08)

| Estipulación | Verificar |
|--------------|-----------|
| Empleados bajo **Configuración → Gestión Organizacional** | Revisar `menuSlice` / estructura menú |

---

## 11. Pendientes de acción (Doc 28)

| ID | Estipulación | Estado |
|----|--------------|--------|
| PEND-002 | No permitir inactivar empleado si tiene acciones de personal bloqueantes (409 + mensaje) | Pendiente |

---

## Resumen de posibles gaps

1. **UI datos sensibles:** Si el usuario no tiene `employee:view-sensitive`, la API devuelve null en nombre, apellidos, cédula, email, etc. La doc pide que la UI muestre `--` en esos casos. Revisar en:
   - `EmployeesTable` (columnas nombre, cédula, email)
   - `EmployeeDetailPage` (Descriptions)
   - Cualquier vista que muestre esos campos

2. **PEND-002:** Validación en backend para no inactivar si hay acciones de personal bloqueantes; frontend mostrar mensaje cuando responda 409.

3. **Menú:** Confirmar que "Empleados" está bajo Configuración → Gestión Organizacional según doc 08.

---

*Última revisión: 2026-02-24. Actualizar este checklist cuando se implementen gaps o cambien estipulaciones en los docs.*
