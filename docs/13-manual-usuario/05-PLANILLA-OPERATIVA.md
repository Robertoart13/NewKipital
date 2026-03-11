# ðŸ“˜ Manual de Usuario - Planilla Operativa

## ðŸŽ¯ Objetivo
Explicar el ciclo real de planilla: creacion, carga, verificacion, aplicacion, reapertura e inactivacion.

## ðŸ”„ Estados de planilla
- `ABIERTA`
- `EN_PROCESO`
- `VERIFICADA`
- `APLICADA`
- `CONTABILIZADA`
- `NOTIFICADA`
- `INACTIVA`

## ðŸ”„ Ciclo principal
```mermaid
stateDiagram-v2
  [*] --> ABIERTA
  ABIERTA --> EN_PROCESO: Process
  EN_PROCESO --> VERIFICADA: Verify
  VERIFICADA --> APLICADA: Apply
  APLICADA --> CONTABILIZADA
  CONTABILIZADA --> NOTIFICADA
  ABIERTA --> INACTIVA: Inactivate
  VERIFICADA --> ABIERTA: Reopen
  INACTIVA --> ABIERTA: Reactivate
```

## ðŸŽ¯ Crear planilla
1. Ir a `Gestion Planilla > Generar`.
2. Completar empresa, periodo, tipo y fechas.
3. Guardar.

### ðŸ“Š Campos clave
| ðŸ“Š Campo | Para que sirve |
|---|---|
| `idEmpresa` | Empresa de la planilla |
| `idPeriodoPago` | Periodicidad (quincenal, mensual, etc.) |
| `tipoPlanilla` | Regular, Aguinaldo, Liquidacion, Extraordinaria |
| `periodoInicio`, `periodoFin` | Rango de trabajo |
| `fechaCorte` | Corte operativo |
| `fechaInicioPago`, `fechaFinPago` | Ventana de pago |
| `fechaPagoProgramada` | Fecha objetivo de pago |
| `moneda` | CRC/USD |

## ðŸŽ¯ Reglas que bloquean
- No permite crear duplicado del mismo slot (empresa + periodo + tipo + moneda).
- No permite verificar si no hay snapshot de empleados.
- No permite verificar si no hay resultados calculados.
- No permite editar si esta en proceso, verificada, aplicada o inactiva.

## ðŸ”„ Flujo recomendado de cierre
1. `Crear` planilla.
2. `Process` para cargar tabla/snapshot.
3. Revisar detalle por empleado.
4. `Verify`.
5. `Apply`.

## Reapertura de planilla verificada
- Ruta: `Gestion Planilla > Planillas`.
- Si la planilla esta en `VERIFICADA`, aparece accion **Reabrir**.
- `Reabrir` devuelve la planilla a `ABIERTA` para corregir seleccion de empleados y acciones.
- Regla: solo aplica para `VERIFICADA`; planillas `APLICADA/CONTABILIZADA` no se pueden reabrir.
### Paso a paso para reabrir
1. Ir a `Gestion Planilla > Planillas`.
2. Buscar una planilla con estado `VERIFICADA`.
3. Clic en `Reabrir`.
4. Confirmar en el dialogo de seguridad.
5. Validar que el estado cambie a `ABIERTA`.

### Que pasa despues de reabrir
- Se habilitan ajustes de empleados y acciones para correccion.
- Debe ejecutarse de nuevo: `Procesar -> Verificar -> Aplicar`.
- Si no se reprocesa, la planilla no debe aplicarse.

## ðŸŽ¯ Que pasa al aplicar
- Se consolida resultado de nomina para el periodo.
- Se publican eventos de dominio.
- Se actualiza auditoria y control de version.

## ðŸŽ¯ Agregar acciones de personal desde planilla
En el detalle expandido de cada empleado hay un selector **"Agregar acciones de personal"** con cuatro opciones. Al elegir una, aparece un formulario inline para capturar la accion sin salir de la planilla:

| Opcion | Campos principales | Comportamiento |
|---|---|---|
| **Horas extras** | Movimiento, Tipo de jornada, Fechas inicio/fin, Cantidad, Monto | Permite varias lineas; calculo automatico segun movimiento. |
| **Ausencias** | Movimiento, Tipo de ausencia, Cantidad, Monto, Remuneracion, Formula | Mismo patron; varias lineas; formula derivada del movimiento. |
| **Retenciones** | Movimiento, Cantidad, Monto, Formula | Monto fijo Ã— cantidad o base Ã— porcentaje. |
| **Deducciones** (Descuentos) | Movimiento, Cantidad, Monto, Formula | Mismo patron que retenciones. |

Flujo: completar linea(s) â†’ **Agregar Transaccion** â†’ la accion queda en estado pendiente â†’ aprobar desde el detalle del empleado. Tambien puede crearse desde el modulo Accion de Personal.

