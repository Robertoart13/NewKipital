# 03 - Modelo de Datos

## Tablas de cola reales
La implementacion usa dos tablas fisicas (no una sola tabla con `tipo`):
- `sys_empleado_identity_queue`
- `sys_empleado_encrypt_queue`

## Campos principales (ambas colas)
- `id_identity_queue` / `id_encrypt_queue`: PK autoincremental.
- `id_empleado`: referencia al empleado.
- `dedupe_key`: clave de idempotencia unica.
- `estado_queue`: estado de procesamiento.
- `attempts_queue`: numero de intentos.
- `next_retry_at_queue`: proximo intento permitido.
- `locked_by_queue`: worker que tomo lock.
- `locked_at_queue`: fecha/hora de lock.
- `last_error_queue`: ultimo error redactado.
- `fecha_creacion_queue`: creacion.
- `fecha_modificacion_queue`: ultima modificacion.

## Estados soportados
- `PENDING`: en espera.
- `PROCESSING`: en ejecucion.
- `DONE`: finalizado correctamente.
- `ERROR_PERM`: error permanente.
- `ERROR_CONFIG`: error de configuracion.
- `ERROR_DUPLICATE`: conflicto de duplicado.
- `ERROR_FATAL`: error critico.

Estados terminales:
- `DONE`, `ERROR_PERM`, `ERROR_CONFIG`, `ERROR_DUPLICATE`, `ERROR_FATAL`.

## Idempotencia
Indices unicos:
- `UQ_employee_identity_queue_dedupe`
- `UQ_employee_encrypt_queue_dedupe`

Clave usada:
- Identidad: `identity:{id_empleado}`
- Cifrado: `encrypt:{id_empleado}`

## Indices operativos agregados (monitoreo rapido)
Identity:
- `IDX_identity_queue_operational (estado_queue, next_retry_at_queue, locked_at_queue, id_identity_queue)`
- `IDX_identity_queue_employee (id_empleado)`
- `IDX_identity_queue_stuck (estado_queue, locked_at_queue)`

Encrypt:
- `IDX_encrypt_queue_operational (estado_queue, next_retry_at_queue, locked_at_queue, id_encrypt_queue)`
- `IDX_encrypt_queue_employee (id_empleado)`
- `IDX_encrypt_queue_stuck (estado_queue, locked_at_queue)`

## Datos de empleado relacionados
Campos de control en `sys_empleados`:
- `id_usuario`
- `estado_empleado`
- `datos_encriptados_empleado`
- `version_encriptacion_empleado`
- `fecha_encriptacion_empleado`
- `email_hash_empleado`
- `cedula_hash_empleado`
