# DIRECTIVA 23  Mdulo Empleados: Referencia End-to-End

**Documento:** 23  
**Para:** Ingeniero Frontend + Backend  
**De:** Roberto  Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber ledo [19-RedefinicionEmpleadoEnterprise.md](./19-RedefinicionEmpleadoEnterprise.md) + [20-MVPContratosEndpoints.md](./20-MVPContratosEndpoints.md) + [18-IdentityCoreEnterprise.md](./18-IdentityCoreEnterprise.md) + [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md)  
**Prioridad:** Este es el paso ms importante del proyecto. Ejecutar en orden estricto.

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Principio Fundamental

> **Este mdulo es el mdulo referencia.** Todo mdulo futuro (Planillas, Acciones de Personal, Configuracin) se construir siguiendo exactamente el mismo patrn que Empleados. Si Empleados queda bien, el ERP se acelera. Si queda mal, todo se arrastra.

Empleados es el primer mdulo que conecta **todo el stack end-to-end**:

- Frontend (pgina real con Ant Design)
-  TanStack Query (hooks reales)
-  HTTP con cookie httpOnly + CSRF
-  Backend (NestJS controller + service + entity)
-  Base de datos (sys_empleados con 33 columnas, FKs, ndices)
-  Guards (JwtAuthGuard + PermissionsGuard)
-  Permisos reales (`employee:view`, `employee:create`, `employee:edit`)
-  Workflows (EmployeeCreationWorkflow con acceso digital)
-  Eventos de dominio (`employee.created`)

Si este flujo funciona de punta a punta, la arquitectura de 22 documentos queda **validada en produccin**.

---

## Formato de Cdigo de Empleado  Regla Obligatoria

> **Al crear un empleado, el `codigo_empleado` se almacena con formato:** `KPid-{id_empleado}-{codigo}`

### Ejemplo

- Usuario ingresa cdigo: `EMP001`
- Backend inserta empleado  obtiene `id_empleado = 5`
- Se guarda en BD: `KPid-5-EMP001`

### Reglas

| Momento | Comportamiento |
|---------|----------------|
| **Formulario frontend** | Usuario ingresa solo el cdigo base (ej. `EMP001`, `CONT-2025`) |
| **POST /api/employees** | Body incluye `codigo: "EMP001"` |
| **Backend al guardar** | Concatena `KPid-{id}-{codigo}` tras el insert (id obtenido) |
| **Respuesta API** | Devuelve `codigo_empleado: "KPid-5-EMP001"` |
| **Edicin** | `codigo_empleado` es **inmutable** (doc 23: campo no editable tras creacin) |

El cdigo base sigue siendo nico por empresa. La validacin verifica que no exista otro empleado con el mismo cdigo base (ya sea en formato legacy o `KPid-*-{codigo}`).

**Nota:** La columna `codigo_empleado` tiene `varchar(45)`. El prefijo `KPid-{id}-` ocupa ~12 caracteres (id hasta 8 dgitos). Se recomienda que el cdigo base no supere ~30 caracteres para no exceder el lmite.

---

## Encriptacin de Datos Sensibles (PII)  Regla Obligatoria

> **Los datos sensibles del empleado deben estar encriptados en reposo.** Solo se desencriptan cuando el usuario tiene permiso `employee:view` y la informacin se enva al frontend para visualizacin.

### Alcance

| Dato | Encriptar en BD | Desencriptar al leer |
|------|-----------------|----------------------|
| `nombre_empleado` |  | Solo si `employee:view` |
| `apellido1_empleado`, `apellido2_empleado` |  | Solo si `employee:view` |
| `cedula_empleado` |  | Solo si `employee:view` |
| `email_empleado` |  (o ndice hash para bsqueda) | Solo si `employee:view` |
| `telefono_empleado` |  | Solo si `employee:view` |
| `direccion_empleado` |  | Solo si `employee:view` |
| `salario_base_empleado` |  | Solo si `employee:view` |
| `numero_ccss_empleado` |  | Solo si `employee:view` |
| `cuenta_banco_empleado` |  | Solo si `employee:view` |
| `motivo_salida_empleado` |  | Solo si `employee:view` |
| `codigo_empleado` | Opcional (no PII) |  |
| FKs, IDs, estados, fechas |  No encriptar |  |

