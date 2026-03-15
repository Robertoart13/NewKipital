# 09 - Operacion y Mantenimiento

## Reiniciar workers
Los workers viven dentro de la API Nest:
1. Reiniciar proceso API (`npm run start:dev` o servicio productivo equivalente).
2. Verificar log de arranque: `Worker started id=... intervalMs=5000`.

## Revisar estado rapido SQL
```sql
SELECT estado_queue, COUNT(*) FROM sys_empleado_identity_queue GROUP BY estado_queue;
SELECT estado_queue, COUNT(*) FROM sys_empleado_encrypt_queue GROUP BY estado_queue;
SELECT COUNT(*) FROM sys_empleados WHERE estado_empleado = 1 AND id_usuario IS NULL;
SELECT COUNT(*) FROM sys_empleados WHERE estado_empleado = 1 AND (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL);
```

## Liberar locks vencidos
Opcion UI (permiso admin): `Liberar procesos bloqueados`.

Opcion API:
- `POST /ops/queues/release-stuck`

## Reanalizar candidatos
Opcion UI: `Reanalizar ahora`.

Opcion API:
- `POST /ops/queues/rescan`

## Reintentar un job
Opcion UI: `Reintentar` por fila.

Opcion API:
- `POST /ops/queues/requeue/:id` body `{ "queue": "identity" | "encrypt" }`

## Politica de retencion productiva
Implementada (opcion simple enterprise):
- Mantener `DONE` por 30 dias.
- Mantener `ERROR_*` por 90 dias.
- Mantener `PROCESSING` historico maximo 7 dias.

Ejecucion automatica de purga:
- Cada 6 horas desde el worker.
- Resultado logueado en `Retention purge ...`.

## Diagnostico rapido por sintomas
Worker detenido:
- Throughput ~0
- `oldestPending` sube
- `PENDING` no drena

Alta carga:
- `PENDING` alto
- Throughput alto
- `oldestPending` estable o sube lento

Lock permanente:
- `PROCESSING` con `locked_at` viejo o null
- Resolver con `release-stuck`

## Incidente real documentado
Caso observado: menu `Monitoreo` no navegaba y no aparecia para algunos usuarios.
Causa compuesta:
1. Configuracion de menu/ruta sin navegacion directa.
2. Permisos `automation:monitor` / `automation:admin` no presentes en BD en ese entorno.

Correccion aplicada:
- Ruta directa `monitoring -> /monitoring/automation` + redirect `/monitoring`.
- Migracion y asignacion de permisos en BD.
- Re-login para refrescar contexto de permisos.
