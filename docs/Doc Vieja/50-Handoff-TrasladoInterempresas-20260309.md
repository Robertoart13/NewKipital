# 50 - Handoff Traslado Interempresas (2026-03-09)

## 1) Corte del handoff
- Fecha: 2026-03-09
- Hora local: 01:54:09 (UTC-06:00)
- Entorno: `mysql_hr_pro`
- Alcance del corte: traslado interempresas, refresco UI post-ejecucion, estado de pruebas y pendientes.

## 2) Ultimo cambio aplicado
Se corrigio el comportamiento de la pantalla `Traslado interempresas` cuando el execute movia empleados pero la grilla no se refrescaba de inmediato.

Archivo modificado:
- `frontend/src/pages/private/payroll-management/IntercompanyTransferPage.tsx`

Ajustes aplicados:
1. Invalidacion explicita de cache (`bustApiCache`) despues de ejecutar traslado.
2. Invalidacion explicita de cache en boton `Refrescar`.
3. Remocion inmediata del grid local de empleados con estado `EXECUTED`.
4. Recarga diferida de empleados (`300ms`) para evitar carrera de lectura post-commit.

## 3) Resultado actual
- El traslado puede ejecutar y persistir correctamente en BD.
- La pantalla ya no debe quedar mostrando empleado trasladado como si siguiera en origen.
- Se reduce el escenario inconsistente donde aparece al mismo tiempo:
  - "Empleado ya pertenece a empresa destino"
  - "Planillas activas en empresa origen"

## 4) Pruebas ejecutadas (ultimo tramo)
Pruebas ya registradas en `docs/Test/TEST-EXECUTION-REPORT.md` (Fases 48, 49, 50):
1. Unit/Integration API de payroll y traslado.
2. E2E real con BD: simulacion y execute de traslado, verificacion SQL before/after.
3. Validacion documental del fix UI de refresco y cache.

## 5) Pruebas pendientes de seguir
Pendientes de QA funcional manual en UI (tras este ultimo fix):
1. Simular traslado de 1 empleado apto y ejecutar.
2. Confirmar que desaparece del grid sin recargar pagina manualmente.
3. Confirmar que al presionar `Refrescar` no reaparece en origen.
4. Volver a simular en origen y validar que no salga el empleado ya trasladado.
5. Validar en empresa destino que el empleado aparece en listado esperado.
6. Validar al menos 1 accion de personal en destino con periodo reasignado.

## 6) Como probar (paso a paso, sin codigo)
1. Abrir `Traslado interempresas` en empresa origen.
2. Seleccionar periodo de pago.
3. Seleccionar empleado y empresa destino.
4. Ejecutar `Simular seleccionados`.
5. Si queda apto, ejecutar `Ejecutar traslado`.
6. Verificar mensaje de exito.
7. Verificar refresco automatico del grid (el empleado no debe quedar visible en origen).
8. Presionar `Refrescar` y confirmar consistencia.
9. Ir a modulos de acciones personales y revisar que la data del empleado este alineada al destino.

## 7) Como validar en BD
Validar al menos estos puntos:
1. Empresa actual del empleado en `sys_empleados`.
2. Registro de transferencia ejecutada en `sys_empleado_transferencias`.
3. Reasignacion de `id_empresa` e `id_calendario_nomina` en acciones de personal movidas.
4. Snapshots de reactivacion invalidados por traslado (`INVALIDATED_BY_TRANSFER`) cuando aplique.

## 8) Reglas aplicadas en este corte
Reglas de `docs/reglas/ReglasImportantes.md` aplicadas:
1. Documentar todo cambio en `docs/` en el mismo ciclo de trabajo.
2. Mantener paridad de comportamiento entre modulos y no romper reglas transversales.
3. Evitar suposiciones: validar con BD real cuando hay duda operacional.
4. Dejar trazabilidad de pruebas, pendientes y criterios de validacion.

## 9) Pendientes funcionales declarados
Se mantiene pendiente de terminar:
1. Accion personal `Despido`.
2. Accion personal `Renuncia`.

## 10) Referencias de evidencia
- `docs/Test/TEST-EXECUTION-REPORT.md`
- `docs/Test/GUIA-TESTING.md`
- `docs/09-EstadoActualProyecto.md`
- `docs/28-PendientesAccion.md`
## 11) Actualizacion final - 2026-03-09 22:22:58 -06:00
Alcance:
- Correccion de mensaje UX para falta de planilla destino en traslado interempresas.

Cambio aplicado:
- Backend: api/src/modules/payroll/intercompany-transfer.service.ts
- Metodo ajustado: formatMissingDestinationDatesMessage
- Comportamiento:
  1. Si falta una sola fecha: No existe planilla destino para la fecha YYYY-MM-DD.
  2. Si faltan multiples fechas: No existe planilla destino para cubrir el rango AAAA-MM-DD a AAAA-MM-DD, con detalle resumido de faltantes.

Validacion tecnica:
- Comando ejecutado: cd api && npm.cmd run build
- Resultado: OK (sin errores de compilacion).

Estado para continuar:
- Listo para continuar con modulo de planillas y siguiente bloque funcional.

## 12) Actualizacion de navegacion y permisos - 2026-03-09 22:45:09 -06:00

Se deja documentado ajuste final de menu en frontend:
- Gestion Planilla muestra:
  1. Planillas > Generar Planilla.
  2. Traslado Interempresas como opcion separada.

Incidencia resuelta:
- Menu no visible por falta de permiso payroll:generate en BD.
- Se ejecuto migracion y se confirmo alta/asignacion del permiso.

## 13) Actualizacion operativa de planilla - 2026-03-10