## ðŸ”„ Aprobacion de accion personal dentro de planilla
Cuando aprueba una accion en la tabla de detalle del empleado:
1. El estado de la accion cambia de `Pendiente Supervisor` a `Aprobada`.
2. Se recarga la tabla de planilla.
3. Se actualiza automaticamente la fila principal del empleado:
   - `Salario Quincenal Bruto`
   - `Devengado`
   - `Cargas Sociales`
   - `Impuesto Renta`
   - `Monto Neto`
   - `Dias`

Regla funcional:
- Si la accion aprobada ya estaba ligada a esa misma planilla, tambien debe impactar el recalculo del empleado.
- En la tabla se cargan acciones dentro del rango de fechas de la planilla (pendiente supervisor, pendiente RRHH y aprobada).

## ðŸ§® Como se calcula cada campo (vista usuario)
| Campo | Regla funcional |
|---|---|
| `Salario Base` | Salario del empleado configurado en ficha de empleado. |
| `Dias` | Dias base del periodo (quincena/mes), ajustados por ingreso en el periodo, renuncia/despido y acciones aprobadas que restan dias. |
| `Salario Quincenal Bruto` | Salario base del periodo recalculado con `Dias` reales. |
| `Devengado` | `Salario Quincenal Bruto` + acciones aprobadas que suman ingreso (aumentos, bonificaciones, horas extra, incapacidades CCSS, licencias remuneradas, vacaciones recalculadas). |
| `Cargas Sociales` | Porcentajes de cargas sociales activos sobre el bruto/devengado del empleado. |
| `Impuesto Renta` | Tramos de renta + creditos fiscales. En quincenal solo se cobra en segunda quincena. |
| `Monto Neto` | `Devengado - Cargas Sociales - Impuesto Renta - (retenciones/descuentos aprobados)`. |

### ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Creditos fiscales en impuesto de renta
- Si tiene hijos: se aplica credito por hijo.
- Si tiene conyuge (casado/union libre): se aplica credito por conyuge.
- Si no tiene hijos/conyuge: no aplica esos creditos.

## ðŸ§­ Como leer el detalle de acciones (tabla expandida)
Vista simplificada:
- `Categoria`
- `Tipo de Accion`
- `Estado`
- `Accion`
- `Monto` (al final)

Regla operativa:
- El `Estado` indica si ya impacta calculo (`Aprobada`) o sigue pendiente.
- El `Monto` se deja al final para lectura financiera rapida.

## ðŸŽ¯ Permisos
- Ver: `payroll:view`
- Crear: `payroll:create`
- Editar: `payroll:edit`
- Procesar: `payroll:process`
- Verificar: `payroll:verify`
- Aplicar: `payroll:apply`
- Reabrir: `payroll:reopen`
- Inactivar/Reactivar: `payroll:cancel`

## ðŸ”— Ver tambien
- [Acciones de personal](./06-ACCIONES-PERSONAL-OPERATIVO.md)
- [Calendario y feriados](./11-CALENDARIO-NOMINA-Y-FERIADOS.md)
- [Traslado interempresa](./13-TRASLADO-INTEREMPRESA.md)



## ? Seleccion por Empleado (Checkbox) - Regla Operativa
- Marcado: el empleado se incluye en la planilla y queda verificado para esa planilla.
- Desmarcado: el empleado se excluye de la planilla (no entra en totales ni aplicacion).
- Solo empleados marcados entran a Verify y Apply.
- Si no hay empleados marcados, Verify/Apply se bloquea.

## ?? Control de Cambios Tardios
- Si un empleado esta marcado/verificado, no se permite crear ni aprobar nuevas acciones de personal en esa planilla.
- Si un empleado esta marcado/verificado, tampoco se permite invalidar acciones en esa planilla.
- Si se necesita ajustar acciones, primero desmarcar al empleado en la tabla de planilla, luego ajustar y volver a marcar.

- Por defecto los empleados aparecen desmarcados: RRHH marca explicitamente quienes van en la planilla.
- La marca del checkbox es persistente: si sale y vuelve a entrar, el empleado permanece marcado o desmarcado segun ultimo guardado.
- Cuando un empleado esta marcado para planilla, el selector 'Agregar acciones de personal' queda bloqueado y muestra el motivo en pantalla.

- Al guardar una accion desde la planilla, el formulario confirma guardado y el recalculo corre en segundo plano (sin bloquear toda la tabla).
- En el bloque 'Detalle de acciones de personal' aparece aviso: 'Guardando accion de personal y recalculando planilla en segundo plano...'.

## Operacion no bloqueante (estipulado)
Reglas oficiales de uso en la tabla de planilla:

