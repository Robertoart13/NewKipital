# Manual de Usuario - Configuracion Organizacional

## Modulos incluidos
- Departamentos
- Puestos
- Clases
- Proyectos

## Orden recomendado
1. Departamentos
2. Puestos
3. Clases
4. Proyectos

## Departamentos
Ruta: `Configuracion > Departamentos`

Campos:
- `nombre` (obligatorio)
- `idExterno` (opcional)

Permisos:
- Ver: `department:view`
- Crear: `department:create`
- Editar: `department:edit`
- Inactivar/Reactivar: `department:inactivate`, `department:reactivate`

## Puestos
Ruta: `Configuracion > Puestos`

Campos:
- `nombre` (obligatorio)
- `descripcion` (opcional)

Permisos:
- Ver: `position:view`
- Crear: `position:create`
- Editar: `position:edit`
- Inactivar/Reactivar: `position:inactivate`, `position:reactivate`

## Clases
Ruta: `Configuracion > Clases`

Campos:
- `nombre` (obligatorio)
- `descripcion` (opcional)
- `codigo` (obligatorio)
- `idExterno` (opcional)

Permisos:
- Ver: `class:view`
- Crear: `class:create`
- Editar: `class:edit`
- Inactivar/Reactivar: `class:inactivate`, `class:reactivate`

## Proyectos
Ruta: `Configuracion > Proyectos`

Campos:
- `idEmpresa` (obligatorio)
- `nombre` (obligatorio)
- `descripcion` (opcional)
- `codigo` (obligatorio)
- `idExterno` (opcional)

Permisos:
- Ver: `project:view`
- Crear: `project:create`
- Editar: `project:edit`
- Inactivar/Reactivar: `project:inactivate`, `project:reactivate`

## Regla operativa
No se recomienda eliminar contexto organizacional en uso. Use inactivacion controlada para mantener trazabilidad historica.

## Ver tambien
- [Empleados](./02-EMPLEADOS.md)
- [Movimientos de nomina](./12-MOVIMIENTOS-NOMINA.md)
