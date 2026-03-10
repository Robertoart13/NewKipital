# ⚙️ Runbooks Operativos

## 🎯 Objetivo
Definir pasos exactos para recuperar operación ante fallas frecuentes.

## 🎯 Runbook 1 - Usuario sin acceso esperado
1. Verificar empresa activa.
2. Verificar rol asignado.
3. Verificar overrides deny.
4. Refrescar sesión/permisos.

## 🎯 Runbook 2 - Planilla bloqueada
1. Identificar estado actual.
2. Validar bloqueos por acciones pendientes.
3. Revisar compatibilidad de periodo.
4. Aplicar resolución según regla de negocio.

## 🎯 Runbook 3 - Worker detenido
1. Revisar cola pending/failed.
2. Validar lock huérfano.
3. Reiniciar worker.
4. Confirmar consumo y monitoreo.

## 🎯 Runbook 4 - Error API en producción
1. Correlation ID.
2. Revisar logs y métricas.
3. Determinar impacto y severidad.
4. Activar playbook de incidente.

## Runbook 5 - Guardado lento o bloqueo en tabla de planilla
Sintoma:
- Usuario reporta que al marcar empleados o guardar acciones la tabla "se congela".

Validaciones:
1. Confirmar que el lock sea por fila (empleado) y no global.
2. Confirmar mensaje visible: `Guardando accion de personal y recalculando planilla en segundo plano...`.
3. Revisar tiempos de PATCH de seleccion y POST/PATCH de acciones en Network.
4. Revisar errores de API y timeout en logs backend.

Acciones:
1. Si hay lock global en frontend, escalar como bug critico UX.
2. Si backend responde lento, medir endpoint y query lenta asociada.
3. Si falla recalculo, notificar error al usuario y forzar refresh controlado.
4. Registrar incidente con modulo, endpoint, empleado afectado y correlation ID.


