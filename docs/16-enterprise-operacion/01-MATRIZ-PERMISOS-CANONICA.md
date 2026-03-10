# Matriz Canonica de Permisos

## Objetivo
Centralizar permisos efectivos por rol, modulo, accion, app y empresa.

## Estructura canonica
| App | Modulo | Accion | Permiso | Rol base | Override usuario | Empresa scope |
|---|---|---|---|---|---|---|
| kpital | empleados | crear | employee:create | RRHH Admin | Allow/Deny | Empresa activa |
| kpital | empleados | ver | employee:view | RRHH Operador | Allow/Deny | Empresa activa |
| kpital | planilla | generar | payroll:generate | Payroll Admin | Allow/Deny | Empresa activa |
| kpital | planilla | aplicar | payroll:apply | Payroll Admin | Allow/Deny | Empresa activa |
| kpital | acciones | aprobar | hr-action:approve | RRHH Admin | Allow/Deny | Empresa activa |
| kpital | configuracion | empresas | company:manage | Config Admin | Allow/Deny | Multiempresa |

## Regla de resolución
1. Deny explícito de usuario.
2. Allow explícito de usuario.
3. Permiso por rol.
4. Si no existe permiso -> denegar.

## Uso
- Esta matriz es referencia de negocio y seguridad para UI, API y QA.
