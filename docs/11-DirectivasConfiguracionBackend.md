# KPITAL 360 — Directivas de Configuración Backend

**Documento:** 11
**Para:** Ingeniero Backend
**De:** Roberto — Arquitecto Funcional / Senior Engineer
**Prerrequisito:** Haber leído [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) + [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md)
**Prioridad:** Ejecutar en orden. No saltar pasos.

---

## Principio Fundamental

El backend de KPITAL 360 no es un monolito desordenado de controllers. Es una **API modular organizada por bounded contexts**, donde cada dominio tiene su propia carpeta con su módulo, controller, service y repository. La estructura debe estar lista para recibir entidades, stored procedures, eventos de dominio y endpoints sin refactorear.

Hoy solo vas a configurar. No vas a crear tablas. No vas a crear endpoints de negocio. Vas a dejar el esqueleto limpio, conectado a MySQL, con el bus de eventos preparado, y organizado para que cuando lleguen las entidades sea solo agregarlas.

---

## Stack del Backend

| Tecnología | Propósito |
|---|---|
| **NestJS** | Framework backend (ya existe scaffolding básico) |
| **TypeORM** | ORM para CRUD simple, entidades, migraciones |
| **MySQL** (Workbench / RDS) | Base de datos relacional |
| **class-validator + class-transformer** | Validación de DTOs |
| **@nestjs/config** | Variables de entorno |
| **@nestjs/jwt + @nestjs/passport + passport-jwt** | Autenticación JWT (configurar, no implementar flujo aún) |
| **bcrypt** | Hash de contraseñas (instalar, no usar aún) |
| **@nestjs/event-emitter** | Bus de eventos de dominio (síncrono local hoy, reemplazable por Redis/RMQ en Fase 2) |

---

## Decisión Arquitectónica: ORM + Stored Procedures (Híbrido)

No es uno u otro. Son complementarios con boundaries claras.

| Tipo de operación | Herramienta | Ejemplo |
|---|---|---|
| CRUD simple (crear, editar, listar, filtrar) | TypeORM (entities, repositories, QueryBuilder) | Empleados, empresas, usuarios, roles |
| Lógica de negocio compleja, masiva o ACID | Stored Procedures (llamados via `query()`) | Generar planilla, aplicar planilla, recálculo masivo, movimiento entre empresas |
| Validaciones de entrada | DTOs + class-validator | Validar que un email sea válido, que un monto sea positivo |
| Auditoría automática | Triggers en MySQL | Registrar quién modificó qué, cuándo |
| Migraciones de esquema | TypeORM migrations | Crear/modificar tablas de forma versionada |
| Comunicación entre bounded contexts | EventBus (domain events) | PayrollApplied → Integration Layer, EmployeeMoved → Personal Actions |

> **Regla:** Los stored procedures se versionan en una carpeta dedicada dentro del proyecto. No se crean "a mano" en Workbench sin registro.

---

## Decisión Arquitectónica: Bus de Eventos de Dominio

El documento 01-EnfoqueSistema define que KPITAL 360 es un sistema **event-driven**. El backend debe tener desde el día 1 el slot donde viven los eventos, aunque hoy no se usen.

### Cómo funciona hoy (Fase 1)

- El EventBus usa `@nestjs/event-emitter` internamente.
- Es **síncrono y local** — todo ocurre dentro del mismo proceso Node.
- Un servicio emite un evento → los listeners del mismo proceso lo reciben.
- No hay cola, no hay Redis, no hay infraestructura externa.

### Cómo funcionará mañana (Fase 2)

- Se reemplaza el transporte interno por Redis o RabbitMQ.
- **Los módulos que emiten eventos no cambian.** Solo emiten al bus.
- **Los módulos que escuchan eventos no cambian.** Solo reciben del bus.
- **Lo único que cambia es el bus.** El transporte pasa de local a distribuido.

### Por qué configurarlo ahora

Si no dejás el slot ahora, cuando llegue Fase 2 vas a tener lógica de negocio acoplada entre módulos (Service A llama directamente a Service B). Desacoplar eso después es un refactor doloroso. Dejarlo preparado hoy es una carpeta y una interfaz. Costo: 15 minutos. Ahorro futuro: semanas.

---

## Pasos 1–12

Ver el documento completo para el detalle de cada paso. Resumen:

1. Instalar dependencias (TypeORM, mysql2, config, jwt, passport, bcrypt, class-validator, event-emitter)
2. Variables de entorno (.env + .env.example + ConfigModule)
3. Configurar TypeORM con MySQL (synchronize: false)
4. Crear base de datos kpital360 en MySQL Workbench
5. Estructura de carpetas por bounded context (7 módulos)
6. Bus de eventos (interfaz base + catálogo + interfaces por módulo)
7. main.ts (CORS, ValidationPipe, prefijo /api)
8. AppModule con todos los imports
9. Módulos placeholder con health checks
10. TypeORM CLI para migraciones
11. Carpeta stored procedures + README convenciones
12. Verificar conexión (10 puntos de verificación)

---

## Lo Que NO Se Hace en Este Paso

- No crear tablas. Solo la base de datos vacía.
- No crear entidades TypeORM. Las carpetas entities/ quedan vacías.
- No crear DTOs. Las carpetas dto/ quedan vacías.
- No implementar autenticación JWT. Solo instalar y estructurar.
- No crear stored procedures. Solo la carpeta con convenciones.
- No implementar emisión/escucha de eventos. Solo interfaces y catálogo.
- No conectar frontend al backend. Solo verificar CORS con health check.

---

## Qué Queda Listo Después de Este Paso

- NestJS conectado a MySQL (kpital360 database)
- TypeORM configurado con synchronize: false y migraciones
- Variables de entorno organizadas (.env + .env.example)
- 7 módulos por bounded context registrados y respondiendo
- Bus de eventos configurado y listo para usar
- Interfaz base de domain events definida
- Catálogo de nombres de eventos centralizado
- Interfaces de eventos por módulo definidas
- CORS habilitado para el frontend
- ValidationPipe global activo
- Prefijo /api en todas las rutas
- CLI de TypeORM configurado para migraciones
- Carpeta de stored procedures con convenciones

---

## Conexión con Documentos Anteriores

| Documento | Conexión |
|---|---|
| **01-EnfoqueSistema** | Los 7 módulos mapean a los 6 bounded contexts + auth. Los eventos vienen de Sección 2.1. |
| **02-ScaffoldingProyecto** | El API NestJS pasa de scaffolding básico a estructura enterprise |
| **03/04-StateManagement** | Los hooks de TanStack del frontend apuntarán a /api/{modulo}/ |
| **10-SeparacionLoginDashboard** | El endpoint /api/auth/login es el que el frontend necesita para sacar los mocks |

---

*Este documento es el paso 1 del backend. Se configura, se organiza, se prepara el bus de eventos, se verifica conexión, y se deja listo.*
