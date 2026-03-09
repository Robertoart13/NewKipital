# KPITAL 360  Directivas de Configuracin Backend

**Documento:** 11
**Para:** Ingeniero Backend
**De:** Roberto  Arquitecto Funcional / Senior Engineer
**Prerrequisito:** Haber ledo [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) + [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md)
**Prioridad:** Ejecutar en orden. No saltar pasos.

---

## Principio Fundamental

El backend de KPITAL 360 no es un monolito desordenado de controllers. Es una **API modular organizada por bounded contexts**, donde cada dominio tiene su propia carpeta con su mdulo, controller, service y repository. La estructura debe estar lista para recibir entidades, stored procedures, eventos de dominio y endpoints sin refactorear.

Hoy solo vas a configurar. No vas a crear tablas. No vas a crear endpoints de negocio. Vas a dejar el esqueleto limpio, conectado a MySQL, con el bus de eventos preparado, y organizado para que cuando lleguen las entidades sea solo agregarlas.

---

## Stack del Backend

| Tecnologa | Propsito |
|---|---|
| **NestJS** | Framework backend (ya existe scaffolding bsico) |
| **TypeORM** | ORM para CRUD simple, entidades, migraciones |
| **MySQL** (Workbench / RDS) | Base de datos relacional |
| **class-validator + class-transformer** | Validacin de DTOs |
| **@nestjs/config** | Variables de entorno |
| **@nestjs/jwt + @nestjs/passport + passport-jwt** | Autenticacin JWT (configurar, no implementar flujo an) |
| **bcrypt** | Hash de contraseas (instalar, no usar an) |
| **@nestjs/event-emitter** | Bus de eventos de dominio (sncrono local hoy, reemplazable por Redis/RMQ en Fase 2) |

---

## Decisin Arquitectnica: ORM + Stored Procedures (Hbrido)

No es uno u otro. Son complementarios con boundaries claras.

| Tipo de operacin | Herramienta | Ejemplo |
|---|---|---|
| CRUD simple (crear, editar, listar, filtrar) | TypeORM (entities, repositories, QueryBuilder) | Empleados, empresas, usuarios, roles |
| Lgica de negocio compleja, masiva o ACID | Stored Procedures (llamados via `query()`) | Generar planilla, aplicar planilla, reclculo masivo, movimiento entre empresas |
| Validaciones de entrada | DTOs + class-validator | Validar que un email sea vlido, que un monto sea positivo |
| Auditora automtica | Triggers en MySQL | Registrar quin modific qu, cundo |
| Migraciones de esquema | TypeORM migrations | Crear/modificar tablas de forma versionada |
| Comunicacin entre bounded contexts | EventBus (domain events) | PayrollApplied  Integration Layer, EmployeeMoved  Personal Actions |

> **Regla:** Los stored procedures se versionan en una carpeta dedicada dentro del proyecto. No se crean "a mano" en Workbench sin registro.

---

## Decisin Arquitectnica: Bus de Eventos de Dominio

El documento 01-EnfoqueSistema define que KPITAL 360 es un sistema **event-driven**. El backend debe tener desde el da 1 el slot donde viven los eventos, aunque hoy no se usen.

### Cmo funciona hoy (Fase 1)

- El EventBus usa `@nestjs/event-emitter` internamente.
- Es **sncrono y local**  todo ocurre dentro del mismo proceso Node.
- Un servicio emite un evento  los listeners del mismo proceso lo reciben.
- No hay cola, no hay Redis, no hay infraestructura externa.

### Cmo funcionar maana (Fase 2)

- Se reemplaza el transporte interno por Redis o RabbitMQ.
- **Los mdulos que emiten eventos no cambian.** Solo emiten al bus.
- **Los mdulos que escuchan eventos no cambian.** Solo reciben del bus.
- **Lo nico que cambia es el bus.** El transporte pasa de local a distribuido.

### Por qu configurarlo ahora

Si no dejs el slot ahora, cuando llegue Fase 2 vas a tener lgica de negocio acoplada entre mdulos (Service A llama directamente a Service B). Desacoplar eso despus es un refactor doloroso. Dejarlo preparado hoy es una carpeta y una interfaz. Costo: 15 minutos. Ahorro futuro: semanas.

