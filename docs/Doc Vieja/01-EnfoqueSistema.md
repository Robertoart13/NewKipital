# KPITAL 360  DOCUMENTO DE VISIN ARQUITECTNICA ENTERPRISE

**Versin 3.0**
**Fecha:** 2025-02-21
**Autor:** Roberto  Senior Full Stack Software Engineer / Functional Architect
**Estado:** Aprobado  Blueprint Arquitectnico Formal
**Clasificacin:** Documento interno  Referencia arquitectnica

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Changelog

| Versin | Fecha       | Autor   | Descripcin                                                                 |
|---------|-------------|---------|-----------------------------------------------------------------------------|
| 1.0     |            | Roberto | Visin inicial: multiempresa, planillas, acciones de personal               |
| 2.0     |            | Roberto | Consolidacin: eventos, workflows, roles dinmicos, trazabilidad, escalabilidad |
| 3.0     | 2025-02-21  | Roberto | Blueprint formal: bounded contexts, mapa de dependencias, NFRs medibles, fases de implementacin, estrategia de resiliencia, gobernanza documental |

---

## Gobernanza del Documento

- **Owner:** Roberto (Arquitecto Funcional / Senior Engineer)
- **Aprobadores de cambios:** Owner + Lead tcnico del proyecto
- **Regla de versionado:**
  - **Patch (v3.0.x):** Correcciones menores, clarificaciones, typos
  - **Minor (v3.x.0):** Nuevos NFRs, ajustes a bounded contexts, nuevos contratos
  - **Major (vX.0.0):** Cambios de dominio, redefinicin de fases, cambios estructurales
- **Frecuencia de revisin:** Al inicio de cada fase de implementacin o cuando se identifique un cambio arquitectnico significativo
- **Formato de cambio:** Toda modificacin debe documentarse en el Changelog y, si aplica, en el Decision Log (Seccin 20)

---

## Tabla de Contenidos

