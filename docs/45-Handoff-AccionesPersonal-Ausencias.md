# 45 - Handoff Operativo (Acciones de Personal: Ausencias)

Fecha: 2026-02-28  
Objetivo: permitir retomar el desarrollo desde cero (nuevo chat / nuevo ingeniero) sin perdida de contexto.

## 1. Estado actual (cerrado)

El modulo **Ausencias** ya esta operativo en flujo base:

1. Vista propia: `/personal-actions/ausencias`.
2. Listado con filtros homologados al patron del sistema.
3. Creacion real en BD (header + cuotas + lineas).
4. Edicion real en BD con validaciones por estado.
5. Avance secuencial de estado (`advance`).
6. Invalidacion sin borrado fisico (`invalidate`).
7. Bitacora visible en tab dedicado.
8. Apertura de modal por click en fila en cualquier estado.

Documentos fuente de detalle:

1. `docs/43-AccionesPersonal-Ausencias-Implementacion-Operativa.md`
2. `docs/44-ContratosAPI-Ausencias-20260228.md`
3. `docs/42-AccionesPersonal-Planilla-Fase0Cerrada.md`

## 2. Endpoints vigentes (Ausencias)

1. `GET /api/personal-actions/absence-employees?idEmpresa=...`
2. `GET /api/personal-actions/absence-movements?idEmpresa=...&idTipoAccionPersonal=20`
3. `GET /api/personal-actions/absence-payrolls?idEmpresa=...&idEmpleado=...`
4. `POST /api/personal-actions/ausencias`
5. `PATCH /api/personal-actions/ausencias/:id`
6. `PATCH /api/personal-actions/ausencias/:id/advance`
7. `PATCH /api/personal-actions/ausencias/:id/invalidate`
8. `GET /api/personal-actions/ausencias/:id/audit-trail?limit=200`

## 3. Permisos usados

1. `hr-action-ausencias:view`
2. `hr-action-ausencias:create`
3. `hr-action-ausencias:edit`
4. `employee:view-sensitive` (solo para ver datos sensibles en card de empleado)

## 4. Reglas de estado (single source of truth)

Catalogo numerico:

1. `1 = DRAFT`
2. `2 = PENDING_SUPERVISOR`
3. `3 = PENDING_RRHH`
4. `4 = APPROVED`
5. `5 = CONSUMED`
6. `6 = CANCELLED`
7. `7 = INVALIDATED`
8. `8 = EXPIRED`
9. `9 = REJECTED`

Flujo secuencial habilitado por `advance`:

1. `1 -> 2`
2. `2 -> 3`
3. `3 -> 4`

Regla UI/edicion:

1. Editables: `1,2,3`
2. Solo lectura (modal abre, sin guardar): `4,5,6,7,8,9`

## 5. Reglas funcionales activas

### 5.1 Encabezado

1. En edicion, `empresa` y `empleado` bloqueados.
2. En creacion, si no hay `empresa + empleado`, no aparece seccion de lineas.

### 5.2 Lineas de transaccion

1. No se permite agregar linea nueva si la actual esta incompleta.
2. No se permite guardar con lineas incompletas.
3. `cantidad` entero `>= 1` (sin limite artificial de 9999).
4. `monto` editable manualmente, no negativo.
5. `monto` en UI se captura como texto numerico (solo digitos) para evitar corrupcion por conversion JS.

### 5.3 Planillas elegibles

Una planilla solo aparece si cumple:

1. misma empresa,
2. mismo periodo de pago del empleado,
3. misma moneda del empleado,
4. activa,
5. estado operativo (abierta/en proceso),
6. ventana vigente (`fecha_fin_pago >= hoy`).

## 6. Base de datos involucrada

Tablas core:

1. `acc_acciones_personal` (header)
2. `acc_cuotas_accion` (cuotas)
3. `acc_ausencias_lineas` (detalle por linea)

Nota operativa:

1. No hay borrado fisico de acciones en flujo normal.
2. Invalidar cambia estado y conserva trazabilidad.

## 7. Bitacora y auditoria

Eventos auditados:

1. `create`
2. `update`
3. `advance`
4. `invalidate`

Comportamiento de carga:

1. Bitacora se carga una vez por apertura/modal para evitar loops.
2. Cambiar entre tabs no debe limpiar formulario ni lineas.

## 8. UX y filtros (estado final esperado)

Listado usa patron homologado:

1. header de registros con `entries per page`,
2. filtro de empresa,
3. filtro de estado (multiseleccion),
4. boton refrescar,
5. panel de filtros con buscar/limpiar.

