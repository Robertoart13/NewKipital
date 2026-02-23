# DIRECTIVA 23 — Módulo Empleados: Referencia End-to-End

**Documento:** 23  
**Para:** Ingeniero Frontend + Backend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [19-RedefinicionEmpleadoEnterprise.md](./19-RedefinicionEmpleadoEnterprise.md) + [20-MVPContratosEndpoints.md](./20-MVPContratosEndpoints.md) + [18-IdentityCoreEnterprise.md](./18-IdentityCoreEnterprise.md)  
**Prioridad:** Este es el paso más importante del proyecto. Ejecutar en orden estricto.

---

## Principio Fundamental

> **Este módulo es el módulo referencia.** Todo módulo futuro (Planillas, Acciones de Personal, Configuración) se construirá siguiendo exactamente el mismo patrón que Empleados. Si Empleados queda bien, el ERP se acelera. Si queda mal, todo se arrastra.

Empleados es el primer módulo que conecta **todo el stack end-to-end**:

- Frontend (página real con Ant Design)
- → TanStack Query (hooks reales)
- → HTTP con cookie httpOnly + CSRF
- → Backend (NestJS controller + service + entity)
- → Base de datos (sys_empleados con 33 columnas, FKs, índices)
- → Guards (JwtAuthGuard + PermissionsGuard)
- → Permisos reales (`employee:view`, `employee:create`, `employee:edit`)
- → Workflows (EmployeeCreationWorkflow con acceso digital)
- → Eventos de dominio (`employee.created`)

Si este flujo funciona de punta a punta, la arquitectura de 22 documentos queda **validada en producción**.

---

## Formato de Código de Empleado — Regla Obligatoria

> **Al crear un empleado, el `codigo_empleado` se almacena con formato:** `KPid-{id_empleado}-{codigo}`

### Ejemplo

- Usuario ingresa código: `EMP001`
- Backend inserta empleado → obtiene `id_empleado = 5`
- Se guarda en BD: `KPid-5-EMP001`

### Reglas

| Momento | Comportamiento |
|---------|----------------|
| **Formulario frontend** | Usuario ingresa solo el código base (ej. `EMP001`, `CONT-2025`) |
| **POST /api/employees** | Body incluye `codigo: "EMP001"` |
| **Backend al guardar** | Concatena `KPid-{id}-{codigo}` tras el insert (id obtenido) |
| **Respuesta API** | Devuelve `codigo_empleado: "KPid-5-EMP001"` |
| **Edición** | `codigo_empleado` es **inmutable** (doc 23: campo no editable tras creación) |

El código base sigue siendo único por empresa. La validación verifica que no exista otro empleado con el mismo código base (ya sea en formato legacy o `KPid-*-{codigo}`).

**Nota:** La columna `codigo_empleado` tiene `varchar(45)`. El prefijo `KPid-{id}-` ocupa ~12 caracteres (id hasta 8 dígitos). Se recomienda que el código base no supere ~30 caracteres para no exceder el límite.

---

## Encriptación de Datos Sensibles (PII) — Regla Obligatoria

> **Los datos sensibles del empleado deben estar encriptados en reposo.** Solo se desencriptan cuando el usuario tiene permiso `employee:view` y la información se envía al frontend para visualización.

### Alcance

| Dato | Encriptar en BD | Desencriptar al leer |
|------|-----------------|----------------------|
| `nombre_empleado` | ✅ | Solo si `employee:view` |
| `apellido1_empleado`, `apellido2_empleado` | ✅ | Solo si `employee:view` |
| `cedula_empleado` | ✅ | Solo si `employee:view` |
| `email_empleado` | ✅ (o índice hash para búsqueda) | Solo si `employee:view` |
| `telefono_empleado` | ✅ | Solo si `employee:view` |
| `direccion_empleado` | ✅ | Solo si `employee:view` |
| `salario_base_empleado` | ✅ | Solo si `employee:view` |
| `numero_ccss_empleado` | ✅ | Solo si `employee:view` |
| `cuenta_banco_empleado` | ✅ | Solo si `employee:view` |
| `motivo_salida_empleado` | ✅ | Solo si `employee:view` |
| `codigo_empleado` | Opcional (no PII) | — |
| FKs, IDs, estados, fechas | ❌ No encriptar | — |