| Evento | Que ve el usuario | Que hace el sistema |
|---|---|---|
| Marcar/desmarcar empleado | El checkbox del empleado queda temporalmente bloqueado | Guarda en segundo plano solo ese empleado; la tabla completa sigue operativa |
| Guardar accion de personal inline | Mensaje: `Guardando accion de personal y recalculando planilla en segundo plano...` | Crea la accion y luego recalcula la tabla en background |
| Recalculo finalizado | Se refrescan montos del empleado y detalle de acciones | Actualiza bruto, devengado, deducciones, neto y dias segun estado aprobado |
| Error en guardado/recalculo | Notificacion de error en pantalla | Mantiene datos anteriores y permite reintentar |

Reglas de experiencia:
- No se bloquea toda la tabla durante guardados puntuales.
- Se debe poder seguir navegando, expandiendo filas y revisando otros empleados.
- Si falla una operacion, solo falla esa operacion, no todo el flujo de planilla.
- Los totales de resumen (`Devengado`, `Cargas Sociales`, `Impuesto Renta`, `Monto Neto`) suman unicamente empleados marcados para planilla.
- Si el empleado ya esta marcado y verificado, en el detalle de acciones se bloquean `Aprobar` e `Invalidar` para evitar cambios tardios.
- En la tabla de empleados solo puede haber un detalle expandido a la vez (modo acordeon).
- El detalle se puede abrir/cerrar haciendo click en cualquier parte de la fila del empleado (no solo en el icono + / -).


## Verificar planilla desde Tabla de empleados y acciones
En `Gestion Planilla > Cargar Planilla Regular`, al final de la tabla aparece el boton **Verificar planilla** cuando la planilla esta en:
- `ABIERTA`
- `EN_PROCESO`

Reglas para habilitar el boton:
- Debe tener permiso `payroll:verify`.
- Debe existir al menos un empleado marcado para planilla.
- No deben existir empleados marcados con `requiere revalidacion`.

Comportamiento:
- Si la planilla esta `ABIERTA`, primero se procesa.
- Luego se ejecuta `verify` y pasa a `VERIFICADA`.
- Antes de ejecutar la verificacion, el sistema muestra un dialogo de confirmacion (`Si, verificar` / `Cancelar`) para evitar cambios por error.
### Que se guarda al verificar planilla
- Estado de planilla pasa a `VERIFICADA`.
- Se registra auditoria del cambio y version (`versionLock`).
- Se mantiene la foto de calculo (snapshot) para revision.
- No se aplican pagos ni se consumen acciones en este paso.

### Acciones de personal pendientes al verificar
- Las acciones `Pendiente Supervisor` o `Pendiente RRHH` no se consumen.
- Solo acciones `Aprobadas` impactan los montos de calculo.
- El cierre final de acciones ocurre al `Aplicar` planilla.

## Snapshot de planilla (vista usuario)
El sistema conserva una foto operativa con:
- Totales de planilla: bruto, deducciones, neto, devengado, cargas sociales, impuesto renta.
- Detalle por empleado: salario base, salario periodo, dias/horas, deducciones y neto.
- Detalle de acciones por empleado que se muestran en la tabla expandida.

## Bloqueo de Verificar durante operaciones en curso
Regla operativa:
- El boton **Verificar planilla** se bloquea mientras exista cualquier operacion pendiente en la tabla:
  - Marcado/desmarcado de empleados (checkbox en guardado).
  - Aprobacion/invalidacion de acciones de personal.
  - Guardado de acciones inline (horas extra, ausencias, retenciones, deducciones).
  - Carga/reproceso de planilla en curso.

Objetivo:
- Evitar verificar con datos intermedios o inconsistentes por operaciones concurrentes.


## Lista de planillas aplicadas (finalizacion de proceso)
- Ruta: `Gestion Planilla > Planillas > Lista de Planillas Aplicadas`.
- Esta vista solo muestra estados:
  - `VERIFICADA`
  - `APLICADA`
  - `ENVIADA NETSUITE`
- No muestra filtro de rango de fechas.
- Objetivo: revisar y cerrar corridas en etapa final.
- Al hacer clic sobre una fila del listado, el sistema navega a la vista `Distribucion de la planilla`.
- Ruta de detalle: `/payroll-management/planillas/aplicadas/distribucion/:publicId`.
- Estado actual: **PENDIENTE DE TERMINAR**. La vista de distribucion aun no tiene el detalle funcional completo esperado para operacion final.
- Seguridad enterprise:
  - La URL usa `publicId` firmado (no consecutivo interno).
  - Si el token es invalido o no pertenece a empresa accesible por el usuario, el sistema rechaza acceso.

Permisos para ver esta vista (cualquiera de estos):
- `payroll:verify`
- `payroll:apply`
- `payroll:netsuite:send` (o alias legacy `payroll:send_netsuite`)
