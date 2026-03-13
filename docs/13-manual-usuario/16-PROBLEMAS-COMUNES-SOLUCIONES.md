# Problemas Comunes y Soluciones - KPITAL 360

Version: 1.0  
Fecha: 2026-03-11

## Matriz de soporte operativo
| Problema observado | Causa probable | Como validar | Solucion recomendada |
|---|---|---|---|
| Empleado no aparece en planilla | Empleado inactivo o sin salario base o fuera de empresa/periodo | Revisar ficha de empleado y filtros | Activar empleado, completar salario, recargar planilla |
| `Salario Quincenal Bruto` en 0 | Dias computados en 0 (ingreso/salida/ausencias no remuneradas consumen dias) | Ver columna `Dias` y detalle de acciones | Corregir acciones no remuneradas o periodo |
| No se puede aprobar accion | Empleado marcado + verificado en esa planilla o estado no elegible | Revisar estado empleado en tabla de planilla | Desmarcar/reabrir revision segun politica o crear accion para proximo periodo |
| No se puede invalidar accion | Candado de planilla o estado finalizado | Revisar estado accion y estado planilla | Gestionar excepcion con RRHH/Administrador |
| No se puede crear accion desde planilla | Empleado bloqueado por verificacion o falta de permiso | Revisar mensaje de bloqueo y rol | Ajustar seleccion/verificacion o permisos del usuario |
| Totales no coinciden con expectativa | Empleados no marcados, acciones pendientes o recalculo pendiente | Revisar `Incluidos en planilla` y estados de accion | Marcar empleados correctos, aprobar acciones, recargar tabla |
| No se puede aplicar planilla | Hay pendientes de verificacion o planilla no elegible | Revisar estado planilla y validaciones | Completar revision y ejecutar calculo completo |
| Error de permisos | Rol sin permiso operativo | Revisar matriz de permisos | Solicitar ajuste de rol/permisos |
| Lentitud al guardar accion | Recalculo completo en curso | Revisar spinner/estado y network | Esperar finalizacion, verificar conectividad y reintentar |
| Error de API al editar vacaciones | Tabla/campo no disponible o mismatch de esquema | Revisar log backend y SQL de referencia | Corregir consulta/entidad conforme a esquema actual |
| En Reglas de Distribucion el listado muestra menos `Asignaciones` que la pantalla de edicion | Listado desactualizado por cache | Abrir regla en `Editar` y validar lineas reales | Usar `Refrescar` en listado para forzar recarga y limpiar cache de consulta |
| En edicion de Regla de Distribucion aparece una linea vacia aunque API trae datos | Rehidratacion incompleta del formulario en frontend | Validar respuesta `GET /distribution-rules/:publicId` y campos `detalles` | Recargar vista y confirmar que `Tipo de Accion` y `Cuenta Contable` se visualizan en cada linea |
| Preview de carga masiva devuelve errores de fecha | `Fecha inicio`/`Fecha fin` vacias o invalidas en Excel | Revisar fila y empleado indicados en mensaje | Completar fecha valida y regenerar preview |
| Confirmar carga masiva no inserta todas las filas | Hay filas en `Error bloqueante` | Revisar columna `Estado` del preview | Corregir filas bloqueadas o confirmar sabiendo que solo entran `Valida` |
| Campana muestra contador pero no ve detalle completo | Esta usando solo dropdown de campana | Abrir notificacion desde click en item | Ir a `/notifications` para lista izquierda + detalle derecha |
| No llegan notificaciones de proceso async | Usuario/app no coinciden con contexto de ejecucion | Revisar sesion activa y app actual | Repetir proceso en app correcta y validar campana + centro de notificaciones |

## Escalamiento
1. Reproducir con evidencia (captura + hora + usuario + empresa + planilla).
2. Validar si es dato, permiso o regla de negocio.
3. Si persiste, escalar a soporte funcional RRHH.
4. Si es tecnico, escalar a ingenieria con request/response y logs.

## Referencias
- [Manual de Usuario Enterprise](./14-MANUAL-USUARIO-ENTERPRISE-KPITAL360.md)
- [Planilla Operativa](./05-PLANILLA-OPERATIVA.md)
- [Manual Tecnico - Manejo de Incidentes](../14-manual-tecnico/09-MANEJO-INCIDENTES-FUNCIONALES.md)