### Flujo

1. **Al crear/actualizar:** Backend recibe datos en claro  encripta campos sensibles con AES-256 (clave desde `ENCRYPTION_KEY` env)  guarda en BD.
2. **Al leer:** Backend valida `@RequirePermissions('employee:view')`  si autorizado, lee de BD (datos encriptados)  desencripta en memoria  devuelve JSON en claro al frontend.
3. **Frontend:** Recibe datos ya desencriptados. No maneja claves ni desencriptacin. Solo visualiza.
4. **Sin permiso:** Si el usuario no tiene `employee:view`, el endpoint responde 403 antes de leer. Nunca se desencripta.

### Implementacin Backend

- Servicio `EncryptionService` con `encrypt(text)`, `decrypt(ciphertext)`.
- `EmployeesService`: antes de `save()`  encriptar campos sensibles; antes de `return`  desencriptar.
- Tabla puede usar `VARBINARY` o `TEXT` para almacenar ciphertext (o `VARCHAR` con B64).
- Para bsqueda por email/cdula: considerar ndice con hash (SHA-256) del valor para lookup sin desencriptar, o bsqueda por filtro en aplicacin (menos eficiente).

### Consideraciones

- Migracin de datos existentes: script para encriptar datos legacy.
- Backup/restore: los backups contienen datos encriptados. La clave debe estar segura.

---

## Qu Se Construye (Scope Exacto)

### Frontend  Vistas y Flujo

| Vista | Ruta | Permiso | Qu hace |
|-------|------|---------|----------|
| **Listado** | `/employees` | `employee:view` | Tabla con filtros, paginacin, bsqueda, estados. Botn "Nuevo Empleado" abre modal de creacin |
| **Crear** | (modal desde listado) | `employee:create` | Modal `EmployeeCreateModal` con formulario completo (con o sin acceso digital). **Selectores de rol por app** (TimeWise: Empleado/Supervisor/Supervisor Global; KPITAL: si creador tiene permiso). **Dropdown Supervisor** segn regla abajo (sin filtro por empresa). Ver Doc 27. No hay ruta `/employees/new` |
| **Detalle/Editar** | `/employees/:id` | `employee:view` / `employee:edit` | Ver y editar empleado existente |
| **Confirmaciones** | (modals) | `employee:edit` | Inactivar, liquidar con confirmacin y motivo |

**Men:** Empleados aparece en **Configuracin  Gestin Organizacional** (no en nivel superior).

### Regla: Lista de supervisores sin filtro por empresa (2026-02-24)

**Estipulacin:** El selector de Supervisor en crear/editar empleado **no** filtra por empresa.

- **Endpoint:** `GET /api/employees/supervisors` (sin query `idEmpresa`).
- **Criterio:** Se listan todos los empleados con rol **Supervisor TimeWise**, **Supervisor Global TimeWise** o **Master** en TimeWise, de **cualquier empresa** a la que el usuario tenga acceso.
- **Motivo:** Las subsidiarias pertenecen al mismo dueo; un supervisor de otra empresa puede asumir el rol temporalmente. Solo se muestran roles por encima de Empleado.
- **Seguridad:** Solo se incluyen empleados de empresas en `sys_usuario_empresa` del usuario; se respeta `employee:view-sensitive` por empresa del empleado para desencriptar nombre/apellidos.

### Extensin 2026-02-24 - Histrico Laboral en creacin

Se agrega en `EmployeeCreateModal` la pestaa `Histrico Laboral` con:

