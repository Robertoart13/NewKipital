# KPITAL 360 — Estructura de Menús Definida

**Documento:** 08  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [06-DirectivasHeaderMenu.md](./06-DirectivasHeaderMenu.md)

---

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

Permiso requerido: `payroll:view`

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

### Gestion Planilla

Permiso requerido: `payroll:view`

```
Gestion Planilla
├── Planillas >
│   ├── Generar Planilla
│   ├── Listado de planillas
│   ├── Listado de planilla Aplicadas
│   └── Carga Masiva
└── Traslado Interempresas
```

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
| Sexta | "Parametros de Planilla" completo: Calendario de Nómina (Calendario, Feriados, Días de Pago), Artículos de Nomina, Movimientos de Nomina |
| Séptima | "Gestion Planilla" completo: Planillas (Generar, Listado, Aplicadas, Carga Masiva), Traslado Interempresas |
| Octava | "Configuracion" completo: Seguridad (Roles y Permisos con sub, Usuarios) + Gestion Organizacional (Reglas, Empresas, Empleados, Clases, Proyectos, Cuentas, Departamentos, Puestos) |

---

## Pendiente de Definir

| Elemento | Estado |
|----------|--------|
| (Todos los menús están definidos) | — |

Cuando Roberto defina estas opciones, se agregan en `menuSlice.ts` reemplazando los placeholders.
