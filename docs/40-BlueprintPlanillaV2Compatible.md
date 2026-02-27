# DIRECTIVA 40 - Blueprint Planilla v2 Ejecutable (Compatible)

**Ultima actualizacion:** 2026-02-27 (actualizada con reglas operativas implementadas)  
**Estado:** Aprobado para implementacion por fases (sin cambios destructivos)  
**Alcance:** Apertura/ejecucion de planilla enterprise CR, multiempresa, multi-moneda, con integracion NetSuite e idempotencia.

---

## 1. Veredicto tecnico

- Arquitectura core de planilla: alineada a nivel enterprise.
- Ejecucion: condicionada a compatibilidad con esquema actual.
- Riesgo principal: habilitacion operativa (RBAC seeds + wiring UI + migraciones incrementales).

---

## 2. Principios no negociables

- Post `APLICADA`: inmutable.
- Una corrida = una moneda.
- Aislamiento estricto por empresa/contexto.
- Snapshot reproducible por corrida.
- Integracion NetSuite idempotente con log request/response.
- No romper naming ni contratos existentes en Fase 1.

---

## 3. Compatibilidad obligatoria con esquema actual

La tabla principal existente es `nom_calendarios_nomina` y se mantiene.

Reglas:
- No hacer reemplazo duro ni renames en Fase 1.
- Agregar columnas/tablas nuevas por `ALTER` incremental.
- Mantener endpoints existentes operativos durante transicion.
- Resolver diferencias de naming en capa backend (mapping DTO/entidad/serializer).

---

## 4. Estados de planilla (source of truth unico)

Decision vigente para compatibilidad: **persistir estados numericos**.

Catalogo objetivo v2:
- `1` = ABIERTA
- `2` = EN_PROCESO
- `3` = VERIFICADA
- `4` = APLICADA
- `5` = ENVIADA_NETSUITE
- `6` = ERROR_ENVIO_NETSUITE
- `7` = INACTIVA

Regla:
- DB guarda entero.
- API/UI pueden exponer texto derivado.
- Mapping centralizado unico (sin mezclar con ENUM string en DB).

Nota de transicion:
- Si existe mapping legacy en codigo, se migra de forma controlada en capa de dominio.

---

## 5. Unicidad operativa sin bloquear historicos

MySQL no soporta indices parciales equivalentes a Postgres.

Patron aprobado:
- `slot_key` (derivado de empresa + periodo + tipo + moneda)
- `is_active` (1 para corridas operativas, 0 para historicas)
- `UNIQUE(slot_key, is_active)`

Resultado:
- Solo una corrida operativa por slot.
- Historicos multiples permitidos sin colision.

---

## 6. Modelo funcional objetivo (incremental)

### 6.1 Tabla principal: `nom_calendarios_nomina`

Mantener columnas actuales y asegurar estas capacidades:
- `id_periodos_pago` FK a `nom_periodos_pago`
- tipo de planilla (via FK a catalogo nuevo)
- nombre de planilla
- rango de periodo y fechas de corte/pago
- moneda
- estado numerico
- `version_lock`
- referencia NetSuite
- `slot_key` + `is_active`

### 6.2 Catalogo nuevo: `nom_tipos_planilla`

- `id_tipo_planilla` PK
- `codigo` (`REGULAR`, `AGUINALDO`, `LIQUIDACION`, `EXTRAORDINARIA`)
- `nombre`
- `color_hex`
- `es_inactivo`
- auditoria de fechas

### 6.3 Snapshot y resultados

- `nomina_empleados_snapshot`
- `nomina_inputs_snapshot`
- `nomina_resultados`

Precision recomendada:
- almacenamiento final: `DECIMAL(18,2)` o `DECIMAL(18,4)` segun concepto.
- calculo interno con mayor precision y redondeo controlado por regla de negocio.

### 6.4 NetSuite logging

Tabla `nomina_netsuite_log` con:
- payload request/response
- http status
- retry_count
- error_message
- timestamps

Idempotencia obligatoria por llave de corrida/envio.

---

## 7. Integracion con Acciones de Personal

Una accion entra a corrida si cumple:
- estado aprobada
- fecha efectiva en periodo
- aprobacion <= cutoff de corrida

Al consumirse:
- se liga a `id_nomina` / `id_calendario_nomina`
- se bloquea edicion de la accion consumida

Politica retroactivos:
- corrida aplicada nunca se reescribe
- ajustes por retro u off-cycle

---

## 8. RBAC minimo (bloqueante de go-live)

Permisos minimos requeridos:
- `payroll:view`
- `payroll:create`
- `payroll:verify`
- `payroll:apply`
- `payroll:send_netsuite`
- `payroll:retry_netsuite`

Condicion previa:
- seed en `mysql_hr_pro` + asignacion a roles reales + pruebas 403/200.

### Matriz actual aplicada (3 roles)

- `OPERADOR_NOMINA`:
  - `payroll:view`
  - `payroll:create`
  - `payroll:process`
  - `payroll:calendar:view`
  - `payroll:type:view`
  - `payroll:pay_period:view`

