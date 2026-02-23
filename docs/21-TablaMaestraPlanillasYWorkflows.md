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
| `es_inactivo` | TINYINT | Soft disable |
| `descripcion_evento_calendario_nomina` | TEXT | Opcional |
| `etiqueta_color_calendario_nomina` | VARCHAR(20) | Para UI calendario |
| `prioridad_calendario_nomina` | INT | Opcional, orden ejecución |
| `fecha_creacion`, `fecha_modificacion` | DATETIME | Auditoría |
| `creado_por`, `modificado_por` | INT | Auditoría |

**Regla:** Periodo ≠ Pago. El calendario permite mostrar "periodo trabajado" y "ventana de pago" por separado.

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

**4.4 Nada se pierde sin motivo.** Si se cancela algo, debe ser con motivo y trazabilidad.

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