Preseleccion de estado (atencion diaria):

1. `Borrador`
2. `Pendiente Supervisor`
3. `Pendiente RRHH`

## 9. QA minimo para verificar al retomar

1. Crear ausencia con 1 linea valida.
2. Crear ausencia con 2 lineas (validar `group_id`/orden y persistencia).
3. Avanzar estado `1->2->3->4`.
4. Invalidar en estado operativo.
5. Abrir modal en estado final y confirmar solo lectura.
6. Abrir tab bitacora y confirmar eventos.
7. Validar que cambio de tab no borra datos.
8. Validar que `monto` solo acepte digitos y no se deforme.

## 10. Pendiente siguiente bloque (no implementado aun)

1. Aprobar flujo completo por rol (supervisor/RRHH) con enforcement mas fino por permiso.
2. Replicar este patron en las demas acciones de personal:
   - Entradas,
   - Salidas,
   - Deducciones,
   - Compensaciones,
   - Incapacidades,
   - Licencias y permisos.
3. Definir invalidacion por linea si negocio lo requiere (hoy la invalidacion es por accion completa).

## 12. Roadmap por fases (para continuar sin ambiguedad)

### Fase A - Cierre Ausencias Base (estado actual)

Estado: **COMPLETADA**  
Incluye:

1. CRUD operativo de Ausencias (header + lineas).
2. Advance secuencial (`1->2->3->4`).
3. Invalidacion de accion completa.
4. Bitacora en modal.
5. Reglas de elegibilidad de planilla.
6. Modo lectura en estados no editables.

Criterio de salida: cumplido.

### Fase B - Gobernanza de estados y acciones UI

Estado: **SIGUIENTE FASE INMEDIATA**  
Objetivo:

1. Afinar permisos por transicion de estado (separar mas fino supervisor vs RRHH si negocio lo exige).
2. Mensajeria UX por accion de estado (explicaciones claras para usuario final).
3. Validar si `Aprobada` debe permitir invalidar o quedar cerrada por politica final.

Criterio de entrada:

1. Fase A estable en QA.
2. Confirmacion funcional de negocio sobre estados finales.

Criterio de salida:

1. Matriz permiso x estado x accion cerrada y aplicada.

### Fase C - Replicar patron en otras Acciones de Personal

Estado: **PENDIENTE**  
Orden recomendado:

1. Deducciones
2. Compensaciones
3. Salidas
4. Entradas
5. Incapacidades
6. Licencias y Permisos

Regla:

1. Cada accion en carpeta/vista/modal propio.
2. Mismo esqueleto de Ausencias:
   - listado homologado,
   - create/edit,
   - bitacora,
   - bloqueo por estado,
   - validaciones de lineas.

Criterio de salida:

1. Todas las acciones con comportamiento consistente y auditables.

### Fase D - Integracion avanzada con motor de planilla

Estado: **PENDIENTE**  
Objetivo:

1. Trigger de recalculo en planillas abiertas al aprobar acciones elegibles.
2. Politica de retroactivos confirmada y ejecutada.
3. Reglas de consumo por corrida (`consumed_run_id`) cerradas para todas las acciones.

Criterio de salida:

1. Trazabilidad completa desde accion personal hasta corrida de planilla.

### Fase E - Hardening final y certificacion operativa

Estado: **PENDIENTE**  
Objetivo:

1. Matriz QA completa por accion/estado.
2. Pruebas de concurrencia.
3. Checklist de auditoria operativa (bitacora, permisos, bloqueo de edicion post-estado final).

Criterio de salida:

1. Go-live candidate para bloque Acciones de Personal.

## 13. Si mañana se pregunta: "Que fase sigue?"

Respuesta estandar esperada:

1. "La siguiente fase es **Fase B - Gobernanza de estados y acciones UI**."
2. "Despues de cerrar Fase B, continuamos con **Fase C - replicar patron en las demas acciones de personal**."

Checklist de arranque rapido para manana:

1. Abrir `docs/45-Handoff-AccionesPersonal-Ausencias.md`.
2. Confirmar Fase A cerrada (sin regresiones).
3. Iniciar tareas de Fase B.

## 11. Regla de continuidad para siguiente ingeniero

No romper lo ya cerrado en Ausencias.  
Cualquier extension debe cumplir:

1. compatibilidad incremental,
2. estados numericos centralizados,
3. trazabilidad en bitacora,
4. misma UX del ecosistema (modales, filtros, confirmaciones, bloqueos por estado).