1. [Visin General del Sistema](#1-visin-general-del-sistema)
2. [Principios Fundamentales](#2-principios-fundamentales)
3. [Fases de Implementacin](#3-fases-de-implementacin)
4. [Mapa de Dominios  Bounded Contexts](#4-mapa-de-dominios--bounded-contexts)
5. [Mapa de Dependencias (Upstream / Downstream)](#5-mapa-de-dependencias-upstream--downstream)
6. [Modelo Empresarial  Multiempresa](#6-modelo-empresarial--multiempresa)
7. [Planillas (Payroll Engine)](#7-planillas-payroll-engine)
8. [Acciones de Personal](#8-acciones-de-personal)
9. [Movimiento de Empleados entre Empresas](#9-movimiento-de-empleados-entre-empresas)
10. [Reclculo Automtico](#10-reclculo-automtico)
11. [Roles y Permisos Dinmicos](#11-roles-y-permisos-dinmicos)
12. [Mens Dinmicos Basados en Permisos](#12-mens-dinmicos-basados-en-permisos)
13. [Aprobaciones Jerrquicas](#13-aprobaciones-jerrquicas)
14. [Trazabilidad Total](#14-trazabilidad-total)
15. [Base de Datos Enterprise](#15-base-de-datos-enterprise)
16. [Non-Functional Requirements (NFRs)](#16-non-functional-requirements-nfrs)
17. [Estrategia de Resiliencia](#17-estrategia-de-resiliencia)
18. [KPITAL + TimeWise  Contrato de Integracin](#18-kpital--timewise--contrato-de-integracin)
19. [Integracin Futura con NetSuite](#19-integracin-futura-con-netsuite)
20. [Decision Log (ADR-Lite)](#20-decision-log-adr-lite)
21. [Qu NO Define Este Documento](#21-qu-no-define-este-documento)

---

## 1. Visin General del Sistema

KPITAL 360 es un **ERP de planillas multiempresa** diseado para:

- **Autogestin empresarial completa**  el sistema responde automticamente a cambios de negocio.
- **Automatizacin total de procesos**  sin dependencias manuales ocultas.
- **Workflows dinmicos basados en eventos**  todo cambio relevante genera un evento de dominio.
- **Trazabilidad absoluta**  toda operacin es auditable.
- **Escalabilidad empresarial**  diseado para crecer sin degradacin.
- **Integracin futura con sistemas externos** (NetSuite, herramientas corporativas).

El sistema debe comportarse como un **ERP corporativo moderno**:

- Multiempresa real con dominios aislados.
- Colaboracin por roles (tipo GitHub).
- Separacin clara de dominios (bounded contexts).
- Procesamiento asncrono donde se requiera.
- Seguridad fuerte con doble validacin.
- Sin dependencias manuales ocultas.

> **Principio rector:** Este sistema no es un CRUD de planillas. Es un motor de reglas empresariales automatizado. Un ERP real.

---

## 2. Principios Fundamentales

### 2.1 Arquitectura Basada en Eventos

Todo cambio relevante genera un **evento de dominio**.

**Eventos principales del sistema:**

| Dominio             | Evento                    | Descripcin                                      |
|---------------------|---------------------------|--------------------------------------------------|
| Employee Management | `EmployeeCreated`         | Nuevo empleado registrado                        |
| Employee Management | `EmployeeMoved`           | Empleado transferido entre empresas              |
| Employee Management | `EmployeeDeactivated`     | Empleado desactivado                             |
| Personal Actions    | `PersonalActionCreated`   | Nueva accin de personal creada                  |
| Personal Actions    | `PersonalActionApproved`  | Accin aprobada por supervisor/RRHH              |
| Personal Actions    | `PersonalActionRejected`  | Accin rechazada                                 |
| Personal Actions    | `SalaryIncreased`         | Aumento salarial aplicado                        |
| Payroll Engine      | `PayrollOpened`           | Planilla abierta para periodo                    |
| Payroll Engine      | `PayrollVerified`         | Planilla verificada                              |
| Payroll Engine      | `PayrollApplied`          | Planilla aplicada (inmutable)                    |
| Payroll Engine      | `PayrollDeactivated`      | Planilla cancelada/inactivada                    |

Los eventos disparan **workflows automticos**. Nada se recalcula manualmente. Nada depende de lgica dispersa.

### 2.2 Autogestin Total

El sistema debe:

- **Auto-recalcular** cuando cambian condiciones del periodo abierto.
- **Auto-cancelar** acciones pendientes cuando se inactiva una planilla.
- **Auto-mover** acciones cuando un empleado cambia de empresa.
- **Auto-validar** antes de cada transicin de estado.
- **Auto-organizar** flujos de aprobacin segn configuracin de roles.

Cuando ocurre un cambio de negocio, el sistema responde automticamente sin intervencin humana.

### 2.3 Idempotencia como Principio

Todo evento crtico del sistema debe ser **idempotente**: ejecutarse mltiples veces debe producir el mismo resultado que ejecutarse una sola vez. Esto garantiza consistencia ante reintentos, fallos de red, o procesamiento duplicado.

### 2.4 Inmutabilidad de Periodos Aplicados

Una vez que una planilla alcanza el estado **Aplicada**, el periodo es **inmutable**. No se recalculan, no se modifican, no se eliminan registros de periodos aplicados. Cualquier correccin genera una nueva accin en un periodo futuro.

---

## 3. Fases de Implementacin

### Fase 1  MVP Operativo

**Objetivo:** Sistema funcional, coherente y estable.

**Alcance:**

- Multiempresa bsica (creacin, configuracin, asignacin de empleados).
- Planillas con estados completos (Abierta  Verificada  Distribucin  Aplicada  Inactiva).
- Acciones de personal con flujo de aprobacin.
- Permisos dinmicos y mens basados en permisos.
- Reclculo automtico en periodo abierto.
- Trazabilidad mnima obligatoria (creador, modificador, timestamps, estados).
- Roles y permisos configurables.

**Exclusiones de Fase 1:**

- Sin colas distribuidas (procesamiento sncrono aceptable a esta escala).
- Sin integracin NetSuite.
- Sin movimientos masivos automatizados.
- Sin procesamiento asncrono avanzado.

**Criterio de completitud:** El sistema puede abrir, procesar y aplicar una planilla completa para mltiples empresas con acciones aprobadas, sin intervencin manual fuera del flujo definido.

---

### Fase 2  Escalabilidad y Automatizacin Avanzada

**Objetivo:** Robustez operativa y capacidad de escala.

**Alcance:**

- Procesamiento asncrono con colas (Redis / Message Queue).
- Movimientos masivos automatizados de empleados entre empresas.
- Reintentos automticos con poltica exponencial.
- Auditora avanzada (motivo de cambio, versiones anteriores, diff de estados).
- Validaciones automticas complejas pre-transicin de planilla.
- Procesamiento por lotes para operaciones pesadas.
- Optimizacin de queries y stored procedures para volumen.

**Criterio de completitud:** El sistema soporta cierre de mes con picos de carga sin degradacin crtica, y los movimientos masivos se procesan sin intervencin manual.

---

### Fase 3  Integracin y Resiliencia Enterprise

**Objetivo:** Comportamiento enterprise real con integracin externa.

**Alcance:**

- Integracin desacoplada con NetSuite (evento `PayrollApplied`  sincronizacin contable).
- Dead Letter Queues para eventos fallidos.
- Retry policies configurables.
- Sistema de alerting para fallos crticos.
- Mtricas de performance y health checks.
- Dashboard de monitoreo operativo.
- Optimizacin avanzada de performance.

**Criterio de completitud:** El sistema opera de forma autnoma con monitoreo activo, integracin contable funcional, y recuperacin automtica ante fallos transitorios.

---

## 4. Mapa de Dominios  Bounded Contexts

El sistema se organiza en **6 bounded contexts**, cada uno con responsabilidad clara, ownership definido, y contratos explcitos.

### 4.1 Company Management

- **Responsabilidad:** Gestin de empresas, configuracin empresarial, frecuencias de pago.
- **System of Record (SoR) de:** Entidad Empresa.
- **Regla clave:** Cada empresa es un dominio aislado con configuracin independiente.

### 4.2 Employee Management

- **Responsabilidad:** Empleados, movimientos entre empresas, historial laboral, asignacin de supervisor.
- **System of Record (SoR) de:** Entidad Empleado (`sys_empleados`).
- **Regla clave:** El empleado pertenece a una empresa en todo momento. Los movimientos generan eventos y preservan historial.

> **REGLA FUNDAMENTAL  Separacin Identidad vs Negocio:**
>
> | Concepto | Tabla | Bounded Context | Qu representa |
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

- **Responsabilidad:** Acciones de personal, flujos de aprobacin, estados de acciones, reglas de negocio internas.
- **System of Record (SoR) de:** Entidad Accin de Personal.
- **Regla clave:** Las acciones siguen un flujo de vida estricto. Solo acciones aprobadas pueden asociarse a planilla.

### 4.4 Payroll Engine

- **Responsabilidad:** Planillas, estados de planilla, aplicacin, reclculo, distribucin de costos.
- **System of Record (SoR) de:** Entidad Planilla.
- **Regla clave:** Planillas aplicadas son inmutables. Solo planillas abiertas permiten reclculo.

### 4.5 Access Control

- **Responsabilidad:** Roles, permisos, mens dinmicos, autenticacin, autorizacin.
- **System of Record (SoR) de:** Roles y Permisos.
- **Regla clave:** Los permisos son dinmicos, configurables en tiempo real, y nunca hardcodeados. Doble validacin: frontend + backend.

### 4.6 Integration Layer

- **Responsabilidad:** Integracin con NetSuite, eventos externos, contratos de salida.
- **Regla clave:** Integracin siempre desacoplada. Nunca bloquea el ERP.

---

## 5. Mapa de Dependencias (Upstream / Downstream)

### Diagrama de Flujo de Dependencias

```

  Company Management  
       (SoR)         

          sync contract
         
       sync contract       
 Employee Management      Access Control   
       (SoR)                                          (SoR)        
                            
          event: EmployeeMoved
          sync contract: employee data
         

  Personal Actions    
       (SoR)         

          event: PersonalActionApproved
          sync contract: approved actions
         

   Payroll Engine     
       (SoR)         

          event: PayrollApplied
         

  Integration Layer   
   (NetSuite, etc.)  

```

### Tabla de Contratos entre Contextos

| Origen (Upstream)    | Destino (Downstream)  | Tipo de Integracin    | Contrato / Evento                          |
|----------------------|-----------------------|------------------------|--------------------------------------------|
| Company Management   | Employee Management   | Sync Contract (read)   | Empresa vlida, configuracin, frecuencia  |
| Employee Management  | Personal Actions      | Sync Contract (read)   | Empleado vlido, supervisor, situacin laboral |
| Employee Management  | Payroll Engine        | Sync Contract (read)   | Asignacin empresa, condiciones del empleado |
| Employee Management  | Payroll Engine        | Event Subscription     | `EmployeeMoved`  reubicacin de acciones  |
| Personal Actions     | Payroll Engine        | Sync Contract (read)   | Acciones aprobadas del periodo              |
| Personal Actions     | Payroll Engine        | Event Subscription     | `PersonalActionApproved`  asociar a planilla |
| Personal Actions     | Payroll Engine        | Event Subscription     | `SalaryIncreased`  reclculo automtico   |
| Payroll Engine       | Integration Layer     | Event Subscription     | `PayrollApplied`  sincronizacin NetSuite |
| Payroll Engine       | Personal Actions      | Event Subscription     | `PayrollDeactivated`  cancelar acciones pendientes |
| Access Control       | Todos los contextos   | Sync Contract (read)   | Permisos del usuario, roles activos        |

### Reglas de Dependencia

- **Ningn downstream puede escribir en el SoR de un upstream.** Ejemplo: Payroll Engine no puede modificar datos del empleado.
- **Los sync contracts son de lectura.** Si un downstream necesita un cambio en un upstream, lo solicita va evento o servicio explcito.
- **Los eventos son el mecanismo preferido para comunicacin cross-context.** Los sync contracts se usan solo para lectura de datos de referencia.

---

## 6. Modelo Empresarial  Multiempresa

### Principio

Una persona de RRHH puede administrar **mltiples empresas** desde una sola interfaz.

### Caractersticas

Cada empresa:

- Tiene empleados propios.
- Tiene planillas independientes.
- Tiene configuracin independiente (deducciones, aportes, reglas).
- Tiene frecuencia de pago distinta (mensual, quincenal, semanal, etc.).
- Opera como un **dominio aislado** pero coexistente.

### Regla Fundamental

Las empresas son **dominios aislados**. No comparten planillas, no comparten acciones, no comparten configuracin. Un empleado pertenece a exactamente una empresa en cada momento.

---

## 7. Planillas (Payroll Engine)

### Pertenencia

Cada planilla pertenece a **una empresa** y cubre **un periodo** especfico.

### Estados Oficiales

```
Abierta  Verificada  Distribucin de Costos  Aplicada
                                                    
                                               Inmutable
          (desde cualquier estado pre-aplicacin)
    Inactiva / Cancelada
```

| Estado               | Descripcin                                                    | Reclculo | Modificable |
|----------------------|----------------------------------------------------------------|-----------|-------------|
| Abierta              | Periodo activo, acepta acciones y reclculos                   |          |            |
| Verificada           | Revisada por RRHH, pendiente distribucin de costos            |          |  (regresa a Abierta si necesita cambios) |
| Distribucin de Costos | Costos asignados a centros de costo                          |          |            |
| Aplicada             | Periodo cerrado, inmutable                                     |          |            |
| Inactiva / Cancelada | Planilla cancelada, acciones pendientes auto-canceladas        |          |            |

### Reglas Crticas

- Solo planillas **Abiertas** pueden recalcular.
- Planillas **Aplicadas** son **inmutables**  no se modifican bajo ninguna circunstancia.
- Planillas **Inactivadas** cancelan automticamente sus acciones pendientes (evento `PayrollDeactivated`).
- No puede existir **ambigedad de periodo**  un empleado no puede tener dos planillas abiertas para el mismo periodo en la misma empresa.

---

## 8. Acciones de Personal

### Naturaleza

Son entidades independientes que siguen un **flujo de vida estricto**. Cada transicin es auditada.

### Tipos de Acciones

| Categora         | Tipos                                        |
|-------------------|----------------------------------------------|
| Ingresos          | Horas extra, bonificaciones, comisiones      |
| Salario           | Aumentos salariales                          |
| Ausencias         | Vacaciones, incapacidades, ausencias         |
| Deducciones       | Deducciones, retenciones, embargos           |

### Flujo de Vida

```
Borrador (opcional)  Pendiente Aprobacin  Aprobada  Asociada a Planilla  Pagada
                                                
                                           Cancelada (desde cualquier estado pre-pago)
```

| Estado                | Descripcin                              | Transiciones Permitidas              |
|-----------------------|------------------------------------------|--------------------------------------|
| Borrador              | Creada pero no enviada                   |  Pendiente Aprobacin,  Cancelada |
| Pendiente Aprobacin  | Enviada para aprobacin                  |  Aprobada,  Cancelada             |
| Aprobada              | Aprobada por supervisor/RRHH             |  Asociada a Planilla,  Cancelada  |
| Asociada a Planilla   | Vinculada a planilla abierta             |  Pagada,  Cancelada               |
| Pagada                | Planilla aplicada, accin ejecutada      | Estado final  inmutable             |
| Cancelada             | Accin cancelada con motivo registrado   | Estado final                         |

### Reglas

- Cada transicin de estado es **auditada** con usuario, timestamp, estado anterior, estado nuevo, y motivo.
- Solo acciones **Aprobadas** pueden asociarse a una planilla.
- Acciones **Pagadas** son inmutables.

---

## 9. Movimiento de Empleados entre Empresas

### Escenario

El movimiento de empleados entre empresas es un **escenario crtico** que debe ejecutarse de forma atmica y auditable.

### Flujo Automtico

Cuando se genera el evento `EmployeeMoved`:

1. Se identifica la planilla activa compatible en la **nueva empresa**.
2. Las acciones **pendientes** (no pagadas) se reubican a la nueva planilla.
3. Se recalculan montos si aplica (diferencias de configuracin entre empresas).
4. Se registra **trazabilidad completa**: empresa origen, empresa destino, acciones movidas, montos anteriores, montos nuevos.
5. **No se pierde historial anterior**  el registro histrico en la empresa origen permanece intacto.
6. Si falla cualquier paso  **rollback automtico completo**.

### Movimientos Masivos (Fase 2+)

El sistema debe soportar movimientos masivos de empleados entre empresas:

- Procesamiento en lotes.
- Transacciones controladas por lote (no una transaccin global).
- Registro individual de xito/fallo por empleado.
- Sin bloqueo del sistema para otros usuarios durante el proceso.

---

## 10. Reclculo Automtico

### Trigger: `SalaryIncreased` (ejemplo principal)

Cuando ocurre un aumento salarial en un periodo abierto:

1. Se dispara evento `SalaryIncreased`.
2. Se detectan acciones del **periodo abierto** que dependen del salario.
3. Se recalculan montos dependientes (horas extra, proporcionales, etc.).
4. Se actualiza la planilla abierta.
5. Se guarda **versin previa** de los montos (auditora de reclculo).
6. Si falla  **rollback automtico** al estado anterior.

### Reglas Inviolables

- **Nunca** se recalculan periodos aplicados.
- El reclculo solo opera sobre planillas en estado **Abierta**.
- Todo reclculo es atmico: se completa totalmente o no se aplica.

---

## 11. Roles y Permisos Dinmicos

### Principio

Sistema de permisos **completamente dinmico**  nunca hardcodeado.

### Capacidades de un Rol

Un rol puede incluir cualquier combinacin de permisos:

| Permiso              | Ejemplo de Accin                         |
|----------------------|-------------------------------------------|
| Crear planillas      | Abrir nuevo periodo                       |
| Editar planillas     | Modificar planilla abierta                |
| Verificar planillas  | Marcar planilla como verificada           |
| Aplicar planillas    | Aplicar planilla (accin irreversible)    |
| Cancelar planillas   | Inactivar planilla                        |
| Crear empleados      | Registrar nuevo empleado                  |
| Editar empleados     | Modificar datos de empleado               |
| Crear acciones       | Crear accin de personal                  |
| Aprobar acciones     | Aprobar accin como supervisor/RRHH       |
| Ver reportes         | Consultar reportes y dashboards           |

### Caractersticas

- Los permisos son **configurables** por empresa.
- Son **modificables en tiempo real** sin reinicio de sistema.
- Soportan **granularidad** a nivel de mdulo y accin.
- Un usuario puede tener **mltiples roles**.

---

## 12. Mens Dinmicos Basados en Permisos

### Flujo

Al iniciar sesin:

1. El backend devuelve los **permisos del usuario** para la empresa activa.
2. El frontend construye el men **dinmicamente** basado en permisos.
3. Si no tiene permiso  **no ve el mdulo**.
4. El backend **valida siempre** cada request (doble seguridad).

### Ejemplos

| Permiso Ausente           | Resultado en UI                    |
|---------------------------|------------------------------------|
| Sin permiso de vacaciones | No ve men de vacaciones           |
| Sin permiso de listar     | No puede consultar listados        |
| Sin permiso de crear      | Botn de crear oculto              |
| Sin permiso de aprobar    | No ve opciones de aprobacin       |

### Regla de Seguridad

**La UI refleja el modelo de seguridad, pero nunca es la nica barrera.** El backend es la fuente de verdad de autorizacin.

---

## 13. Aprobaciones Jerrquicas

### Flujo Tpico

```
Empleado crea accin
       
Supervisor aprueba
       
RRHH valida
       
Entra a planilla
       
Planilla aplicada
       
Accin pagada
```

### Reglas

- Cada transicin requiere **permiso especfico** del rol del usuario.
- El flujo de aprobacin es **configurable** por tipo de accin y por empresa.
- Un supervisor solo puede aprobar acciones de **sus subordinados directos**. Jerarqua de supervisin (Supervisor Global, Supervisor, Empleado) y reglas de asignacin: ver [27-DiagramaFlujoEmpleadosYUsuarios.md](./27-DiagramaFlujoEmpleadosYUsuarios.md).
- RRHH puede validar acciones de **cualquier empleado** segn permisos.

---

## 14. Trazabilidad Total

### Principio

Toda entidad del sistema debe registrar su ciclo de vida completo.

### Campos de Auditora Obligatorios

| Campo               | Descripcin                                    |
|---------------------|------------------------------------------------|
| Usuario creador     | Quin cre el registro                         |
| Usuario modificador | Quin realiz la ltima modificacin           |
| Usuario aprobador   | Quin aprob la transicin (si aplica)         |
| Fecha de creacin   | Timestamp de creacin                          |
| Fecha de modificacin | Timestamp de ltima modificacin             |
| Estado anterior     | Estado previo a la transicin                  |
| Estado nuevo        | Estado posterior a la transicin               |
| Motivo de cambio    | Justificacin textual (obligatorio en estados crticos) |

### Reglas de Auditora

- **Nada es irreversible sin auditora.**
- Los registros de auditora son **inmutables**  no se pueden editar ni eliminar.
- En operaciones crticas (aplicar planilla, cancelar, movimiento de empleado), el motivo de cambio es **obligatorio**.
- El historial de versiones se preserva para entidades crticas (montos de planilla, acciones, salarios).

---

## 15. Base de Datos Enterprise

### Principios de Diseo

| Principio                     | Descripcin                                                    |
|-------------------------------|----------------------------------------------------------------|
| Relaciones normalizadas       | Modelo relacional limpio, sin redundancia innecesaria          |
| Foreign keys estrictas        | Integridad referencial fuerte en todas las relaciones          |
| Transacciones ACID            | Atomicidad, Consistencia, Aislamiento, Durabilidad            |
| Rollbacks controlados         | Toda operacin crtica tiene rollback definido                 |
| Soft delete                   | Cuando aplique, se marca como eliminado sin borrar fsicamente |
| Historial versionado          | Entidades crticas mantienen versiones anteriores              |
| ndices estratgicos          | Optimizacin para queries frecuentes y reportes                |

### Reglas de Procesamiento Masivo

- Los procesos masivos se ejecutan en **transacciones controladas por lote** (no una transaccin global).
- Cada lote tiene registro individual de xito/fallo.
- Los bloqueos en MySQL se minimizan mediante diseo de queries y estrategia de locking.

---

## 16. Non-Functional Requirements (NFRs)

### 16.1 Performance Targets

#### Perfil: Operacin Normal

| Operacin                       | Target        |
|---------------------------------|---------------|
| Creacin de accin de personal  | < 500ms       |
| Apertura de planilla            | < 2s          |
| Reclculo de 100 acciones       | < 5s          |
| Movimiento individual           | < 3s          |
| Consulta de listado (paginado)  | < 1s          |

#### Perfil: Peak Scenario (Cierre de Mes / Quincena)

| Operacin                           | Target        | Nota                                      |
|-------------------------------------|---------------|-------------------------------------------|
| Aplicar planilla (500+ empleados)   | < 30s         | Tolera ms latencia que operaciones CRUD   |
| Reclculo masivo (500+ acciones)    | < 15s         | Procesamiento por lotes                    |
| Movimiento masivo (100 empleados)   | < 10s         | Transacciones por lote, no global          |
| Generacin de reportes              | < 20s         | Puede ser asncrono en Fase 2+            |

### 16.2 Concurrencia

| Perfil           | Usuarios Concurrentes | Procesos Batch Simultneos | Planillas Simultneas |
|------------------|-----------------------|----------------------------|-----------------------|
| Normal Ops       | 100                   | 10                         | 10                    |
| Peak Scenario    | 300500               | 20                         | 1020                 |

### 16.3 Disponibilidad

| Mtrica          | Target Inicial | Target Enterprise (Fase 3) |
|------------------|----------------|----------------------------|
| Disponibilidad   | 99.5%          | 99.9%                      |
| RTO              | < 30 min       | < 15 min                   |
| RPO              | < 5 min        | < 1 min                    |

### 16.4 SLOs Diferenciados

No todas las operaciones tienen el mismo nivel de criticidad:

| Nivel      | Operaciones                                    | Latencia Mxima | Disponibilidad |
|------------|------------------------------------------------|-----------------|----------------|
| Crtico    | Aplicar planilla, reclculo, movimiento masivo | Definido arriba | 99.9%          |
| Alto       | Crear/aprobar acciones, abrir planilla         | < 2s            | 99.5%          |
| Normal     | Consultas, listados, reportes                  | < 5s            | 99%            |
| Bajo       | Configuracin, administracin de roles         | < 10s           | 95%            |

---

## 17. Estrategia de Resiliencia

### Principio

El sistema debe **fallar de forma controlada** y **recuperarse automticamente** cuando sea posible.

### Modelo de Fallo y Recuperacin

#### Eventos Crticos

Todo evento crtico debe:

- **Confirmar procesamiento**  el emisor sabe si el evento fue procesado.
- **Registrar estado**  cada evento tiene estado: pendiente, procesado, fallido.
- **Permitir reintento**  eventos fallidos pueden reprocesarse.

#### Eventos Fallidos

- Se envan a **Dead Letter Queue** (DLQ).
- Generan **alerta** al equipo de operaciones.
- **No bloquean** el flujo principal del sistema.
- Se registra motivo de fallo para diagnstico.

#### Poltica de Reintentos

- Poltica de **backoff exponencial** (1s  2s  4s  8s  ...).
- Nmero mximo de reintentos **configurable** por tipo de evento.
- Despus de agotar reintentos  DLQ + alerta.

#### Idempotencia

- Todos los eventos deben ser **idempotentes**.
- Ejecutarse dos o ms veces nunca produce efectos distintos a ejecutarse una vez.
- Esto es un requisito de diseo, no de implementacin.

### Degradacin Controlada (Graceful Degradation)

| Escenario                        | Comportamiento Esperado                              |
|----------------------------------|------------------------------------------------------|
| Cola de eventos no disponible    | Procesamiento sncrono temporal (Fase 1 behavior)    |
| NetSuite no disponible           | Planilla se aplica normalmente, sync queda en cola   |
| Base de datos degradada          | Solo lectura, operaciones de escritura en cola        |
| Fallo en reclculo               | Rollback automtico, accin queda en estado anterior  |

---

## 18. KPITAL + TimeWise  Contrato de Integracin

### Ecosistema

KPITAL y TimeWise son dos sistemas que comparten infraestructura pero tienen **responsabilidades claramente separadas**.

### Recursos Compartidos

| Recurso        | Compartido | Ownership                |
|----------------|------------|--------------------------|
| Base de datos  |           | Shared infrastructure    |
| Usuarios       |           | Access Control (KPITAL)  |
| Roles          |           | Access Control (KPITAL)  |
| Permisos       |           | Access Control (KPITAL)  |
| Empleados      |           | Employee Management      |

### Responsabilidades

| Sistema   | Puede                                  | No Puede                          |
|-----------|----------------------------------------|-----------------------------------|
| TimeWise  | Crear acciones de personal             | Aplicar planillas                 |
| TimeWise  | Consultar empleados (read-only)        | Modificar datos de empleado       |
| TimeWise  | Generar eventos de asistencia          | Aprobar acciones de planilla      |
| KPITAL    | Procesar planillas                     | Generar datos de asistencia       |
| KPITAL    | Validar acciones recibidas             | Asumir que toda accin es vlida  |
| KPITAL    | Rechazar acciones invlidas de TimeWise |                                 |

### Regla Fundamental

> **Base de datos compartida  responsabilidad compartida.**

Si TimeWise genera una accin invlida  se rechaza en el dominio **Personal Actions** de KPITAL. TimeWise no tiene bypass de validacin.

### Anti-Corruption Layer

KPITAL acta como **anti-corruption layer**: toda accin que ingresa desde TimeWise pasa por las mismas validaciones que una accin creada internamente. No hay "fast path" ni excepciones por origen.

---

## 19. Integracin Futura con NetSuite

### Trigger

Despus de aplicar planilla  evento `PayrollApplied`.

### Flujo

1. `PayrollApplied` se emite.
2. Integration Layer consume el evento.
3. Se transforma la informacin al formato NetSuite.
4. Se enva a NetSuite va API.
5. Se registra confirmacin o fallo.
6. Si falla  cola de reintentos  DLQ si persiste.

### Principios

- Integracin **siempre desacoplada**.
- **Nunca bloquea** el ERP  la planilla se aplica independientemente del estado de NetSuite.
- La informacin contable se sincroniza de forma **eventual** (eventual consistency).
- El estado de sincronizacin es visible y auditable.

---

## 20. Decision Log (ADR-Lite)

| ID     | Decisin                                          | Alternativa Considerada                | Tradeoff                                                    | Impacto                           | Fecha      |
|--------|---------------------------------------------------|----------------------------------------|-------------------------------------------------------------|-----------------------------------|------------|
| ADR-001 | Employee Management es SoR del empleado          | Ownership compartido KPITAL/TimeWise   | Single source of truth vs flexibilidad de TimeWise          | Alto  define boundaries          | 2025-02-21 |
| ADR-002 | Planillas aplicadas son inmutables                | Permitir correcciones retroactivas     | Integridad contable vs facilidad de correccin              | Crtico  base del modelo         | 2025-02-21 |
| ADR-003 | Eventos idempotentes como principio de diseo     | Idempotencia solo donde se necesite    | Esfuerzo de diseo extra vs resiliencia                     | Alto  afecta todo evento         | 2025-02-21 |
| ADR-004 | Fase 1 sin colas distribuidas                     | Implementar colas desde da 1          | Simplicidad inicial vs preparacin para escala              | Medio  afecta timeline           | 2025-02-21 |
| ADR-005 | Anti-corruption layer para acciones de TimeWise   | Trust implcito en datos de TimeWise   | Validacin extra vs performance de ingesta                  | Alto  seguridad de datos         | 2025-02-21 |
| ADR-006 | Permisos dinmicos, nunca hardcodeados            | Permisos estticos por mdulo          | Flexibilidad total vs complejidad de implementacin         | Alto  afecta toda la UI          | 2025-02-21 |
| ADR-007 | SLOs diferenciados por tipo de operacin          | SLO nico para todo el sistema         | Complejidad de monitoreo vs targets realistas               | Medio  afecta infraestructura    | 2025-02-21 |

---

## 21. Qu NO Define Este Documento

Este documento define **visin, principios y direccin**. No define:

- Campos especficos de tablas de base de datos.
- Endpoints de API.
- DTOs o contratos de API.
- Implementacin tcnica exacta (frameworks, libreras).
- Estructura de carpetas del proyecto.
- Configuracin de infraestructura (servidores, instancias).
- Diagramas de secuencia detallados.
- Mockups de interfaz de usuario.

Para cada uno de estos aspectos se generarn documentos tcnicos especficos derivados de esta visin.

---

## Validaciones Automticas Pre-Transicin

Antes de cambiar el estado de una planilla, el sistema ejecuta validaciones automticas:

| Validacin                        | Descripcin                                                  | Bloquea Transicin |
|-----------------------------------|--------------------------------------------------------------|--------------------|
| Acciones pendientes               | No hay acciones en estado intermedio sin resolver             |                   |
| Inconsistencias de monto          | Los montos calculados son coherentes con las reglas           |                   |
| Empleados sin salario             | Todo empleado en planilla tiene salario asignado              |                   |
| Montos negativos                  | No existen montos negativos no justificados                   |                   |
| Aprobacin obligatoria            | Todas las acciones que requieren aprobacin estn aprobadas   |                   |
| Periodo sin ambigedad            | No existe otra planilla para el mismo periodo/empresa         |                   |

El sistema **impide errores humanos** mediante validacin proactiva.

---

## Conclusin

KPITAL 360 no es un CRUD de planillas.

Es un **motor de reglas empresariales automatizado**: un ERP real, multiempresa, basado en eventos, con permisos dinmicos, workflows robustos, trazabilidad total, y diseado para escalar desde un MVP funcional hasta una plataforma enterprise con integracin contable y resiliencia operativa.

Este documento es el **blueprint vivo** que gua todas las decisiones tcnicas del proyecto. Toda implementacin debe ser coherente con los principios aqu definidos, y cualquier desviacin debe documentarse en el Decision Log con justificacin explcita.

---

*Documento generado como referencia arquitectnica formal del proyecto KPITAL 360.*
*Toda modificacin requiere aprobacin del Owner y actualizacin del Changelog.*

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
