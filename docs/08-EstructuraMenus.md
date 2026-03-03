# KPITAL 360 — Estructura de Menús Definida

**Documento:** 08  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [06-DirectivasHeaderMenu.md](./06-DirectivasHeaderMenu.md)

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Contexto

Roberto fue definiendo las opciones del menú de forma incremental a través de directivas. Este documento consolida **exactamente qué opciones existen**, con su estructura de submenús tal como quedó definida.

**Solo existe un menú: el menú horizontal superior (header).** No hay sidebar ni menú lateral.

---

## Menú Horizontal Principal (Header — Nivel 2)

Vive en `store/slices/menuSlice.ts`. Estructura jerárquica con submenús multinivel (dropdowns).

---

### Acciones de Personal

Permiso requerido: `personal-action:view`

```
Acciones de Personal
├── Entradas de Personal
├── Salidas de Personal
│   ├── Despidos
│   └── Renuncias
├── Deducciones
│   ├── Retenciones
│   └── Descuentos
├── Compensaciones
│   ├── Aumentos
│   ├── Bonificaciones
│   ├── Horas Extras
│   └── Vacaciones
├── Incapacidades
├── Licencias y Permisos
└── Ausencias
```

### Parametros de Planilla

Permiso requerido: por opcion

```
Parametros de Planilla
└── Parametros Iniciales
    ├── Calendario de Nómina >
    │   ├── Calendario
    │   ├── Listado de Feriados
    │   └── Listado de Días de Pago de Planilla
    ├── Artículos de Nomina
    └── Movimientos de Nomina
```

Permisos por opcion:
- Articulos de Nomina: `payroll-article:view`
- Movimientos de Nomina: `payroll-movement:view`
- Calendario: `payroll:calendar:view`
- Listado de Feriados: `payroll-holiday:view`
- Listado de Dias de Pago de Planilla: `payroll:view`

### Gestion Planilla

Actualmente **fuera de alcance** y oculto en menu.  
La apertura/listado/operacion de planillas se trabaja desde:
- `Parametros de Planilla > Calendario de Nómina > Listado de Días de Pago de Planilla`
- `Parametros de Planilla > Calendario de Nómina > Calendario`

### Configuracion

Cada opción tiene su propio permiso. Si el permiso no existe en la BD o no está asignado al usuario autenticado, la opción se **oculta**.

```
Configuracion
├── [Seguridad]
│   ├── Permisos        → config:permissions
│   ├── Roles           → config:roles
│   └── Usuarios        → config:users
│
└── [Gestion de Organizacional]
    ├── Reglas de Distribución  → config:reglas-distribucion
    ├── Empresas                → company:view
    ├── Empleados               → employee:view
    ├── Clases                  → config:clases
    ├── Proyectos               → config:proyectos
    ├── Cuentas Contables       → config:cuentas-contables
    ├── Departamentos           → config:departamentos
    └── Puestos                 → config:puestos
```

**Regla:** Las opciones sin permiso definido en BD (ej. `config:clases`, `config:proyectos`) permanecen ocultas hasta que el permiso se cree y se asigne a roles.

---

## Regla de visibilidad por permisos

**Toda opción de menú debe tener `requiredPermission`.** El selector `getVisibleMenuItems` filtra según los permisos del usuario autenticado:

- Si el permiso **no existe en la BD**: nadie lo tiene → la opción queda oculta.
- Si el permiso **existe pero no está asignado** al usuario (vía roles/overrides): la opción queda oculta.
- Solo se muestra cuando el permiso existe en `sys_permisos` y el usuario lo tiene asignado.

Las opciones que aún no tienen permiso creado en BD (ej. Reglas de Distribución, Clases, Proyectos) permanecen ocultas hasta que se defina el permiso y se asigne a roles en Configuración > Roles.

---

## Historial de Definiciones

| Directiva | Qué Definió Roberto |
|-----------|---------------------|
| Primera | Estructura del header con 4 opciones principales y placeholders |
| Segunda | Submenú "Acciones de Personal" completo: Entradas, Salidas, Deducciones, Compensaciones, Incapacidades, Licencias, Ausencias |
| Tercera | Sub-submenú "Salidas de Personal" → Despidos, Renuncias |
| Cuarta | Sub-submenú "Deducciones" → Retenciones, Descuentos |
| Quinta | Sub-submenú "Compensaciones" → Aumentos, Bonificaciones, Horas Extras, Vacaciones |
| Sexta | "Parametros de Planilla": Calendario de Nómina (Calendario, Días de Pago), Artículos de Nomina, Movimientos de Nomina |
| Séptima | "Gestion Planilla" se difiere; opciones ocultas por alcance actual |
| Octava | "Configuracion" completo: Seguridad (Roles y Permisos con sub, Usuarios) + Gestion Organizacional (Reglas, Empresas, Empleados, Clases, Proyectos, Cuentas, Departamentos, Puestos) |

---

## Pendiente de Definir

| Elemento | Estado |
|----------|--------|
| (Todos los menús están definidos) | — |

Cuando Roberto defina estas opciones, se agregan en `menuSlice.ts` reemplazando los placeholders.

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
