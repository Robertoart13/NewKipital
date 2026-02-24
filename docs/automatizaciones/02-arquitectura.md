# 02 - Arquitectura

## Modelo
Arquitectura asincrona basada en dos colas independientes:
1. Cola de Identidad (`sys_empleado_identity_queue`).
2. Cola de Cifrado (`sys_empleado_encrypt_queue`).

Cada cola tiene:
- Estados (`PENDING`, `PROCESSING`, `DONE`, `ERROR_*`).
- Lock (`locked_by_queue`, `locked_at_queue`).
- Reintentos (`attempts_queue`, `next_retry_at_queue`).
- Idempotencia (`dedupe_key` unico).

## Flujo alto nivel
1. Se crea/actualiza empleado.
2. Enqueue de identidad si aplica (`activo + sin usuario`).
3. Worker identidad procesa y vincula usuario/app/rol.
4. Enqueue de cifrado si aplica (`datos_encriptados = 0/null`).
5. Worker cifrado procesa y marca cifrado completo.

## Componentes tecnicos
Backend:
- `EmployeeDataAutomationWorkerService`
- `OpsService`
- `OpsController`

Frontend:
- `AutomationMonitoringPage`
- Cliente API `opsMonitoring.ts`

## Politica anti-starvation (correccion aplicada)
En ambos scans de enqueue:
- `ORDER BY e.id_empleado ASC`
- Exclusion de empleados ya encolados en estados activos (`PENDING`, `PROCESSING`).
- `INSERT IGNORE` + `dedupe_key` unico como segunda barrera.

Esto evita que `LIMIT` provoque starvation bajo carga alta.

## Polling y lotes actuales
- Intervalo de tick: 5 segundos.
- Batch process identity: 25 jobs por tick.
- Batch process encrypt: 50 jobs por tick.
- Batch scan enqueue: hasta 200 candidatos por ciclo por cola.

## Diseño operativo de consulta para dashboard
- Vista operativa (default): solo `PENDING`, `PROCESSING`, `ERROR_*`.
- Vista historial: `DONE` con rango de fechas obligatorio (default ultimas 24h).
- Limite duro operativo: 200.
- Limite duro historial: 100.

## Dependencias operativas
- App activa `timewise`.
- Rol activo `EMPLEADO_TIMEWISE`.
- Permisos de monitoreo (`automation:monitor`) y operacion (`automation:admin`).
