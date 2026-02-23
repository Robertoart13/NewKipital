# DIRECTIVA 17 — Estándar de Workflows Enterprise

## Objetivo

Definir una estructura formal para todos los flujos de trabajo del sistema, evitando:

- Lógica mezclada en services
- Condicionales escondidos en controllers
- Efectos secundarios invisibles
- Acoplamiento entre módulos

---

## Principio Arquitectónico

Un workflow:

- **Orquesta** acciones entre múltiples módulos
- **Reacciona** a eventos del dominio
- **No contiene** lógica de negocio primaria
- **No reemplaza** services
- **No accede** directamente a la base de datos sin justificación (excepto transacciones ACID)

> Un workflow es **ORQUESTADOR**, no **EJECUTOR**.

---

## Estructura de Carpetas

```
src/
└── workflows/
    ├── common/
    │   ├── workflow.interface.ts    ← Contrato base (WorkflowResult)
    │   └── index.ts
    ├── employees/
    │   ├── employee-creation.workflow.ts
    │   └── index.ts
    ├── identity/
    │   ├── identity-sync.workflow.ts
    │   └── index.ts
    └── workflows.module.ts          ← Módulo NestJS que registra todos
```

---

## Convenciones Obligatorias

### Nombres

Formato: `{dominio}-{accion}.workflow.ts`

Ejemplos:
- `employee-creation.workflow.ts`
- `identity-sync.workflow.ts`
- `payroll-apply.workflow.ts`
- `role-assignment.workflow.ts`

### Responsabilidades

Un workflow **DEBE:**
- Recibir un evento o ser invocado por un service
- Validar reglas de orquestación
- Llamar a servicios o usar EntityManager (para ACID)
- Manejar transacciones si aplica
- Registrar auditoría
- Disparar nuevos eventos post-commit

Un workflow **NO DEBE:**
- Tener validaciones de DTO
- Tomar decisiones de negocio internas del dominio
- Ser llamado directamente por controllers

---

## Separación de Responsabilidades

| Capa | Responsabilidad |
|------|----------------|
| **Controller** | Recibe request, valida DTO |
| **Service** | Lógica de negocio del dominio |
| **EventBus** | Publica evento |
| **Workflow** | Orquesta acciones cruzadas |
| **Repository** | Persistencia |

**Nunca mezclar.**

---

## Workflows Implementados

### 1. EmployeeCreationWorkflow

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Crear empleado + usuario + asignaciones en transacción ACID |
| **Disparado por** | `EmployeesService.create()` (cuando `crearAccesoTimewise/Kpital = true`) |
| **Servicios/Repos** | Usa `queryRunner.manager` directamente (ACID requiere una sola conexión) |
| **Eventos emitidos** | `employee.created` (post-commit) |
| **Fallos** | Email duplicado, app no encontrada → rollback total |

### 2. IdentitySyncWorkflow

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Sincronizar email de empleado con login de usuario |
| **Disparado por** | Evento `employee.email_changed` |
| **Servicios/Repos** | `Repository<User>` (operación simple, no requiere multi-tabla) |
| **Eventos emitidos** | `identity.login_updated` |
| **Fallos** | Email ya existe en sys_usuarios → log de error, no actualiza |

---

## Regla de Oro

Si una acción afecta:

- Más de un módulo
- Más de una tabla root
- Más de un bounded context

→ **Debe ser workflow.**

Si afecta solo su propio dominio → es lógica de **service**.

---

## Reglas de Seguridad

- Todo workflow debe dejar **auditoría**
- Todo cambio de identidad **invalida sesión** (futuro)
- Todo cambio cross-domain debe ser **transaccional**
- Si falla una parte crítica → **rollback completo**
- No puede existir **estado inconsistente**

---

## Interacción con Event Bus

```
Service ejecuta operación
       ↓
Service emite evento (DOMAIN_EVENTS.*)
       ↓
Workflow escucha @OnEvent()
       ↓
Workflow orquesta acciones cross-domain
       ↓
Workflow emite nuevos eventos (post-commit)
```

---

## Estado después de esta directiva

| Componente | Estado |
|-----------|--------|
| Empresa root | ✅ |
| Usuarios enterprise | ✅ |
| Empleados con acceso | ✅ |
| Identidad sincronizable | ✅ |
| Estructura workflow | ✅ |
