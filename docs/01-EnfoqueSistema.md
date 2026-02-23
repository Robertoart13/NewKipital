# KPITAL 360 — DOCUMENTO DE VISIÓN ARQUITECTÓNICA ENTERPRISE

**Versión 3.0**
**Fecha:** 2025-02-21
**Autor:** Roberto — Senior Full Stack Software Engineer / Functional Architect
**Estado:** Aprobado — Blueprint Arquitectónico Formal
**Clasificación:** Documento interno — Referencia arquitectónica

---

## Changelog

| Versión | Fecha       | Autor   | Descripción                                                                 |
|---------|-------------|---------|-----------------------------------------------------------------------------|
| 1.0     | —           | Roberto | Visión inicial: multiempresa, planillas, acciones de personal               |
| 2.0     | —           | Roberto | Consolidación: eventos, workflows, roles dinámicos, trazabilidad, escalabilidad |
| 3.0     | 2025-02-21  | Roberto | Blueprint formal: bounded contexts, mapa de dependencias, NFRs medibles, fases de implementación, estrategia de resiliencia, gobernanza documental |

---

## Gobernanza del Documento

- **Owner:** Roberto (Arquitecto Funcional / Senior Engineer)
- **Aprobadores de cambios:** Owner + Lead técnico del proyecto
- **Regla de versionado:**
  - **Patch (v3.0.x):** Correcciones menores, clarificaciones, typos
  - **Minor (v3.x.0):** Nuevos NFRs, ajustes a bounded contexts, nuevos contratos
  - **Major (vX.0.0):** Cambios de dominio, redefinición de fases, cambios estructurales
- **Frecuencia de revisión:** Al inicio de cada fase de implementación o cuando se identifique un cambio arquitectónico significativo
- **Formato de cambio:** Toda modificación debe documentarse en el Changelog y, si aplica, en el Decision Log (Sección 20)

---

