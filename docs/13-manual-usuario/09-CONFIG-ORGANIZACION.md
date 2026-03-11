# 📘 Manual de Usuario - Configuracion Organizacional

## 🎯 Modulos incluidos
- Regla de distribucion
- Departamentos
- Puestos
- Clases
- Proyectos

## 🎯 Orden recomendado
1. Regla de distribucion
2. Departamentos
3. Puestos
4. Clases
5. Proyectos

## 🎯 Regla de distribucion
Ruta: `Configuracion > Regla de Distribucion`

Flujo:
1. Elegir empresa.
2. Definir si la regla es global (todos los empleados) o especifica (departamento/puesto).
3. Agregar lineas: tipo de accion personal + cuenta contable.
4. Guardar la regla.

Reglas clave:
- Global: no permite departamento ni puesto.
- Especifica: exige departamento y puesto opcional.
- No se permite repetir el mismo tipo de accion personal en la misma regla.
- La cuenta contable debe pertenecer a la empresa seleccionada y al mismo tipo de accion personal.

Permisos:
- Listar: `config:reglas-distribucion`
- Ver detalle: `config:reglas-distribucion:view`
- Crear/Editar/Inactivar/Reactivar: `config:reglas-distribucion:edit`
- Ver bitacora: `config:reglas-distribucion:audit`

Estado actual del modulo:
- Ya existe listado, creacion, edicion, inactivacion y reactivacion.
- La URL de edicion usa `publicId` firmado (no expone ID interno).
- La bitacora tecnica se consulta desde la vista de edicion (si el usuario tiene permiso de auditoria).

Que valida el sistema al guardar:
1. La empresa es obligatoria.
2. Si la regla es global, no usa departamento ni puesto.
3. Si la regla es especifica, departamento es obligatorio y puesto es opcional.
4. No se permite repetir el mismo tipo de accion personal en dos lineas de la misma regla.
5. La cuenta contable debe corresponder a la empresa y al tipo de accion seleccionado.

Pendiente para continuar despues:
- Completar y publicar la vista funcional `Distribucion de la planilla` (detalle de planillas aplicadas) para cerrar el flujo contable final.
- Definir con negocio si se requiere reporte/exportacion de reglas de distribucion (CSV/PDF) para auditoria operativa.

## 🎯 Departamentos
Ruta: `Configuracion > Departamentos`

Campos:
- `nombre` (obligatorio)
- `idExterno` (opcional)

Permisos:
- Ver: `department:view`
- Crear: `department:create`
- Editar: `department:edit`
- Inactivar/Reactivar: `department:inactivate`, `department:reactivate`

## 🎯 Puestos
Ruta: `Configuracion > Puestos`

Campos:
- `nombre` (obligatorio)
- `descripcion` (opcional)

Permisos:
- Ver: `position:view`
- Crear: `position:create`
- Editar: `position:edit`
- Inactivar/Reactivar: `position:inactivate`, `position:reactivate`

## 🎯 Clases
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

## 🎯 Proyectos
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

## 🎯 Regla operativa
No se recomienda eliminar contexto organizacional en uso. Use inactivacion controlada para mantener trazabilidad historica.

## 🔗 Ver tambien
- [Empleados](./02-EMPLEADOS.md)
- [Movimientos de nomina](./12-MOVIMIENTOS-NOMINA.md)


