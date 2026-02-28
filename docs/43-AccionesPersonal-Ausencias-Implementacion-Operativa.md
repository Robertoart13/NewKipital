# 43 - Acciones de Personal (Ausencias) Implementacion Operativa

Fecha de cierre: 2026-02-28
Estado: Implementado en backend + frontend
Relacion: Complementa y actualiza `42-AccionesPersonal-Planilla-Fase0Cerrada.md`.

## 1. Alcance cerrado

Queda implementado para Ausencias:

1. Vista propia y ruta propia (`/personal-actions/ausencias`).
2. Modal propio con encabezado + lineas de transaccion.
3. Persistencia real create/edit (header + cuotas + lineas).
4. Validaciones enterprise de planillas elegibles.
5. Calculo de monto por linea segun movimiento/cantidad/tipo ausencia.
6. Enmascaramiento de datos sensibles por permiso.
7. Filtros/listado homologados con modulos de referencia.
8. Bitacora operativa en modal de ausencia (tab dedicado).

## 2. Backend implementado

### 2.1 Endpoints

1. `GET /api/personal-actions/absence-employees?idEmpresa=`
2. `GET /api/personal-actions/absence-movements?idEmpresa=&idTipoAccionPersonal=`
3. `GET /api/personal-actions/absence-payrolls?idEmpresa=&idEmpleado=`
4. `POST /api/personal-actions/ausencias`
5. `PATCH /api/personal-actions/ausencias/:id`
6. `PATCH /api/personal-actions/ausencias/:id/advance`
7. `PATCH /api/personal-actions/ausencias/:id/invalidate`

### 2.2 Permisos utilizados

1. `hr-action-ausencias:view`
2. `hr-action-ausencias:create`
3. `hr-action-ausencias:edit`
4. `employee:view-sensitive` (solo para ver datos sensibles del empleado)

### 2.3 Regla de estado inicial al crear

En Kpital, Ausencias no inicia en borrador:

1. Estado inicial al crear: `PENDING_SUPERVISOR` (codigo `2`).
2. Motivo: flujo operativo solicitado (RRHH crea y pasa a supervisor).

### 2.4 Persistencia transaccional

Al crear/editar se maneja transaccion:

1. Header en `acc_acciones_personal`.
2. Cuotas en `acc_cuotas_accion`.
3. Lineas en `acc_ausencias_lineas`.

## 3. Base de datos

### 3.1 Tabla nueva

`acc_ausencias_lineas`

Campos funcionales:

1. `id_accion`, `id_cuota`
2. `id_empresa`, `id_empleado`
3. `id_calendario_nomina`, `id_movimiento_nomina`
4. `tipo_ausencia_linea` (`JUSTIFICADA`, `NO_JUSTIFICADA`)
5. `cantidad_linea`, `monto_linea`, `remuneracion_linea`
6. `formula_linea`, `orden_linea`, `fecha_efecto_linea`
7. auditoria de creacion/modificacion

Nota de despliegue:

1. En `HRManagementDB_produccion` se aplico DDL puntual de la tabla por compatibilidad de historial de migraciones.
2. La migracion versionada en repo se mantiene como fuente oficial de estructura.

## 4. Reglas enterprise de planilla elegible

Selector `Periodo de pago (Planilla)` se llena por empleado/empresa:

1. `id_empresa = empresa seleccionada`.
2. `id_periodos_pago = periodo del empleado`.
3. `moneda_calendario_nomina = moneda del empleado`.
4. `es_inactivo = 0`.
5. `estado_calendario_nomina IN (1,2)` (`ABIERTA`, `EN_PROCESO`).
6. `fecha_fin_pago >= CURDATE()`.

No se muestran estados no operables (`0,3,4,5,6`).

## 5. Reglas de calculo de monto en lineas

### 5.1 Tipo de ausencia

1. `JUSTIFICADA`:
   - `monto = 0`
   - `formula = "Ausencia justificada"`
2. `NO_JUSTIFICADA`:
   - prioridad 1: movimiento por monto fijo (`montoFijo * cantidad`)
   - prioridad 2: movimiento por porcentaje (`base * (%/100) * cantidad`)
   - fallback: `monto = 0` con formula informativa

### 5.2 Base para porcentaje

1. Base normal: salario base del empleado.
2. Si periodo del empleado es quincenal (`idPeriodoPago = 9`): `base = salario/2`.

### 5.3 Recalculo automatico