### Flujo

1. **Al crear/actualizar:** Backend recibe datos en claro → encripta campos sensibles con AES-256 (clave desde `ENCRYPTION_KEY` env) → guarda en BD.
2. **Al leer:** Backend valida `@RequirePermissions('employee:view')` → si autorizado, lee de BD (datos encriptados) → desencripta en memoria → devuelve JSON en claro al frontend.
3. **Frontend:** Recibe datos ya desencriptados. No maneja claves ni desencriptación. Solo visualiza.
4. **Sin permiso:** Si el usuario no tiene `employee:view`, el endpoint responde 403 antes de leer. Nunca se desencripta.

### Implementación Backend

- Servicio `EncryptionService` con `encrypt(text)`, `decrypt(ciphertext)`.
- `EmployeesService`: antes de `save()` → encriptar campos sensibles; antes de `return` → desencriptar.
- Tabla puede usar `VARBINARY` o `TEXT` para almacenar ciphertext (o `VARCHAR` con B64).
- Para búsqueda por email/cédula: considerar índice con hash (SHA-256) del valor para lookup sin desencriptar, o búsqueda por filtro en aplicación (menos eficiente).

### Consideraciones

- Migración de datos existentes: script para encriptar datos legacy.
- Backup/restore: los backups contienen datos encriptados. La clave debe estar segura.

---

## Qué Se Construye (Scope Exacto)

### Frontend — Vistas y Flujo

| Vista | Ruta | Permiso | Qué hace |
|-------|------|---------|----------|
| **Listado** | `/employees` | `employee:view` | Tabla con filtros, paginación, búsqueda, estados. Botón "Nuevo Empleado" abre modal de creación |
| **Crear** | (modal desde listado) | `employee:create` | Modal `EmployeeCreateModal` con formulario completo (con o sin acceso digital). No hay ruta `/employees/new` |
| **Detalle/Editar** | `/employees/:id` | `employee:view` / `employee:edit` | Ver y editar empleado existente |
| **Confirmaciones** | (modals) | `employee:edit` | Inactivar, liquidar con confirmación y motivo |

**Menú:** Empleados aparece en **Configuración → Gestión Organizacional** (no en nivel superior).

### Backend — Ya existe, verificar y ajustar

| Componente | Estado | Acción |
|-----------|--------|--------|
| Entity (`employee.entity.ts`) | ✅ Completo (33 columnas) | Verificar que mapea 1:1 con BD |
| DTOs (`create-employee.dto.ts`, `update-employee.dto.ts`) | ✅ Existe | Verificar validaciones completas |
| Service (`employees.service.ts`) | ✅ Existe | Verificar: paginación, filtros, includeInactive + encriptación |
| Controller (`employees.controller.ts`) | ✅ Existe | Verificar: @RequirePermissions en cada endpoint |
| Workflow (`employee-creation.workflow.ts`) | ✅ Existe | Verificar: ACID funciona con BD real |
| Catálogos (departamentos, puestos, periodos pago) | ✅ Tablas + seed | Verificar: endpoints de consulta disponibles |

---

## FASE A — Backend: Verificación y Ajustes (Primero)

Antes de tocar el frontend, el backend debe estar devolviendo datos reales correctamente.

### A.1 — Verificar Endpoints Existentes

Probar con Postman/Insomnia (o curl) cada endpoint. Todos requieren cookie de sesión.

| # | Test | Endpoint | Esperado |
|---|------|----------|----------|
| 1 | Login | `POST /api/auth/login` | Cookie + user data |
| 2 | Sesión | `GET /api/auth/me?companyId=1&appCode=kpital` | User + permissions + companies |
| 3 | Listar empleados | `GET /api/employees?idEmpresa=1` | Array (puede estar vacío) |
| 4 | Listar con inactivos | `GET /api/employees?idEmpresa=1&includeInactive=true` | Array incluyendo inactivos |
| 5 | Crear empleado (sin acceso) | `POST /api/employees` con body mínimo | 201 + empleado creado |
| 6 | Crear empleado (con acceso TW) | `POST /api/employees` con `crearAccesoTimewise=true` | 201 + empleado + usuario + app asignada |
| 7 | Detalle | `GET /api/employees/:id` | Empleado con relaciones (departamento, puesto, periodo pago) |
| 8 | Actualizar | `PUT /api/employees/:id` | 200 + empleado actualizado |
| 9 | Inactivar | `PATCH /api/employees/:id/inactivate` | 200 + estado=0 |
| 10 | Liquidar | `PATCH /api/employees/:id/liquidar` | 200 + estado cambiado + fecha_salida |
| 11 | Sin permiso | Intentar crear sin `employee:create` | 403 Forbidden |