1. Acumulados monetarios (`vacacionesAcumuladas`, `cesantiaAcumulada`).
2. Tabla dinmica de `provisionesAguinaldo` por empresa.
3. Validaciones de fechas no futuras y consistencia inicio/fin.
4. Persistencia relacionada en tabla `sys_empleado_provision_aguinaldo`.

Documentacin especfica:

- `docs/30-HistorialLaboralEmpleado.md`

Estndar de moneda obligatorio para este flujo:

- `docs/29-EstandarFormatoMoneda.md`
- `docs/31-CifradoIdentidadYProvisionamiento.md`

Validacin de formularios (texto, email, anti-SQL):

- `docs/31-ValidacionFormulariosFrontend.md`

**Reglas de validacin aplicadas:** textRules, emailRules, optionalNoSqlInjection en campos de texto. Salario base: mayor a 0 (valor por defecto 0; al crear debe indicar error si es 0). Comportamiento de tabs y bitcora: ver seccin **UX  Modales de Empleado (Tabs y Bitcora)** ms abajo.

### Backend  Ya existe, verificar y ajustar

| Componente | Estado | Accin |
|-----------|--------|--------|
| Entity (`employee.entity.ts`) |  Completo (33 columnas) | Verificar que mapea 1:1 con BD |
| DTOs (`create-employee.dto.ts`, `update-employee.dto.ts`) |  Existe | Verificar validaciones completas |
| Service (`employees.service.ts`) |  Existe | Verificar: paginacin, filtros, includeInactive + encriptacin |
| Controller (`employees.controller.ts`) |  Existe | Verificar: @RequirePermissions en cada endpoint |
| Workflow (`employee-creation.workflow.ts`) |  Existe | Verificar: ACID funciona con BD real |
| Catlogos (departamentos, puestos, periodos pago) |  Tablas + seed | Verificar: endpoints de consulta disponibles |

---

## FASE A  Backend: Verificacin y Ajustes (Primero)

Antes de tocar el frontend, el backend debe estar devolviendo datos reales correctamente.

### A.1  Verificar Endpoints Existentes

Probar con Postman/Insomnia (o curl) cada endpoint. Todos requieren cookie de sesin.

| # | Test | Endpoint | Esperado |
|---|------|----------|----------|
| 1 | Login | `POST /api/auth/login` | Cookie + user data |
| 2 | Sesin | `GET /api/auth/me?companyId=1&appCode=kpital` | User + permissions + companies |
| 3 | Listar empleados | `GET /api/employees?idEmpresa=1` | Array (puede estar vaco) |
| 4 | Listar con inactivos | `GET /api/employees?idEmpresa=1&includeInactive=true` | Array incluyendo inactivos |
| 5 | Crear empleado (sin acceso) | `POST /api/employees` con body mnimo | 201 + empleado creado |
| 6 | Crear empleado (con acceso TW) | `POST /api/employees` con `crearAccesoTimewise=true` y `idRolTimewise` | 201 + empleado + usuario + app + rol asignados |
| 7 | Detalle | `GET /api/employees/:id` | Empleado con relaciones (departamento, puesto, periodo pago) |
| 8 | Actualizar | `PUT /api/employees/:id` | 200 + empleado actualizado |
| 9 | Inactivar | `PATCH /api/employees/:id/inactivate` | 200 + estado=0 |
| 10 | Liquidar | `PATCH /api/employees/:id/liquidar` | 200 + estado cambiado + fecha_salida |
| 11 | Sin permiso | Intentar crear sin `employee:create` | 403 Forbidden |

**Si algn test falla  arreglar antes de seguir al frontend.**

### A.1.1  Crear empleado con acceso a KPITAL (sin nombres)

Cuando `crearAccesoKpital=true` en `POST /api/employees`, el backend ejecuta el flujo transaccional completo:

1. **Usuario (`sys_usuarios`)**  
   - Se crea el usuario con `email` normalizado (lowercase + trim).  
   - `estado_usuario = 1` (activo).