---

## Pasos 112

Ver el documento completo para el detalle de cada paso. Resumen:

1. Instalar dependencias (TypeORM, mysql2, config, jwt, passport, bcrypt, class-validator, event-emitter)
2. Variables de entorno (.env + .env.example + ConfigModule)
3. Configurar TypeORM con MySQL (synchronize: false)
4. Crear base de datos kpital360 en MySQL Workbench
5. Estructura de carpetas por bounded context (7 mdulos)
6. Bus de eventos (interfaz base + catlogo + interfaces por mdulo)
7. main.ts (CORS, ValidationPipe, prefijo /api)
8. AppModule con todos los imports
9. Mdulos placeholder con health checks
10. TypeORM CLI para migraciones
11. Carpeta stored procedures + README convenciones
12. Verificar conexin (10 puntos de verificacin)

---

## Lo Que NO Se Hace en Este Paso

- No crear tablas. Solo la base de datos vaca.
- No crear entidades TypeORM. Las carpetas entities/ quedan vacas.
- No crear DTOs. Las carpetas dto/ quedan vacas.
- No implementar autenticacin JWT. Solo instalar y estructurar.
- No crear stored procedures. Solo la carpeta con convenciones.
- No implementar emisin/escucha de eventos. Solo interfaces y catlogo.
- No conectar frontend al backend. Solo verificar CORS con health check.

---

## Qu Queda Listo Despus de Este Paso

- NestJS conectado a MySQL (kpital360 database)
- TypeORM configurado con synchronize: false y migraciones
- Variables de entorno organizadas (.env + .env.example)
- 7 mdulos por bounded context registrados y respondiendo
- Bus de eventos configurado y listo para usar
- Interfaz base de domain events definida
- Catlogo de nombres de eventos centralizado
- Interfaces de eventos por mdulo definidas
- CORS habilitado para el frontend
- ValidationPipe global activo
- Prefijo /api en todas las rutas
- CLI de TypeORM configurado para migraciones
- Carpeta de stored procedures con convenciones

---

## Conexin con Documentos Anteriores

| Documento | Conexin |
|---|---|
| **01-EnfoqueSistema** | Los 7 mdulos mapean a los 6 bounded contexts + auth. Los eventos vienen de Seccin 2.1. |
| **02-ScaffoldingProyecto** | El API NestJS pasa de scaffolding bsico a estructura enterprise |
| **03/04-StateManagement** | Los hooks de TanStack del frontend apuntarn a /api/{modulo}/ |
| **10-SeparacionLoginDashboard** | El endpoint /api/auth/login es el que el frontend necesita para sacar los mocks |

---

## Estado Actual Implementado (Empresas y Permisos)

### Mdulo Empresas (API)

Controlador: `api/src/modules/companies/companies.controller.ts`

Endpoints protegidos:
- `POST /api/companies`  `company:create`
- `GET /api/companies`  `company:view` (query: `?inactiveOnly=true` para listar solo inactivas; sin param lista solo activas)
- `GET /api/companies/:id`  `company:view`
- `PUT /api/companies/:id`  `company:edit`
- `PATCH /api/companies/:id/inactivate`  `company:inactivate`
- `PATCH /api/companies/:id/reactivate`  `company:reactivate`
- `POST /api/companies/logo/temp`  carga temporal de logo (imagen)
- `POST /api/companies/:id/logo/commit`  confirmacin de logo final por `idEmpresa`
- `GET /api/companies/:id/logo`  stream de logo actual o imagen por defecto

Validaciones de logo activas:
- Solo tipos imagen permitidos.
- Tamao maximo 5MB.
- Al confirmar (`commit`) se renombra y guarda por `idEmpresa` en `uploads/logoEmpresa/`.

### Compatibilidad Legacy de Permisos

Guard: `api/src/common/guards/permissions.guard.ts`

Regla activa:
- Si el endpoint requiere `company:*` y el usuario tiene `company:manage`, se autoriza por compatibilidad.
- Objetivo: no romper ambientes o roles legacy mientras se migra a granularidad.

