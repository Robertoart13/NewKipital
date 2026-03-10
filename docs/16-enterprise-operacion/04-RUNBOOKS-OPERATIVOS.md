# Runbooks Operativos

## Objetivo
Definir pasos exactos para recuperar operación ante fallas frecuentes.

## Runbook 1 - Usuario sin acceso esperado
1. Verificar empresa activa.
2. Verificar rol asignado.
3. Verificar overrides deny.
4. Refrescar sesión/permisos.

## Runbook 2 - Planilla bloqueada
1. Identificar estado actual.
2. Validar bloqueos por acciones pendientes.
3. Revisar compatibilidad de periodo.
4. Aplicar resolución según regla de negocio.

## Runbook 3 - Worker detenido
1. Revisar cola pending/failed.
2. Validar lock huérfano.
3. Reiniciar worker.
4. Confirmar consumo y monitoreo.

## Runbook 4 - Error API en producción
1. Correlation ID.
2. Revisar logs y métricas.
3. Determinar impacto y severidad.
4. Activar playbook de incidente.