**Si algún test falla → arreglar antes de seguir al frontend.**

### A.2 — Endpoints de Catálogos (Necesarios para Formularios)

El formulario de crear/editar empleado necesita llenar selects con datos reales. Verificar o crear:

| Endpoint | Método | Respuesta | Módulo |
|----------|--------|-----------|--------|
| `/api/catalogs/departments` | GET | Array de departamentos activos (catalogo global) | employees o companies |
| `/api/catalogs/positions` | GET | Array de puestos activos | employees o companies |
| `/api/catalogs/pay-periods` | GET | Array de periodos de pago activos | payroll |
| `/api/catalogs/companies` | GET | Array de empresas del usuario | companies (ya existe) |

**Decisión:** Los catálogos pueden vivir en un controller dedicado (`CatalogsController`) o dentro del módulo correspondiente. Lo importante es que existan y devuelvan datos.

**Regla:** Los selects del frontend NUNCA se llenan con datos hardcodeados. Siempre del backend. Los ENUMs (género, estado civil, tipo contrato, jornada, moneda) sí pueden estar en el frontend como constantes porque son valores fijos definidos en el doc 19.

**Nota de seguridad (2026-02-22):** Estos tres endpoints de catalogos se exponen como globales y no requieren `idEmpresa` en query. En backend estan marcados con `@AllowWithoutCompany()` para evitar `403` por contexto de empresa en cargas de formulario.

### A.3 — Respuesta del Listado: Formato Estándar

El endpoint `GET /api/employees?idEmpresa=N` debe devolver un formato paginado estándar que el frontend pueda consumir directamente con Ant Design Table:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

Parámetros de query soportados:

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `idEmpresa` | number | **requerido** | Empresa activa |
| `page` | number | 1 | Página actual |
| `pageSize` | number | 20 | Registros por página |
| `search` | string | — | Búsqueda por nombre, apellido, código, cédula |
| `estado` | number | 1 (activos) | Filtrar por estado. `includeInactive=true` para todos |
| `idDepartamento` | number | — | Filtrar por departamento |
| `idPuesto` | number | — | Filtrar por puesto |
| `sort` | string | `nombre_empleado` | Campo de ordenamiento |
| `order` | string | `ASC` | Dirección: ASC o DESC |

### A.4 — Respuesta del Detalle: Relaciones Incluidas

El endpoint `GET /api/employees/:id` debe devolver el empleado con sus relaciones resueltas (no solo IDs):

```json
{
  "id_empleado": 1,
  "codigo_empleado": "EMP-001",
  "nombre_empleado": "Juan",
  "apellido1_empleado": "Pérez",
  "departamento": { "id_departamento": 3, "nombre_departamento": "Contabilidad" },
  "puesto": { "id_puesto": 7, "nombre_puesto": "Contador Senior" },
  "periodoPago": { "id_periodos_pago": 2, "nombre_periodo_pago": "Quincenal" },
  "supervisor": { "id_empleado": 5, "nombre_empleado": "María", "apellido1_empleado": "López" },
  "tieneAccesoDigital": true,
  "estado_empleado": 1,
  ...
}
```

**Regla:** El frontend no hace JOINs. El backend devuelve datos ya resueltos. Los datos sensibles llegan desencriptados si el usuario tiene `employee:view`.

### A.5 — Validación Empresa al Crear Empleado (Multiempresa)

El empleado siempre requiere `idEmpresa` (sys_empleados.id_empresa es NOT NULL). El backend **NO confía en la UI**:

