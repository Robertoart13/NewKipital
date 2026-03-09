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
