# DOC 27 — Diagrama: Flujo Empleados, Roles y Vista Configuración

**Objetivo:** Documentar visualmente el modelo de identidad, creación de empleados con roles, y quién aparece en Configuración → Usuarios.

**Contexto:** KPITAL y TimeWise son apps distintas que comparten la misma BD. Un solo login para ambas. Los empleados se crean solo desde KPITAL.

---

## 1. Arquitectura General

![Arquitectura KPITAL + TimeWise](../assets/docs-diagrama-kpital-timewise-identidad.png)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MISMA BASE DE DATOS                                │
│  sys_usuarios | sys_empleados | sys_usuario_app | sys_usuario_rol | ...     │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                    │
          │                                    │
          ▼                                    ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│        KPITAL            │      │       TimeWise            │
│  (ERP Planilla / RRHH)   │      │  (Asistencia / Autoserv.) │
├──────────────────────────┤      ├──────────────────────────┤
│ • Crear empleados        │      │ • Marcar asistencia       │
│ • Planillas              │      │ • Ver vacaciones          │
│ • Configuración usuarios │      │ • Ausencias               │
│ • Solo staff RRHH/admin  │      │ • Registro de tiempo      │
└──────────────────────────┘      └──────────────────────────┘

   CREACIÓN DE EMPLEADOS: solo desde KPITAL (nunca desde TimeWise)
   UN LOGIN: mismo email/password para ambas apps
```

---

## 2. Quién Crea Empleados

```
                    ¿Quién puede crear empleados?
                                    │
                                    ▼
              ┌─────────────────────────────────────────┐
              │  Usuarios con acceso a KPITAL           │
              │  (staff administrativo: RRHH, admins)   │
              └─────────────────────────────────────────┘
                                    │
                                    │  POST /api/employees
                                    ▼
              ┌─────────────────────────────────────────┐
              │  EmployeeCreationWorkflow               │
              │  (solo desde KPITAL, nunca TimeWise)    │
              └─────────────────────────────────────────┘
```

---

## 3. Creación de Empleado — Flujo con Roles

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  FORMULARIO CREAR EMPLEADO (KPITAL)                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [ ] Crear acceso a TimeWise     ──►  Si ☑: muestra selector "Rol TimeWise"      │
│                                        Roles disponibles: Empleado, Supervisor   │
│                                                                                  │
│  [ ] Crear acceso a KPITAL       ──►  Si ☑: requiere permiso "employee:assign-   │
│                                        kpital-role" del creador                  │
│                                        Muestra selector "Rol KPITAL"             │
│                                        Roles: según catálogo sys_roles (app KPITAL)│
│                                                                                  │
│  Si ambos ☑: puede tener Empleado (TW) + Admin (KPITAL) en la misma persona      │
│  Ej: Ana de RRHH = Admin KPITAL + Empleado TimeWise (también marca asistencia)   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW (transacción única)                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  1. Crear sys_usuarios                                                           │
│  2. Crear sys_empleados (id_usuario vinculado)                                   │
│  3. sys_usuario_app (TimeWise y/o KPITAL)                                        │
│  4. sys_usuario_empresa                                                          │
│  5. sys_usuario_rol (NUEVO) — por cada app seleccionada, insertar rol elegido    │
│     • TimeWise + rol Empleado  → 1 fila (id_usuario, id_rol, id_empresa, id_app) │
│     • TimeWise + rol Supervisor→ 1 fila                                          │
│     • KPITAL + rol X           → 1 fila (si creador tiene permiso)               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Roles por App (Separados)

```
TimeWise:
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐
│ EMPLEADO        │     │ SUPERVISOR       │     │ SUPERVISOR_GLOBAL        │
│ Solo autoservicio│     │ Empleado + más   │     │ Ver/aprobar todo,        │
│ (vacaciones,    │     │ (gestiona otros, │     │ supervisa supervisores   │
│  asistencia)    │     │  ver reportes)   │     │ y empleados              │
└─────────────────┘     └──────────────────┘     └──────────────────────────┘
        │                         │                           │
        └─────────────────────────┴────────── Son 3 ROLES distintos
                   Si quitas Supervisor → queda Empleado

KPITAL:
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ MASTER          │     │ RRHH             │     │ Otros roles...   │
│ Admin total     │     │ Planilla, emp.   │     │ (crear según     │
│                 │     │                  │     │  necesidades)    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

**Regla:** Una persona puede tener rol Empleado (TimeWise) + rol Admin (KPITAL). Si le quitas KPITAL, sigue siendo Empleado en TimeWise.

---

## 5. Vista Configuración → Usuarios — Quién Aparece

```
                    TODOS los sys_usuarios
                              │
                              │  FILTRO (no mostrar "empleados puros")
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ¿Aparece en Configuración → Usuarios?                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ✅ SÍ aparece:                                                                  │
│     • Tiene acceso a KPITAL (cualquier rol) — gestionan planilla                 │
│     • Tiene acceso a TimeWise Y rol Supervisor (o superior)                      │
│                                                                                  │
│  ❌ NO aparece:                                                                  │
│     • Solo TimeWise + rol Empleado — son empleados operativos, no se configuran  │
│       desde aquí (su perfil se gestiona vía Empleados, no vía Config Usuarios)   │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Columna adicional sugerida: "Aplicaciones" → KPITAL | TimeWise | Ambas          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Diagrama de Casos

```
                    CREAR EMPLEADO
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   Sin acceso       Solo TW           TW + KPITAL
   digital          (Empleado o       (combo roles)
   (id_usuario      Supervisor)
   = NULL)
          │               │               │
          ▼               ▼               ▼
   No login         Login TW          Login ambas
   No aparece       Aparece solo      Aparece en
   en Config        en Config si      Config (staff)
   Usuarios         es Supervisor
