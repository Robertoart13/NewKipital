# Manual Tecnico - Reglas Tecnicas

## Reglas de implementacion
- Validacion de permisos en backend como fuente de verdad.
- Auditoria obligatoria en operaciones criticas (create/update/inactivate/reactivate).
- Inactivacion logica sobre eliminacion fisica en modulos de negocio.
- Validaciones de negocio por estado antes de transiciones de flujo.
- Cifrado de datos sensibles de empleados + hashes para busqueda.

## Reglas de estado
- Acciones de personal solo consumibles en planilla cuando estan aprobadas.
- Planilla aplicada no debe volver a editarse.
- Empresa o empleado no se inactivan si hay bloqueos de planilla/acciones.

## Regla de autorizacion
Permiso efectivo = roles por contexto + roles globales - exclusiones + overrides (ALLOW/DENY) - denegaciones globales.

## Ver tambien
- [Seguridad y permisos](./02-SEGURIDAD-PERMISOS.md)
- [Reglas maestras](../03-reglas/REGLAS-MAESTRAS-CANONICAS.md)