2. **Acceso a app (`sys_usuario_app`)**  
   - Se asigna `id_app` correspondiente a `kpital`.

3. **Empresa de trabajo (`sys_usuario_empresa`)**  
   - Se asigna la empresa seleccionada en la creacin del empleado.

4. **Rol KPITAL (`sys_usuario_rol`)**  
   - Se asigna `idRolKpital` con `id_app=kpital` y `id_empresa` correspondiente.
   - Se asigna además el rol global en `sys_usuario_rol_global` para reflejarse en Gestión de Usuarios.

5. **Empleado (`sys_empleados`)**  
   - Se crea el empleado con `id_usuario` asociado y datos sensibles encriptados.

**Nota de visibilidad en Gestin de Usuarios:**  
La vista consulta `GET /api/users` con cache; al crear un empleado con acceso digital se invalida ese cache y el frontend dispara un refresh automtico, por lo que el usuario debe aparecer de inmediato.  
Esta visibilidad no depende del nombre del empleado, sino de la existencia en `sys_usuarios` y su asignacin a `kpital` + empresa.

### A.2  Endpoints de Catlogos (Necesarios para Formularios)

El formulario de crear/editar empleado necesita llenar selects con datos reales. Verificar o crear:

| Endpoint | Mtodo | Respuesta | Mdulo |
|----------|--------|-----------|--------|
| `/api/catalogs/departments` | GET | Array de departamentos activos (catalogo global) | employees o companies |
| `/api/catalogs/positions` | GET | Array de puestos activos | employees o companies |
| `/api/catalogs/pay-periods` | GET | Array de periodos de pago activos | payroll |
| `/api/catalogs/companies` | GET | Array de empresas del usuario | companies (ya existe) |

**Decisin:** Los catlogos pueden vivir en un controller dedicado (`CatalogsController`) o dentro del mdulo correspondiente. Lo importante es que existan y devuelvan datos.

**Regla:** Los selects del frontend NUNCA se llenan con datos hardcodeados. Siempre del backend. Los ENUMs (gnero, estado civil, tipo contrato, jornada, moneda) s pueden estar en el frontend como constantes porque son valores fijos definidos en el doc 19.

**Nota de seguridad (2026-02-22):** Estos tres endpoints de catalogos se exponen como globales y no requieren `idEmpresa` en query. En backend estan marcados con `@AllowWithoutCompany()` para evitar `403` por contexto de empresa en cargas de formulario.

### A.3  Respuesta del Listado: Formato Estndar