### Migracin de Catlogo de Permisos

Migracin: `api/src/database/migrations/1708533400000-SyncPermissionCatalogAndCompanyGranular.ts`

Objetivo:
- Sincronizar catlogo de permisos enterprise actual.
- Insertar permisos granulares de empresas (`company:view`, `company:create`, `company:edit`, `company:inactivate`, `company:reactivate`).
- Mantener `company:manage` (legacy).
- Asignar permisos de empresa a `MASTER`, `ADMIN_SISTEMA` y a roles que ya tenan `company:manage`.

### Nota Operativa

Si una BD ya existente no refleja estos permisos, ejecutar migraciones pendientes o aplicar el seed idempotente equivalente antes de validar UI.

---

*Este documento es el paso 1 del backend. Se configura, se organiza, se prepara el bus de eventos, se verifica conexin, y se deja listo.*

---

## Estandar de encoding Backend (obligatorio)

- Todos los archivos de pi/src deben guardarse en UTF-8 sin BOM.
- No se permiten mensajes de error con mojibake (C, , , , etc.).
- Para mensajes operativos y de negocio, priorizar texto estable y legible en cualquier entorno.
- Antes de release, ejecutar barrido de caracteres corruptos en pi/src.

---

## Auditoria operacional asincrona (nuevo)

Implementacion enterprise agregada para acciones de configuracion sin bloquear el flujo del usuario:

- Tabla dedicada: sys_auditoria_acciones (migration 1708533500000-CreateSysAuditoriaAcciones.ts).
- Outbox existente: sys_domain_events.
- Publicador: AuditOutboxService publica eventos udit.*.
- Worker: AuditWorkerService consume eventos ggregate_type='audit' en segundo plano y persiste en sys_auditoria_acciones.

Principios:

- El request principal NO espera la escritura final de bitacora.
- Si falla auditoria, no rompe la operacion de negocio.
- Se registra actor, entidad, accion, descripcion y payload before/after en JSON.

### Actualizacion 2026-02-24

- Permiso nuevo de configuracion para auditoria de empresas:
  - `config:companies:audit`
  - Migracion: `1708533600000-AddCompanyAuditPermission.ts`
- Endpoint nuevo:
  - `GET /api/companies/:id/audit-trail?limit=N`
  - Requiere `config:companies:audit` y valida acceso por empresa asignada.
- Endpoint de bitacora de usuario ya operativo:
  - `GET /api/config/users/:id/audit-trail?limit=N`

### Estndar de mensajes de bitcora (2026-02-23)

Los mensajes de auditora deben ser **autosuficientes** y **legibles** para RRHH, TI y directivos. Inspirado en NetSuite.

| Regla | Descripcin |
|-------|-------------|
| Incluir antes/despus | En operaciones de reemplazo (empresas, roles, permisos), siempre incluir estado anterior y estado nuevo en `descripcion` y en `payloadBefore`/`payloadAfter`. |
| Lenguaje humano | No usar cdigos tcnicos en la descripcin legible. Usar etiquetas como "Asignacin de empresas modificada" en lugar de "replace_companies". |
| Verbos claros | Usar "modificada", "asignada", "revocada", "actualizada". Evitar jerga tcnica. |
| Formato descripcion | `{Accin} para {afectado}. Antes: {estado anterior}. Despus: {estado nuevo}.` |
| payloadBefore/payloadAfter | Siempre enviar ambos en operaciones de reemplazo para auditora tcnica. |

**Ejemplo correcto:**
```
descripcion: "Asignacin de empresas modificada para Ana Mara Garca Lpez (ID 2). Antes: Empresa test 1. Despus: Rocca Master Company, Rocca Subsidiaria, Empresa test 2."
payloadBefore: { idUsuario, companyIds: [...] }
payloadAfter: { idUsuario, companyIds: [...] }
```

**Mapeo modulo+accion  etiqueta legible (frontend):** Ver `UsersManagementPage.tsx` funcin `getAuditActionLabel()`.

---

## Cache API (nuevo  2026-03-04)