Se recalcula al cambiar:

1. movimiento
2. cantidad
3. tipo de ausencia

## 6. Validaciones funcionales

1. Sin empresa no se habilita empleado.
2. Sin empresa + empleado no se muestran lineas de transaccion.
3. No se agrega linea nueva si la actual esta incompleta.
4. No se guarda si hay lineas incompletas.
5. `cantidad` entero `>= 1`.
6. `monto` `>= 0` (editable manualmente).
7. Movimiento inactivo solo visible si ya estaba seleccionado en edicion.
8. `monto` en UI se captura como numerico entero:
   - solo digitos (`0-9`),
   - caracteres no numericos se limpian en vivo,
   - se evita autoconversion cientifica o corrupcion por `number` de JS.
9. `cantidad`:
   - entero `>= 1`,
   - sin limite artificial de `9999` (se retira tope anterior).

## 7. UX homologada (mismo patron del sistema)

Aplicado en Ausencias:

1. Confirmacion previa de crear/guardar con estilo corporativo (`companyConfirm*`).
2. Preloads visibles:
   - empresa -> empleados
   - empleado -> planillas
   - empresa -> movimientos
3. Limpieza del modal de creacion al reabrir (sin arrastre de empleado/datos previos).
4. Header de registros con:
   - `entries per page`
   - filtro de empresa
   - filtro de estado
   - refrescar
5. Bloque de filtros colapsable con:
   - `Search`
   - `Show All`
   - `Collapse All`
   - `Limpiar Todo`
6. Click en fila para editar (si tiene permiso), con cursor coherente.
7. Click en fila para abrir modal en cualquier estado (consulta o edicion segun reglas).
8. Carga visual estable en modal:
   - preload modal mientras carga detalle,
   - preload de planillas al resolver `empresa + empleado`,
   - preload de bitacora solo cuando tab `Bitacora` esta activo.
9. Al cambiar entre tabs (`Informacion principal` <-> `Bitacora`) no se pierde el estado del formulario ni se reinician lineas.

## 8. Columnas operativas definidas para listado

Columnas activas:

1. Nombre de la Empresa
2. Nombre del Empleado
3. Periodo de Pago
4. Movimiento
5. Remunerada
6. Estado
7. Acciones

Resumen de columnas 3/4/5:

1. Se consolidan desde `acc_ausencias_lineas`.
2. Si hay multiples lineas, se muestra resumen agrupado por accion.

## 9. Pendiente siguiente bloque (no incluido en este cierre)

1. Flujo completo de transiciones por rol:
   - `PENDING_SUPERVISOR -> PENDING_RRHH -> APPROVED`
2. Replicar este patron en los demas modulos de Acciones de Personal.

## 10. Actualizacion operativa adicional (2026-02-28, bloque QA/invalidacion)

### 10.1 Endpoint adicional operativo

1. `PATCH /api/personal-actions/ausencias/:id/advance`
   - Permiso: `hr-action-ausencias:edit`.
   - Comportamiento: mueve la ausencia al siguiente estado operativo.
   - Transiciones validas:
     - `DRAFT (1) -> PENDING_SUPERVISOR (2)`
     - `PENDING_SUPERVISOR (2) -> PENDING_RRHH (3)`
     - `PENDING_RRHH (3) -> APPROVED (4)`
2. `PATCH /api/personal-actions/ausencias/:id/invalidate`
   - Permiso: `hr-action-ausencias:edit`.
   - Comportamiento: invalida la ausencia sin borrado fisico.

### 10.2 Reglas nuevas de edicion

1. `Empresa` y `Empleado` quedan bloqueados en modo `Editar`.
2. Si una linea referencia planilla no elegible hoy:
   - se conserva visible por trazabilidad,
   - se etiqueta como `No elegible hoy`,
   - backend rechaza guardar hasta corregir.
3. Si una linea referencia movimiento fuera de catalogo operativo:
   - se conserva visible por trazabilidad,
   - se etiqueta como `No elegible hoy`,
   - backend valida activo/tipo en guardado.

### 10.3 Invalidacion sin borrado

1. La accion `Invalidar` cambia estado a `INVALIDATED (7)`.
2. Registra:
   - `invalidated_at_accion`
   - `invalidated_reason_accion`
3. Cuotas relacionadas no pagadas pasan a `CANCELADA`.
4. No aplica para estados finales no editables:
   - `CONSUMED (5)`
   - `CANCELLED (6)`
   - `INVALIDATED (7)`
   - `EXPIRED (8)`
   - `REJECTED (9)`