- `GERENTE_NOMINA`:
  - Todo lo de operador +
  - `payroll:verify`
  - `payroll:edit` (reopen controlado)
  - `payroll:view_sensitive`
  - `payroll:netsuite:view_log`

- `MASTER`:
  - Todo lo de gerente +
  - `payroll:apply`
  - `payroll:cancel`
  - `payroll:export`
  - `payroll:send_netsuite` (permiso creado, integracion pausada)
  - `payroll:retry_netsuite` (permiso creado, integracion pausada)
  - `payroll:calendar:manage`
  - `payroll:type:manage`
  - `payroll:pay_period:manage`

---

## 9. Fases de implementacion

### Fase 0 - Descubrimiento
- inventario DDL actual (`nom_calendarios_nomina`, acciones, permisos)
- confirmar mapping de estados y `version_lock`

### Fase 1 - DB compatible
- `ALTER` incremental sobre `nom_calendarios_nomina`
- crear `nom_tipos_planilla`
- crear `slot_key` + `is_active` + unique
- seed RBAC de payroll

### Fase 2 - Backend compatible
- mapping central estados int->texto
- snapshot + transaccion de corrida
- enforcement de reglas de transicion

### Fase 3 - Frontend
- rutas/guards/menus segun permisos reales
- apertura/verificacion/aplicacion con validaciones

### Fase 4 - NetSuite + E2E
- envio idempotente
- retry controlado
- pruebas end-to-end con roles y multiempresa

---

## 10. Definition of Done (v2)

- esquema incremental aplicado sin romper contratos existentes
- RBAC payroll completo sembrado y asignado
- unicidad operativa activa (`slot_key + is_active`)
- estados centralizados y consistentes
- snapshot funcional y auditable
- integracion NetSuite con idempotencia y logs
- pruebas E2E de apertura->verificacion->aplicacion->envio

### Estado de ejecucion actual (2026-02-27)

- Implementado:
  - Fase 1 (DB compatible base + RBAC `payroll:*` en `hr_pro`).
  - Fase 2 parcial (snapshot de corrida + `process` + resumen de corrida + verify con precondiciones).
  - Fase 3 parcial (listado de planillas con filtros operativos de empresa, inactivas y rango de fechas).
  - Bitacora funcional de planilla en `sys_auditoria_acciones` para cambios de negocio.
- No implementado en este bloque:
  - Fase NetSuite (`send/retry`) por decision de alcance actual.

---

## 11. Reglas operativas implementadas (obligatorias)

### 11.1 Bitacora de planilla (regla no negociable)

Toda accion que cambie datos o estado de planilla debe quedar auditada con:
- `payload_before`
- `payload_after`
- `descripcion`
- actor y fecha

Acciones auditadas:
- `create`
- `update`
- `process`
- `verify`
- `apply`
- `reopen`
- `inactivate`

Endpoint de consulta:
- `GET /api/payroll/:id/audit-trail?limit=N`

Regla UX:
- La pestana `Bitacora` en editar planilla debe mostrar diffs por campo (`antes/despues`), no solo metadata tecnica.

### 11.2 Filtros de listado de planillas

Contrato activo del listado:
- Empresa (obligatorio en UI)
- Mostrar inactivas
- Rango de fechas (`fechaDesde`, `fechaHasta`)

Backend:
- `GET /api/payroll?idEmpresa=N&includeInactive=bool&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD`
- Filtro por traslape de periodo:
  - `fecha_fin_periodo >= fechaDesde`
  - `fecha_inicio_periodo <= fechaHasta`

Default frontend:
- Desde `hoy - 1 mes`
- Hasta `hoy + 1 mes`

### 11.3 Regla de UX en editar planilla

- El modal de edicion abre de inmediato.
- Mientras carga detalle remoto, muestra preload (`Spin`) en contenido.
- Debe mostrar nombre de planilla existente desde apertura (sin quedar en "Pendiente...").

### 11.4 Tipo planilla y FK

Regla de persistencia:
- `id_tipo_planilla` no debe quedar `NULL` cuando existe tipo de planilla seleccionado.
- Frontend envia `idTipoPlanilla`.
- Backend resuelve fallback por `tipoPlanilla` cuando el id no llegue.

### 11.5 Calendario de planilla (estado implementado)

- Ruta activa: `/payroll-params/calendario/ver` con permiso `payroll:calendar:view`.
- Ruta activa de listado/operacion: `/payroll-params/calendario/dias-pago` con permiso `payroll:view`.
- Ruta activa de feriados: `/payroll-params/calendario/feriados` con permiso `payroll-holiday:view`.
- `Gestion Planilla` se mantiene fuera de alcance actual (oculto).
- Calendario incluye:
  - vista `Mensual` y `Timeline`,
  - filtros por empresa/moneda/tipo/estado/periodo,
  - indicadores de riesgo operativos,
  - panel de detalle con acciones por RBAC.
- Regla de seguridad UX:
  - confirmacion antes de `Procesar`, `Verificar` y `Aplicar`.
  - `Verificar` se bloquea si no hay snapshot de inputs.
