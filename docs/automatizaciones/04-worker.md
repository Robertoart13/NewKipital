# 04 - Worker

## Ciclo de ejecucion
Servicio: `EmployeeDataAutomationWorkerService`

Por tick:
1. Liberar locks vencidos (TTL 10 min).
2. Encolar candidatos de identidad.
3. Encolar candidatos de cifrado.
4. Procesar batch de identidad.
5. Procesar batch de cifrado.
6. Log de ciclo y backlog periodico.
7. Ejecutar purga de retencion (cada 6 horas).

## Seleccion de jobs
Criterio para tomar jobs en ambos workers:
- `estado = PENDING`
- `nextRetryAt IS NULL OR nextRetryAt <= NOW()`
- Orden por `fechaCreacion ASC`

## Locking
Al tomar job:
- `estado = PROCESSING`
- `lockedBy = workerId`
- `lockedAt = now`
- `attempts = attempts + 1`

## Finalizacion
Si completa:
- `estado = DONE`
- lock limpio
- `nextRetryAt = NULL`
- `lastError = NULL`

## Errores y reintentos
- Error terminal (`QueueTerminalError`): setea `ERROR_*` y no reintenta.
- Error no terminal:
  - Si intentos >= 5: `ERROR_FATAL`.
  - Si intentos < 5: vuelve a `PENDING` con backoff lineal (`attempts * 60s`).

## Recuperacion de huerfanos
Metodo `releaseStuckJobs`:
- Busca `PROCESSING` con `locked_at_queue < NOW() - 10 min`.
- Regresa a `PENDING` y limpia lock.

## Retencion automatica en worker
Ejecucion: cada 6 horas.

Politica aplicada:
- `DONE` older than 30 dias: se elimina.
- `ERROR_*` older than 90 dias: se elimina.
- `PROCESSING` older than 7 dias: se elimina por ruido operativo historico.

## Reglas internas worker identidad
- Si empleado no existe: `ERROR_FATAL`.
- Si empleado inactivo: `DONE` sin provisionar.
- Si ya tiene `id_usuario`: `DONE`.
- Valida existencia de app `timewise` y rol `EMPLEADO_TIMEWISE`.
- Politica de duplicado:
  - Reuse usuario existente solo si empresa coincide y no hay conflicto de cedula hash.
  - Si no coincide: `ERROR_DUPLICATE`.

## Reglas internas worker cifrado
- Cifra solo campos no cifrados (`enc:v*`).
- Marca `datos_encriptados_empleado = 1`.
- Genera hashes de cedula y email.
- Propaga cifrado a provisiones de aguinaldo.
- Evita reencriptar valores ya cifrados.
