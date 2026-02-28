# 44 - Contratos API de Ausencias (Actualizacion Operativa)

Fecha: 2026-02-28
Contexto: Documento complementario de contratos para evitar ambiguedad mientras se mantiene historial del MVP base.

## 1. Endpoints vigentes

| Metodo | Ruta | Descripcion | Auth | Permiso |
|--------|------|-------------|------|---------|
| GET | `/api/personal-actions/absence-employees?idEmpresa=N` | Catalogo de empleados para Ausencias por empresa. | Cookie | `hr-action-ausencias:view` |
| GET | `/api/personal-actions/absence-movements?idEmpresa=N&idTipoAccionPersonal=20` | Catalogo de movimientos de Ausencias por empresa/tipo. | Cookie | `hr-action-ausencias:view` |
| GET | `/api/personal-actions/absence-payrolls?idEmpresa=N&idEmpleado=M` | Catalogo de planillas elegibles por empresa+empleado (periodo/moneda/estado/ventana). | Cookie | `hr-action-ausencias:view` |
| POST | `/api/personal-actions/ausencias` | Crear ausencia (header + lineas) en transaccion. Estado inicial `PENDING_SUPERVISOR`. | Cookie | `hr-action-ausencias:create` |
| PATCH | `/api/personal-actions/ausencias/:id` | Editar ausencia existente (flujo controlado por estado y validaciones). | Cookie | `hr-action-ausencias:edit` |
| PATCH | `/api/personal-actions/ausencias/:id/advance` | Avanzar ausencia al siguiente estado operativo segun flujo secuencial. | Cookie | `hr-action-ausencias:edit` |
| PATCH | `/api/personal-actions/ausencias/:id/invalidate` | Invalidar ausencia sin borrado fisico (estado `INVALIDATED`). | Cookie | `hr-action-ausencias:edit` |
| GET | `/api/personal-actions/ausencias/:id/audit-trail?limit=200` | Bitacora operativa de la ausencia (eventos create/update/advance/invalidate). | Cookie | `hr-action-ausencias:view` |

## 2. Reglas funcionales que afectan contrato

1. Captura multi-linea por accion:
   - encabezado + lineas en el mismo submit.
2. Validacion backend de planilla elegible:
   - empresa, periodo de empleado, moneda, estado operativo y ventana vigente.
3. Estado inicial en creacion:
   - `PENDING_SUPERVISOR` (no borrador).
4. Persistencia transaccional:
   - `acc_acciones_personal` + `acc_cuotas_accion` + `acc_ausencias_lineas`.
5. Flujo secuencial de avance:
   - `1 -> 2 -> 3 -> 4`.
   - estados finales no aceptan `advance`.
6. Invalidacion:
   - solo estados operativos (`1,2,3`),
   - cancela cuotas no pagadas.
7. Edicion:
   - solo en `1,2,3`,
   - `Empresa` y `Empleado` bloqueados,
   - planilla/movimiento historico no elegible se conserva visible por trazabilidad.
8. Consulta de detalle:
   - el modal de ausencia se puede abrir en cualquier estado para lectura y bitacora.
   - en estados `4..9` el backend/frontend operan en modo no editable.

## 3. Payload de creacion/edicion (resumen)

```json
{
  "idEmpresa": 1,
  "idEmpleado": 123,
  "observacion": "texto opcional",
  "lines": [
    {
      "payrollId": 10,
      "fechaEfecto": "2026-03-31",
      "movimientoId": 55,
      "tipoAusencia": "NO_JUSTIFICADA",
      "cantidad": 2,
      "monto": 15000,
      "remuneracion": true,
      "formula": "7500 x 2"
    }
  ]
}
```

Reglas de payload relevantes:

1. `cantidad` entero `>= 1` (sin tope artificial de `9999`).
2. `monto` numerico no negativo (UI lo captura como entero de solo digitos para estabilidad operativa).
3. `empresa` y `empleado` no cambian en edicion de ausencia.

## 4. Referencias

1. [42-AccionesPersonal-Planilla-Fase0Cerrada.md](./42-AccionesPersonal-Planilla-Fase0Cerrada.md)
2. [43-AccionesPersonal-Ausencias-Implementacion-Operativa.md](./43-AccionesPersonal-Ausencias-Implementacion-Operativa.md)
