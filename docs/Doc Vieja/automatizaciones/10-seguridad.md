# 10 - Seguridad

## Principios
1. No exponer PII en monitoreo.
2. Acceso por permisos explicitos.
3. Acciones operativas separadas de visualizacion.
4. Redaccion de errores antes de presentar en UI.

## Controles implementados
- Permisos backend:
  - `automation:monitor` para lectura.
  - `automation:admin` para acciones.
- Guard de permisos en todos los endpoints `/ops/queues/*`.
- `redactError()` elimina correos y numeros largos en `last_error`.
- UI de monitoreo solo muestra IDs, estados y metricas agregadas.

## Cifrado y datos sensibles
- Campos sensibles se cifran con prefijo versionado `enc:v*`.
- Hash de identidad (`email_hash`, `cedula_hash`) para validaciones y dedupe.
- APIs de empleado respetan permiso `employee:view-sensitive` para exponer/ocultar sensibles.

## Auditoria operativa
Acciones manuales a auditar:
- `rescan`
- `release-stuck`
- `requeue`

Recomendacion:
- Registrar `usuario`, `fecha`, `accion`, `parametros`, `resultado` en tabla/evento de auditoria.