1. **CreateEmployeeDto:** `idEmpresa` obligatorio para creación.
2. **EmployeesService.create(currentUser, dto):** Antes de crear, verificar acceso:
   - Query a `sys_usuario_empresa` donde `id_usuario = userId`, `id_empresa = dto.idEmpresa`, `estado_usuario_empresa = 1`.
   - Si no existe → `403 Forbidden`.
   - Si existe → proceder con creación normal.

**Criterio de seguridad:** Esta validación es obligatoria aunque el frontend filtre bien.

---

## FASE B — Frontend: Estructura de Archivos

### B.1 — Archivos del Módulo

```
src/
├── pages/
│   └── private/
│       └── employees/
│           ├── EmployeesListPage.tsx        # Listado principal (abre modal de creación)
│           ├── EmployeeDetailPage.tsx       # Detalle + edición
│           ├── components/
│           │   ├── EmployeeCreateModal.tsx  # Modal de creación (NO página separada)
│           │   ├── EmployeeCreateModal.module.css  # Estilos del modal
│           │   ├── EmployeesTable.tsx       # Tabla Ant Design (recibe datos, no fetcha)
│           │   ├── EmployeeForm.tsx         # Formulario compartido (editar)
│           │   ├── EmployeeFilters.tsx      # Barra de filtros
│           │   ├── EmployeeStatusBadge.tsx  # Badge visual de estado
│           │   └── EmployeeActions.tsx      # Botones de acción con modals
│           └── constants/
│               └── employee-enums.ts        # ENUMs locales
│
├── queries/
│   └── employees/
│       ├── keys.ts
│       ├── useEmployees.ts
│       ├── useEmployee.ts
│       ├── useCreateEmployee.ts             # NUEVO
│       ├── useUpdateEmployee.ts             # NUEVO
│       ├── useInactivateEmployee.ts         # NUEVO
│       └── useLiquidateEmployee.ts          # NUEVO
│
├── queries/
│   └── catalogs/
│       ├── keys.ts                          # NUEVO
│       ├── useDepartments.ts                # NUEVO
│       ├── usePositions.ts                  # NUEVO
│       └── usePayPeriods.ts                 # NUEVO
```

### B.2 — Rutas en AppRouter

| Ruta | Componente | Guard | Permiso |
|------|-----------|-------|---------|
| `/employees` | `EmployeesListPage` | PrivateGuard | `employee:view` |
| `/employees/:id` | `EmployeeDetailPage` | PrivateGuard | `employee:view` |

**Nota:** No existe ruta `/employees/new`. La creación se realiza desde un modal abierto desde el listado (botón "Nuevo Empleado").

---

## FASE C — Frontend: Implementación por Vista

### C.1 — Listado de Empleados (`EmployeesListPage.tsx`)

**Columnas:** Código, Cédula, Nombre completo, Email, Departamento, Puesto, Estado, Acciones.

**Comportamientos:** Estado vacío, loading (Skeleton), error con reintentar, búsqueda con debounce 400ms, paginación backend, botón crear solo con `employee:create`.

### C.2 — Crear Empleado (`EmployeeCreateModal.tsx`)

**Ubicación:** Modal que se abre desde `EmployeesListPage` al hacer clic en "Nuevo Empleado". No es una página separada.

**Secciones (tabs):** Información Personal, Información de Contacto, Información Laboral, Información Financiera, Autogestión, Histórico Laboral.

**Campo Empresa:**
- **Fuente:** `auth.companies` (viene en sesión `/auth/me`). No se usa endpoint nuevo.
- **Si `companies.length === 1`:** Mostrar `Input` deshabilitado con el nombre de la empresa. En submit enviar `idEmpresa = companies[0].id`.
- **Si `companies.length >= 2`:** Mostrar `Select` con esas empresas. Valor por defecto: empresa activa (Redux `activeCompany.company?.id`) si está en la lista; si no, `companies[0].id`. En submit enviar `idEmpresa = selectedCompanyId`. El cambio en el selector no afecta la empresa activa global.
- **Post-submit:** No cambiar empresa activa. Cerrar modal, invalidar lista y permanecer en el listado (empleados de la empresa activa).