## Tabla de Contenidos

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Principios Fundamentales](#2-principios-fundamentales)
3. [Fases de Implementación](#3-fases-de-implementación)
4. [Mapa de Dominios — Bounded Contexts](#4-mapa-de-dominios--bounded-contexts)
5. [Mapa de Dependencias (Upstream / Downstream)](#5-mapa-de-dependencias-upstream--downstream)
6. [Modelo Empresarial — Multiempresa](#6-modelo-empresarial--multiempresa)
7. [Planillas (Payroll Engine)](#7-planillas-payroll-engine)
8. [Acciones de Personal](#8-acciones-de-personal)
9. [Movimiento de Empleados entre Empresas](#9-movimiento-de-empleados-entre-empresas)
10. [Recálculo Automático](#10-recálculo-automático)
11. [Roles y Permisos Dinámicos](#11-roles-y-permisos-dinámicos)
12. [Menús Dinámicos Basados en Permisos](#12-menús-dinámicos-basados-en-permisos)
13. [Aprobaciones Jerárquicas](#13-aprobaciones-jerárquicas)
14. [Trazabilidad Total](#14-trazabilidad-total)
15. [Base de Datos Enterprise](#15-base-de-datos-enterprise)
16. [Non-Functional Requirements (NFRs)](#16-non-functional-requirements-nfrs)
17. [Estrategia de Resiliencia](#17-estrategia-de-resiliencia)
18. [KPITAL + TimeWise — Contrato de Integración](#18-kpital--timewise--contrato-de-integración)
19. [Integración Futura con NetSuite](#19-integración-futura-con-netsuite)
20. [Decision Log (ADR-Lite)](#20-decision-log-adr-lite)
21. [Qué NO Define Este Documento](#21-qué-no-define-este-documento)

---

## 1. Visión General del Sistema

KPITAL 360 es un **ERP de planillas multiempresa** diseñado para:

- **Autogestión empresarial completa** — el sistema responde automáticamente a cambios de negocio.
- **Automatización total de procesos** — sin dependencias manuales ocultas.
- **Workflows dinámicos basados en eventos** — todo cambio relevante genera un evento de dominio.
- **Trazabilidad absoluta** — toda operación es auditable.
- **Escalabilidad empresarial** — diseñado para crecer sin degradación.
- **Integración futura con sistemas externos** (NetSuite, herramientas corporativas).

El sistema debe comportarse como un **ERP corporativo moderno**:

- Multiempresa real con dominios aislados.
- Colaboración por roles (tipo GitHub).
- Separación clara de dominios (bounded contexts).
- Procesamiento asíncrono donde se requiera.
- Seguridad fuerte con doble validación.
- Sin dependencias manuales ocultas.

> **Principio rector:** Este sistema no es un CRUD de planillas. Es un motor de reglas empresariales automatizado. Un ERP real.

---

## 2. Principios Fundamentales

### 2.1 Arquitectura Basada en Eventos

Todo cambio relevante genera un **evento de dominio**.

**Eventos principales del sistema:**

| Dominio             | Evento                    | Descripción                                      |
|---------------------|---------------------------|--------------------------------------------------|
| Employee Management | `EmployeeCreated`         | Nuevo empleado registrado                        |
| Employee Management | `EmployeeMoved`           | Empleado transferido entre empresas              |
| Employee Management | `EmployeeDeactivated`     | Empleado desactivado                             |
| Personal Actions    | `PersonalActionCreated`   | Nueva acción de personal creada                  |
| Personal Actions    | `PersonalActionApproved`  | Acción aprobada por supervisor/RRHH              |
| Personal Actions    | `PersonalActionRejected`  | Acción rechazada                                 |
| Personal Actions    | `SalaryIncreased`         | Aumento salarial aplicado                        |
| Payroll Engine      | `PayrollOpened`           | Planilla abierta para periodo                    |
| Payroll Engine      | `PayrollVerified`         | Planilla verificada                              |
| Payroll Engine      | `PayrollApplied`          | Planilla aplicada (inmutable)                    |
| Payroll Engine      | `PayrollDeactivated`      | Planilla cancelada/inactivada                    |

Los eventos disparan **workflows automáticos**. Nada se recalcula manualmente. Nada depende de lógica dispersa.

### 2.2 Autogestión Total

El sistema debe:

- **Auto-recalcular** cuando cambian condiciones del periodo abierto.
- **Auto-cancelar** acciones pendientes cuando se inactiva una planilla.
- **Auto-mover** acciones cuando un empleado cambia de empresa.
- **Auto-validar** antes de cada transición de estado.
- **Auto-organizar** flujos de aprobación según configuración de roles.

Cuando ocurre un cambio de negocio, el sistema responde automáticamente sin intervención humana.

### 2.3 Idempotencia como Principio

Todo evento crítico del sistema debe ser **idempotente**: ejecutarse múltiples veces debe producir el mismo resultado que ejecutarse una sola vez. Esto garantiza consistencia ante reintentos, fallos de red, o procesamiento duplicado.

### 2.4 Inmutabilidad de Periodos Aplicados

Una vez que una planilla alcanza el estado **Aplicada**, el periodo es **inmutable**. No se recalculan, no se modifican, no se eliminan registros de periodos aplicados. Cualquier corrección genera una nueva acción en un periodo futuro.

---

## 3. Fases de Implementación

### Fase 1 — MVP Operativo

**Objetivo:** Sistema funcional, coherente y estable.

**Alcance:**

- Multiempresa básica (creación, configuración, asignación de empleados).
- Planillas con estados completos (Abierta → Verificada → Distribución → Aplicada → Inactiva).
- Acciones de personal con flujo de aprobación.
- Permisos dinámicos y menús basados en permisos.
- Recálculo automático en periodo abierto.
- Trazabilidad mínima obligatoria (creador, modificador, timestamps, estados).
- Roles y permisos configurables.

**Exclusiones de Fase 1:**

- Sin colas distribuidas (procesamiento síncrono aceptable a esta escala).
- Sin integración NetSuite.
- Sin movimientos masivos automatizados.
- Sin procesamiento asíncrono avanzado.

**Criterio de completitud:** El sistema puede abrir, procesar y aplicar una planilla completa para múltiples empresas con acciones aprobadas, sin intervención manual fuera del flujo definido.

---

### Fase 2 — Escalabilidad y Automatización Avanzada

**Objetivo:** Robustez operativa y capacidad de escala.

**Alcance:**

- Procesamiento asíncrono con colas (Redis / Message Queue).
- Movimientos masivos automatizados de empleados entre empresas.
- Reintentos automáticos con política exponencial.
- Auditoría avanzada (motivo de cambio, versiones anteriores, diff de estados).
- Validaciones automáticas complejas pre-transición de planilla.
- Procesamiento por lotes para operaciones pesadas.
- Optimización de queries y stored procedures para volumen.

**Criterio de completitud:** El sistema soporta cierre de mes con picos de carga sin degradación crítica, y los movimientos masivos se procesan sin intervención manual.

---

### Fase 3 — Integración y Resiliencia Enterprise

**Objetivo:** Comportamiento enterprise real con integración externa.

**Alcance:**

- Integración desacoplada con NetSuite (evento `PayrollApplied` → sincronización contable).
- Dead Letter Queues para eventos fallidos.
- Retry policies configurables.
- Sistema de alerting para fallos críticos.
- Métricas de performance y health checks.
- Dashboard de monitoreo operativo.
- Optimización avanzada de performance.

**Criterio de completitud:** El sistema opera de forma autónoma con monitoreo activo, integración contable funcional, y recuperación automática ante fallos transitorios.

---

## 4. Mapa de Dominios — Bounded Contexts

El sistema se organiza en **6 bounded contexts**, cada uno con responsabilidad clara, ownership definido, y contratos explícitos.

### 4.1 Company Management

- **Responsabilidad:** Gestión de empresas, configuración empresarial, frecuencias de pago.
- **System of Record (SoR) de:** Entidad Empresa.
- **Regla clave:** Cada empresa es un dominio aislado con configuración independiente.

### 4.2 Employee Management

- **Responsabilidad:** Empleados, movimientos entre empresas, historial laboral, asignación de supervisor.
- **System of Record (SoR) de:** Entidad Empleado (`sys_empleados`).
- **Regla clave:** El empleado pertenece a una empresa en todo momento. Los movimientos generan eventos y preservan historial.

> **REGLA FUNDAMENTAL — Separación Identidad vs Negocio:**
>
> | Concepto | Tabla | Bounded Context | Qué representa |
> |----------|-------|----------------|---------------|
> | **Usuario** | `sys_usuarios` | Access Control / Auth | Cuenta digital para autenticarse en el sistema |
> | **Empleado** | `sys_empleados` | Employee Management | Persona contratada por una empresa (datos laborales: salario, puesto, departamento) |
>
> Son entidades **completamente independientes**:
> - Un usuario puede existir sin ser empleado (ej: Admin TI, contador externo).
> - Un empleado puede existir sin usuario (ej: empleado que no usa el sistema).
> - Si un empleado necesita acceso al sistema, se vincula mediante `sys_empleados.id_usuario` (FK opcional).
> - Nunca se mezclan datos de identidad con datos laborales en la misma tabla.

### 4.3 Personal Actions

- **Responsabilidad:** Acciones de personal, flujos de aprobación, estados de acciones, reglas de negocio internas.
- **System of Record (SoR) de:** Entidad Acción de Personal.
- **Regla clave:** Las acciones siguen un flujo de vida estricto. Solo acciones aprobadas pueden asociarse a planilla.

### 4.4 Payroll Engine

- **Responsabilidad:** Planillas, estados de planilla, aplicación, recálculo, distribución de costos.
- **System of Record (SoR) de:** Entidad Planilla.
- **Regla clave:** Planillas aplicadas son inmutables. Solo planillas abiertas permiten recálculo.

### 4.5 Access Control

- **Responsabilidad:** Roles, permisos, menús dinámicos, autenticación, autorización.
- **System of Record (SoR) de:** Roles y Permisos.
- **Regla clave:** Los permisos son dinámicos, configurables en tiempo real, y nunca hardcodeados. Doble validación: frontend + backend.

### 4.6 Integration Layer

- **Responsabilidad:** Integración con NetSuite, eventos externos, contratos de salida.
- **Regla clave:** Integración siempre desacoplada. Nunca bloquea el ERP.

---

## 5. Mapa de Dependencias (Upstream / Downstream)

### Diagrama de Flujo de Dependencias

```
┌─────────────────────┐
│  Company Management  │
│       (SoR)         │
└────────┬────────────┘
         │ sync contract
         ▼
┌─────────────────────┐       sync contract       ┌─────────────────┐
│ Employee Management  │ ◄─────────────────────── │  Access Control   │
│       (SoR)         │                            │     (SoR)        │
└────────┬────────────┘                            └──────────────────┘
         │ event: EmployeeMoved
         │ sync contract: employee data
         ▼
┌─────────────────────┐
│  Personal Actions    │
│       (SoR)         │
└────────┬────────────┘
         │ event: PersonalActionApproved
         │ sync contract: approved actions
         ▼
┌─────────────────────┐
│   Payroll Engine     │
│       (SoR)         │
└────────┬────────────┘
         │ event: PayrollApplied
         ▼
┌─────────────────────┐
│  Integration Layer   │
│   (NetSuite, etc.)  │
└─────────────────────┘
```

### Tabla de Contratos entre Contextos

| Origen (Upstream)    | Destino (Downstream)  | Tipo de Integración    | Contrato / Evento                          |
|----------------------|-----------------------|------------------------|--------------------------------------------|
| Company Management   | Employee Management   | Sync Contract (read)   | Empresa válida, configuración, frecuencia  |
| Employee Management  | Personal Actions      | Sync Contract (read)   | Empleado válido, supervisor, situación laboral |
| Employee Management  | Payroll Engine        | Sync Contract (read)   | Asignación empresa, condiciones del empleado |
| Employee Management  | Payroll Engine        | Event Subscription     | `EmployeeMoved` → reubicación de acciones  |
| Personal Actions     | Payroll Engine        | Sync Contract (read)   | Acciones aprobadas del periodo              |
| Personal Actions     | Payroll Engine        | Event Subscription     | `PersonalActionApproved` → asociar a planilla |
| Personal Actions     | Payroll Engine        | Event Subscription     | `SalaryIncreased` → recálculo automático   |
| Payroll Engine       | Integration Layer     | Event Subscription     | `PayrollApplied` → sincronización NetSuite |
| Payroll Engine       | Personal Actions      | Event Subscription     | `PayrollDeactivated` → cancelar acciones pendientes |
| Access Control       | Todos los contextos   | Sync Contract (read)   | Permisos del usuario, roles activos        |

### Reglas de Dependencia

- **Ningún downstream puede escribir en el SoR de un upstream.** Ejemplo: Payroll Engine no puede modificar datos del empleado.
- **Los sync contracts son de lectura.** Si un downstream necesita un cambio en un upstream, lo solicita vía evento o servicio explícito.
- **Los eventos son el mecanismo preferido para comunicación cross-context.** Los sync contracts se usan solo para lectura de datos de referencia.

---

## 6. Modelo Empresarial — Multiempresa

### Principio

Una persona de RRHH puede administrar **múltiples empresas** desde una sola interfaz.

### Características

Cada empresa:

- Tiene empleados propios.
- Tiene planillas independientes.
- Tiene configuración independiente (deducciones, aportes, reglas).
- Tiene frecuencia de pago distinta (mensual, quincenal, semanal, etc.).
- Opera como un **dominio aislado** pero coexistente.

### Regla Fundamental

Las empresas son **dominios aislados**. No comparten planillas, no comparten acciones, no comparten configuración. Un empleado pertenece a exactamente una empresa en cada momento.

---

## 7. Planillas (Payroll Engine)

### Pertenencia

Cada planilla pertenece a **una empresa** y cubre **un periodo** específico.

### Estados Oficiales

```
Abierta → Verificada → Distribución de Costos → Aplicada
                                                    ↓
                                               Inmutable
         ↓ (desde cualquier estado pre-aplicación)
    Inactiva / Cancelada
```

| Estado               | Descripción                                                    | Recálculo | Modificable |
|----------------------|----------------------------------------------------------------|-----------|-------------|
| Abierta              | Periodo activo, acepta acciones y recálculos                   | ✅         | ✅           |
| Verificada           | Revisada por RRHH, pendiente distribución de costos            | ❌         | ❌ (regresa a Abierta si necesita cambios) |
| Distribución de Costos | Costos asignados a centros de costo                          | ❌         | ❌           |
| Aplicada             | Periodo cerrado, inmutable                                     | ❌         | ❌           |
| Inactiva / Cancelada | Planilla cancelada, acciones pendientes auto-canceladas        | ❌         | ❌           |

### Reglas Críticas

- Solo planillas **Abiertas** pueden recalcular.
- Planillas **Aplicadas** son **inmutables** — no se modifican bajo ninguna circunstancia.
- Planillas **Inactivadas** cancelan automáticamente sus acciones pendientes (evento `PayrollDeactivated`).
- No puede existir **ambigüedad de periodo** — un empleado no puede tener dos planillas abiertas para el mismo periodo en la misma empresa.

---

## 8. Acciones de Personal

### Naturaleza

Son entidades independientes que siguen un **flujo de vida estricto**. Cada transición es auditada.

### Tipos de Acciones

| Categoría         | Tipos                                        |
|-------------------|----------------------------------------------|
| Ingresos          | Horas extra, bonificaciones, comisiones      |
| Salario           | Aumentos salariales                          |
| Ausencias         | Vacaciones, incapacidades, ausencias         |
| Deducciones       | Deducciones, retenciones, embargos           |

### Flujo de Vida

```
Borrador (opcional) → Pendiente Aprobación → Aprobada → Asociada a Planilla → Pagada
                                                ↓
                                           Cancelada (desde cualquier estado pre-pago)
```

| Estado                | Descripción                              | Transiciones Permitidas              |
|-----------------------|------------------------------------------|--------------------------------------|
| Borrador              | Creada pero no enviada                   | → Pendiente Aprobación, → Cancelada |
| Pendiente Aprobación  | Enviada para aprobación                  | → Aprobada, → Cancelada             |
| Aprobada              | Aprobada por supervisor/RRHH             | → Asociada a Planilla, → Cancelada  |
| Asociada a Planilla   | Vinculada a planilla abierta             | → Pagada, → Cancelada               |
| Pagada                | Planilla aplicada, acción ejecutada      | Estado final — inmutable             |
| Cancelada             | Acción cancelada con motivo registrado   | Estado final                         |

### Reglas

- Cada transición de estado es **auditada** con usuario, timestamp, estado anterior, estado nuevo, y motivo.
- Solo acciones **Aprobadas** pueden asociarse a una planilla.
- Acciones **Pagadas** son inmutables.

---

## 9. Movimiento de Empleados entre Empresas

### Escenario

El movimiento de empleados entre empresas es un **escenario crítico** que debe ejecutarse de forma atómica y auditable.

### Flujo Automático

Cuando se genera el evento `EmployeeMoved`:

1. Se identifica la planilla activa compatible en la **nueva empresa**.
2. Las acciones **pendientes** (no pagadas) se reubican a la nueva planilla.
3. Se recalculan montos si aplica (diferencias de configuración entre empresas).
4. Se registra **trazabilidad completa**: empresa origen, empresa destino, acciones movidas, montos anteriores, montos nuevos.
5. **No se pierde historial anterior** — el registro histórico en la empresa origen permanece intacto.
6. Si falla cualquier paso → **rollback automático completo**.

### Movimientos Masivos (Fase 2+)

El sistema debe soportar movimientos masivos de empleados entre empresas:

- Procesamiento en lotes.
- Transacciones controladas por lote (no una transacción global).
- Registro individual de éxito/fallo por empleado.
- Sin bloqueo del sistema para otros usuarios durante el proceso.

---

## 10. Recálculo Automático

### Trigger: `SalaryIncreased` (ejemplo principal)

Cuando ocurre un aumento salarial en un periodo abierto:

1. Se dispara evento `SalaryIncreased`.
2. Se detectan acciones del **periodo abierto** que dependen del salario.
3. Se recalculan montos dependientes (horas extra, proporcionales, etc.).
4. Se actualiza la planilla abierta.
5. Se guarda **versión previa** de los montos (auditoría de recálculo).
6. Si falla → **rollback automático** al estado anterior.

### Reglas Inviolables

- **Nunca** se recalculan periodos aplicados.
- El recálculo solo opera sobre planillas en estado **Abierta**.
- Todo recálculo es atómico: se completa totalmente o no se aplica.

---

## 11. Roles y Permisos Dinámicos

### Principio

Sistema de permisos **completamente dinámico** — nunca hardcodeado.

### Capacidades de un Rol

Un rol puede incluir cualquier combinación de permisos:

| Permiso              | Ejemplo de Acción                         |
|----------------------|-------------------------------------------|
| Crear planillas      | Abrir nuevo periodo                       |
| Editar planillas     | Modificar planilla abierta                |
| Verificar planillas  | Marcar planilla como verificada           |
| Aplicar planillas    | Aplicar planilla (acción irreversible)    |
| Cancelar planillas   | Inactivar planilla                        |
| Crear empleados      | Registrar nuevo empleado                  |
| Editar empleados     | Modificar datos de empleado               |
| Crear acciones       | Crear acción de personal                  |
| Aprobar acciones     | Aprobar acción como supervisor/RRHH       |
| Ver reportes         | Consultar reportes y dashboards           |

### Características

- Los permisos son **configurables** por empresa.
- Son **modificables en tiempo real** sin reinicio de sistema.
- Soportan **granularidad** a nivel de módulo y acción.
- Un usuario puede tener **múltiples roles**.

---

## 12. Menús Dinámicos Basados en Permisos

### Flujo

Al iniciar sesión:

1. El backend devuelve los **permisos del usuario** para la empresa activa.
2. El frontend construye el menú **dinámicamente** basado en permisos.
3. Si no tiene permiso → **no ve el módulo**.
4. El backend **valida siempre** cada request (doble seguridad).

### Ejemplos

| Permiso Ausente           | Resultado en UI                    |
|---------------------------|------------------------------------|
| Sin permiso de vacaciones | No ve menú de vacaciones           |
| Sin permiso de listar     | No puede consultar listados        |
| Sin permiso de crear      | Botón de crear oculto              |
| Sin permiso de aprobar    | No ve opciones de aprobación       |

### Regla de Seguridad

**La UI refleja el modelo de seguridad, pero nunca es la única barrera.** El backend es la fuente de verdad de autorización.

---

## 13. Aprobaciones Jerárquicas

### Flujo Típico

```
Empleado crea acción
       ↓
Supervisor aprueba
       ↓
RRHH valida
       ↓
Entra a planilla
       ↓
Planilla aplicada
       ↓
Acción pagada
```

### Reglas

- Cada transición requiere **permiso específico** del rol del usuario.
- El flujo de aprobación es **configurable** por tipo de acción y por empresa.
- Un supervisor solo puede aprobar acciones de **sus subordinados directos**. Jerarquía de supervisión (Supervisor Global, Supervisor, Empleado) y reglas de asignación: ver [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md).
- RRHH puede validar acciones de **cualquier empleado** según permisos.

---

## 14. Trazabilidad Total

### Principio

Toda entidad del sistema debe registrar su ciclo de vida completo.

### Campos de Auditoría Obligatorios

| Campo               | Descripción                                    |
|---------------------|------------------------------------------------|
| Usuario creador     | Quién creó el registro                         |
| Usuario modificador | Quién realizó la última modificación           |
| Usuario aprobador   | Quién aprobó la transición (si aplica)         |
| Fecha de creación   | Timestamp de creación                          |
| Fecha de modificación | Timestamp de última modificación             |
| Estado anterior     | Estado previo a la transición                  |
| Estado nuevo        | Estado posterior a la transición               |
| Motivo de cambio    | Justificación textual (obligatorio en estados críticos) |

### Reglas de Auditoría

- **Nada es irreversible sin auditoría.**
- Los registros de auditoría son **inmutables** — no se pueden editar ni eliminar.
- En operaciones críticas (aplicar planilla, cancelar, movimiento de empleado), el motivo de cambio es **obligatorio**.
- El historial de versiones se preserva para entidades críticas (montos de planilla, acciones, salarios).

---

## 15. Base de Datos Enterprise

### Principios de Diseño

| Principio                     | Descripción                                                    |
|-------------------------------|----------------------------------------------------------------|
| Relaciones normalizadas       | Modelo relacional limpio, sin redundancia innecesaria          |
| Foreign keys estrictas        | Integridad referencial fuerte en todas las relaciones          |
| Transacciones ACID            | Atomicidad, Consistencia, Aislamiento, Durabilidad            |
| Rollbacks controlados         | Toda operación crítica tiene rollback definido                 |
| Soft delete                   | Cuando aplique, se marca como eliminado sin borrar físicamente |
| Historial versionado          | Entidades críticas mantienen versiones anteriores              |
| Índices estratégicos          | Optimización para queries frecuentes y reportes                |

### Reglas de Procesamiento Masivo

- Los procesos masivos se ejecutan en **transacciones controladas por lote** (no una transacción global).
- Cada lote tiene registro individual de éxito/fallo.
- Los bloqueos en MySQL se minimizan mediante diseño de queries y estrategia de locking.

---

## 16. Non-Functional Requirements (NFRs)

### 16.1 Performance Targets

#### Perfil: Operación Normal

| Operación                       | Target        |
|---------------------------------|---------------|
| Creación de acción de personal  | < 500ms       |
| Apertura de planilla            | < 2s          |
| Recálculo de 100 acciones       | < 5s          |
| Movimiento individual           | < 3s          |
| Consulta de listado (paginado)  | < 1s          |

#### Perfil: Peak Scenario (Cierre de Mes / Quincena)

| Operación                           | Target        | Nota                                      |
|-------------------------------------|---------------|-------------------------------------------|
| Aplicar planilla (500+ empleados)   | < 30s         | Tolera más latencia que operaciones CRUD   |
| Recálculo masivo (500+ acciones)    | < 15s         | Procesamiento por lotes                    |
| Movimiento masivo (100 empleados)   | < 10s         | Transacciones por lote, no global          |
| Generación de reportes              | < 20s         | Puede ser asíncrono en Fase 2+            |

### 16.2 Concurrencia

| Perfil           | Usuarios Concurrentes | Procesos Batch Simultáneos | Planillas Simultáneas |
|------------------|-----------------------|----------------------------|-----------------------|
| Normal Ops       | 100                   | 10                         | 10                    |
| Peak Scenario    | 300–500               | 20                         | 10–20                 |

### 16.3 Disponibilidad

| Métrica          | Target Inicial | Target Enterprise (Fase 3) |
|------------------|----------------|----------------------------|
| Disponibilidad   | 99.5%          | 99.9%                      |
| RTO              | < 30 min       | < 15 min                   |
| RPO              | < 5 min        | < 1 min                    |

### 16.4 SLOs Diferenciados

No todas las operaciones tienen el mismo nivel de criticidad:

| Nivel      | Operaciones                                    | Latencia Máxima | Disponibilidad |
|------------|------------------------------------------------|-----------------|----------------|
| Crítico    | Aplicar planilla, recálculo, movimiento masivo | Definido arriba | 99.9%          |
| Alto       | Crear/aprobar acciones, abrir planilla         | < 2s            | 99.5%          |
| Normal     | Consultas, listados, reportes                  | < 5s            | 99%            |
| Bajo       | Configuración, administración de roles         | < 10s           | 95%            |

---

## 17. Estrategia de Resiliencia

### Principio

El sistema debe **fallar de forma controlada** y **recuperarse automáticamente** cuando sea posible.

### Modelo de Fallo y Recuperación

#### Eventos Críticos

Todo evento crítico debe:

- **Confirmar procesamiento** — el emisor sabe si el evento fue procesado.
- **Registrar estado** — cada evento tiene estado: pendiente, procesado, fallido.
- **Permitir reintento** — eventos fallidos pueden reprocesarse.

#### Eventos Fallidos

- Se envían a **Dead Letter Queue** (DLQ).
- Generan **alerta** al equipo de operaciones.
- **No bloquean** el flujo principal del sistema.
- Se registra motivo de fallo para diagnóstico.

#### Política de Reintentos

- Política de **backoff exponencial** (1s → 2s → 4s → 8s → ...).
- Número máximo de reintentos **configurable** por tipo de evento.
- Después de agotar reintentos → DLQ + alerta.

#### Idempotencia

- Todos los eventos deben ser **idempotentes**.
- Ejecutarse dos o más veces nunca produce efectos distintos a ejecutarse una vez.
- Esto es un requisito de diseño, no de implementación.

### Degradación Controlada (Graceful Degradation)

| Escenario                        | Comportamiento Esperado                              |
|----------------------------------|------------------------------------------------------|
| Cola de eventos no disponible    | Procesamiento síncrono temporal (Fase 1 behavior)    |
| NetSuite no disponible           | Planilla se aplica normalmente, sync queda en cola   |
| Base de datos degradada          | Solo lectura, operaciones de escritura en cola        |
| Fallo en recálculo               | Rollback automático, acción queda en estado anterior  |

---

## 18. KPITAL + TimeWise — Contrato de Integración

### Ecosistema

KPITAL y TimeWise son dos sistemas que comparten infraestructura pero tienen **responsabilidades claramente separadas**.

### Recursos Compartidos

| Recurso        | Compartido | Ownership                |
|----------------|------------|--------------------------|
| Base de datos  | ✅          | Shared infrastructure    |
| Usuarios       | ✅          | Access Control (KPITAL)  |
| Roles          | ✅          | Access Control (KPITAL)  |
| Permisos       | ✅          | Access Control (KPITAL)  |
| Empleados      | ✅          | Employee Management      |

### Responsabilidades

| Sistema   | Puede                                  | No Puede                          |
|-----------|----------------------------------------|-----------------------------------|
| TimeWise  | Crear acciones de personal             | Aplicar planillas                 |
| TimeWise  | Consultar empleados (read-only)        | Modificar datos de empleado       |
| TimeWise  | Generar eventos de asistencia          | Aprobar acciones de planilla      |
| KPITAL    | Procesar planillas                     | Generar datos de asistencia       |
| KPITAL    | Validar acciones recibidas             | Asumir que toda acción es válida  |
| KPITAL    | Rechazar acciones inválidas de TimeWise | —                                |

### Regla Fundamental

> **Base de datos compartida ≠ responsabilidad compartida.**

Si TimeWise genera una acción inválida → se rechaza en el dominio **Personal Actions** de KPITAL. TimeWise no tiene bypass de validación.

### Anti-Corruption Layer

KPITAL actúa como **anti-corruption layer**: toda acción que ingresa desde TimeWise pasa por las mismas validaciones que una acción creada internamente. No hay "fast path" ni excepciones por origen.

---

## 19. Integración Futura con NetSuite

### Trigger

Después de aplicar planilla → evento `PayrollApplied`.

### Flujo

1. `PayrollApplied` se emite.
2. Integration Layer consume el evento.
3. Se transforma la información al formato NetSuite.
4. Se envía a NetSuite vía API.
5. Se registra confirmación o fallo.
6. Si falla → cola de reintentos → DLQ si persiste.

### Principios

- Integración **siempre desacoplada**.
- **Nunca bloquea** el ERP — la planilla se aplica independientemente del estado de NetSuite.
- La información contable se sincroniza de forma **eventual** (eventual consistency).
- El estado de sincronización es visible y auditable.

---

## 20. Decision Log (ADR-Lite)

| ID     | Decisión                                          | Alternativa Considerada                | Tradeoff                                                    | Impacto                           | Fecha      |
|--------|---------------------------------------------------|----------------------------------------|-------------------------------------------------------------|-----------------------------------|------------|
| ADR-001 | Employee Management es SoR del empleado          | Ownership compartido KPITAL/TimeWise   | Single source of truth vs flexibilidad de TimeWise          | Alto — define boundaries          | 2025-02-21 |
| ADR-002 | Planillas aplicadas son inmutables                | Permitir correcciones retroactivas     | Integridad contable vs facilidad de corrección              | Crítico — base del modelo         | 2025-02-21 |
| ADR-003 | Eventos idempotentes como principio de diseño     | Idempotencia solo donde se necesite    | Esfuerzo de diseño extra vs resiliencia                     | Alto — afecta todo evento         | 2025-02-21 |
| ADR-004 | Fase 1 sin colas distribuidas                     | Implementar colas desde día 1          | Simplicidad inicial vs preparación para escala              | Medio — afecta timeline           | 2025-02-21 |
| ADR-005 | Anti-corruption layer para acciones de TimeWise   | Trust implícito en datos de TimeWise   | Validación extra vs performance de ingesta                  | Alto — seguridad de datos         | 2025-02-21 |
| ADR-006 | Permisos dinámicos, nunca hardcodeados            | Permisos estáticos por módulo          | Flexibilidad total vs complejidad de implementación         | Alto — afecta toda la UI          | 2025-02-21 |
| ADR-007 | SLOs diferenciados por tipo de operación          | SLO único para todo el sistema         | Complejidad de monitoreo vs targets realistas               | Medio — afecta infraestructura    | 2025-02-21 |

---

## 21. Qué NO Define Este Documento

Este documento define **visión, principios y dirección**. No define:

- Campos específicos de tablas de base de datos.
- Endpoints de API.
- DTOs o contratos de API.
- Implementación técnica exacta (frameworks, librerías).
- Estructura de carpetas del proyecto.
- Configuración de infraestructura (servidores, instancias).
- Diagramas de secuencia detallados.
- Mockups de interfaz de usuario.

Para cada uno de estos aspectos se generarán documentos técnicos específicos derivados de esta visión.

---

## Validaciones Automáticas Pre-Transición

Antes de cambiar el estado de una planilla, el sistema ejecuta validaciones automáticas:

| Validación                        | Descripción                                                  | Bloquea Transición |
|-----------------------------------|--------------------------------------------------------------|--------------------|
| Acciones pendientes               | No hay acciones en estado intermedio sin resolver             | ✅                  |
| Inconsistencias de monto          | Los montos calculados son coherentes con las reglas           | ✅                  |
| Empleados sin salario             | Todo empleado en planilla tiene salario asignado              | ✅                  |
| Montos negativos                  | No existen montos negativos no justificados                   | ✅                  |
| Aprobación obligatoria            | Todas las acciones que requieren aprobación están aprobadas   | ✅                  |
| Periodo sin ambigüedad            | No existe otra planilla para el mismo periodo/empresa         | ✅                  |

El sistema **impide errores humanos** mediante validación proactiva.

---

## Conclusión

KPITAL 360 no es un CRUD de planillas.

Es un **motor de reglas empresariales automatizado**: un ERP real, multiempresa, basado en eventos, con permisos dinámicos, workflows robustos, trazabilidad total, y diseñado para escalar desde un MVP funcional hasta una plataforma enterprise con integración contable y resiliencia operativa.

Este documento es el **blueprint vivo** que guía todas las decisiones técnicas del proyecto. Toda implementación debe ser coherente con los principios aquí definidos, y cualquier desviación debe documentarse en el Decision Log con justificación explícita.

---

*Documento generado como referencia arquitectónica formal del proyecto KPITAL 360.*
*Toda modificación requiere aprobación del Owner y actualización del Changelog.*