```

---

## 7. Permisos del Creador al Asignar Roles KPITAL

```
Creador (usuario autenticado en KPITAL)
         │
         │  Quiere asignar rol KPITAL al nuevo empleado
         ▼
¿Tiene permiso employee:assign-kpital-role?
         │
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ▼         ▼
 Muestra    No muestra selector de roles KPITAL
 selector   Solo puede asignar TimeWise (Empleado/Supervisor)
 roles
 KPITAL
```

---

## 8. Resumen de Reglas (ver sección 11 para reglas completas)

Reglas principales: ver **[11. Resumen de Reglas (Actualizado)](#11-resumen-de-reglas-actualizado)**.

---

## 9. Estado Actual vs. Propuesto

| Aspecto | Actual | Propuesto |
|---------|--------|-----------|
| Asignación de roles al crear empleado | ❌ No existe | ✅ Selector de roles por app |
| Workflow inserta en sys_usuario_rol | ❌ No | ✅ Sí |
| Filtro en Config → Usuarios | Muestra todos | Filtra empleados puros (solo TW+Empleado) |
| Permiso para asignar rol KPITAL | ❌ No existe | ✅ employee:assign-kpital-role |
| Roles TimeWise en BD | SUPERVISOR_TIMEWISE (script) | EMPLEADO_TIMEWISE + SUPERVISOR_TIMEWISE + SUPERVISOR_GLOBAL_TIMEWISE (seed/migración) |
| Dropdown supervisor | Muestra todos los empleados | Solo empleados con rol Supervisor o Supervisor Global en TimeWise |
| Supervisor cross-empresa | Modelo permite (FK sin restricción) | Documentado y permitido (ej: supervisor renunció, asignar de otra empresa) |

---

## 10. Jerarquía de Supervisión en TimeWise

### 10.1 Niveles

| Nivel | Rol en TimeWise | Descripción | Permisos |
|-------|-----------------|-------------|----------|
| **Supervisor Global** | `SUPERVISOR_GLOBAL_TIMEWISE` | Rol con permisos extra. Puede supervisar supervisores y empleados. Ver todo, aprobar todo. | Ver/aprobar asistencia, vacaciones, ausencias de cualquier empleado o supervisor bajo su alcance |
| **Supervisor** | `SUPERVISOR_TIMEWISE` | Supervisa empleados. Puede tener otro supervisor (incl. otro supervisor o supervisor global). | Gestionar empleados a su cargo; no tiene alcance sobre otros supervisores salvo si es su supervisor directo |
| **Empleado** | `EMPLEADO_TIMEWISE` | Sin permisos sobre otros. Solo autoservicio. | Marcar asistencia, ver vacaciones propias, ausencias propias |

**Regla:** Supervisor Global es un **rol** con permisos extra, no solo posición en organigrama. Se asigna en sys_usuario_rol.

### 10.2 Asignación de Supervisor (id_supervisor_empleado)

Se asigna al crear o editar empleado, en el formulario (Sección Organización).

**Filtro del dropdown "Supervisor":**

| Regla | Descripción |
|-------|-------------|
| **Solo Supervisores** | Solo se muestran empleados que tengan rol `SUPERVISOR_TIMEWISE` o `SUPERVISOR_GLOBAL_TIMEWISE` en TimeWise para esa empresa |
| **No empleados** | Los empleados con solo rol Empleado NO aparecen — no tienen permisos que afecten a otros empleados |
| **Cross-empresa permitido** | El supervisor puede ser empleado de **otra empresa** (ej: holdings, matriz, cuando el supervisor original renunció y se asigna uno de otra empresa del grupo) |

### 10.3 Diagrama de Jerarquía

```
                    SUPERVISOR GLOBAL (rol)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        Roberto (sup)    Alex (sup)      María (sup)
        id_supervisor    id_supervisor   id_supervisor
        = null o Global  = Roberto       = Global
              │               │
              │               └── Pedro (empleado)
              └── Juan (empleado)
```

### 10.4 Supervisor Cross-Empresa

| Caso | Permitido | Nota |
|------|-----------|------|
| Empleado Empresa A, supervisor Empresa A | ✅ | Caso típico |
| Empleado Empresa A, supervisor Empresa B | ✅ | Holdings, matriz. Ej: supervisor renunció en A, se asigna uno de B |
| FK id_supervisor_empleado | Sin restricción de empresa | Apunta a sys_empleados.id_empleado; no valida misma empresa |

---

## 11. Resumen de Reglas (Actualizado)

| # | Regla |
|---|-------|
| 1 | Empleados solo se crean desde KPITAL. Quien crea debe tener acceso a KPITAL. |
| 2 | Al crear con acceso: elegir app(s) + rol(es) por app. TimeWise: Empleado, Supervisor o Supervisor Global. KPITAL: según catálogo + permiso del creador. |
| 3 | Empleado y Supervisor son roles distintos. Supervisor = Empleado + más permisos. Supervisor Global = rol con permisos extra (ver/aprobar todo en alcance). |
| 4 | Configuración → Usuarios: solo staff KPITAL y supervisores TimeWise. No empleados puros (solo TW + Empleado). |
| 5 | Un usuario puede ser Admin KPITAL y Empleado TimeWise a la vez. Cada rol es independiente por app. |
| 6 | Dropdown "Supervisor": solo empleados con rol Supervisor o Supervisor Global en TimeWise. No empleados. |
| 7 | Supervisor puede ser de otra empresa (cross-empresa permitido). |
