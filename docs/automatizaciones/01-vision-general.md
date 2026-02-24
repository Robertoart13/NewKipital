# 01 - Vision General

## Proposito
El modulo de automatizaciones garantiza tres objetivos operativos:
1. Crear o validar la identidad digital del empleado activo.
2. Cifrar datos sensibles del empleado y provisiones relacionadas.
3. Mantener trazabilidad con colas asincronas, reintentos controlados y monitoreo operativo.

## Alcance
Incluye:
- Worker de identidad.
- Worker de cifrado.
- Colas `sys_empleado_identity_queue` y `sys_empleado_encrypt_queue`.
- API de operaciones (`/ops/queues/*`).
- Modulo UI de Monitoreo en la app.

No incluye:
- Payroll logic de negocio fuera de identidad/cifrado.
- Rotacion completa de llaves legacy (solo base preparada).

## Resultado esperado
Para empleado activo (`estado_empleado = 1`):
- `id_usuario` asociado.
- App TimeWise activa para el usuario.
- Rol por defecto `EMPLEADO_TIMEWISE` activo.
- Campos sensibles cifrados (`enc:v*`).
- `datos_encriptados_empleado = 1`.

## Trazabilidad
Puntos de control:
- Logs de workers por ciclo y por job.
- Estado por cola y por job.
- KPIs en modulo Monitoreo.
- Endpoints operativos para diagnostico y acciones controladas.
