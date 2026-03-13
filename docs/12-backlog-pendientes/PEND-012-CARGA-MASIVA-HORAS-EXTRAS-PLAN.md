# PEND-012 - Plan de Implementacion: Carga Masiva de Horas Extras

## Estado actual
`CERRADO` (validado en QA funcional con evidencia UI + API + DB).

## Objetivo
Implementar flujo enterprise de carga masiva de horas extras por `empresa + planilla` con:
- plantilla Excel guiada
- preview con validaciones y calculo
- commit transaccional (all-or-nothing)
- rollback total en error
- bitacora y notificacion clara al usuario ejecutor

## Alcance confirmado
- Planilla seleccionable solo en estados: `ABIERTA`, `EN_PROCESO`.
- Identificacion de empleado por `codigo_empleado` (formato `KPid-{id}-...`).
- Se permiten multiples filas por empleado en el Excel.
- Resultado de persistencia:
  - crear una accion de personal de horas extras por empleado
  - crear multiples lineas por esa accion (segun filas del Excel por empleado)
- Estado final de acciones creadas: `Aprobada`.
- `aprobado_por` y `fecha_aprobacion` corresponden al usuario que ejecuta la carga.
- Columnas nuevas en hoja `Empleados`:
  - `Fecha Inicio Hora Extra`
  - `Fecha Fin Hora Extra` (si vacia, usar fecha inicio)
- Filas con horas en `0` o sin datos minimos: se muestran en preview como no procesables y no se insertan.
- Si existe error bloqueante en commit: rollback total de toda la carga.

## Flujo funcional objetivo
1. Usuario entra a `Gestion Planilla > Planillas > Carga Masiva de Horas Extras`.
2. Selecciona empresa.
3. Selecciona planilla valida (`ABIERTA` o `EN_PROCESO`).
4. Descarga plantilla Excel:
   - Hoja `Empleados`
   - Hoja `Movimientos` (referencia)
   - Hoja `TiposJornada` (referencia)
5. Carga archivo Excel.
6. Sistema ejecuta `preview`:
   - parsea filas
   - valida datos de negocio y consistencia
   - calcula montos y formula por fila
   - detecta no procesables y bloqueantes
   - muestra resumen y detalle
7. Usuario confirma `Procesar carga masiva`.
8. Sistema ejecuta `commit` en transaccion:
   - si todo bien -> commit
   - si cualquier error -> rollback total
9. Notificacion final al usuario con resultado claro.

## Deteccion de duplicados (enterprise)
### Nivel archivo
- Calcular hash `sha256` del archivo cargado.
- Si ya existe carga exitosa para misma `empresa + planilla + hash`, bloquear como "archivo ya procesado".

### Nivel linea de negocio
- Huella por fila:
`empresa + planilla + codigo_empleado + movimiento + tipo_jornada + cantidad_horas + fecha_inicio + fecha_fin`
- Evitar duplicados en:
  - la misma carga
  - cargas previas ya aplicadas en esa planilla

## Reglas de validacion backend
- Empresa existe y usuario tiene acceso.
- Planilla existe, pertenece a empresa, estado permitido.
- No hay proceso concurrente de verificar/aplicar esa planilla.
- Empleado existe por `codigo_empleado` y pertenece a empresa.
- Movimiento valido y activo para empresa.
- Tipo jornada valido (`6`, `7`, `8`).
- Cantidad horas > `0` para filas procesables.
- Fechas validas (`dd/mm/yyyy` en plantilla -> normalizacion backend).
- Si `fecha_fin` vacia -> `fecha_fin = fecha_inicio`.
- Si empleado bloqueado por verificacion/cierre de planilla -> error bloqueante.

## Diseno API (implementado en backend)
- `GET /api/personal-actions/horas-extras/carga-masiva/template-data?idEmpresa={id}&payrollId={id}`
  - retorna empleados elegibles + movimientos + tipos de jornada.
- `POST /api/personal-actions/horas-extras/carga-masiva/preview`
  - recibe contexto y filas parseadas del Excel.
  - responde resumen de:
    - filas validas
    - filas no procesables
    - errores bloqueantes
    - montos/formula por fila
  - persiste staging de preview.
- `POST /api/personal-actions/horas-extras/carga-masiva/commit`
  - confirma carga en transaccion.
  - crea acciones y lineas aprobadas.
  - rollback total en error.

## Modelo de datos (staging recomendado)
- `pa_overtime_bulk_uploads` (cabecera)
  - id, empresa, planilla, usuario, hash_archivo, estado, resumen, timestamps
- `pa_overtime_bulk_upload_rows` (detalle)
  - id_upload, numero_fila, codigo_empleado, id_movimiento, jornada, horas, fechas, monto, formula, estado_fila, mensaje

Estados sugeridos:
- `UPLOADED`, `PREVIEW_OK`, `PREVIEW_WITH_WARNINGS`, `COMMIT_OK`, `COMMIT_FAILED`

## Notificaciones y mensajes
- Exito:
  - empresa, planilla, total empleados, total lineas, usuario, fecha/hora.
- Error (rollback total):
  - mensaje principal: "La carga masiva no se completo. Se revirtieron todos los cambios."
  - detalle por empleado/fila con causa concreta.

## Fases de implementacion
### Fase 1 - Backend base
- Endpoints `template`, `preview`, `commit`.
- Parser Excel.
- Normalizacion de fechas.
- Validador de negocio por fila.
Estado: **Completada (backend API + staging)**.

### Fase 2 - Logica de calculo y preview
- Reusar formula de horas extras del modulo actual.
- Construir tabla de preview con no procesables y bloqueantes.
Estado: **Completada**.

### Fase 3 - Commit transaccional
- Agrupar filas por empleado.
- Crear accion por empleado + lineas.
- Guardar aprobacion por usuario ejecutor.
- Rollback total.
Estado: **Completada**.

### Fase 4 - Frontend completo
- Pantalla operativa de carga masiva.
- Descarga plantilla.
- Upload + preview.
- Confirmacion + estados de proceso.
Estado: **Completada**.

### Fase 5 - QA y evidencias
- E2E:
  - archivo valido
  - horas 0
  - empleado bloqueado
  - duplicado
  - rollback total
- Evidencia de DB + capturas + reporte.
Estado: **Completada**.

## Criterio de cierre
Se cierra cuando:
1. Funciona template -> preview -> commit en produccion funcional.
2. Existe rollback total validado.
3. Existen pruebas E2E y evidencias de DB.
4. Manual usuario y manual tecnico actualizados.

Resultado de cierre:
- Flujo feliz validado.
- Duplicado validado.
- Empleado bloqueado validado.
- Error/rollback validado.
- Notificaciones validadas de punta a punta (campana -> centro -> lectura -> detalle).