Se implement un cache empresarial con TTL fijo de **5 minutos** y **invalida automticamente** cuando hay cambios (POST/PUT/PATCH/DELETE).  
Objetivo: acelerar listados y catlogos sin perder consistencia.

### Comportamiento

- **TTL**: 5 minutos.
- **Justificacin TTL**: los datos cacheados son catlogos/listados administrativos; la consistencia real depende de invalidacin en mutaciones, no del tiempo.
- **Invalidacin**: cualquier cambio en el mismo `scope` invalida el cache.
- **Keying**: considera `url`, `params`, `query` y `userId` (evita fugas de datos entre usuarios).
- **Scope por empresa**: el cache se segmenta por `idEmpresa/companyId` para evitar invalidaciones globales.
- **Invalidacin por body**: en POST/PUT/PATCH/DELETE se detecta `idEmpresa` tambin en `body` para invalidar el scope correcto cuando el endpoint no usa query params.
- **Normalizacin de query**: solo parmetros allowlist por scope + orden determinstico.  
  Ejemplo planilla (`scope=payroll`): `idEmpresa`, `includeInactive`, `inactiveOnly`, `fechaDesde`, `fechaHasta`, `estado`, `page`, `size`, `sort`.
- **User scope**: `userId` solo en endpoints con payload dependiente del usuario (ej: `notifications`) para maximizar hit-rate sin comprometer seguridad.
- **Fallback**: si no hay Redis, usa memoria local del API.

### Redis (opcional recomendado)

Si `REDIS_HOST` est configurado, el cache es **compartido** entre instancias (enterprise).  
Si no, el cache es **por instancia** (dev / single node).

Env vars:
- `REDIS_HOST`
- `REDIS_PORT` (default 6379)
- `REDIS_PASSWORD` (opcional)
- `CACHE_STRICT_REDIS` (true/false). Si `true`, falla si Redis cae (modo enterprise estricto).
- `CACHE_ENV_PREFIX` (prod/stg).
- `CACHE_KEY_VERSION` (v1/v2).
- `CACHE_REDIS_TIMEOUT_MS` (default 75ms).
- `CACHE_BREAKER_THRESHOLD` (default 5).
- `CACHE_BREAKER_RESET_MS` (default 10000ms).
- `CACHE_SWR_ENABLED` (default true).

### Scopes activos (ejemplos)

- `personal-actions`
- `companies`
- `employees`
- `catalogs`
- `payroll`, `payroll-articles`, `payroll-movements`, `payroll-holidays`
- `roles`, `permissions`, `apps`, `user-assignments`, `config`
- `notifications`
- `users`

### Excepciones (no cachear)

Por seguridad y frescura de datos **NO se cachean**:
- `auth` (tokens, login, refresh)
- `health` (estado vivo)
- `ops/queues` (colas en tiempo real)

### Protecciones enterprise agregadas

- **Circuit breaker**: si Redis falla repetidamente, se bypass el cache por una ventana corta.
- **Stampede protection**: lock por key (Redis) + espera corta o stale-while-revalidate.
- **Mtricas internas**: hit/miss/set/error/invalidation/bypass/breaker (ver `GET /api/ops/queues/cache-metrics`).
- **Degradacin segura**: si Redis cae o el breaker se abre, el sistema contina sin cache.

### Infra requerida para 100% enterprise (pendiente operativo)

- **Redis HA** (Cluster/Sentinel/Managed service) habilitado en prod.
- **Eviction policy** definida y documentada (recomendado `allkeys-lfu`) + `maxmemory`.
- **Observabilidad externa**: exportar mtricas a Prometheus/Grafana (hit/miss/error/breaker/latencia).

### Actualizacion cache (2026-03-08) - Refresco forzado en Planillas

- Se confirma regla: toda mutacion (`POST/PUT/PATCH/DELETE`) invalida cache del scope correspondiente.
- Se agrega soporte de `cb` (cache-buster) en la key de cache para GET cuando frontend requiere lectura fresca inmediata.
- Regla UX: boton `Refrescar` debe ejecutar `bustApiCache()` y luego recargar el listado para evitar estado visual stale.