### 10.4 UX de estados y acciones (aclaracion operativa)

1. El listado ahora muestra accion primaria por "siguiente estado" en vez de mezclar botones ambiguos:
   - `Borrador` -> `Enviar a Supervisor`
   - `Pendiente Supervisor` -> `Enviar a RRHH`
   - `Pendiente RRHH` -> `Aprobar`
2. `Invalidar` solo se muestra en estados operativos (`1,2,3`).
3. En estados finales (`4..9`) no aparece accion de avance ni invalidacion.
4. Cada tag de estado muestra tooltip explicativo al pasar el mouse (significado funcional del estado).
5. El boton `Editar` abre modal de detalle en cualquier estado permitido de vista.
6. Si el estado no es editable (`4..9`), el modal abre en modo solo lectura.
7. En modo solo lectura:
   - todos los campos y lineas quedan bloqueados,
   - se oculta boton de guardado,
   - se mantiene acceso a tab de bitacora.

### 10.7 Bitacora de Ausencias (implementada)

1. Endpoint:
   - `GET /api/personal-actions/ausencias/:id/audit-trail?limit=200`
2. Permiso:
   - `hr-action-ausencias:view`
3. Entidad de auditoria:
   - `personal-action`
4. El tab `Bitacora` en modal de Ausencias muestra:
   - fecha/hora,
   - actor,
   - accion,
   - detalle,
   - cambios `antes/despues` por campo.
5. Eventos auditados en Ausencias:
   - `create`
   - `update`
   - `advance`
   - `invalidate`
6. Proteccion anti-loop de carga:
   - bitacora se carga una sola vez por apertura de modal y por ausencia,
   - no se dispara recursivamente al cambiar de tab.

### 10.8 Apertura en cualquier estado + modo lectura

1. El modal se puede abrir desde la fila para todos los estados visibles.
2. Estados editables:
   - `DRAFT (1)`
   - `PENDING_SUPERVISOR (2)`
   - `PENDING_RRHH (3)`
3. Estados no editables (solo consulta + bitacora):
   - `APPROVED (4)`
   - `CONSUMED (5)`
   - `CANCELLED (6)`
   - `INVALIDATED (7)`
   - `EXPIRED (8)`
   - `REJECTED (9)`
4. En modo solo lectura:
   - campos bloqueados,
   - lineas bloqueadas,
   - sin boton de guardado,
   - bitacora visible.

### 10.9 Regla operativa de control por defecto en listado

1. El filtro de estado por defecto mantiene foco en pendientes de atencion:
   - `Borrador`
   - `Pendiente Supervisor`
   - `Pendiente RRHH`
2. El filtro de estado es multiseleccion; el usuario puede ampliar a otros estados cuando requiere analisis.

### 10.5 Filtro de estados orientado a operacion diaria

1. El filtro `Estado` de Ausencias es multiseleccion.
2. Carga inicial por defecto (atencion operativa):
   - `Borrador`
   - `Pendiente Supervisor`
   - `Pendiente RRHH`
3. El usuario puede agregar estados adicionales libremente.
4. `Limpiar Todo` vuelve a la preseleccion de atencion (`[1,2,3]`) para mantener foco operativo.

### 10.6 Escenarios QA sembrados en BD (empresa 1)

1. `QA ESC-01 Empleado inactivo` (`id_accion=5`, estado `1`)
2. `QA ESC-02 Movimiento inactivo` (`id_accion=6`, estado `1`)
3. `QA ESC-03 Periodo cerrado` (`id_accion=7`, estado `1`)
4. `QA ESC-04 Pendiente RRHH` (`id_accion=8`, estado `3`)
5. `QA ESC-05 Aprobada bloqueada edicion` (`id_accion=9`, estado `4`)
6. `QA ESC-06 Consumida bloqueada edicion` (`id_accion=10`, estado `5`)
7. `QA ESC-07 Cancelada bloqueada edicion` (`id_accion=11`, estado `6`)
8. `QA ESC-08 Invalidada bloqueada edicion` (`id_accion=12`, estado `7`)
9. `QA ESC-09 Expirada bloqueada edicion` (`id_accion=13`, estado `8`)
10. `QA ESC-10 Rechazada bloqueada edicion` (`id_accion=14`, estado `9`)