El endpoint `GET /api/employees?idEmpresa=N` debe devolver un formato paginado estndar que el frontend pueda consumir directamente con Ant Design Table:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20
}
```

Parmetros de query soportados:

| Param | Tipo | Default | Descripcin |
|-------|------|---------|-------------|
| `idEmpresa` | number | **requerido** | Empresa activa |
| `page` | number | 1 | Pgina actual |
| `pageSize` | number | 20 | Registros por pgina |
| `search` | string |  | Bsqueda por nombre, apellido, cdigo, cdula |
| `estado` | number | 1 (activos) | Filtrar por estado. `includeInactive=true` para todos |
| `idDepartamento` | number |  | Filtrar por departamento |
| `idPuesto` | number |  | Filtrar por puesto |
| `sort` | string | `nombre_empleado` | Campo de ordenamiento |
| `order` | string | `ASC` | Direccin: ASC o DESC |

### A.4  Respuesta del Detalle: Relaciones Incluidas

El endpoint `GET /api/employees/:id` debe devolver el empleado con sus relaciones resueltas (no solo IDs):

```json
{
  "id_empleado": 1,
  "codigo_empleado": "EMP-001",
  "nombre_empleado": "Juan",
  "apellido1_empleado": "Prez",
  "departamento": { "id_departamento": 3, "nombre_departamento": "Contabilidad" },
  "puesto": { "id_puesto": 7, "nombre_puesto": "Contador Senior" },
  "periodoPago": { "id_periodos_pago": 2, "nombre_periodo_pago": "Quincenal" },
  "supervisor": { "id_empleado": 5, "nombre_empleado": "Mara", "apellido1_empleado": "Lpez" },
  "tieneAccesoDigital": true,
  "estado_empleado": 1,
  ...
}
```

**Regla:** El frontend no hace JOINs. El backend devuelve datos ya resueltos. Los datos sensibles llegan desencriptados si el usuario tiene `employee:view`.

### A.5  Validacin Empresa al Crear Empleado (Multiempresa)

El empleado siempre requiere `idEmpresa` (sys_empleados.id_empresa es NOT NULL). El backend **NO confa en la UI**:

1. **CreateEmployeeDto:** `idEmpresa` obligatorio para creacin.
2. **EmployeesService.create(currentUser, dto):** Antes de crear, verificar acceso:
   - Query a `sys_usuario_empresa` donde `id_usuario = userId`, `id_empresa = dto.idEmpresa`, `estado_usuario_empresa = 1`.
   - Si no existe  `403 Forbidden`.
   - Si existe  proceder con creacin normal.

**Criterio de seguridad:** Esta validacin es obligatoria aunque el frontend filtre bien.

---

## FASE B  Frontend: Estructura de Archivos

### B.1  Archivos del Mdulo

```
src/
 pages/
    private/
        employees/
            EmployeesListPage.tsx        # Listado principal (abre modal de creacin)
            EmployeeDetailPage.tsx       # Detalle + edicin
            components/
               EmployeeCreateModal.tsx  # Modal de creacin (NO pgina separada); estilos en UsersManagementPage.module.css
               EmployeesTable.tsx       # Tabla Ant Design (recibe datos, no fetcha)
               EmployeeForm.tsx         # Formulario compartido (editar)
               EmployeeFilters.tsx      # Barra de filtros
               EmployeeStatusBadge.tsx  # Badge visual de estado
               EmployeeActions.tsx      # Botones de accin con modals
            constants/
                employee-enums.ts        # ENUMs locales

 queries/
    employees/
        keys.ts
        useEmployees.ts
        useEmployee.ts
        useCreateEmployee.ts             # NUEVO
        useUpdateEmployee.ts             # NUEVO
        useInactivateEmployee.ts         # NUEVO
        useLiquidateEmployee.ts          # NUEVO

 queries/
    catalogs/
        keys.ts                          # NUEVO
        useDepartments.ts                # NUEVO
        usePositions.ts                  # NUEVO
        usePayPeriods.ts                 # NUEVO
