# 06 - Monitoreo

## Objetivo
Dar visibilidad operativa en tiempo real para colas, backlog, throughput y errores, sin exponer PII.

## Permisos
- `automation:monitor`: ver monitoreo.
- `automation:admin`: ejecutar acciones operativas.

Sin permiso:
- Menu no visible.
- Endpoints devuelven `403`.

## Endpoints
- `GET /ops/queues/summary`
- `GET /ops/queues/identity`
- `GET /ops/queues/encrypt`
- `GET /ops/queues/health-check`
- `POST /ops/queues/rescan`
- `POST /ops/queues/release-stuck`
- `POST /ops/queues/requeue/:id`

## Modo de uso del dashboard
### Operativo (default)
- Carga solo estados activos y de error (`PENDING`, `PROCESSING`, `ERROR_*`).
- Ordenado para diagnostico rapido.
- Limite maximo por consulta: 200.

### Historial
- Enfocado en `DONE`.
- Requiere filtro temporal (default ultimas 24h; soporta 7 y 30 dias).
- Limite maximo por consulta: 100.

## KPI y formulas
- `PENDING/PROCESSING/DONE/ERROR_*`: conteo por estado en cada cola.
- `activosSinUsuario`: empleados activos con `id_usuario IS NULL`.
- `activosNoCifrados`: empleados activos con `datos_encriptados_empleado = 0/null`.
- `plaintextDetected`: conteo de campos sensibles con valor no `enc:v%`.
- `oldestPendingAgeMinutes`: diferencia en minutos del `PENDING` mas antiguo (entre ambas colas).
- `throughputJobsPerMin5`: (`DONE_ultimos_5min_identity + DONE_ultimos_5min_encrypt`) / 5.
- `throughputJobsPerMin15`: (`DONE_ultimos_15min_identity + DONE_ultimos_15min_encrypt`) / 15.
- `errorsLast15m`: errores `ERROR_*` en los ultimos 15 minutos (ambas colas).
- `stuckProcessing`: total de jobs `PROCESSING` sin lock o lock vencido.

## UX implementada
- Pantalla 100% en espanol.
- Tooltips explicativos en tarjetas.
- Acordeon pedagogico `Que significa este monitoreo?`.
- Botones: `Actualizar ahora`, `Reanalizar ahora`, `Liberar procesos bloqueados`, `Reintentar`.
- Vista dual: `Operativo` / `Historial de procesados`.
- Semaforo de salud visible.

## Datos ocultos
- No se muestran datos sensibles de empleados.
- `last_error` redacta emails y numeros largos.
