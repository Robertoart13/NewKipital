# DIRECTIVA 21 — Tabla Maestra de Planillas + Políticas de Workflows Críticos

## Objetivo

Definir la tabla maestra (calendario) que gobierna qué planillas existen, y las políticas enterprise para casos borde: reapertura, acciones multi-período, traslado de empleado, cambio de período de pago, etc. Todo gobernado por workflows/eventos.

---

## 1. Tabla Maestra de Planillas — nom_calendarios_nomina

### Propósito

Esta tabla **NO** es el detalle de pagos. Es el **calendario oficial** que define:

- Qué planillas existen
- Para qué empresa
- Para qué periodo
- Qué tipo de planilla (regular, aguinaldo, liquidación, extraordinaria)
- En qué moneda se ejecuta
- Qué empleados califican (por id_periodos_pago + moneda)

**Regla:** Las acciones de personal no "escogen planilla" manualmente; se enrutan solas a la planilla abierta del periodo compatible.

### Campos Obligatorios

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id_calendario_nomina` | INT PK AI | |
| `id_empresa` | INT FK | → sys_empresas |
| `id_periodos_pago` | INT FK | → nom_periodos_pago (obligatorio) |
| `tipo_planilla` | ENUM/VARCHAR | Regular, Aguinaldo, Liquidación, Extraordinaria |
| `fecha_inicio_periodo` | DATE | Inicio periodo trabajado |
| `fecha_fin_periodo` | DATE | Fin periodo trabajado |
| `fecha_inicio_pago` | DATE | Inicio ventana de pago |
| `fecha_fin_pago` | DATE | Fin ventana de pago |
| `moneda_calendario_nomina` | ENUM | CRC, USD (obligatorio) |
| `estado_calendario_nomina` | TINYINT | Ver estados abajo |
| `es_inactivo` | TINYINT | 1=Activo, 0=Inactivo |
| `descripcion_evento_calendario_nomina` | TEXT | Opcional |
| `etiqueta_color_calendario_nomina` | VARCHAR(20) | Para UI calendario |
| `prioridad_calendario_nomina` | INT | Opcional, orden ejecución |
| `fecha_creacion`, `fecha_modificacion` | DATETIME | Auditoría |
| `creado_por`, `modificado_por` | INT | Auditoría |

**Regla:** Periodo ≠ Pago. El calendario permite mostrar "periodo trabajado" y "ventana de pago" por separado.  
**Regla (TZ):** Fechas de planilla se tratan como **date-only** (`YYYY-MM-DD`) en **hora local** para evitar desfases por zona horaria.

### Estados de Planilla (estado_calendario_nomina)

| Valor | Nombre | Editable | Reabre |
|-------|--------|----------|--------|
| 1 | Abierta | Sí | — |
| 2 | En Proceso | Sí (controlado) | — |
| 3 | Verificada | No (puede devolver a Abierta) | Sí |
| 4 | Aplicada | No | **NO** (inmutable) |
| 5 | Contabilizada | No | **NO** (final contable) |
| 6 | Notificada | No | Opcional |
| 0 | Inactiva | — | Soft disable, no rompe integridad |

### Unicidad

No puede existir más de una planilla **Abierta/En Proceso/Verificada** para:

- misma empresa
- mismo periodo (fecha_inicio_periodo, fecha_fin_periodo)
- misma moneda
- mismo tipo_planilla
- mismo id_periodos_pago

Sí pueden existir muchas planillas históricas (Aplicadas, etc.).

### Tipos de Planilla (Costa Rica)

Catálogo controlado:

- **Regular** — Planilla ordinaria
- **Aguinaldo** — Aguinaldo
- **Liquidación** — Incluye cesantía/preaviso
- **Extraordinaria** — Bonos puntuales, ajustes

---

## 2. Acciones de Personal Multi-Período

### Modelo

Una "Acción" tiene:

1. **Definición** — La intención (préstamo, deducción recurrente, subsidio)
2. **Schedule** — Distribución por períodos: qué períodos afecta y cuánto en cada uno
3. **Cuotas** — Instancias por período (tabla `acc_cuotas_accion`)

### Modos de UX

- **Modo A (Programación):** "Desde período X hasta período Y" + frecuencia + monto total / cuotas
- **Modo B (Selección explícita):** Checkboxes de períodos concretos (casos raros)

En ambos, el resultado es un schedule que genera **cuotas** por período.

### Estados de Cuota

| Estado | Descripción |
|--------|-------------|
| BORRADOR | En creación |
| PENDIENTE_APROBACION | Esperando aprobación |
| APROBADA | Aprobada, esperando planilla compatible |
| PROGRAMADA | Multi-período, pendiente de asignar a planillas |
| ASOCIADA | Asociada a planilla Abierta |
| PAGADA | Incluida en planilla Aplicada (final) |
| CANCELADA | Cancelada con motivo |
| BLOQUEADA_INCOMPATIBLE | Empresa/moneda/período no compatible |

### Evento: personal-action.scheduled

Al crear una acción multi-período:

- Se validan períodos futuros generados o generables
- Se crean cuotas por período (estado PROGRAMADA)
- Se emite `personal-action.scheduled`

**QA:** No crea cuotas en períodos Aplicados. No permite schedule que cruce empresa distinta. Idempotencia.

---

## 3. Reapertura de Período Cerrado

### Regla Enterprise

- **Aplicada / Contabilizada** = INMUTABLES. No se reabren.
- **Verificada** → puede devolverse a **Abierta** (reapertura controlada).

### Workflow: PayrollReopened

Cuando planilla pasa Verificada → Abierta:

1. Emitir evento `payroll.reopened`
2. Ejecutar recálculo controlado (solo sobre esa planilla)
3. Re-habilitar asociación de acciones/cuotas pendientes compatibles
4. **Motivo obligatorio** + auditoría

**QA:** No permite reapertura si está Aplicada/Contabilizada. Reapertura no duplica acciones.

---

## 4. Empleado Movido a Otra Empresa — Política P3 (Bloquear)

### Política Escogida: **P3 — Bloquear hasta resolver**

No se permite mover empleado si tiene cuotas/acciones activas sin planilla destino compatible. Se obliga a RRHH a decidir.

**Alternativas no escogidas:**
- P1: Auto-crear planilla destino (solo si negocio permite autogeneración)
- P2: Reprogramar al siguiente período válido

### Evento: employee.moved

Dispara **EmployeeMovedWorkflow**.

### Reglas

**4.1 Qué se mueve:** Solo entidades NO finales (Borrador, Pendiente, Aprobada, Asociada a planilla Abierta).

**4.2 Criterio de compatibilidad destino:** Debe existir planilla en empresa destino con:
- mismo id_periodos_pago
- misma moneda
- tipo_planilla compatible

**4.3 Si NO existe planilla destino compatible:** BLOQUEAR traslado. El sistema explica qué cuotas/acciones impiden el movimiento. RRHH debe resolver antes de mover.

**4.4 Regla de fecha efectiva:** Traslado **solo al inicio de periodo**. No se permite mitad de periodo.

**4.4.1 Politica de continuidad:** Por defecto es **continuidad**. Liquidacion solo aplica en escenarios de **renuncia/despido**.

**4.5 Acciones pendientes bloqueantes:** Definir lista (ej. licencias/incapacidades/aumentos pendientes). Recurrentes de ley no bloquean.

**4.6 Política por estado (acordada):**
- Se trasladan: DRAFT, PENDING_SUPERVISOR, PENDING_RRHH, APPROVED.
- No se trasladan: CONSUMED, INVALIDATED, CANCELLED, EXPIRED, REJECTED.

### 4.6.1 Politica por tipo de accion (portabilidad)

**Regla base:** todas las acciones de personal **no consumidas** se trasladan y se recalculan por calendario destino.

**Excepciones operativas:**
- Acciones de ley recurrentes (CCSS/IVM/Impuesto): **no se trasladan**. Se recalculan en la empresa destino en la planilla correspondiente.
- Si negocio define que una accion es **no portable**, debe marcarse en el workflow y quedar documentado por tipo/movimiento.

**Matriz base (default PORTABLE):**
- Ausencias: PORTABLE (por fecha efectiva/rango).
- Licencias: PORTABLE (por rango).
- Incapacidades: PORTABLE (por rango).
- Vacaciones: PORTABLE en continuidad; **liquidacion** si traslado con cierre (ver politica de continuidad).
- Horas extra: PORTABLE si fecha >= traslado.
- Bonificaciones: PORTABLE (si no existe regla de empresa contraria).
- Aumentos: PORTABLE (se aplica en planilla destino segun fecha efectiva).
- Retenciones/Descuentos: PORTABLE si son personales; si son internas de empresa, REQUIERE definicion de negocio.

**4.7 Si un rango cruza traslado:** recalcular por calendario destino (solo futuros).

**4.8 Simulación previa:** obligatoria antes de ejecutar (impacto movidas/invalidas/recalculadas).

**4.9 Auditoría:** registrar traslado con origen/destino, fecha efectiva, usuario y resumen técnico.

### Implementación base (2026-03-04)

- API de simulación y ejecución: `/api/payroll/intercompany-transfer/simulate` y `/api/payroll/intercompany-transfer/execute`.
- Tabla de auditoría: `sys_empleado_transferencias` (estado, resumen JSON, actor, fechas).
- Validaciones activas: periodo destino obligatorio, inicio de periodo, planilla origen en estados bloqueantes, reasignación de acciones/lineas por fecha.
- Pendiente: portabilidad de saldo de vacaciones (ver `docs/28-PendientesAccion.md` PEND-004).

**4.10 Nada se pierde sin motivo.** Si se cancela algo, debe ser con motivo y trazabilidad.

---

## 5. Cierre del Período (Planilla Aplicada)

### Workflow: PayrollApplied

Cuando planilla pasa a Aplicada:

1. Todas las cuotas/acciones asociadas pasan a **Pagada**
2. Cuotas pendientes que apuntaban a ese período: si no entraron, quedan "Pendiente no ejecutada" con motivo (auditoría)
3. Bloquear edición de planilla, cuotas pagadas, cálculos

**QA:** Ninguna cuota pagada se puede editar. Correcciones → ajuste en período futuro.

---

## 6. Cambio de Período de Pago del Empleado

### Evento: employee.pay_period_changed

**Workflow PayPeriodChangedWorkflow:**

- Cuotas futuras: reprogramar al nuevo calendario (si política lo permite) o bloquear hasta decisión
- Cuotas ya asociadas a planilla abierta: revalidar compatibilidad; si no compatible → desasociar, estado "Pendiente" con motivo

**QA:** No duplicar cuotas. No dejar cuotas sin estado.

---

## 7. Cambio de Moneda del Empleado

- Cuota se paga en la moneda definida en la cuota
- Si cambia moneda del empleado: no reescribir histórico
- Cuotas futuras: política por definir (Fase 2)
- Si hay mismatch: cuota queda "Pendiente por incompatibilidad" con motivo

---

## 8. Cambio de Email del Empleado

Ya implementado: **IdentitySyncWorkflow** escucha `employee.email_changed`.

---

## 9. Catálogo de Eventos Confirmados

| Evento | Cuándo |
|--------|--------|
| `payroll.opened` | Planilla creada (Abierta) |
| `payroll.verified` | Planilla verificada |
| `payroll.applied` | Planilla aplicada (inmutable) |
| `payroll.reopened` | Planilla Verificada → Abierta |
| `payroll.deactivated` | Planilla inactivada |
| `employee.moved` | Empleado trasladado a otra empresa |
| `employee.pay_period_changed` | Cambió período de pago del empleado |
| `employee.email_changed` | Cambió email (→ IdentitySyncWorkflow) |
| `personal-action.created` | Acción creada |
| `personal-action.approved` | Acción aprobada |
| `personal-action.rejected` | Acción rechazada |
| `personal-action.scheduled` | Acción multi-período programada |
| `personal-action.canceled` | Acción/cuota cancelada |

---

## 10. Matriz de Estados (QA)

### Por Cuota/Acción

- Borrador, Pendiente aprobación, Aprobada, Programada, Asociada a planilla Abierta
- Pagada (final), Cancelada (final con motivo), Bloqueada por incompatibilidad

### Por Planilla Calendario

- Abierta, En Proceso, Verificada
- Aplicada (final), Contabilizada (final)
- Inactiva (soft)

---

## Actualizacion 2026-02-27 - Compatibilidad v2 ejecutable

Se aprueba evolucion incremental sin reemplazo destructivo del esquema actual.

Lineamientos:
- Mantener `nom_calendarios_nomina` y su naming actual en Fase 1.
- Agregar nuevas capacidades por migracion incremental (`ALTER`) sin renames duros.
- Centralizar mapping de estados numericos como fuente de verdad.
- Implementar unicidad operativa con `slot_key + is_active` para permitir historicos.
- Seedear permisos `payroll:*` en `hr_pro` antes de habilitar flujo completo.

Referencia canonica:
- `docs/40-BlueprintPlanillaV2Compatible.md`

### Implementado (sin NetSuite)

- Tablas de corrida:
  - `nomina_empleados_snapshot`
  - `nomina_inputs_snapshot`
  - `nomina_resultados`
- Flujo operativo en API:
  - `process`: `Abierta -> En Proceso` con snapshot + ligue de acciones aprobadas + resultados base.
  - `verify`: requiere snapshot y resultados; inputs o cargas sociales configuradas para permitir `En Proceso -> Verificada`.
- Se mantiene inmutabilidad de `Aplicada`.

Pendiente fuera de este bloque:
- Envio/reintento NetSuite.

## Actualizacion operativa 2026-02-27 (bitacora + filtros + UX)

### Bitacora obligatoria de planilla

Regla formal:
- Toda transicion o cambio de datos de planilla debe auditarse en `sys_auditoria_acciones`.
- No se acepta bitacora solo tecnica para planilla.

Acciones auditadas:
- create
- update
- process
- verify
- apply
- reopen
- inactivate

Consulta:
- `GET /api/payroll/:id/audit-trail`

Salida esperada:
- actor
- fecha
- descripcion
- cambios por campo (`antes` / `despues`)

### Filtro de listado por rango de fechas

Se adopta filtro por traslape de periodo:
- `fecha_fin_periodo >= fechaDesde`
- `fecha_inicio_periodo <= fechaHasta`

Parametros:
- `fechaDesde`
- `fechaHasta`
- `idEmpresa`
- `includeInactive`

Default UI:
- `hoy - 1 mes` a `hoy + 1 mes`

### Edicion de planilla (regla UX)

- El modal de edicion debe abrir inmediatamente.
- Mientras llega detalle remoto debe mostrar preload.
- La cabecera de nombre generado no debe vaciarse en edicion.

### Calendario operativo de planilla (regla UX)

- Vista mensual y vista timeline para lectura operativa.
- Filtros obligatorios: empresa, moneda, tipo de planilla, estado, periodo de pago.
- En vista mensual:
  - mostrar inicio de periodo y fecha de pago (no repetir la planilla en todos los dias del rango).
  - si no hay datos, mantener calendario visible y mostrar aviso informativo.
- Panel lateral de detalle con:
  - datos funcionales en espanol (sin terminos tecnicos internos).
  - acciones `Procesar`, `Verificar`, `Aplicar` segun estado y permisos.
  - confirmacion obligatoria antes de ejecutar cada accion.
  - `Verificar` bloqueado si no existen movimientos procesados y no hay cargas sociales configuradas (snapshot inputs = 0 y cargas sociales = 0).

## Actualizacion 2026-03-08 - Flujo operativo de Inactivar/Reactivar planilla

### Inactivar planilla
- No permite inactivar estados finales contables (Aplicada/Contabilizada).
- Desasocia acciones no finales (`DRAFT`, `PENDING_SUPERVISOR`, `PENDING_RRHH`, `APPROVED`).
- Las acciones desasociadas pasan a `PENDING_RRHH`.
- Se persiste snapshot por accion en `acc_planilla_reactivation_items` para reactivacion posterior.

### Reactivar planilla
- Solo aplica para planilla en estado Inactiva.
- La planilla vuelve a estado Abierta.
- Reactivacion parcial: reasocia acciones elegibles; no elegibles se mantienen `PENDING_RRHH` con motivo.

### Consistencia de datos en UI
- Mutaciones invalidan cache server-side.
- `Refrescar` usa cache-buster (`cb`) para forzar datos nuevos sin esperar TTL.

- Disparadores automaticos de reasignacion: `payroll.create`, `payroll.reopen`, `payroll.reactivate`.
- Safety net operativo: job programado cada 5 minutos que intenta reasignar huérfanas pendientes de snapshot a planillas operativas elegibles.


### Nombre de Planilla con Consecutivo (2026-03-09)
- Regla: al crear planilla, el nombre se persiste con sufijo consecutivo de 4 digitos: BASE-0001, BASE-0002, etc.
- Implementacion: consecutivo basado en id_calendario_nomina para evitar colisiones en concurrencia.
- Si el nombre enviado ya termina en -dddd, se normaliza la base y se vuelve a generar el sufijo oficial.

## Actualizacion 2026-03-09 - Reasociacion estricta e invalidacion por traslado

- Los snapshots de reactivacion (cc_planilla_reactivation_items) solo pueden reasociarse automaticamente cuando la planilla destino coincide exactamente con la planilla origen del snapshot en: periodo de pago, tipo de planilla, moneda, periodo nomina, fecha corte, ventana de pago y fecha de pago programada.
- Al ejecutar traslado interempresas, los snapshots pendientes de las acciones trasladadas se marcan como INVALIDATED_BY_TRANSFER para que no vuelvan a entrar en flujo de reactivacion de la planilla anterior.
- Si no existe planilla exacta compatible, la accion se mantiene en PENDING_RRHH para resolucion manual de RRHH.

## Actualizacion 2026-03-09 - Validacion robusta E2E (datos reales)

### Escenario A validado (inactivar -> planilla exacta -> reasignar)
- Resultado: funcional y consistente.
- Al inactivar, las acciones no finales quedan desasociadas y con snapshot pendiente.
- Al existir planilla exacta compatible, la reasignacion automatica recupera las acciones huerfanas.

### Escenario B validado (inactivar -> traslado -> invalidar snapshot)
- Resultado: parcialmente validado.
- Simulacion de traslado: ya identifica y asigna planillas destino por fecha cuando hay cobertura.
- Execute: no completa si existen acciones bloqueantes o si ocurre conflicto tecnico en ledger de vacaciones.

### Criterios operativos para que B complete
1. El empleado no debe tener acciones bloqueantes en estados activos de bloqueo.
2. Debe existir planilla destino compatible para todas las fechas requeridas.
3. El flujo de traslado no debe colisionar en la tabla de ledger de vacaciones.

### Regla de QA para reproduccion enterprise
- Antes de afirmar "traslado completo", validar en SQL:
  - estado final de transferencia;
  - empresa del empleado;
  - `id_calendario_nomina` en acciones trasladadas;
  - snapshots en `acc_planilla_reactivation_items` (`INVALIDATED_BY_TRANSFER` cuando aplica).

## Actualizacion 2026-03-09 - Criterio final de fechas para compatibilidad

Regla operativa confirmada por negocio:
- Para compatibilidad de planilla en reasociacion/reactivacion, solo se validan fechas de periodo:
  - `Inicio Periodo`
  - `Fin Periodo`

No bloquean compatibilidad por variacion entre empresas:
- `Fecha Corte`
- `Inicio Pago`
- `Fin Pago`
- `Fecha Pago Programada`

Se mantienen como obligatorios de compatibilidad:
- empresa objetivo,
- periodo de pago,
- tipo de planilla,
- moneda,
- inicio/fin de periodo.

## Actualizacion 2026-03-09 - Politica de bloqueo por tipo de accion (ajuste)

Regla vigente:
- No se bloquea traslado por tipo de accion (`licencia`, `incapacidad`, `aumento`) si la accion esta en estado trasladable.
- El bloqueo se decide por:
  1) estados finales/no trasladables,
  2) falta de planilla destino para fechas requeridas,
  3) validaciones estructurales del traslado.

Objetivo:
- Permitir continuidad operativa enterprise y evitar bloqueo innecesario de traslados cuando las acciones pendientes son trasladables por diseno.

## Actualizacion 2026-03-09 22:36:56 -06:00 - Menu y permiso Generar Planilla

Se incorpora control dedicado para generacion de planilla en Gestion Planilla:
- Menu habilitado: Planillas > Generar Planilla.
- Se ocultan otras acciones de ese submenu para este flujo.
- Permiso nuevo: payroll:generate.
- Ruta dedicada: /payroll-management/planillas/generar.
- Vista inicial: placeholder con encabezado "Generar Planilla" para continuar construccion funcional.

## Actualizacion 2026-03-09 22:45:09 -06:00 - Ajuste final de navegacion Gestion Planilla

Regla vigente de navegacion:
- En Gestion Planilla deben coexistir dos opciones:
  1. Planillas > Generar Planilla (flujo de generacion).
  2. Traslado Interempresas (flujo de traslado).

No son el mismo flujo ni una opcion reemplaza a la otra.

Permisos operativos:
- payroll:generate controla Generar Planilla.
- payroll:intercompany-transfer controla Traslado Interempresas.

Nota operativa:
- Si no aparece Gestion Planilla tras deploy, validar migraciones y existencia de payroll:generate en BD.

## Actualizacion 2026-03-09 22:50:09 -06:00 - Vista Generar Planilla (fase inicial)

Se habilita flujo inicial en Gestion Planilla > Planillas > Generar Planilla:
- Campo Empresa (fuente de verdad del filtro).
- Campo Moneda.
- Lista de planillas cargada por empresa seleccionada.
- Moneda aplicada como filtro en la vista.

Regla aplicada:
- La carga depende de los campos del propio formulario/vista (empresa, moneda), no de filtros externos de otras pantallas.

Alcance actual:
- Fase de consulta y preparacion operativa para generar.
- Pendiente siguiente fase: formulario completo de apertura de planilla + validaciones de creacion.

## Actualizacion 2026-03-09 23:09:00 -06:00 - Generar Planilla: solo planillas procesables

Ajuste funcional en la vista Generar Planilla:
- Planillas por Empresa y Moneda se mantiene como Select.
- Solo se listan planillas en estado Abierta (estado 1), porque el endpoint de proceso permite procesar exclusivamente planillas en ese estado.
- Se excluyen inactivas y cualquier estado no procesable.

Regla vigente:
- Si el objetivo es **Procesar**, el estado aplicable es unicamente **Abierta**.

## Actualizacion 2026-03-09 23:20:00 -06:00 - Generar Planilla: filtro por tipo de periodo

Ajuste en la vista Generar Planilla:
- Se agrega selector Tipo de periodo de pago (catalogo pay-periods).
- El listado de planillas (Select) ahora se filtra por:
  - Empresa
  - Moneda
  - Tipo de periodo de pago
  - Estado Abierta
- En cada opcion de planilla se muestra explicitamente el nombre del periodo de pago (ejemplo: Quincenal).

Objetivo:
- Evitar ambiguedad cuando existan multiples planillas abiertas por diferentes periodos de pago.

## Actualizacion 2026-03-09 23:35:00 -06:00 - Generar Planilla: panel de detalle de seleccion

Mejora UX en Generar Planilla:
- Al seleccionar una planilla en el Select, se muestra un panel de detalle debajo con:
  - Empresa
  - Tipo de periodo de pago
  - Moneda
  - Fecha inicio/fin de periodo
  - Inicio/fin de pago
  - Fecha pago programada
  - Tipo de planilla
  - Estado visual

Regla de limpieza de seleccion:
- Si cambia Empresa, Moneda, Tipo de periodo o se pulsa Refrescar, se limpia la planilla seleccionada y su panel.
- Si la planilla seleccionada deja de cumplir filtros, tambien se limpia automaticamente.

## Actualizacion 2026-03-09 23:48:00 -06:00 - Generar Planilla Regular (alcance actual)

Ajuste de nomenclatura y alcance de la vista:
- Menu actualizado a Generar Planilla Regular.
- Titulo de vista actualizado a Generar Planilla Regular.
- El selector de planillas filtra unicamente planillas de tipo Regular.
- Se mantiene filtro de estado Abierta para compatibilidad con proceso.

Nota de alcance:
- Liquidacion, Aguinaldo y otras variantes se trabajaran en vistas separadas.

## Actualizacion 2026-03-10 00:05:00 -06:00 - Panel de detalle completo en Generar Planilla Regular

Se corrige y amplifica el detalle de planilla seleccionada:
- Fuente de detalle: GET /payroll/:id al seleccionar planilla.
- Se corrige lectura de fechas de periodo usando echaInicioPeriodo y echaFinPeriodo.
- El panel expone campos operativos y tecnicos disponibles desde BD/API (ids, estado, flags, fechas de creacion/modificacion, version, referencia externa, slot, descripcion de evento, etc.).

Regla de consistencia UX:
- Al cambiar filtros (empresa, moneda, periodo) o refrescar, se limpia la seleccion y su detalle para evitar datos cruzados.

## Actualizacion 2026-03-10 00:20:00 -06:00 - Detalle de planilla simplificado para usuario

Ajuste UX en Generar Planilla Regular:
- Se reemplaza el panel tecnico amplio por un resumen funcional rapido.
- Se muestran unicamente campos clave para identificacion y operacion de la planilla:
  - Empresa
  - Tipo de periodo
  - Moneda
  - Fecha inicio/fin periodo
  - Fecha corte
  - Fecha inicio/fin pago
  - Fecha pago programada
  - Tipo planilla
  - Estado

Se mantiene internamente la carga por GET /payroll/:id para consistencia de datos.

## Actualizacion 2026-03-10 00:55:00 -06:00 - Flujo Cargar Planilla Regular

Se actualiza la vista operativa para enfocarla en carga previa a revision:
- Texto funcional de la vista: Cargar Planilla Regular.
- Boton nuevo: Cargar planilla (sobre planilla seleccionada).
- Al ejecutar, se llama al proceso backend de planilla para cargar empleados y acciones de personal elegibles.
- Despues de cargar, se consulta y muestra resumen (snapshot-summary) con indicadores clave:
  - Empleados cargados
  - Acciones ligadas
  - Inputs generados
  - Total bruto / deducciones / neto

Regla UX aplicada:
- Si cambian filtros (empresa, moneda, periodo) o se refresca, se limpia seleccion, detalle y resumen para evitar mezcla de contexto.

## Actualizacion 2026-03-10 01:25:00 -06:00 - Cargar Planilla Regular: conservar seleccion post-carga

Correccion aplicada al flujo de Cargar Planilla Regular:
- La vista ahora considera estados operativos Abierta y En Proceso para mantener visible la planilla luego de ejecutar Cargar planilla.
- Se evita que la seleccion se limpie automaticamente al cambiar el estado desde Abierta hacia En Proceso.
- Se actualiza el texto del selector para reflejar correctamente los estados visibles.

Objetivo:
- Mantener continuidad del flujo operativo (cargar -> revisar) sin perder la planilla seleccionada tras la carga.

## Actualizacion 2026-03-10 01:40:00 -06:00 - Cargar Planilla Regular: sin modal ni resumen numerico

Ajuste UX del boton de carga:
- Se elimina modal de confirmacion al pulsar Cargar planilla.
- La accion ejecuta precarga directa con estado loading en el boton.
- Se elimina bloque de resumen numerico post-carga (Empleados cargados, Acciones ligadas, Inputs, Totales).

Criterio funcional aplicado:
- Esta vista queda enfocada en disparar precarga para construir tabla de revision, sin mostrar resumen intermedio en ese bloque.

## Actualizacion 2026-03-10 02:10:00 -06:00 - Cargar Planilla: genera tabla de revision (no resumen)

Cambio funcional en Gestion Planilla > Cargar Planilla Regular:
- El boton Cargar planilla ahora ejecuta flujo de carga de tabla operativa por empleado.
- Se elimina en la vista el bloque de resumen numerico (empleados/acciones/totales) como salida principal.
- Se renderiza tabla con columnas de revision salarial y deducciones por empleado, con detalle expandible de acciones.

Alineacion con legacy:
- Patron equivalente a GenerarPlanillas_lista.jsx: el boton dispara carga y luego muestra componente/tabla de detalle.
- Patron de calculo alineado a Planilla_empleados_cargar.js (devengado, cargas sociales, renta, neto y detalle de acciones).

Endpoints nuevos de soporte:
- PATCH /payroll/:id/load-table  -> carga/genera snapshot de tabla para vista de revision.
- GET /payroll/:id/snapshot-table -> retorna tabla cargada (empleados + acciones).

Regla de estado operativa para carga:
- Carga permitida en estados Abierta o En Proceso.
- Mensaje actualizado para evitar semantica de "procesar" en esta vista.

## Actualizacion 2026-03-10 02:45:00 -06:00 - Cargar Planilla: datos sensibles en tabla de empleados

Correccion aplicada para evitar mostrar valores cifrados (enc:v1:...) en el listado de empleados:
- Backend (GET /payroll/:id/snapshot-table):
  - Se desencriptan nombre y apellidos cuando el usuario tiene permiso sensible.
  - Permisos evaluados por empresa de la planilla: payroll:view_sensitive (principal) y compatibilidad con employee:view-sensitive.
  - Si no tiene permiso sensible, no se exponen nombres desencriptados y se mantiene fallback no sensible (Empleado #ID).
- Frontend (Cargar Planilla Regular):
  - Columnas monetarias y de devengado se enmascaran como *** cuando el usuario no tiene payroll:view_sensitive.

Objetivo:
- Mantener consistencia con la regla transversal del sistema: usuario con permiso sensible ve datos completos; sin permiso sensible ve datos protegidos.

## Actualizacion 2026-03-10 03:20:00 -06:00 - Correccion de calculo y detalle en tabla de Cargar Planilla

Se corrige inconsistencia donde la tabla mostraba montos en 0.00 y detalle vacio:
- salario_base_empleado venia cifrado y se estaba parseando directo a Number, provocando 0.00.
- Ahora el calculo de planilla desencripta salario base antes de convertir a monto.
- El snapshot de tabla ahora incluye tambien deducciones generadas por planilla (CCSS e impuesto renta) dentro de cciones, no solo acciones de personal aprobadas.
- Se normaliza 	ipoSigno para clasificar correctamente deducciones de CCSS/renta como -.

Resultado esperado:
- Columnas Salario Base, Salario Quincenal Bruto, Cargas Sociales, Impuesto Renta, Monto Neto dejan de salir en 0 cuando hay salario/cargas en BD.
- Detalle de acciones de personal muestra al menos CCSS/renta generadas en corrida aunque no existan acciones de personal adicionales.

## 2026-03-10 - Ajuste UI Cargar Planilla Regular

- Se agrego seleccion por checkbox por empleado en la tabla principal de "Tabla de empleados y acciones".
- Se agregaron dos tarjetas de resumen al final de la tabla:
  - Informacion de Empleados (total, verificados, pendientes).
  - Totales Monetarios (devengado, cargas, renta, neto total).
- El boton "Cargar planilla" se movio fuera del bloque "Detalle de la planilla".
- Al cargar la tabla exitosamente, el panel "Detalle de la planilla" se colapsa automaticamente para priorizar la visualizacion de la tabla.

## 13. Formula operativa de tabla "Tabla de empleados y acciones" (vigente)

Campos visibles en la tabla:
- Salario Base
- Salario Quincenal Bruto
- Devengado (dias)
- Cargas Sociales
- Impuesto Renta
- Monto Neto
- Dias

Reglas de calculo (compatibles con legacy `Planilla_empleados_cargar.js`):

1) Salario Base
- Fuente: salario base del empleado en su empresa actual.
- Se muestra en moneda de la corrida.

2) Salario Quincenal Bruto
- Si periodo de pago es Quincenal: `salario_base / 2`.
- Si periodo de pago es Mensual: `salario_base`.
- Si empleado ingreso dentro del periodo, se recalcula proporcional por dias.

3) Devengado (dias)
- Base de dias:
  - Quincenal: 15
  - Mensual: 30
- Se resta por acciones no remuneradas que descuentan dias (ausencias/licencias sin goce, vacaciones, incapacidades segun regla).
- Nunca baja de 0.

4) Cargas Sociales
- Se calculan sobre el devengado del periodo.
- Formula: `monto_carga = devengado * porcentaje_carga` por cada carga activa de la empresa.
- Total Cargas Sociales = suma de todas las cargas configuradas.
- Regla enterprise: las cargas sociales son de empresa (recurrentes), no dependen de que exista accion personal manual.

5) Impuesto Renta
- Mensual: tramo progresivo definido por regla de negocio.
- Quincenal: se aplica cuando corresponde a segunda quincena (fecha fin del periodo en rango de segunda quincena), con logica de acumulacion definida en backend.
- Si no aplica por periodo/tramo, valor = 0.

6) Monto Neto
- Formula: `neto = devengado - cargas_sociales - impuesto_renta - deducciones - retenciones`.

7) Dias
- Se muestra el total final de dias devengados para el calculo del empleado.

Regla de precision:
- Calculo interno con precision controlada.
- Presentacion en UI con formato monetario local y redondeo de visualizacion.

## 14. Reglas de carga de datos para el detalle por empleado

Cuando se carga una planilla:
- Si una accion personal cumple reglas de inclusion (estado, fecha efectiva, empresa, planilla), debe aparecer en "Detalle de acciones de personal".
- Las cargas sociales tambien se reflejan como detalle por empleado cuando la empresa tiene `nom_cargas_sociales` activas.

Diagnostico operativo documentado:
- Si la empresa no tiene registros en `nom_cargas_sociales`, la tabla mostrara cargas en 0.
- Si no hay acciones asociadas al calendario, el detalle por empleado mostrara "No hay datos".

## 15. Cambios UI aplicados en Cargar Planilla Regular (2026-03-10)

Cambios confirmados:
1. Boton "Cargar planilla" movido fuera del panel de detalle (fuera del collapse completo).
2. Al cargar tabla exitosamente, el panel de detalle se colapsa automaticamente para priorizar la tabla.
3. Tabla principal con checkbox por empleado (seleccion por fila).
4. Se agregan 2 tarjetas al final de la tabla:
   - Informacion de Empleados.
   - Totales Monetarios.

Resumenes visibles agregados:
- Total Empleados.
- Empleados Verificados.
- Pendientes de Verificar.
- Devengado (Quincenal).
- Cargas Sociales.
- Impuesto Renta.
- Monto Neto Total.

Nota:
- El resumen monetario respeta permiso sensible (`payroll:view_sensitive`): sin permiso, la UI enmascara valores.
