# DIRECTIVA 31 - Cifrado, Identidad y Provisionamiento Automatico

**Documento:** 31  
**Fecha:** 2026-02-24  
**Objetivo:** Definir la ejecucion operativa de cifrado de datos sensibles de empleados, sincronizacion de identidad (empleado-usuario) y provisionamiento automatico para inserciones manuales.

---

## Alcance

Este documento cubre:

1. Cifrado de datos sensibles en `sys_empleados` y provisiones.
2. Sincronizacion transaccional de campos compartidos entre `sys_empleados` y `sys_usuarios`.
3. Provisionamiento automatico de acceso TimeWise para empleados creados fuera del API.
4. Colas y workers con control de errores, idempotencia y recuperacion de huérfanos.

---

## Politica de permisos

1. Nuevo permiso: `employee:view-sensitive`.
2. Edicion de empleado: requiere `employee:edit` y `employee:view-sensitive`.
3. Visualizacion sin permiso sensible: API devuelve `null` en campos sensibles; la UI muestra `--`.

---

## Campos compartidos Empleado-Usuario

Campos sincronizados:

- `email_empleado` <-> `email_usuario`
- `nombre_empleado` <-> `nombre_usuario`
- `apellido1_empleado` <-> `apellido_usuario`

Regla:

- Source of truth operativo: `sys_empleados`.
- La actualizacion de identidad se ejecuta en la misma transaccion del update de empleado.
- Si falla la actualizacion de `sys_usuarios`, se hace rollback completo.

---

## Provisionamiento automatico TimeWise (insercion manual)

Aplica a registros:

- `estado_empleado = 1`
- `id_usuario IS NULL`

Accion automatica:

1. Crear `sys_usuarios`.
2. Vincular `sys_empleados.id_usuario`.
3. Crear `sys_usuario_app` con app TimeWise.
4. Crear `sys_usuario_rol` con rol `EMPLEADO_TIMEWISE`.

Si falta configuracion de app/rol default:

- marcar `ERROR_CONFIG` (sin retry automatico)
- registrar alerta operativa.

---

## Colas y workers

Se separan responsabilidades:

1. `identity queue` (provisionamiento de usuario/app/rol)
2. `encrypt queue` (cifrado de datos sensibles)

Prioridad oficial:

1. Identity worker
2. Encrypt worker

Justificacion:

- reduce errores de dependencia en login/unique/hash
- minimiza reprocesos y drift de identidad.

---

## Addendum operativo (obligatorio)

### 1) Estados terminales de cola (sin retries ciegos)

Estados terminales:

- `ERROR_PERM`
- `ERROR_CONFIG`
- `ERROR_DUPLICATE`
- `ERROR_FATAL`

Regla:

- estos estados no reintentan automaticamente.
- requieren correccion o intervencion operativa.

### 2) Idempotencia y recuperacion de trabajos huerfanos

Control obligatorio:

- `dedupe_key` unica por `(id_empleado, tipo_tarea)` o equivalente.
- campos de lock: `locked_by`, `locked_at`, `attempts`, `next_retry_at`.

Recuperacion:

- si un job queda `PROCESSING` y supera TTL, vuelve a `PENDING`.
- el evento de liberacion queda auditado.

### 3) Anti-loop

- Los workers no deben reencolar su propio update.
- Se valida bandera/version de cifrado antes de encolar.

---

## SLA operativo base

- Lote sugerido: 200 registros/ciclo.
- Frecuencia sugerida: 30 segundos.
- Meta:
  - 100 registros: < 2 minutos
  - 400 registros: < 8 minutos
- Reintentos: maximo 5 con backoff exponencial.

---

## Backfill inicial

1. Encolar empleados con `id_usuario IS NULL` en cola de identidad.
2. Ejecutar identity worker hasta vaciar.
3. Encolar empleados/provisiones con bandera de cifrado en `0`.
4. Ejecutar encrypt worker hasta vaciar.
5. Emitir reporte:
   - `DONE`, `ERROR`, `stuck`, tiempos, top errores.

---

## Seguridad y auditoria

1. Nunca loggear plaintext de campos sensibles.
2. Auditar:
   - sync de identidad
   - provisionamiento automatico
   - accesos de desencriptacion
3. Soportar versionado de cifrado:
   - `enc:vN`
   - `kid` para rotacion de llave.