```

### B.2  Rutas en AppRouter

| Ruta | Componente | Guard | Permiso |
|------|-----------|-------|---------|
| `/employees` | `EmployeesListPage` | PrivateGuard | `employee:view` |
| `/employees/:id` | `EmployeeDetailPage` | PrivateGuard | `employee:view` |

**Nota:** No existe ruta `/employees/new`. La creacin se realiza desde un modal abierto desde el listado (botn "Nuevo Empleado").

---

## FASE C  Frontend: Implementacin por Vista

### C.1  Listado de Empleados (`EmployeesListPage.tsx`)

**Columnas:** Cdigo, Cdula, Nombre completo, Email, Departamento, Puesto, Estado, Acciones.

**Comportamientos:** Estado vaco, loading (Skeleton), error con reintentar, bsqueda con debounce 400ms, paginacin backend, botn crear solo con `employee:create`.

### C.2  Crear Empleado (`EmployeeCreateModal.tsx`)

**Ubicacin:** Modal que se abre desde `EmployeesListPage` al hacer clic en "Nuevo Empleado". No es una pgina separada.

**Secciones (tabs):** Informacin Personal, Informacin de Contacto, Informacin Laboral, Informacin Financiera, Autogestin, Histrico Laboral.

**Campo Empresa:**
- **Fuente:** `auth.companies` (viene en sesin `/auth/me`). No se usa endpoint nuevo.
- **Si `companies.length === 1`:** Mostrar `Input` deshabilitado con el nombre de la empresa. En submit enviar `idEmpresa = companies[0].id`.
- **Si `companies.length >= 2`:** Mostrar `Select` con esas empresas. Valor por defecto: empresa activa (Redux `activeCompany.company?.id`) si est en la lista; si no, `companies[0].id`. En submit enviar `idEmpresa = selectedCompanyId`. El cambio en el selector no afecta la empresa activa global.
- **Post-submit:** No cambiar empresa activa. Cerrar modal, invalidar lista y permanecer en el listado (empleados de la empresa activa).

**Selects del backend:** Departamento, Puesto, Periodo de Pago (catalogos globales, no filtrados por empresa en el request).  
**Regla de limpieza de BD:** Departamento, Puesto y Periodo de Pago **no se borran** en limpieza operativa porque son catlogos nicos de referencia (ver `docs/automatizaciones/11-limpieza-operativa-db.md`  se conservan `org_departamentos`, `org_puestos`, `nom_periodos_pago`).  
**ENUMs locales:** Gnero, Estado Civil, Tipo Contrato, Jornada, Moneda, Tiene Cnyuge.

**Al guardar:** Mutation POST  cerrar modal  invalidar lista  mostrar notificacin de xito.

### C.3  Detalle y Edicin (`EmployeeDetailPage.tsx`)

**Modos:** Vista (Descriptions) y Edicin (Form). Campos inmutables: id_empleado, id_empresa, codigo_empleado. Modals: Inactivar (motivo), Liquidar (fecha salida + motivo), Reactivar.

---

## FASE D  Hooks de TanStack Query (Mutations)

| Hook | Mtodo | Endpoint |
|------|--------|----------|
| `useCreateEmployee` | POST | `/api/employees` |
| `useUpdateEmployee` | PUT | `/api/employees/:id` |
| `useInactivateEmployee` | PATCH | `/api/employees/:id/inactivate` |
| `useLiquidateEmployee` | PATCH | `/api/employees/:id/liquidar` |

---

## FASE E  Reglas de UX Enterprise

| Permiso | Efecto en UI |
|---------|--------------|
| `employee:view` | Puede ver listado y detalle (backend enva datos desencriptados) |
| `employee:create` | Ve botn "+ Nuevo Empleado" y ruta `/employees/new` |
| `employee:edit` | Ve botones Editar, Inactivar, Liquidar |
| Sin permiso | Men no muestra Empleados. URL directa  redirect dashboard |

### UX  Modales de Empleado (Tabs y Bitcora)

**Objetivo:** Documentar cmo se manejan los tabs y la bitcora en los modales de Crear y Editar empleado para mantener consistencia y evitar regresiones.

#### Tabs en los modales

- **Componentes afectados:** `EmployeeCreateModal`, `EmployeeEditModal`.
- **Clase CSS:** `employeeModalTabsScroll` (junto con `tabsWrapper`, `companyModalTabs`) en `UsersManagementPage.module.css`.
- **Comportamiento:**
  - **Wrap a dos lneas:** Los tabs **no** usan scroll horizontal. La lista de tabs tiene `flex-wrap: wrap`: si no caben en una sola fila, pasan a una segunda lnea. As **todos los tabs estn siempre visibles** y no se pierden al navegar.
  - No se usa scroll programtico ni `scrollIntoView`. El `onChange` del `Tabs` solo actualiza el estado (`setActiveTabKey`).
  - No hay flechas de overflow ni dropdown "ms"; al hacer wrap, no hay overflow.
- **Tabs en Crear:** Informacin Personal, Informacin de Contacto, Informacin Laboral, Informacin Financiera, Autogestin, Histrico Laboral.
- **Tabs en Editar:** Los mismos anteriores ms **Bitcora** (tab independiente, al mismo nivel que Histrico Laboral). El tab Bitcora solo se muestra cuando hay `employeeId` (empleado cargado).

#### Bitcora (solo modal Editar)

- **Ubicacin:** Tab propio **"Bitcora"**, a la par de "Histrico Laboral" (no dentro de l).
- **Permiso:** `config:employees:audit`. Si el usuario no tiene el permiso, el tab se muestra igual pero el contenido es el mensaje: "No tiene permiso para ver la bitcora de este empleado."
- **Contenido:** Tabla con historial de cambios del empleado (quin, cundo, accin, detalle). Carga **diferida**: los datos se piden al abrir el tab Bitcora (`GET /employees/:id/audit-trail`).
- **Backend:** Permiso insertado/asignado por migracin `1708534500000-AddEmployeeAuditPermission.ts` (roles MASTER, ADMIN_SISTEMA). Endpoint protegido con `@RequirePermissions('config:employees:audit')`.

#### Resumen de reglas para implementacin

| Tema | Regla |
|------|--------|
| Tabs | Wrap en 2 lneas; sin scroll horizontal; sin ref ni scroll programtico en los modales. |
| Bitcora | Tab separado en Editar; visible siempre (con mensaje si no hay permiso); carga al abrir el tab. |
| Estilos | `employeeModalTabsScroll` con `overflow: visible`, `flex-wrap: wrap` en la lista de tabs. |

---

## FASE F  Orden de Ejecucin (Sprints)

**Sprint 1  Backend:** Verificar endpoints, paginacin, filtros, catlogos, @RequirePermissions, **encriptacin/desencriptacin**.  
**Sprint 2  Listado:** Rutas, EmployeesListPage, tabla, filtros, paginacin, estados.  
**Sprint 3  Crear:** EmployeeForm, hooks catlogos, mutation crear, validaciones, acceso digital.  
**Sprint 4  Detalle + Edicin:** Vista/edicin, mutations update/inactivate/liquidate, modals.  
**Sprint 5  Pulido:** Flujo end-to-end, permisos, cambio empresa, CSRF.

---

## Base de Datos  Seed para Pruebas Multiempresa

Para probar el selector de empresa y la validacin 403:

1. **Insertar 4 empresas nuevas:** Beta, Gamma, Delta, Omega (prefijos EB, EG, ED, EO).
2. **Asignar solo 2 (EB, EG) al usuario admin** en `sys_usuario_empresa`.

Migracin: `1708532300000-SeedEmpresasMultiempresaPrueba.ts`.

---

## Pruebas QA (Multiempresa)

1. Loguearse con el admin.
2. Confirmar `auth.companies.length >= 2`.
3. Abrir "Crear Empleado": debe aparecer **Select** con solo empresas asignadas (demo + EB + EG). Valor por defecto = empresa activa.
4. Crear empleado en EB sin cambiar empresa activa: debe crear OK. Volver al listado y seguir viendo empleados de la empresa activa.
5. Probar request manual (Postman/DevTools) con `idEmpresa` de empresa no asignada (ej. ED): debe responder **403 Forbidden**.
6. Probar `GET /api/catalogs/departments` sin `idEmpresa`: debe responder **200** si existe sesion y permiso `employee:view`.

---

## Lo Que NO Se Hace en Este Mdulo

 Importacin masiva  
 CRUD de departamentos/puestos (solo selects)  
 Reportes ni exportacin Excel  
 Optimizacin mobile (desktop 1280px+)

---

## Conexin con Documentos Anteriores

| Documento | Conexin |
|-----------|----------|
| 19-RedefinicionEmpleadoEnterprise | Entity 33 columnas, ENUMs, FKs |
| 18-IdentityCoreEnterprise | @RequirePermissions, JwtAuthGuard |
| 16-CreacionEmpleadoConAcceso | Workflow ACID, seccin Acceso Digital |
| 22-AuthReport | CSRF, guards |

---

*Este mdulo es el punto de inflexin del proyecto. Pasa de "arquitectura documentada" a "sistema funcional".*

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