Alcance nuevo documentado:
1. Se verifico calculo de campos de tabla de planilla en entorno real.
2. Se confirmo que cargas sociales dependen de configuracion por empresa.
3. Se insertaron cargas sociales faltantes para `Constructora BRK` (`id_empresa=3`) en `nom_cargas_sociales`.
4. Se validaron resultados en tabla para empleado con formula completa:
   - bruto quincenal,
   - cargas,
   - renta,
   - neto.
5. Se ajusto UX de pantalla "Cargar Planilla Regular":
   - boton de carga fuera del panel de detalle,
   - colapso automatico del panel al cargar,
   - checkbox por empleado,
   - cards de resumen al final de la tabla.

Evidencia de datos (resumen):
- Empresa 3 no tenia cargas sociales configuradas al inicio (causa de cargas=0).
- Se crearon 3 cargas activas (IVM, Salud/Maternidad, Banco Popular).
- Luego la corrida mostro cargas calculadas y neto ajustado correctamente.

## 14) Actualizacion carga de acciones en tabla de planilla - 2026-03-10 02:10:04 -06:00

Alcance:
1. Se ajusto backend de load-table para mostrar en detalle de empleado las acciones de personal en estados: Borrador, Pendiente Supervisor, Pendiente RRHH y Aprobada.
2. Se mantiene regla financiera: los montos de planilla (bruto/deducciones/neto) se calculan solo con acciones aprobadas.
3. Se preserva orden de detalle solicitado: primero acciones de personal, luego cargas sociales e impuesto renta.
4. Se expone estado real por linea (estado, estadoCodigo) y bandera canApprove para habilitar boton de aprobacion desde la UI.

Archivo actualizado:
- `api/src/modules/payroll/payroll.service.ts`

Validacion tecnica:
- Comando: cd api && npm.cmd run build
- Resultado: OK (compila sin errores).


## 15) Actualizacion planilla regular y tabla operativa - 2026-03-10 03:10:00 -06:00

Se documenta continuidad del bloque funcional posterior al traslado interempresas:

1. Vista de planilla regular ajustada para uso operativo real (carga de tabla por planilla seleccionada).
2. Formato de detalle de acciones enriquecido en "Tipo de Accion" con patron legacy:
   - Categoria (cantidad) - Movimiento - detalle.
3. Se mantiene criterio de calculo:
   - Totales financieros solo con acciones aprobadas.
   - Visual de detalle incluye pendientes para revision/decision.
4. Se habilita accion de aprobacion directa desde tabla para lineas en Pendiente Supervisor.
5. Se confirma dependencias de cargas sociales por empresa:
   - Si no existen cargas activas en nom_cargas_sociales, Cargas Sociales queda en 0.

Nota operativa:
- El estado de tabla y resumen puede requerir recarga de planilla (boton Cargar planilla) despues de cambios de configuracion/cargas para reconstruir snapshot visual.

## 16) Acta de sesion consolidada - 2026-03-10 03:35:00 -06:00

### 16.1 Que hablamos (resumen ejecutivo)
1. Se confirmo que la vista de `Generar Planilla Regular` debe funcionar como carga operativa de tabla, no como aplicacion final.
2. Se pidio alinear la UX con el sistema de referencia (legacy) para legibilidad y operacion RRHH.
3. Se definio que el detalle de acciones debe mostrar estados reales y permitir aprobacion directa cuando aplique.
4. Se discutio y ratifico que el calculo financiero no debe contaminarse con acciones no aprobadas.

### 16.2 Que analizamos (tecnico-funcional)
1. Flujo de datos API -> snapshot -> frontend para carga de tabla.
2. Regla de inclusion de acciones por estado para vista de revision.
3. Diferencia entre:
   - visibilidad operativa (mostrar pendientes), y
   - impacto financiero (solo aprobadas).
4. Dependencia de cargas sociales por empresa (`nom_cargas_sociales`) como precondicion de calculo de deducciones recurrentes.
5. Formato de `Tipo de Accion` para compatibilidad visual con legacy y lectura rapida por usuario.

### 16.3 Decisiones tomadas
1. Mantener `Cargar planilla` como previsualizacion operativa.
2. Mostrar acciones en estados Borrador/Pendiente Supervisor/Pendiente RRHH/Aprobada.
3. Mantener formula financiera estricta con acciones `APPROVED`.
4. Permitir accion `Aprobar` desde tabla para estados `Pendiente Supervisor`.
5. Aplicar semaforo visual de estado en detalle por linea.
6. Estandarizar formato enriquecido de `Tipo de Accion`.

### 16.4 Resultado actual del bloque
1. Tabla de empleados y acciones funcional para revision.
2. Detalle por empleado con estados y accion operativa.
3. Calculo visible de salario/cargas/renta/neto con regla financiera vigente.
4. Documentacion transversal actualizada en blueprint, reglas, pruebas, indice, estado y pendientes.

### 16.5 Que sigue (siguiente bloque acordado)
1. Continuar fase de planilla aplicada (de preview/verificacion hacia aplicacion final).
2. Reforzar escenarios de QA funcional en empresas con catalogos completos e incompletos.
3. Mantener trazabilidad de cambios en docs/test por fase antes de cerrar cada bloque.

### 16.6 Como validar que este bloque quedo estable
1. Cargar planilla regular y expandir detalle de al menos 1 empleado.
2. Verificar formato de `Tipo de Accion` y estado por linea.
3. Aprobar una linea pendiente de supervisor desde tabla.
4. Recargar planilla y confirmar consistencia visual/financiera.
5. Confirmar que cargas sociales aparecen solo si existe configuracion activa en empresa.