**Selects del backend:** Departamento, Puesto, Periodo de Pago (catalogos globales, no filtrados por empresa en el request).  
**ENUMs locales:** Género, Estado Civil, Tipo Contrato, Jornada, Moneda, Tiene Cónyuge.

**Al guardar:** Mutation POST → cerrar modal → invalidar lista → mostrar notificación de éxito.

### C.3 — Detalle y Edición (`EmployeeDetailPage.tsx`)

**Modos:** Vista (Descriptions) y Edición (Form). Campos inmutables: id_empleado, id_empresa, codigo_empleado. Modals: Inactivar (motivo), Liquidar (fecha salida + motivo), Reactivar.

---

## FASE D — Hooks de TanStack Query (Mutations)

| Hook | Método | Endpoint |
|------|--------|----------|
| `useCreateEmployee` | POST | `/api/employees` |
| `useUpdateEmployee` | PUT | `/api/employees/:id` |
| `useInactivateEmployee` | PATCH | `/api/employees/:id/inactivate` |
| `useLiquidateEmployee` | PATCH | `/api/employees/:id/liquidar` |

---

## FASE E — Reglas de UX Enterprise

| Permiso | Efecto en UI |
|---------|--------------|
| `employee:view` | Puede ver listado y detalle (backend envía datos desencriptados) |
| `employee:create` | Ve botón "+ Nuevo Empleado" y ruta `/employees/new` |
| `employee:edit` | Ve botones Editar, Inactivar, Liquidar |
| Sin permiso | Menú no muestra Empleados. URL directa → redirect dashboard |

---

## FASE F — Orden de Ejecución (Sprints)

**Sprint 1 — Backend:** Verificar endpoints, paginación, filtros, catálogos, @RequirePermissions, **encriptación/desencriptación**.  
**Sprint 2 — Listado:** Rutas, EmployeesListPage, tabla, filtros, paginación, estados.  
**Sprint 3 — Crear:** EmployeeForm, hooks catálogos, mutation crear, validaciones, acceso digital.  
**Sprint 4 — Detalle + Edición:** Vista/edición, mutations update/inactivate/liquidate, modals.  
**Sprint 5 — Pulido:** Flujo end-to-end, permisos, cambio empresa, CSRF.

---

## Base de Datos — Seed para Pruebas Multiempresa

Para probar el selector de empresa y la validación 403:

1. **Insertar 4 empresas nuevas:** Beta, Gamma, Delta, Omega (prefijos EB, EG, ED, EO).
2. **Asignar solo 2 (EB, EG) al usuario admin** en `sys_usuario_empresa`.

Migración: `1708532300000-SeedEmpresasMultiempresaPrueba.ts`.

---

## Pruebas QA (Multiempresa)

1. Loguearse con el admin.
2. Confirmar `auth.companies.length >= 2`.
3. Abrir "Crear Empleado": debe aparecer **Select** con solo empresas asignadas (demo + EB + EG). Valor por defecto = empresa activa.
4. Crear empleado en EB sin cambiar empresa activa: debe crear OK. Volver al listado y seguir viendo empleados de la empresa activa.
5. Probar request manual (Postman/DevTools) con `idEmpresa` de empresa no asignada (ej. ED): debe responder **403 Forbidden**.
6. Probar `GET /api/catalogs/departments` sin `idEmpresa`: debe responder **200** si existe sesion y permiso `employee:view`.

---

## Lo Que NO Se Hace en Este Módulo

❌ Importación masiva  
❌ CRUD de departamentos/puestos (solo selects)  
❌ Reportes ni exportación Excel  
❌ Optimización mobile (desktop 1280px+)

---

## Conexión con Documentos Anteriores

| Documento | Conexión |
|-----------|----------|
| 19-RedefinicionEmpleadoEnterprise | Entity 33 columnas, ENUMs, FKs |
| 18-IdentityCoreEnterprise | @RequirePermissions, JwtAuthGuard |
| 16-CreacionEmpleadoConAcceso | Workflow ACID, sección Acceso Digital |
| 22-AuthReport | CSRF, guards |

---

*Este módulo es el punto de inflexión del proyecto. Pasa de "arquitectura documentada" a "sistema funcional".*
